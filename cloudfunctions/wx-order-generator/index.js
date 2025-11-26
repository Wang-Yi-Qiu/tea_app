/**
 * 微信支付订单号生成器
 * 实现唯一性和幂等性的订单号生成策略
 */

const cloud = require("wx-server-sdk");
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 订单号生成器类
 */
class OrderNumberGenerator {
  constructor() {
    this.sequenceCache = new Map(); // 内存缓存序列号
    this.cacheExpireTime = 5 * 60 * 1000; // 缓存5分钟
  }

  /**
   * 生成订单号
   * @param {string} openid - 用户openid
   * @param {string} channel - 渠道标识 (mini-program, h5, app)
   * @param {Object} orderData - 订单数据
   * @returns {string} 订单号
   */
  async generateOrderNumber(openid, channel = 'mini-program', orderData = {}) {
    try {
      const today = new Date();
      const datePrefix = this.getDatePrefix(today);
      const channelPrefix = this.getChannelPrefix(channel);

      // 1. 检查是否已有相同订单（幂等性检查）
      const existingOrderNumber = await this.checkExistingOrder(openid, orderData);
      if (existingOrderNumber) {
        console.log(`发现已有订单号: ${existingOrderNumber} for user: ${openid}`);
        return existingOrderNumber;
      }

      // 2. 获取今日序列号
      const sequence = await this.getTodaySequence(datePrefix);

      // 3. 生成用户哈希
      const userHash = this.generateUserHash(openid);

      // 4. 生成校验码
      const checkDigit = this.generateCheckDigit(datePrefix, channelPrefix, sequence, userHash);

      // 5. 组装订单号
      const orderNumber = `${datePrefix}${channelPrefix}${sequence}${userHash}${checkDigit}`;

      // 6. 记录订单号生成
      await this.recordOrderNumberGeneration(orderNumber, openid, channel, orderData);

      console.log(`生成订单号成功: ${orderNumber} for user: ${openid}, channel: ${channel}`);
      return orderNumber;

    } catch (error) {
      console.error('订单号生成失败:', error);
      // 备用生成策略
      return this.generateFallbackOrderNumber(openid, channel);
    }
  }

  /**
   * 检查是否已有相同订单（幂等性）
   * @param {string} openid - 用户openid
   * @param {Object} orderData - 订单数据
   *returns {string|null} 已存在的订单号
   */
  async checkExistingOrder(openid, orderData) {
    try {
      // 检查最近5分钟内的相同订单
      const recentTime = new Date(Date.now() - 5 * 60 * 1000);

      // 构建订单指纹用于比较
      const orderFingerprint = this.createOrderFingerprint(orderData);

      const recentOrders = await db.collection('orders')
        .where({
          openid: openid,
          total_amount: orderData.total_amount,
          status: 'pending',
          created_time: db.command.gte(recentTime)
        })
        .get();

      for (const order of recentOrders.data) {
        const existingFingerprint = this.createOrderFingerprint({
          order_items: order.order_items,
          total_amount: order.total_amount
        });

        if (orderFingerprint === existingFingerprint) {
          console.log(`发现重复订单: ${order.out_trade_no}`);
          return order.out_trade_no;
        }
      }

      return null;

    } catch (error) {
      console.error('检查现有订单失败:', error);
      return null;
    }
  }

  /**
   * 创建订单指纹
   * @param {Object} orderData - 订单数据
   * @returns {string} 订单指纹
   */
  createOrderFingerprint(orderData) {
    const normalizedItems = orderData.order_items
      .map(item => ({
        sku_id: item.sku_id,
        quantity: item.quantity,
        price: item.price
      }))
      .sort((a, b) => a.sku_id.localeCompare(b.sku_id));

    const fingerprintData = {
      items: normalizedItems,
      total_amount: orderData.total_amount
    };

    return crypto.createHash('md5')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');
  }

