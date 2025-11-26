/**
 * 微信支付智能重试机制云函数
 * 实现基于错误类型的智能重试策略
 */

const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 智能重试管理器
 */
class SmartRetryManager {
  constructor() {
    this.setupRetryStrategies();
  }

  /**
   * 设置重试策略
   */
  setupRetryStrategies() {
    this.retryStrategies = {
      // 微信支付API重试策略
      'wx_unifiedorder': {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        backoffFactor: 2,
        jitterFactor: 0.1,
        retryableErrors: ['SYSTEMERROR', 'APPID_NOT_EXIST', 'MCHID_NOT_EXIST', 'NETWORK_ERROR']
      },

      'wx_orderquery': {
        maxRetries: 5,
        baseDelayMs: 500,
        maxDelayMs: 8000,
        backoffFactor: 1.5,
        jitterFactor: 0.1,
        retryableErrors: ['SYSTEMERROR', 'NETWORK_ERROR', 'TIMEOUT']
      },

      // 数据库操作重试策略
      'database_update': {
        maxRetries: 2,
        baseDelayMs: 200,
        maxDelayMs: 2000,
        backoffFactor: 2,
        jitterFactor: 0.2,
        retryableErrors: ['CONFLICT', 'TIMEOUT', 'TEMPORARY_FAILURE']
      },

      'database_query': {
        maxRetries: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffFactor: 1.5,
        jitterFactor: 0.3,
        retryableErrors: ['TIMEOUT', 'CONNECTION_ERROR']
      },

      // 业务处理重试策略
      'inventory_operation': {
        maxRetries: 2,
        baseDelayMs: 300,
        maxDelayMs: 3000,
        backoffFactor: 1.8,
        jitterFactor: 0.15,
        retryableErrors: ['VERSION_MISMATCH', 'TEMPORARY_LOCK']
      },

      'notification_send': {
        maxRetries: 4,
        baseDelayMs: 1000,
        maxDelayMs: 15000,
        backoffFactor: 2.5,
        jitterFactor: 0.2,
        retryableErrors: ['NETWORK_ERROR', 'SERVICE_UNAVAILABLE', 'RATE_LIMITED']
      },

      // 默认策略
      'default': {
        maxRetries: 3,
        baseDelayMs: 500,
        maxDelayMs: 5000,
        backoffFactor: 1.5,
        jitterFactor: 0.1,
        retryableErrors: ['NETWORK_ERROR', 'SYSTEM_ERROR', 'TIMEOUT']
      }
    };
  }

  /**
   * 执行带重试的操作
   * @param {string} operationType - 操作类型
   * @param {Function} operation - 要执行的操作
   * @param {Object} context - 操作上下文
   * @returns {Object} 执行结果
   */
  async executeWithRetry(operationType, operation, context = {}) {
    const strategy = this.retryStrategies[operationType] || this.retryStrategies['default'];
    const executionId = this.generateExecutionId();

    let lastError = null;
    let totalDuration = 0;

    console.log(`开始执行操作 [${operationType}], executionId: ${executionId}`);

    for (let attempt = 1; attempt <= strategy.maxRetries + 1; attempt++) {
      const attemptStartTime = Date.now();

      try {
        console.log(`执行操作 [${operationType}] attempt ${attempt}/${strategy.maxRetries + 1}, executionId: ${executionId}`);

        // 执行操作
        const result = await operation();
        const attemptDuration = Date.now() - attemptStartTime;
        totalDuration += attemptDuration;

        // 记录成功执行
        await this.recordExecution(executionId, operationType, attempt, result, attemptDuration, null);

        console.log(`操作执行成功 [${operationType}] attempt ${attempt}, 耗时: ${attemptDuration}ms, 总耗时: ${totalDuration}ms`);

        return {
          success: true,
          data: result,
          executionId: executionId,
          attempt: attempt,
          totalDuration: totalDuration
        };

      } catch (error) {
        lastError = error;
        const attemptDuration = Date.now() - attemptStartTime;
        totalDuration += attemptDuration;

        // 记录失败执行
        await this.recordExecution(executionId, operationType, attempt, null, attemptDuration, error);

        console.error(`操作执行失败 [${operationType}] attempt ${attempt}: ${error.message}`);

        // 判断是否应该重试
        if (attempt > strategy.maxRetries || !this.shouldRetry(error, strategy, context)) {
          console.log(`停止重试 [${operationType}], 最终尝试: ${attempt}/${strategy.maxRetries + 1}`);
          break;
        }

        // 计算延迟时间
        const delayMs = this.calculateDelay(attempt - 1, strategy);
        console.log(`等待 ${delayMs}ms 后重试 [${operationType}]...`);

        await this.sleep(delayMs);
      }
    }

    // 所有重试都失败
    console.error(`操作最终失败 [${operationType}], executionId: ${executionId}, 总耗时: ${totalDuration}ms`, lastError);

    // 记录最终失败
    await this.recordExecutionFailure(executionId, operationType, lastError, totalDuration);

    throw lastError;
  }

