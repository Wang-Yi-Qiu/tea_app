/**
 * 文本内容安全检测云函数
 * 集成腾讯云文本内容安全API
 */

const tencentcloud = require('tencentcloud-sdk-nodejs');
const { config, validateConfig, checkRateLimit } = require('../configs/tencent-cloud-config');

// 初始化腾讯云客户端
function createTencentClient() {
  const cmsClient = tencentcloud.cms.v20190307.Client;
  const clientConfig = {
    credential: {
      secretId: config.tencentCloud.secretId,
      secretKey: config.tencentCloud.secretKey,
    },
    region: config.tencentCloud.region,
    profile: {
      httpProfile: {
        endpoint: config.tencentCloud.domain,
      },
    },
  };
  return new cmsClient(clientConfig);
}

// 全局客户端实例（云函数内可复用）
let tencentClient = null;

/**
 * 主处理函数
 */
exports.main = async (event, context) => {
  try {
    // 验证配置
    validateConfig();

    // 初始化客户端
    if (!tencentClient) {
      tencentClient = createTencentClient();
    }

    // 解析请求参数
    const { content, businessType, userId, postId, deviceId } = event;

    if (!content || typeof content !== 'string') {
      throw new Error('Content is required and must be a string');
    }

    if (!businessType || !config.business.businessType[businessType]) {
      throw new Error('Invalid businessType');
    }

    // 记录请求日志
    console.log('Text content check request:', {
      userId: userId || 'anonymous',
      businessType,
      contentLength: content.length,
      postId,
      deviceId,
      timestamp: new Date().toISOString()
    });

    // 检查频率限制
    const rateLimitResult = checkRateLimit(getRequestStats());
    if (!rateLimitResult.allowed) {
      return {
        code: 429,
        message: '请求过于频繁',
        data: {
          retryAfter: rateLimitResult.retryAfter,
          suggestion: 'reduce_frequency'
        },
        error: rateLimitResult.error
      };
    }

    // 执行文本检测
    const result = await checkTextContent(content, businessType, {
      userId,
      postId,
      deviceId,
      timestamp: Date.now()
    });

    // 保存检测记录
    await saveReviewRecord({
      content,
      businessType,
      userId,
      postId,
      deviceId,
      result,
      timestamp: Date.now()
    });

    // 触发通知（如果需要）
    if (result.status === config.reviewStatus.BLOCK ||
        result.status === config.reviewStatus.REVIEW) {
      await triggerNotification({
        type: 'content_review',
        status: result.status,
        businessType,
        userId,
        postId,
        details: result
      });
    }

    return {
      code: 0,
      message: 'success',
      data: {
        status: result.status,
        suggestion: result.suggestion,
        labels: result.labels,
        confidence: result.confidence,
        requestId: result.requestId,
        processingTime: result.processingTime
      }
    };

  } catch (error) {
    console.error('Text content check error:', error);

    // 错误处理和降级策略
    return handleContentCheckError(error, event);
  }
};

/**
 * 执行文本内容检测
 */
async function checkTextContent(content, businessType, context) {
  const startTime = Date.now();

  try {
    // 构造请求参数
    const params = {
      Content: content,
      BizType: businessType,
      DataId: `${context.userId}_${context.timestamp}`,
      Device: context.deviceId ? {
        IP: context.deviceId
      } : undefined,
      User: context.userId ? {
        UserId: context.userId
      } : undefined
    };

    console.log('Sending request to Tencent Cloud CMS:', {
      contentLength: content.length,
      bizType: businessType,
      dataId: params.DataId
    });

    // 调用腾讯云API
    const response = await tencentClient.TextModeration(params);

    const processingTime = Date.now() - startTime;

    console.log('Tencent Cloud CMS response:', {
      requestId: response.RequestId,
      processingTime,
      suggestion: response.Suggestion
    });

    // 解析响应结果
    const result = parseTencentResponse(response, processingTime);

    // 检查是否需要降级处理
    if (result.status === config.reviewStatus.ERROR &&
        config.tencentCloud.fallback.enabled) {
      console.log('API error, using fallback keyword filter');
      return performKeywordFilter(content, businessType);
    }

    return result;

  } catch (error) {
    console.error('Tencent Cloud API call failed:', error);

    // API调用失败，尝试降级策略
    if (config.tencentCloud.fallback.enabled) {
      console.log('API call failed, using fallback keyword filter');
      return performKeywordFilter(content, businessType);
    }

    throw error;
  }
}