  /**
   * 获取日期前缀
   * 格式: YYYYMMDD
   * @param {Date} date - 日期对象
   * @returns {string} 日期前缀
   */
  getDatePrefix(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * 获取渠道前缀
   * @param {string} channel - 渠道标识
   * @returns {string} 渠道前缀
   */
  getChannelPrefix(channel) {
    const channelMap = {
      'mini-program': '02',
      'h5': '03',
      'app': '04',
      'admin': '09'
    };
    return channelMap[channel] || '01';
  }

  /**
   * 获取今日序列号
   * @param {string} datePrefix - 日期前缀
   * @returns {number} 序列号
   */
  async getTodaySequence(datePrefix) {
    // 检查内存缓存
    if (this.sequenceCache.has(datePrefix)) {
      const cacheEntry = this.sequenceCache.get(datePrefix);
      if (Date.now() - cacheEntry.timestamp < this.cacheExpireTime) {
        return cacheEntry.sequence + 1;
      }
    }

    try {
      // 从数据库获取当前序列号
      const result = await db.collection('order_sequences')
        .where({
          date_prefix: datePrefix
        })
        .orderBy('current_sequence', 'desc')
        .limit(1)
        .get();

      const currentSequence = result.data.length > 0
        ? result.data[0].current_sequence
        : 0;

      const newSequence = currentSequence + 1;

      // 原子性更新序列号
      const updateResult = await db.collection('order_sequences')
        .where({
          date_prefix: datePrefix,
          current_sequence: currentSequence
        })
        .update({
          data: {
            current_sequence: newSequence,
            updated_time: new Date()
          }
        });

      // 如果更新失败，说明序列号已被其他进程更新，需要重新获取
      if (updateResult.stats.updated === 0) {
        console.log(`序列号冲突，重新获取: ${datePrefix}`);
        return await this.retryGetSequence(datePrefix, 3);
      }

      // 更新缓存
      this.sequenceCache.set(datePrefix, {
        sequence: newSequence,
        timestamp: Date.now()
      });

      console.log(`获取序列号成功: ${datePrefix} -> ${newSequence}`);
      return newSequence;

    } catch (error) {
      console.error('获取序列号失败:', error);
      // 使用随机数作为备选方案
      return Math.floor(Math.random() * 9000) + 1000;
    }
  }

  /**
   * 重试获取序列号
   * @param {string} datePrefix - 日期前缀
   * @param {number} maxRetries - 最大重试次数
   * @returns {number} 序列号
   */
  async retryGetSequence(datePrefix, maxRetries) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 短暂延迟避免频繁冲突
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 50 * attempt));
        }

        const result = await db.collection('order_sequences')
          .where({
            date_prefix: datePrefix
          })
          .orderBy('current_sequence', 'desc')
          .limit(1)
          .get();

        const currentSequence = result.data.length > 0
          ? result.data[0].current_sequence
          : 0;

        const newSequence = currentSequence + 1;

        // 尝试插入新记录
        await db.collection('order_sequences').add({
          data: {
            date_prefix: datePrefix,
            current_sequence: newSequence,
            created_time: new Date(),
            updated_time: new Date()
          }
        });

        return newSequence;

      } catch (error) {
        if (attempt === maxRetries - 1) {
          // 最后一次重试失败，使用随机数
          return Math.floor(Math.random() * 9000) + 1000;
        }
      }
    }
  }

  /**
   * 生成用户哈希
   * 基于用户openid生成定长哈希
   * @param {string} openid - 用户openid
   * @returns {string} 用户哈希
   */
  generateUserHash(openid) {
    const hash = crypto.createHash('sha256')
      .update(openid)
      .digest('hex');

    return hash.substring(0, 6).toUpperCase();
  }

  /**
   * 生成校验码
   * 基于多个部分生成校验码
   * @param {...string} parts - 各个组成部分
   * @returns {string} 校验码
   */
  generateCheckDigit(...parts) {
    const combined = parts.join('');
    const hash = crypto.createHash('md5').update(combined).digest('hex');
    return hash.substring(0, 2).toUpperCase();
  }

  /**
   * 记录订单号生成
   * @param {string} orderNumber - 订单号
   * @param {string} openid - 用户openid
   * @param {string} channel - 渠道
   * @param {Object} orderData - 订单数据
   */
  async recordOrderNumberGeneration(orderNumber, openid, channel, orderData) {
    try {
      const generationRecord = {
        order_number: orderNumber,
        openid: openid,
        channel: channel,
        total_amount: orderData.total_amount,
        item_count: orderData.order_items ? orderData.order_items.length : 0,
        generation_time: new Date(),
        generation_method: 'standard'
      };

      await db.collection('order_number_generations').add({
        data: generationRecord
      });

    } catch (error) {
      console.error('记录订单号生成失败:', error);
      // 记录失败不影响主流程
    }
  }

  /**
   * 备用订单号生成
   * 当标准生成失败时使用
   * @param {string} openid - 用户openid
   * @param {string} channel - 渠道
   * @returns {string} 备用订单号
   */
  generateFallbackOrderNumber(openid, channel) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const userHash = this.generateUserHash(openid);
    const channelPrefix = this.getChannelPrefix(channel);

    return `FB${timestamp}${channelPrefix}${userHash}${random}`.toUpperCase();
  }

  /**
   * 验证订单号格式
   * @param {string} orderNumber - 订单号
   * @returns {boolean} 验证结果
   */
  validateOrderNumber(orderNumber) {
    // 标准格式: 8位日期 + 2位渠道 + 4位序列号 + 6位用户哈希 + 2位校验码 = 22位
    const standardPattern = /^\d{8}\d{2}\d{4}[A-F0-9]{6}[A-F0-9]{2}$/;

    // 备用格式: FB开头
    const fallbackPattern = /^FB[A-F0-9]+$/;

    return standardPattern.test(orderNumber) || fallbackPattern.test(orderNumber);
  }

  /**
   * 解析订单号信息
   * @param {string} orderNumber - 订单号
   * @returns {Object} 解析结果
   */
  parseOrderNumber(orderNumber) {
    if (orderNumber.startsWith('FB')) {
      return {
        type: 'fallback',
        order_number: orderNumber,
        generated_time: 'unknown',
        channel: 'unknown'
      };
    }

    if (orderNumber.length === 22) {
      const datePrefix = orderNumber.substring(0, 8);
      const channelPrefix = orderNumber.substring(8, 10);
      const sequence = orderNumber.substring(10, 14);
      const userHash = orderNumber.substring(14, 20);
      const checkDigit = orderNumber.substring(20, 22);

      return {
        type: 'standard',
        order_number: orderNumber,
        date_prefix: datePrefix,
        channel_prefix: channelPrefix,
        sequence: parseInt(sequence),
        user_hash: userHash,
        check_digit: checkDigit,
        generated_date: this.parseDatePrefix(datePrefix),
        channel_code: channelPrefix
      };
    }

    return {
      type: 'unknown',
      order_number: orderNumber
    };
  }

  /**
   * 解析日期前缀
   * @param {string} datePrefix - 日期前缀
   * @returns {Date} 日期对象
   */
  parseDatePrefix(datePrefix) {
    if (datePrefix.length !== 8) return null;

    const year = parseInt(datePrefix.substring(0, 4));
    const month = parseInt(datePrefix.substring(4, 6)) - 1;
    const day = parseInt(datePrefix.substring(6, 8));

    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * 批量生成订单号
   * @param {number} count - 生成数量
   * @param {string} openid - 用户openid
   * @param {string} channel - 渠道
   * @returns {Array<string>} 订单号列表
   */
  async generateOrderNumbers(count, openid, channel = 'mini-program') {
    const orderNumbers = [];
    const startTime = Date.now();

    try {
      for (let i = 0; i < count; i++) {
        const orderNumber = await this.generateOrderNumber(openid, channel);
        orderNumbers.push(orderNumber);

        // 批量生成时添加小延迟避免序列号冲突
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      const duration = Date.now() - startTime;
      console.log(`批量生成订单号完成: ${count}个, 耗时: ${duration}ms`);

      return orderNumbers;

    } catch (error) {
      console.error('批量生成订单号失败:', error);
      throw error;
    }
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of this.sequenceCache.entries()) {
      if (now - entry.timestamp > this.cacheExpireTime) {
        this.sequenceCache.delete(key);
      }
    }
  }
}