  /**
   * 判断是否应该重试
   * @param {Error} error - 错误对象
   * @param {Object} strategy - 重试策略
   * @param {Object} context - 上下文
   * @returns {boolean} 是否应该重试
   */
  shouldRetry(error, strategy, context) {
    // 检查错误码是否在可重试列表中
    if (error.code && strategy.retryableErrors.includes(error.code)) {
      return true;
    }

    // 检查错误消息是否包含可重试的关键词
    const retryableKeywords = [
      'timeout',
      'network',
      'connection',
      'temporary',
      'overload',
      'rate limit',
      'service unavailable'
    ];

    const errorMessage = error.message.toLowerCase();
    for (const keyword of retryableKeywords) {
      if (errorMessage.includes(keyword)) {
        return true;
      }
    }

    // 基于错误类型判断
    if (error.name === 'NETWORK_ERROR' ||
        error.name === 'TIMEOUT' ||
        error.name === 'CONNECTION_ERROR') {
      return true;
    }

    // 特殊上下文判断
    if (context.importantOperation === true &&
        error.code && error.code.startsWith('TEMP_')) {
      return true;
    }

    return false;
  }

  /**
   * 计算重试延迟
   * @param {number} attempt - 尝试次数 (0-based)
   * @param {Object} strategy - 重试策略
   * @returns {number} 延迟时间(ms)
   */
  calculateDelay(attempt, strategy) {
    // 指数退避
    const exponentialDelay = strategy.baseDelayMs * Math.pow(strategy.backoffFactor, attempt);

    // 添加随机抖动
    const jitter = exponentialDelay * strategy.jitterFactor * (Math.random() * 2 - 1);

    // 确保不超过最大延迟
    const totalDelay = exponentialDelay + jitter;

    return Math.max(Math.min(totalDelay, strategy.maxDelayMs), 0);
  }

  /**
   * 记录执行结果
   * @param {string} executionId - 执行ID
   * @param {string} operationType - 操作类型
   * @param {number} attempt - 尝试次数
   * @param {Object} result - 执行结果
   * @param {number} duration - 执行耗时
   * @param {Error} error - 错误对象
   */
  async recordExecution(executionId, operationType, attempt, result, duration, error) {
    try {
      const executionLog = {
        execution_id: executionId,
        operation_type: operationType,
        attempt_number: attempt,
        timestamp: new Date(),
        success: error === null,
        duration_ms: duration,
        error_message: error ? error.message : null,
        error_code: error ? error.code : null,
        error_name: error ? error.name : null,
        result_summary: result ? this.summarizeResult(result) : null
      };

      await db.collection('retry_executions').add({
        data: executionLog
      });

    } catch (loggingError) {
      console.error('记录执行日志失败:', loggingError);
    }
  }

  /**
   * 记录最终失败
   * @param {string} executionId - 执行ID
   * @param {string} operationType - 操作类型
   * @param {Error} error - 错误对象
   * @param {number} totalDuration - 总耗时
   */
  async recordExecutionFailure(executionId, operationType, error, totalDuration) {
    try {
      const failureRecord = {
        execution_id: executionId,
        operation_type: operationType,
        final_error: {
          message: error.message,
          code: error.code,
          name: error.name,
          stack: error.stack
        },
        total_duration_ms: totalDuration,
        failure_time: new Date(),
        needs_manual_intervention: this.needsManualIntervention(error)
      };

      await db.collection('retry_failures').add({
        data: failureRecord
      });

      // 如果需要人工介入，发送通知
      if (failureRecord.needs_manual_intervention) {
        await this.notifyManualIntervention(failureRecord);
      }

    } catch (loggingError) {
      console.error('记录最终失败失败:', loggingError);
    }
  }

  /**
   * 概括执行结果
   * @param {Object} result - 执行结果
   * @returns {string} 结果摘要
   */
  summarizeResult(result) {
    try {
      if (typeof result === 'string') {
        return result.substring(0, 200);
      }

      if (typeof result === 'object') {
        const summary = {
          success: result.success,
          type: result.type || result.order_id ? 'order' : 'unknown',
          id: result.order_id || result.id || null
        };

        return JSON.stringify(summary);
      }

      return String(result).substring(0, 200);

    } catch (error) {
      return 'Result summarization failed';
    }
  }

