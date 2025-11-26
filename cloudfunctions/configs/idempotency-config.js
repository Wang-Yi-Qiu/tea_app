/**
 * 微信支付幂等性处理配置
 * 统一管理幂等性相关配置参数
 */

// 订单状态定义
const ORDER_STATUS = {
  PENDING: 'pending',           // 待支付
  PAID: 'paid',                // 已支付
  PROCESSING: 'processing',     // 处理中
  SHIPPED: 'shipped',           // 已发货
  COMPLETED: 'completed',       // 已完成
  CANCELLED: 'cancelled',       // 已取消
  REFUNDED: 'refunded'          // 已退款
};

// 支付状态定义
const PAYMENT_STATUS = {
  UNPAID: 'unpaid',           // 未支付
  PAID: 'paid',               // 已支付
  FAILED: 'failed',           // 支付失败
  REFUNDING: 'refunding',     // 退款中
  REFUNDED: 'refunded',       // 已退款
  CANCELLED: 'cancelled'      // 已取消
};

// 状态转换规则
const STATUS_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PAID]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.COMPLETED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.REFUNDED]: []
};

// 支付回调处理配置
const PAYMENT_CALLBACK_CONFIG = {
  // 签名验证
  SIGNATURE_VERIFICATION: {
    enabled: process.env.SIGNATURE_VERIFICATION_ENABLED === 'true',
    ignore_for_test: process.env.NODE_ENV === 'development'
  },

  // 幂等性检查配置
  IDEMPOTENCY_CHECK: {
    // 检查方法优先级
    methods: [
      'transaction_record',    // 交易记录表
      'order_status',          // 订单状态
      'distributed_lock'       // 分布式锁
    ],

    // 缓存配置
    cache: {
      enabled: true,
      ttl: 5 * 60,           // 5分钟
      key_prefix: 'idempotency:'
    },

    // 分布式锁配置
    distributed_lock: {
      enabled: true,
      ttl: 5 * 60,           // 5分钟过期
      key_prefix: 'callback_lock:',
      max_retry: 3
    }
  },

  // 重试配置
  RETRY_CONFIG: {
    max_attempts: 3,
    base_delay: 1000,        // 1秒
    max_delay: 30000,        // 30秒
    backoff_factor: 2,
    jitter_enabled: true,
    jitter_factor: 0.1
  },

  // 错误处理配置
  ERROR_HANDLING: {
    // 记录错误
    log_errors: true,
    log_level: 'error',

    // 人工介入条件
    manual_intervention: {
      critical_error_codes: [
        'VALIDATION_ERROR',
        'PERMISSION_DENIED',
        'CONFIGURATION_ERROR',
        'DATABASE_CORRUPTION'
      ],

      consecutive_failures: 5,
      error_rate_threshold: 0.1    // 10%
    },

    // 通知配置
    notification: {
      enabled: true,
      channels: ['email', 'wechat'],
      urgent_channels: ['email', 'wechat', 'sms']
    }
  }
};

// 订单号生成配置
const ORDER_NUMBER_CONFIG = {
  // 生成策略
  generation: {
    default_strategy: 'standard',
    fallback_enabled: true,

    // 标准生成配置
    standard: {
      date_prefix_format: 'YYYYMMDD',
      channel_prefix_length: 2,
      sequence_length: 4,
      user_hash_length: 6,
      check_digit_length: 2,
      total_length: 22
    },

    // 备用生成配置
    fallback: {
      prefix: 'FB',
      timestamp_length: 13,
      random_length: 8,
      user_hash_length: 6
    }
  },

  // 渠道映射
  channel_mapping: {
    'mini-program': '02',
    'h5': '03',
    'app': '04',
    'admin': '09',
    'default': '01'
  },

  // 序列号管理
  sequence_management: {
    // 缓存配置
    cache: {
      enabled: true,
      ttl: 5 * 60,        // 5分钟
      max_size: 1000
    },

    // 数据库配置
    database: {
      table: 'order_sequences',
      batch_size: 100,
      retry_on_conflict: true,
      max_retry: 3
    }
  },

  // 幂等性检查配置
  duplicate_check: {
    // 时间窗口（分钟）
    time_window: 5,

    // 检查字段
    check_fields: [
      'openid',
      'total_amount',
      'order_items',
      'status'
    ],

    // 指纹算法
    fingerprint_algorithm: 'md5'
  }
};

