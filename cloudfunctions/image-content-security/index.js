/**
 * 图片内容安全检测云函数
 * 集成腾讯云图片内容安全API
 */

const tencentcloud = require('tencentcloud-sdk-nodejs');
const { config, validateConfig, checkRateLimit } = require('../configs/tencent-cloud-config');
const crypto = require('crypto');

// 初始化腾讯云客户端
function createTencentClient() {
  const imsClient = tencentcloud.ims.v20201229.Client;
  const clientConfig = {
    credential: {
      secretId: config.tencentCloud.secretId,
      secretKey: config.tencentCloud.secretKey,
    },
    region: config.tencentCloud.region,
    profile: {
      httpProfile: {
        endpoint: 'ims.tencentcloudapi.com',
      },
    },
  };
  return new imsClient(clientConfig);
}

// 全局客户端实例
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
    const { imageUrl, fileID, businessType, userId, postId, deviceId } = event;

    // 图片来源必须二选一
    if (!imageUrl && !fileID) {
      throw new Error('Either imageUrl or fileID is required');
    }

    if (imageUrl && fileID) {
      throw new Error('Provide either imageUrl or fileID, not both');
    }

    if (!businessType || !config.business.businessType[businessType]) {
      throw new Error('Invalid businessType');
    }

    // 记录请求日志
    console.log('Image content check request:', {
      userId: userId || 'anonymous',
      businessType,
      imageSource: imageUrl ? 'url' : 'fileID',
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

    // 获取图片数据
    let imageData;
    if (imageUrl) {
      imageData = await downloadImageFromUrl(imageUrl);
    } else {
      imageData = await downloadImageFromCloudStorage(fileID);
    }

    // 执行图片检测
    const result = await checkImageContent(imageData, businessType, {
      userId,
      postId,
      deviceId,
      imageUrl,
      fileID,
      timestamp: Date.now()
    });

    // 保存检测记录
    await saveReviewRecord({
      imageUrl,
      fileID,
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
        type: 'image_review',
        status: result.status,
        businessType,
        userId,
        postId,
        details: result
      });
    }

    // 清理临时文件
    if (imageData && imageData.tempPath) {
      await cleanupTempFile(imageData.tempPath);
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
        processingTime: result.processingTime,
        imageSize: result.imageSize,
        format: result.format
      }
    };

  } catch (error) {
    console.error('Image content check error:', error);

    // 错误处理和降级策略
    return handleContentCheckError(error, event);
  }
};

/**
 * 从URL下载图片
 */
async function downloadImageFromUrl(imageUrl) {
  try {
    console.log('Downloading image from URL:', imageUrl);

    // 验证URL格式
    const urlObj = new URL(imageUrl);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid URL protocol');
    }

    // 使用云函数HTTP请求下载图片
    const response = await new Promise((resolve, reject) => {
      const https = require('https');
      const http = require('http');
      const client = urlObj.protocol === 'https:' ? https : http;

      const request = client.get(imageUrl, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            data: buffer,
            size: buffer.length,
            format: getImageFormat(buffer),
            source: 'url',
            originalUrl: imageUrl
          });
        });
      });

      request.on('error', reject);
      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });

    console.log('Image downloaded:', {
      size: response.size,
      format: response.format
    });

    return response;

  } catch (error) {
    console.error('Failed to download image from URL:', error);
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

/**
 * 从云存储下载图片
 */
async function downloadImageFromCloudStorage(fileID) {
  try {
    console.log('Downloading image from cloud storage:', fileID);

    // 使用微信云存储API下载文件
    const result = await cloud.downloadFile({
      fileID: fileID
    });

    const buffer = result.fileContent;
    const format = getImageFormat(buffer);

    console.log('Image downloaded from cloud storage:', {
      size: buffer.length,
      format
    });

    return {
      data: buffer,
      size: buffer.length,
      format,
      source: 'cloudStorage',
      fileID
    };

  } catch (error) {
    console.error('Failed to download image from cloud storage:', error);
    throw new Error(`Failed to download image from cloud storage: ${error.message}`);
  }
}

/**
 * 获取图片格式
 */
function getImageFormat(buffer) {
  // 检查文件头来确定图片格式
  const header = buffer.subarray(0, 12);

  // JPEG
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
    return 'JPEG';
  }

  // PNG
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
    return 'PNG';
  }

  // GIF
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) {
    return 'GIF';
  }

  // BMP
  if (header[0] === 0x42 && header[1] === 0x4D) {
    return 'BMP';
  }

  // WEBP (需要更多检查）
  if (header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) {
    return 'WEBP';
  }

  return 'UNKNOWN';
}

/**
 * 执行图片内容检测
 */