  /**
   * 判断是否需要人工介入
   * @param {Error} error - 错误对象
   * @returns {boolean} 是否需要人工介入
   */
  needsManualIntervention(error) {
    // 严重错误需要人工介入
    const criticalErrorCodes = [
      'VALIDATION_ERROR',
      'PERMISSION_DENIED',
      'CONFIGURATION_ERROR',
      'PAYMENT_GATEWAY_ERROR',
      'DATABASE_CORRUPTION'
    ];

    // 超过一定重试次数
    const highRetries = 5;

    // 错误消息关键词
    const criticalKeywords = [
      'database corrupted',
      'permission denied',
      'configuration error',
      'payment gateway',
      'service permanently unavailable'
    ];

    return criticalErrorCodes.includes(error.code) ||
           criticalKeywords.some(keyword =>
             error.message.toLowerCase().includes(keyword)
           );
  }

  /**
   * 通知人工介入
   * @param {Object} failureRecord - 失败记录
   */
  async notifyManualIntervention(failureRecord) {
    try {
      const notification = {
        type: 'manual_intervention_required',
        execution_id: failureRecord.execution_id,
        operation_type: failureRecord.operation_type,
        error_message: failureRecord.final_error.message,
        error_code: failureRecord.final_error.code,
        failure_time: failureRecord.failure_time,
        urgency: this.determineUrgency(failureRecord)
      };

      // 发送到管理员通知系统
      await cloud.invokeFunction('send-admin-notification', {
        notification: notification,
        channels: ['email', 'wechat', 'sms']
      });

      console.log(`人工介入通知已发送: ${failureRecord.execution_id}`);

    } catch (error) {
      console.error('发送人工介入通知失败:', error);
    }
  }

  /**
   * 确定紧急程度
   * @param {Object} failureRecord - 失败记录
   * @returns {string} 紧急程度
   */
  determineUrgency(failureRecord) {
    const { operation_type, final_error } = failureRecord;

    // 支付相关操作为高优先级
    if (operation_type.includes('payment') || operation_type.includes('wx_')) {
      return 'high';
    }

    // 数据库相关为中等优先级
    if (operation_type.includes('database')) {
      return 'medium';
    }

    // 其他为一般优先级
    return 'low';
  }