/**
 * 解析腾讯云API响应
 */
function parseTencentResponse(response, processingTime) {
  const suggestion = response.Suggestion || 'Pass';
  let status;
  let suggestionCode;

  // 映射建议到状态
  switch (suggestion) {
    case 'Pass':
      status = config.reviewStatus.PASS;
      suggestionCode = 'pass';
      break;
    case 'Review':
      status = config.reviewStatus.REVIEW;
      suggestionCode = 'review';
      break;
    case 'Block':
      status = config.reviewStatus.BLOCK;
      suggestionCode = 'block';
      break;
    default:
      status = config.reviewStatus.ERROR;
      suggestionCode = 'error';
  }

  // 解析标签信息
  const labels = [];
  if (response.Label && response.Label !== 'Normal') {
    labels.push({
      label: response.Label,
      score: response.Score || 0,
      subLabel: response.SubLabel || ''
    });
  }

  // 解析关键词（如果有）
  const keywords = [];
  if (response.Keywords && Array.isArray(response.Keywords)) {
    keywords.push(...response.Keywords);
  }

  return {
    status,
    suggestion: suggestionCode,
    labels,
    keywords,
    confidence: response.Score || 0,
    requestId: response.RequestId,
    processingTime,
    originalResponse: response
  };
}

/**
 * 关键词过滤降级处理
 */
function performKeywordFilter(content, businessType) {
  const startTime = Date.now();

  if (!config.tencentCloud.fallback.keywordFilter.enabled) {
    return {
      status: config.reviewStatus.ERROR,
      suggestion: 'error',
      labels: [],
      keywords: [],
      confidence: 0,
      requestId: 'fallback_' + Date.now(),
      processingTime: Date.now() - startTime,
      isFallback: true,
      message: 'Keyword filter is disabled'
    };
  }

  const { sensitiveWords } = config.tencentCloud.fallback.keywordFilter;
  const foundKeywords = [];
  let hasViolation = false;

  // 检查敏感词（不区分大小写）
  const lowerContent = content.toLowerCase();

  for (const word of sensitiveWords) {
    if (lowerContent.includes(word.toLowerCase())) {
      foundKeywords.push(word);
      hasViolation = true;
    }
  }

  const status = hasViolation ? config.reviewStatus.BLOCK : config.reviewStatus.PASS;
  const suggestion = hasViolation ? 'block' : 'pass';

  console.log('Keyword filter result:', {
    hasViolation,
    foundKeywords: foundKeywords.length,
    processingTime: Date.now() - startTime
  });

  return {
    status,
    suggestion,
    labels: hasViolation ? [{ label: config.reviewLabels.OTHER, score: 1.0 }] : [],
    keywords: foundKeywords,
    confidence: hasViolation ? 1.0 : 0.0,
    requestId: 'fallback_' + Date.now(),
    processingTime: Date.now() - startTime,
    isFallback: true
  };
}

/**
 * 保存审核记录到数据库
 */