async function checkImageContent(imageData, businessType, context) {
  const startTime = Date.now();

  try {
    // 验证图片大小
    if (imageData.size > 10 * 1024 * 1024) { // 10MB
      throw new Error('Image size too large (max 10MB)');
    }

    // 验证图片格式
    const supportedFormats = ['JPEG', 'PNG', 'GIF', 'BMP', 'WEBP'];
    if (!supportedFormats.includes(imageData.format)) {
      throw new Error(`Unsupported image format: ${imageData.format}`);
    }

    // 将图片转换为Base64
    const imageBase64 = imageData.data.toString('base64');

    // 构造请求参数
    const params = {
      FileContent: imageBase64,
      BizType: businessType,
      DataId: `${context.userId}_${context.timestamp}`,
      Device: context.deviceId ? {
        IP: context.deviceId
      } : undefined,
      User: context.userId ? {
        UserId: context.userId
      } : undefined,
      // 设置额外配置
      Conf: {
        // 是否返回人物信息
        FaceRetain: 1,
        // 检测类型：1 色情，2 暴力，3 政治敏感，4 违法，5 广告，6 其他
        DetectType: '1,2,3,4,5,6'
      }
    };

    console.log('Sending image moderation request:', {
      imageSize: imageData.size,
      format: imageData.format,
      bizType: businessType,
      dataId: params.DataId
    });

    // 调用腾讯云图片审核API
    const response = await tencentClient.ImageModeration(params);

    const processingTime = Date.now() - startTime;

    console.log('Tencent Cloud IMS response:', {
      requestId: response.RequestId,
      processingTime,
      suggestion: response.Suggestion,
      hitFlag: response.HitFlag
    });

    // 解析响应结果
    const result = parseImageResponse(response, processingTime, imageData);

    // 检查是否需要降级处理
    if (result.status === config.reviewStatus.ERROR &&
        config.tencentCloud.fallback.enabled) {
      console.log('API error, using fallback processing');
      return performImageFallback(imageData, businessType);
    }

    return result;

  } catch (error) {
    console.error('Tencent Cloud image API call failed:', error);

    // API调用失败，尝试降级策略
    if (config.tencentCloud.fallback.enabled) {
      console.log('API call failed, using fallback processing');
      return performImageFallback(imageData, businessType);
    }

    throw error;
  }
}

/**
 * 解析图片审核API响应
 */
function parseImageResponse(response, processingTime, imageData) {
  const suggestion = response.Suggestion || 'Pass';
  const hitFlag = response.HitFlag || 0;

  let status;
  let suggestionCode;

  // 映射建议到状态
  switch (suggestion) {
    case 'Pass':
      status = hitFlag === 0 ? config.reviewStatus.PASS : config.reviewStatus.REVIEW;
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
  if (response.LabelResults && Array.isArray(response.LabelResults)) {
    response.LabelResults.forEach(labelResult => {
      labels.push({
        label: labelResult.Label,
        subLabel: labelResult.SubLabel || '',
        score: labelResult.Score || 0,
        hitFlag: labelResult.HitFlag || 0,
        keywordSets: labelResult.KeywordSets || []
      });
    });
  }

  // 解析人物信息（如果有）
  const faceInfo = [];
  if (response.FaceResults && Array.isArray(response.FaceResults)) {
    response.FaceResults.forEach(face => {
      faceInfo.push({
        faceId: face.FaceId || '',
        gender: face.Gender || '',
        age: face.Age || 0,
        expression: face.Expression || '',
        beauty: face.Beauty || 0,
        score: face.Score || 0,
        faceRect: face.FaceRect || {}
      });
    });
  }

  // 解析OCR文本（如果有）
  const ocrText = [];
  if (response.OCRResults && Array.isArray(response.OCRResults)) {
    response.OCRResults.forEach(ocr => {
      ocrText.push({
        text: ocr.Text || '',
        score: ocr.Score || 0,
        keywordSets: ocr.KeywordSets || []
      });
    });
  }

  return {
    status,
    suggestion: suggestionCode,
    labels,
    faceInfo,
    ocrText,
    confidence: Math.max(...labels.map(l => l.score), 0),
    requestId: response.RequestId,
    processingTime,
    imageSize: imageData.size,
    format: imageData.format,
    hitFlag,
    originalResponse: response
  };
}

/**
 * 图片降级处理
 */
async function performImageFallback(imageData, businessType) {
  const startTime = Date.now();

  // 降级策略：只检查基本信息和大小限制
  console.log('Performing image fallback processing:', {
    size: imageData.size,
    format: imageData.format
  });

  // 基本规则检查
  const issues = [];

  // 检查图片大小
  if (imageData.size > 5 * 1024 * 1024) { // 5MB
    issues.push('图片过大');
  }

  // 检查图片格式
  const allowedFormats = ['JPEG', 'PNG'];
  if (!allowedFormats.includes(imageData.format)) {
    issues.push('不支持的图片格式');
  }

  // 简单的OCR文本检查（如果启用）
  let hasSensitiveText = false;
  if (config.tencentCloud.fallback.keywordFilter.enabled) {
    try {
      // 这里可以集成简单的OCR，但降级策略主要基于文件属性
      console.log('OCR text check skipped in fallback mode');
    } catch (error) {
      console.log('OCR check failed:', error.message);
    }
  }

  const status = issues.length > 0 ? config.reviewStatus.REVIEW : config.reviewStatus.PASS;
  const suggestion = issues.length > 0 ? 'review' : 'pass';

  return {
    status,
    suggestion,
    labels: issues.length > 0 ? [{ label: config.reviewLabels.OTHER, score: 0.5 }] : [],
    faceInfo: [],
    ocrText: [],
    keywords: issues,
    confidence: issues.length > 0 ? 0.5 : 0.1,
    requestId: 'fallback_' + Date.now(),
    processingTime: Date.now() - startTime,
    imageSize: imageData.size,
    format: imageData.format,
    isFallback: true,
    fallbackReason: 'API unavailable, used basic image validation'
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
      imageUrl: record.imageUrl || '',
      fileID: record.fileID || '',
      businessType: record.businessType,
      userId: record.userId,
      postId: record.postId,
      deviceId: record.deviceId,
      status: record.result.status,
      suggestion: record.result.suggestion,
      labels: record.result.labels,
      faceInfo: record.result.faceInfo,
      ocrText: record.result.ocrText,
      keywords: record.result.keywords || [],
      confidence: record.result.confidence,
      requestId: record.result.requestId,
      processingTime: record.result.processingTime,
      imageSize: record.result.imageSize,
      format: record.result.format,
      isFallback: record.result.isFallback || false,
      fallbackReason: record.result.fallbackReason || '',
      createTime: new Date(record.timestamp),
      updateTime: new Date()
    };

    await collection.add({
      data: reviewRecord
    });

    console.log('Image review record saved:', {
      recordId: reviewRecord._id,
      status: record.result.status,
      imageSize: record.result.imageSize
    });

  } catch (error) {
    console.error('Failed to save image review record:', error);
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

    console.log('Image review notification triggered:', notificationData);

    // 发送webhook通知
    if (config.notification.channels.webhook.enabled) {
      await sendWebhookNotification(notificationData);
    }

  } catch (error) {
    console.error('Failed to send image review notification:', error);
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
      event: 'image_content_review',
      data: {
        type: data.type,
        status: data.status,
        businessType: data.businessType,
        userId: data.userId,
        postId: data.postId,
        timestamp: Date.now(),
        details: {
          labels: data.details.labels,
          faceInfo: data.details.faceInfo,
          ocrText: data.details.ocrText,
          confidence: data.details.confidence
        }
      }
    };

    // 使用云开发HTTP API发送webhook
    const result = await cloud.openapi.cloudbase.invokeFunction({
      env: cloud.DYNAMIC_CURRENT_ENV,
      name: 'send-webhook-notification',
      data: payload
    });

    console.log('Image review webhook notification sent:', result);

  } catch (error) {
    console.error('Failed to send image review webhook notification:', error);
  }
}