// 全局订单号生成器实例
const orderNumberGenerator = new OrderNumberGenerator();

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action, openid, channel, orderData, count } = event;

  try {
    switch (action) {
      case 'generate':
        return await generateOrderNumber(openid, channel, orderData);

      case 'batch_generate':
        return await batchGenerateOrderNumbers(count, openid, channel);

      case 'validate':
        return await validateOrderNumber(event.order_number);

      case 'parse':
        return await parseOrderNumber(event.order_number);

      case 'check_existing':
        return await checkExistingOrder(openid, orderData);

      default:
        throw new Error(`未知的操作: ${action}`);
    }

  } catch (error) {
    console.error('订单号生成器云函数执行失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 生成单个订单号
 */
async function generateOrderNumber(openid, channel, orderData) {
  const orderNumber = await orderNumberGenerator.generateOrderNumber(openid, channel, orderData);

  return {
    success: true,
    order_number: orderNumber,
    generated_time: new Date()
  };
}

/**
 * 批量生成订单号
 */
async function batchGenerateOrderNumbers(count, openid, channel) {
  const orderNumbers = await orderNumberGenerator.generateOrderNumbers(count, openid, channel);

  return {
    success: true,
    order_numbers: orderNumbers,
    count: orderNumbers.length,
    generated_time: new Date()
  };
}

/**
 * 验证订单号
 */
async function validateOrderNumber(orderNumber) {
  const isValid = orderNumberGenerator.validateOrderNumber(orderNumber);
  const parsedInfo = orderNumberGenerator.parseOrderNumber(orderNumber);

  return {
    success: true,
    is_valid: isValid,
    parsed_info: parsedInfo
  };
}

/**
 * 解析订单号
 */
async function parseOrderNumber(orderNumber) {
  const parsedInfo = orderNumberGenerator.parseOrderNumber(orderNumber);

  return {
    success: true,
    parsed_info: parsedInfo
  };
}

/**
 * 检查现有订单
 */
async function checkExistingOrder(openid, orderData) {
  const existingOrderNumber = await orderNumberGenerator.checkExistingOrder(openid, orderData);

  return {
    success: true,
    existing_order_number: existingOrderNumber,
    has_existing_order: !!existingOrderNumber
  };
}

// 导出生成器实例供其他模块使用
module.exports = {
  OrderNumberGenerator,
  orderNumberGenerator
};