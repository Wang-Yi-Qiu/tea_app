/**
 * 腾讯云内容安全API配置
 * 注意：所有密钥信息请存储在云函数环境变量中，不要硬编码在代码里
 */

const config = {
  // 腾讯云内容安全API配置
  tencentCloud: {
    // 从环境变量获取SecretId和SecretKey
    secretId: process.env.TENCENT_SECRET_ID || '',
    secretKey: process.env.TENCENT_SECRET_KEY || '',

    // 内容安全API域名 - 根据实际部署区域选择
    domain: process.env.TENCENT_CMS_DOMAIN || 'cms.tencentcloudapi.com',

    // API版本
    version: '2019-03-07',

    // 地域信息 - 根据实际部署区域选择
    region: process.env.TENCENT_REGION || 'ap-guangzhou',

    // API调用频率限制配置
    rateLimit: {
      // 每分钟最大调用次数
      maxRequestsPerMinute: 600,
      // 每小时最大调用次数
      maxRequestsPerHour: 10000,
      // 每天最大调用次数
      maxRequestsPerDay: 100000
    },

    // 重试配置
    retry: {
      // 最大重试次数
      maxRetries: 3,
      // 重试延迟（毫秒）
      retryDelay: 1000,
      // 退避策略倍数
      backoffMultiplier: 2
    },

    // 超时配置（毫秒）
    timeout: 15000,

    // 降级策略配置
    fallback: {
      // 是否启用降级
      enabled: true,
      // 降级时使用的关键词过滤
      keywordFilter: {
        enabled: true,
        sensitiveWords: [
          // 政治敏感词
          '政治', '领导人', '政府', '国家',
          // 暴力词
          '杀人', '暴力', '恐怖', '爆炸', '自杀',
          // 色情词
          '色情', '裸体', '性交', '黄片',
          // 赌博词
          '赌博', '博彩', '赌场', '老虎机',
          // 毒品词
          '毒品', '大麻', '海洛因', '摇头丸',
          // 其他敏感词
          '诈骗', '传销', '违法', '犯罪'
        ]
      }
    }
  },

  // 审核结果状态定义
  reviewStatus: {
    PASS: 'Pass',           // 通过
    REVIEW: 'Review',       // 人工复核
    BLOCK: 'Block',         // 拦绝
    PENDING: 'Pending',     // 待审
    ERROR: 'Error'          // 错误
  },

  // 审核标签定义
  reviewLabels: {
    // 正常内容
    NORMAL: 'Normal',
    // 涉政
    POLITICS: 'Pol',
    // 色情
    PORN: 'Porn',
    // 暴力
    VIOLENCE: 'Violence',
    // 赌博
    GAMBLE: 'Gamble',
    // 毒品
    DRUG: 'Drug',
    // 违法
    ILLEGAL: 'Illegal',
    // 其他
    OTHER: 'Other'
  },

  // 业务配置
  business: {
    // 内容类型
    contentType: {
      TEXT: 'Text',
      IMAGE: 'Image',
      AUDIO: 'Audio',
      VIDEO: 'Video'
    },

    // 业务场景
    businessType: {
      COMMUNITY: 'Community',    // 社区发帖
      COMMENT: 'Comment',         // 评论
      CHAT: 'Chat',               // 聊天
      PROFILE: 'Profile',         // 个人资料
      PRODUCT: 'Product',         // 商品信息
      AVATAR: 'Avatar'            // 头像
    },

    // 自动审核配置
    autoReview: {
      // 是否启用自动审核
      enabled: true,
      // 自动审核通过的置信度阈值
      passThreshold: 0.9,
      // 需要人工审核的置信度阈值
      reviewThreshold: 0.6
    }
  },

  // 日志配置
  logging: {
    // 日志级别
    level: process.env.LOG_LEVEL || 'INFO',
    // 是否记录详细请求信息
    logRequests: process.env.LOG_REQUESTS === 'true',
    // 是否记录响应详情
    logResponses: process.env.LOG_RESPONSES === 'true',
    // 日志收集API地址
    collectorEndpoint: process.env.LOG_COLLECTOR_ENDPOINT || ''
  },

  // 通知配置
  notification: {
    // 是否启用异常通知
    enabled: process.env.NOTIFICATION_ENABLED === 'true',
    // 通知方式
    channels: {
      email: {
        enabled: process.env.EMAIL_NOTIFICATION_ENABLED === 'true',
        recipients: process.env.EMAIL_RECIPIENTS?.split(',') || []
      },
      webhook: {
        enabled: process.env.WEBHOOK_NOTIFICATION_ENABLED === 'true',
        url: process.env.WEBHOOK_NOTIFICATION_URL || ''
      }
    }
  },

  // 数据库配置
  database: {
    // 审核记录表名
    reviewRecordsTable: 'content_review_records',
    // 敏感词库表名
    sensitiveWordsTable: 'sensitive_words',
    // 黑名单表名
    blacklistTable: 'user_blacklist'
  }
};

// 环境变量验证
function validateConfig() {
  const requiredVars = [
    'TENCENT_SECRET_ID',
    'TENCENT_SECRET_KEY'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// 获取当前请求统计
function getRequestStats() {
  return {
    requestsThisMinute: 0,
    requestsThisHour: 0,
    requestsThisDay: 0,
    lastResetTime: Date.now()
  };
}

// 检查请求是否超出频率限制
function checkRateLimit(stats) {
  const now = Date.now();
  const { rateLimit } = config.tencentCloud;

  // 检查分钟级限制
  if (stats.requestsThisMinute >= rateLimit.maxRequestsPerMinute) {
    return {
      allowed: false,
      error: 'Rate limit exceeded: maximum requests per minute reached',
      retryAfter: Math.ceil(60000 - (now - stats.lastResetTime))
    };
  }

  // 检查小时级限制
  if (stats.requestsThisHour >= rateLimit.maxRequestsPerHour) {
    return {
      allowed: false,
      error: 'Rate limit exceeded: maximum requests per hour reached',
      retryAfter: Math.ceil(3600000 - (now - stats.lastResetTime))
    };
  }

  // 检查日级限制
  if (stats.requestsThisDay >= rateLimit.maxRequestsPerDay) {
    return {
      allowed: false,
      error: 'Rate limit exceeded: maximum requests per day reached',
      retryAfter: Math.ceil(86400000 - (now - stats.lastResetTime))
    };
  }

  return { allowed: true };
}

module.exports = {
  config,
  validateConfig,
  getRequestStats,
  checkRateLimit
};