/**
 * 清理临时文件
 */
async function cleanupTempFile(tempPath) {
  try {
    // 云函数环境中通常不需要手动清理，内存会自动释放
    console.log('Cleanup temp file:', tempPath);
  } catch (error) {
    console.error('Failed to cleanup temp file:', error);
  }
}

/**
 * 错误处理
 */
function handleContentCheckError(error, event) {
  console.error('Image content check error details:', {
    error: error.message,
    stack: error.stack,
    event: JSON.stringify(event)
  });

  // 网络错误或API不可用时的处理
  if (error.code === 'NetworkError' ||
      error.code === 'ESOCKETTIMEDOUT' ||
      error.code === 'ETIMEDOUT' ||
      error.message.includes('download') ||
      error.message.includes('timeout')) {

    return {
      code: 503,
      message: '图片处理服务暂时不可用，请稍后重试',
      data: {
        status: config.reviewStatus.ERROR,
        suggestion: 'retry_later',
        labels: [],
        confidence: 0,
        requestId: 'network_error_' + Date.now()
      },
      error: error.message,
      retryable: true
    };
  }

  // 文件大小或格式错误
  if (error.message.includes('size') || error.message.includes('format')) {
    return {
      code: 400,
      message: error.message,
      data: {
        status: config.reviewStatus.BLOCK,
        suggestion: 'invalid_file',
        labels: [],
        confidence: 1.0,
        requestId: 'file_error_' + Date.now()
      },
      error: error.message,
      retryable: false
    };
  }

  // 其他错误
  return {
    code: 500,
    message: error.message || 'Internal server error',
    data: {
      status: config.reviewStatus.ERROR,
      suggestion: 'error',
      labels: [],
      confidence: 0,
      requestId: 'error_' + Date.now()
    },
    error: error.message,
    retryable: false
  };
}

/**
 * 获取请求统计（简化版）
 */
function getRequestStats() {
  // 这里应该从Redis或其他缓存系统获取真实的统计数据
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
    imageUrl: 'https://example.com/test-image.jpg', // 替换为实际的测试图片URL
    businessType: config.business.businessType.AVATAR,
    userId: 'test_user_001',
    postId: 'test_post_001',
    deviceId: 'test_device_001'
  };

  console.log('Running image content security test...');
  const result = await exports.main(testEvent, {});
  console.log('Test result:', result);
  return result;
}

// 导出测试函数
exports.test = testFunction;