// 重试机制配置
const RETRY_STRATEGY_CONFIG = {
  // 默认策略
  default: {
    max_retries: 3,
    base_delay: 500,         // 500ms
    max_delay: 5000,         // 5秒
    backoff_factor: 1.5,
    jitter_factor: 0.1,
    enabled: true
  },

  // 微信支付API策略
  wx_payment_apis: {
    unifiedorder: {
      max_retries: 3,
      base_delay: 1000,      // 1秒
      max_delay: 10000,      // 10秒
      backoff_factor: 2,
      jitter_factor: 0.1,
      retryable_errors: [
        'SYSTEMERROR',
        'APPID_NOT_EXIST',
        'MCHID_NOT_EXIST',
        'NETWORK_ERROR'
      ]
    },

    orderquery: {
      max_retries: 5,
      base_delay: 500,       // 500ms
      max_delay: 8000,       // 8秒
      backoff_factor: 1.5,
      jitter_factor: 0.1,
      retryable_errors: [
        'SYSTEMERROR',
        'NETWORK_ERROR',
        'TIMEOUT'
      ]
    }
  },

  // 数据库操作策略
  database_operations: {
    update: {
      max_retries: 2,
      base_delay: 200,       // 200ms
      max_delay: 2000,       // 2秒
      backoff_factor: 2,
      jitter_factor: 0.2,
      retryable_errors: [
        'CONFLICT',
        'TIMEOUT',
        'TEMPORARY_FAILURE'
      ]
    },

    query: {
      max_retries: 3,
      base_delay: 100,       // 100ms
      max_delay: 1000,       // 1秒
      backoff_factor: 1.5,
      jitter_factor: 0.3,
      retryable_errors: [
        'TIMEOUT',
        'CONNECTION_ERROR'
      ]
    }
  },

  // 业务操作策略
  business_operations: {
    inventory: {
      max_retries: 2,
      base_delay: 300,       // 300ms
      max_delay: 3000,       // 3秒
      backoff_factor: 1.8,
      jitter_factor: 0.15,
      retryable_errors: [
        'VERSION_MISMATCH',
        'TEMPORARY_LOCK'
      ]
    },

    notification: {
      max_retries: 4,
      base_delay: 1000,      // 1秒
      max_delay: 15000,      // 15秒
      backoff_factor: 2.5,
      jitter_factor: 0.2,
      retryable_errors: [
        'NETWORK_ERROR',
        'SERVICE_UNAVAILABLE',
        'RATE_LIMITED'
      ]
    }
  }
};

// 库存管理配置
const INVENTORY_CONFIG = {
  // 扣减策略
  deduction: {
    strategy: 'optimistic',     // optimistic/pessimistic
    reservation_enabled: true,
    reservation_ttl: 30 * 60,  // 30分钟

    // 原子性操作配置
    atomicity: {
      enabled: true,
      isolation_level: 'serializable',
      timeout: 5000           // 5秒
    }
  },

  // 冲突处理
  conflict_handling: {
    detection_methods: [
      'version_check',
      'conditional_update',
      'distributed_lock'
    ],

    resolution_strategies: [
      'retry_with_backoff',
      'manual_intervention',
      'graceful_degradation'
    ]
  },

  // 监控配置
  monitoring: {
    // 告警阈值
    alert_thresholds: {
      low_inventory: 10,         // 库存低于10
      high_conflict_rate: 0.05, // 冲突率5%
      reserved_inventory: 100     // 预留库存100
    },

    // 监控指标
    metrics: [
      'deduction_success_rate',
      'deduction_latency',
      'conflict_rate',
      'inventory_accuracy'
    ]
  }
};

// 性能监控配置
const PERFORMANCE_CONFIG = {
  // 性能指标
  metrics: {
    response_time: {
      warning_threshold: 500,    // 500ms
      error_threshold: 2000       // 2秒
    },

    throughput: {
      warning_threshold: 100,    // 100请求/秒
      error_threshold: 50        // 50请求/秒
    },

    error_rate: {
      warning_threshold: 0.01,  // 1%
      error_threshold: 0.05      // 5%
    },

    idempotency: {
      duplicate_rate_threshold: 0.02,  // 2%重复率
      processing_efficiency_threshold: 0.95 // 95%处理效率
    }
  },

  // 监控工具
  monitoring_tools: [
    'cloud_monitoring',
    'custom_metrics',
    'log_analysis'
  ],

  // 报告配置
  reporting: {
    real_time: true,
    daily_summary: true,
    weekly_report: true,

    // 报告内容
    report_content: [
      'performance_metrics',
      'error_analysis',
      'idempotency_effectiveness',
      'recommendations'
    ]
  }
};