async function saveReviewRecord(record) {
  try {
    const db = cloud.database();
    const collection = db.collection(config.database.reviewRecordsTable);

    const reviewRecord = {
      _id: `${record.postId}_${record.userId}_${record.timestamp}`,
      content: record.content.substring(0, 500), // 只保存前500个字符
      businessType: record.businessType,
      userId: record.userId,
      postId: record.postId,
      deviceId: record.deviceId,
      status: record.result.status,
      suggestion: record.result.suggestion,
      labels: record.result.labels,
      keywords: record.result.keywords,
      confidence: record.result.confidence,
      requestId: record.result.requestId,
      processingTime: record.result.processingTime,
      isFallback: record.result.isFallback || false,
      createTime: new Date(record.timestamp),
      updateTime: new Date()
    };

    await collection.add({
      data: reviewRecord
    });

    console.log('Review record saved:', {
      recordId: reviewRecord._id,
      status: record.result.status
    });

  } catch (error) {
    console.error('Failed to save review record:', error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 触发通知
 */
async function triggerNotification(notificationData) {
  try {
    if (!config.notification.enabled) {
      return;
    }

    // 这里可以集成微信小程序订阅消息、邮件、webhook等通知方式
    console.log('Notification triggered:', notificationData);

    // 实际实现可以根据需要添加邮件、微信通知等
    if (config.notification.channels.webhook.enabled) {
      // 发送webhook通知
      await sendWebhookNotification(notificationData);
    }

  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

/**
 * 发送webhook通知
 */
async function sendWebhookNotification(data) {
  try {
    const webhookUrl = config.notification.channels.webhook.url;
    if (!webhookUrl) {
      return;
    }

    const payload = {
      event: 'content_review',
      data: {
        type: data.type,
        status: data.status,
        businessType: data.businessType,
        userId: data.userId,
        postId: data.postId,
        timestamp: Date.now(),
        details: data.details
      }
    };

    // 使用云开发HTTP API发送webhook
    const result = await cloud.openapi.cloudbase.invokeFunction({
      env: cloud.DYNAMIC_CURRENT_ENV,
      name: 'send-webhook-notification',
      data: payload
    });

    console.log('Webhook notification sent:', result);

  } catch (error) {
    console.error('Failed to send webhook notification:', error);
  }
}

/**
 * 错误处理
 */
function handleContentCheckError(error, event) {
  console.error('Content check error details:', {
    error: error.message,
    stack: error.stack,
    event: JSON.stringify(event)
  });

  // 网络错误或API不可用时的降级处理
  if (error.code === 'NetworkError' ||
      error.code === 'ESOCKETTIMEDOUT' ||
      error.code === 'ETIMEDOUT') {

    if (config.tencentCloud.fallback.enabled &&
        config.tencentCloud.fallback.keywordFilter.enabled) {

      try {
        console.log('Network error, using keyword filter fallback');
        const fallbackResult = performKeywordFilter(event.content, event.businessType);

        return {
          code: 200,
          message: 'success (fallback mode)',
          data: {
            status: fallbackResult.status,
            suggestion: fallbackResult.suggestion,
            labels: fallbackResult.labels,
            keywords: fallbackResult.keywords,
            confidence: fallbackResult.confidence,
            requestId: fallbackResult.requestId,
            processingTime: fallbackResult.processingTime,
            isFallback: true,
            warning: 'API unavailable, used keyword filter fallback'
          }
        };
      } catch (fallbackError) {
        console.error('Keyword filter fallback also failed:', fallbackError);
      }
    }
  }

  // 其他错误
  return {
    code: 500,
    message: error.message || 'Internal server error',
    data: {
      status: config.reviewStatus.ERROR,
      suggestion: 'error',
      labels: [],
      keywords: [],
      confidence: 0,
      requestId: 'error_' + Date.now()
    },
    error: error.message
  };
}

/**
 * 获取请求统计（简化版）
 */
function getRequestStats() {
  // 这里应该从Redis或其他缓存系统获取真实的统计数据
  // 为了简化，这里返回默认值
  return {
    requestsThisMinute: 0,
    requestsThisHour: 0,
    requestsThisDay: 0,
    lastResetTime: Date.now()
  };
}

/**
 * 测试函数 - 用于云函数部署后测试
 */
async function testFunction() {
  const testEvent = {
    content: '这是一个正常的测试文本内容',
    businessType: config.business.businessType.COMMUNITY,
    userId: 'test_user_001',
    postId: 'test_post_001',
    deviceId: 'test_device_001'
  };

  console.log('Running text content security test...');
  const result = await exports.main(testEvent, {});
  console.log('Test result:', result);
  return result;
}

// 导出测试函数
exports.test = testFunction;