  /**
   * 生成执行ID
   * @returns {string} 执行ID
   */
  generateExecutionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `EXEC_${timestamp}_${random}`;
  }

  /**
   * 睡眠函数
   * @param {number} ms - 睡眠时间(毫秒)
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取重试统计
   * @param {Object} filters - 过滤条件
   * @returns {Object} 重试统计
   */
  async getRetryStatistics(filters = {}) {
    try {
      const { operation_type, start_date, end_date } = filters;

      // 构建查询条件
      let query = {};
      if (operation_type) {
        query.operation_type = operation_type;
      }
      if (start_date || end_date) {
        query.timestamp = {};
        if (start_date) {
          query.timestamp.gte = start_date;
        }
        if (end_date) {
          query.timestamp.lte = end_date;
        }
      }

      // 获取执行记录
      const executions = await db.collection('retry_executions')
        .where(query)
        .get();

      // 统计分析
      const statistics = this.analyzeExecutions(executions.data);

      return {
        success: true,
        total_executions: executions.data.length,
        statistics: statistics,
        period: {
          start_date,
          end_date
        }
      };

    } catch (error) {
      console.error('获取重试统计失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 分析执行记录
   * @param {Array} executions - 执行记录数组
   * @returns {Object} 分析结果
   */
  analyzeExecutions(executions) {
    const stats = {
      total_executions: executions.length,
      successful_executions: 0,
      failed_executions: 0,
      operation_types: {},
      error_codes: {},
      average_attempts: 0,
      max_attempts: 0,
      average_duration: 0,
      retry_rate: 0
    };

    let totalAttempts = 0;
    let totalDuration = 0;

    executions.forEach(execution => {
      if (execution.success) {
        stats.successful_executions++;
      } else {
        stats.failed_executions++;
      }

      // 操作类型统计
      if (!stats.operation_types[execution.operation_type]) {
        stats.operation_types[execution.operation_type] = {
          total: 0,
          successful: 0,
          failed: 0
        };
      }
      stats.operation_types[execution.operation_type].total++;
      if (execution.success) {
        stats.operation_types[execution.operation_type].successful++;
      } else {
        stats.operation_types[execution.operation_type].failed++;
      }

      // 错误码统计
      if (execution.error_code) {
        if (!stats.error_codes[execution.error_code]) {
          stats.error_codes[execution.error_code] = 0;
        }
        stats.error_codes[execution.error_code]++;
      }

      totalAttempts += execution.attempt_number;
      totalDuration += execution.duration_ms;
      stats.max_attempts = Math.max(stats.max_attempts, execution.attempt_number);
    });

    stats.average_attempts = stats.total_executions > 0 ? totalAttempts / stats.total_executions : 0;
    stats.average_duration = stats.total_executions > 0 ? totalDuration / stats.total_executions : 0;
    stats.retry_rate = stats.total_executions > 0 ? (stats.total_executions - stats.successful_executions) / stats.total_executions : 0;

    return stats;
  }

  /**
   * 清理旧的执行记录
   * @param {number} daysToKeep - 保留天数
   */
  async cleanupOldRecords(daysToKeep = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      // 清理执行记录
      await db.collection('retry_executions')
        .where({
          timestamp: db.command.lt(cutoffDate)
        })
        .remove();

      // 清理失败记录
      await db.collection('retry_failures')
        .where({
          failure_time: db.command.lt(cutoffDate)
        })
        .remove();

      console.log(`清理旧记录完成，保留 ${daysToKeep} 天`);

      return { success: true, days_to_keep: daysToKeep };

    } catch (error) {
      console.error('清理旧记录失败:', error);
      return { success: false, error: error.message };
    }
  }
}

// 全局重试管理器实例
const smartRetryManager = new SmartRetryManager();

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action, operation_type, operation_data, context, filters } = event;

  try {
    switch (action) {
      case 'execute_with_retry':
        return await executeWithRetry(operation_type, operation_data, context);

      case 'get_statistics':
        return await getRetryStatistics(filters);

      case 'cleanup_records':
        return await cleanupRecords(context.days_to_keep);

      case 'get_strategies':
        return await getRetryStrategies();

      default:
        throw new Error(`未知的操作: ${action}`);
    }

  } catch (error) {
    console.error('重试管理器云函数执行失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 执行带重试的操作
 */
async function executeWithRetry(operation_type, operation_data, context) {
  // 根据操作类型构建实际的操作函数
  const operation = await buildOperation(operation_type, operation_data);

  const result = await smartRetryManager.executeWithRetry(
    operation_type,
    operation,
    context
  );

  return {
    success: true,
    execution_result: result
  };
}

/**
 * 构建操作函数
 */
async function buildOperation(operation_type, operation_data) {
  switch (operation_type) {
    case 'wx_unifiedorder':
      return () => cloud.openapi.pay.unifiedOrder(operation_data);

    case 'wx_orderquery':
      return () => cloud.openapi.pay.orderQuery(operation_data);

    case 'database_update':
      return () => db.collection(operation_data.collection).where(operation_data.where).update({
        data: operation_data.data
      });

    case 'database_query':
      return () => db.collection(operation_data.collection).where(operation_data.where).get();

    case 'inventory_operation':
      return () => performInventoryOperation(operation_data);

    case 'notification_send':
      return () => cloud.openapi.templateMessage.send(operation_data);

    default:
      throw new Error(`不支持的操作类型: ${operation_type}`);
  }
}

/**
 * 执行库存操作
 */
async function performInventoryOperation(operation_data) {
  const { sku_id, quantity, operation } = operation_data;

  if (operation === 'deduct') {
    return await db.collection('inventory')
      .where({
        sku_id: sku_id,
        available_quantity: db.command.gte(quantity)
      })
      .update({
        data: {
          available_quantity: db.command.inc(-quantity),
          updated_time: new Date()
        }
      });
  } else if (operation === 'add') {
    return await db.collection('inventory')
      .where({
        sku_id: sku_id
      })
      .update({
        data: {
          available_quantity: db.command.inc(quantity),
          updated_time: new Date()
        }
      });
  } else {
    throw new Error(`不支持的库存操作: ${operation}`);
  }
}

/**
 * 获取重试统计
 */
async function getRetryStatistics(filters) {
  return await smartRetryManager.getRetryStatistics(filters);
}

/**
 * 清理旧记录
 */
async function cleanupRecords(daysToKeep) {
  return await smartRetryManager.cleanupOldRecords(daysToKeep);
}

/**
 * 获取重试策略
 */
async function getRetryStrategies() {
  return {
    success: true,
    strategies: smartRetryManager.retryStrategies
  };
}

// 导出管理器实例供其他模块使用
module.exports = {
  SmartRetryManager,
  smartRetryManager
};