// 安全配置
const SECURITY_CONFIG = {
  // 数据加密
  encryption: {
    enabled: true,
    algorithm: 'AES-256-GCM',
    key_rotation_days: 90,

    // 加密字段
    encrypted_fields: [
      'openid',
      'payment_info',
      'transaction_id'
    ]
  },

  // 访问控制
  access_control: {
    enabled: true,
    ip_whitelist: process.env.IP_WHITELIST?.split(',') || [],
    rate_limiting: {
      enabled: true,
      requests_per_minute: 60,
      burst_size: 10
    }
  },

  // 审计日志
  audit_logging: {
    enabled: true,
    log_level: 'info',

    // 审计事件
    audit_events: [
      'payment_callback_received',
      'order_status_updated',
      'inventory_modified',
      'error_occurred',
      'manual_intervention'
    ],

    // 保留期
    retention_days: 90
  }
};

// 配置验证函数
function validateConfig() {
  const errors = [];

  // 验证状态转换规则
  for (const [fromStatus, toStatuses] of Object.entries(STATUS_TRANSITIONS)) {
    if (!Object.values(ORDER_STATUS).includes(fromStatus)) {
      errors.push(`无效的起始状态: ${fromStatus}`);
    }

    for (const toStatus of toStatuses) {
      if (!Object.values(ORDER_STATUS).includes(toStatus)) {
        errors.push(`无效的目标状态: ${toStatus}`);
      }
    }
  }

  // 验证订单号长度
  const standardLength = ORDER_NUMBER_CONFIG.generation.standard.date_prefix_format.length +
                        ORDER_NUMBER_CONFIG.generation.standard.channel_prefix_length +
                        ORDER_NUMBER_CONFIG.generation.standard.sequence_length +
                        ORDER_NUMBER_CONFIG.generation.standard.user_hash_length +
                        ORDER_NUMBER_CONFIG.generation.standard.check_digit_length;

  if (standardLength !== ORDER_NUMBER_CONFIG.generation.standard.total_length) {
    errors.push('订单号长度配置不一致');
  }

  // 验证重试配置
  for (const [category, strategies] of Object.entries(RETRY_STRATEGY_CONFIG)) {
    if (typeof strategies === 'object' && !strategies.enabled) {
      continue;
    }

    if (category !== 'default' && typeof strategies === 'object') {
      for (const [operation, config] of Object.entries(strategies)) {
        if (config.max_retries < 0 || config.max_retries > 10) {
          errors.push(`重试次数配置异常: ${category}.${operation}`);
        }

        if (config.base_delay > config.max_delay) {
          errors.push(`延迟时间配置异常: ${category}.${operation}`);
        }
      }
    }
  }

  return errors;
}

// 环境特定配置
function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';

  const envConfigs = {
    development: {
      signature_verification: {
        ignore_for_test: true
      },
      retry_strategies: {
        default: {
          max_retries: 1,
          base_delay: 100
        }
      },
      monitoring: {
        real_time: false
      }
    },

    staging: {
      signature_verification: {
        ignore_for_test: false
      },
      retry_strategies: {
        default: {
          max_retries: 2
        }
      }
    },

    production: {
      signature_verification: {
        ignore_for_test: false
      },
      security: {
        encryption: {
          enabled: true
        },
        access_control: {
          enabled: true,
          rate_limiting: {
            requests_per_minute: 120
          }
        }
      }
    }
  };

  return envConfigs[env] || envConfigs.development;
}

// 配置合并函数
function getMergedConfig() {
  const envConfig = getEnvironmentConfig();

  return {
    ORDER_STATUS,
    PAYMENT_STATUS,
    STATUS_TRANSITIONS,
    PAYMENT_CALLBACK_CONFIG: {
      ...PAYMENT_CALLBACK_CONFIG,
      ...envConfig.signature_verification
    },
    ORDER_NUMBER_CONFIG,
    RETRY_STRATEGY_CONFIG: {
      ...RETRY_STRATEGY_CONFIG,
      ...envConfig.retry_strategies
    },
    INVENTORY_CONFIG,
    PERFORMANCE_CONFIG: {
      ...PERFORMANCE_CONFIG,
      ...envConfig.monitoring
    },
    SECURITY_CONFIG: {
      ...SECURITY_CONFIG,
      ...envConfig.security
    }
  };
}

// 配置导出
module.exports = {
  // 基础配置
  ORDER_STATUS,
  PAYMENT_STATUS,
  STATUS_TRANSITIONS,

  // 详细配置
  PAYMENT_CALLBACK_CONFIG,
  ORDER_NUMBER_CONFIG,
  RETRY_STRATEGY_CONFIG,
  INVENTORY_CONFIG,
  PERFORMANCE_CONFIG,
  SECURITY_CONFIG,

  // 工具函数
  validateConfig,
  getEnvironmentConfig,
  getMergedConfig,

  // 获取合并后的配置
  config: getMergedConfig()
};