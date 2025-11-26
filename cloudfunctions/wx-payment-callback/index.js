/**
 * 微信支付回调处理云函数
 * 实现完整的幂等性处理机制
 */

const cloud = require("wx-server-sdk");
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

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

/**
 * 云函数入口
 * 处理微信支付回调通知
 */
exports.main = async (event, context) => {
  console.log('微信支付回调接收:', event);

  try {
    // 1. 验证请求来源和签名
    if (!verifyCallbackRequest(event)) {
      console.warn('回调请求验证失败');
      return { code: 'FAIL', message: '请求验证失败' };
    }

    // 2. 解析支付通知数据
    const paymentData = parsePaymentNotification(event);
    console.log('解析支付数据:', paymentData);

    // 3. 幂等性检查 - 核心幂等性逻辑
    const idempotencyCheck = await checkCallbackIdempotency(paymentData);
    if (idempotencyCheck.isProcessed) {
      console.log(`支付回调已处理: ${paymentData.out_trade_no}`);
      return { code: 'SUCCESS', message: '回调处理成功' };
    }

    // 4. 获取处理锁
    const processingLock = await acquireProcessingLock(paymentData.out_trade_no, paymentData.transaction_id);
    if (!processingLock.success) {
      console.log(`回调正在处理中: ${paymentData.out_trade_no}`);
      return { code: 'SUCCESS', message: '回调正在处理中' };
    }

    try {
      // 5. 处理支付结果
      const processResult = await processPaymentResult(paymentData);

      if (processResult.success) {
        // 6. 记录幂等性处理成功
        await recordCallbackProcessing(paymentData, processResult);

        // 7. 释放处理锁
        await releaseProcessingLock(processingLock.lockKey);

        console.log(`支付回调处理完成: ${paymentData.out_trade_no}`);
        return { code: 'SUCCESS', message: '支付回调处理成功' };
      } else {
        throw new Error(processResult.reason);
      }

    } catch (error) {
      // 8. 错误处理和锁清理
      await releaseProcessingLock(processingLock.lockKey);
      throw error;
    }

  } catch (error) {
    console.error('支付回调处理失败:', error);
    await recordCallbackError(event, error);

    // 失败时返回FAIL，让微信支付重试
    return { code: 'FAIL', message: '处理失败，请重试' };
  }
};

/**
 * 验证回调请求
 * @param {Object} event - 回调事件数据
 * @returns {boolean} 验证结果
 */
function verifyCallbackRequest(event) {
  try {
    // 检查必要字段
    const requiredFields = ['appid', 'mch_id', 'out_trade_no', 'transaction_id', 'result_code', 'time_end'];
    for (const field of requiredFields) {
      if (!event[field]) {
        console.error(`缺少必要字段: ${field}`);
        return false;
      }
    }

    // TODO: 实际项目中需要验证签名
    // const signature = event.sign;
    // const calculatedSignature = calculateSignature(event);
    // return signature === calculatedSignature;

    return true;
  } catch (error) {
    console.error('验证回调请求失败:', error);
    return false;
  }
}

/**
 * 解析支付通知数据
 * @param {Object} event - 原始回调数据
 * @returns {Object} 解析后的支付数据
 */
function parsePaymentNotification(event) {
  return {
    appid: event.appid,
    mch_id: event.mch_id,
    out_trade_no: event.out_trade_no,
    transaction_id: event.transaction_id,
    result_code: event.result_code,
    err_code: event.err_code || '',
    err_code_des: event.err_code_des || '',
    total_fee: parseInt(event.total_fee) || 0,
    cash_fee: parseInt(event.cash_fee) || 0,
    time_end: event.time_end,
    openid: event.openid,
    is_subscribe: event.is_subscribe || 'N',
    trade_type: event.trade_type || '',
    bank_type: event.bank_type || '',
    attach: event.attach || '',
    fee_type: event.fee_type || 'CNY'
  };
}

/**
 * 检查回调幂等性
 * @param {Object} paymentData - 支付数据
 * @returns {Object} 幂等性检查结果
 */
async function checkCallbackIdempotency(paymentData) {
  try {
    // 方法1: 查询支付交易记录
    const existingTransaction = await db.collection('payment_transactions')
      .where({
        out_trade_no: paymentData.out_trade_no,
        transaction_id: paymentData.transaction_id
      })
      .get();

    if (existingTransaction.data.length > 0) {
      return {
        isProcessed: true,
        existingRecord: existingTransaction.data[0],
        reason: 'transaction_already_exists'
      };
    }

    // 方法2: 查询订单状态
    const orderRecord = await db.collection('orders')
      .where({
        out_trade_no: paymentData.out_trade_no
      })
      .get();

    if (orderRecord.data.length === 0) {
      console.warn(`订单不存在: ${paymentData.out_trade_no}`);
      return { isProcessed: false, reason: 'order_not_found' };
    }

    const order = orderRecord.data[0];

    // 检查是否已经是最终状态
    if (order.payment_status === 'paid' && paymentData.result_code === 'SUCCESS') {
      console.log(`订单已支付: ${paymentData.out_trade_no}`);
      return {
        isProcessed: true,
        existingRecord: order,
        reason: 'order_already_paid'
      };
    }

    return { isProcessed: false, reason: 'ready_to_process' };

  } catch (error) {
    console.error('幂等性检查失败:', error);
    // 检查失败时允许处理，让业务逻辑二次验证
    return { isProcessed: false, reason: 'idempotency_check_failed' };
  }
}

/**
 * 获取处理锁
 * @param {string} outTradeNo - 商户订单号
 * @param {string} transactionId - 微信支付订单号
 * @returns {Object} 锁获取结果
 */
async function acquireProcessingLock(outTradeNo, transactionId) {
  try {
    const lockKey = `payment_callback_${outTradeNo}_${transactionId}`;
    const lockValue = generateUniqueId();
    const expiresTime = new Date(Date.now() + 5 * 60 * 1000); // 5分钟过期

    const lockData = {
      lock_key: lockKey,
      lock_value: lockValue,
      out_trade_no: outTradeNo,
      transaction_id: transactionId,
      created_time: new Date(),
      expires_time: expiresTime,
      status: 'active'
    };

    // 原子性插入锁记录
    await db.collection('callback_processing_locks').add({
      data: lockData
    });

    console.log(`获取处理锁成功: ${lockKey}`);
    return {
      success: true,
      lockKey: lockKey,
      lockValue: lockValue
    };

  } catch (error) {
    console.error('获取处理锁失败:', error);
    return { success: false, reason: 'lock_acquisition_failed' };
  }
}

/**
 * 释放处理锁
 * @param {string} lockKey - 锁key
 * @returns {boolean} 释放结果
 */
async function releaseProcessingLock(lockKey) {
  try {
    await db.collection('callback_processing_locks')
      .where({
        lock_key: lockKey,
        status: 'active'
      })
      .remove();

    console.log(`释放处理锁成功: ${lockKey}`);
    return true;

  } catch (error) {
    console.error('释放处理锁失败:', error);
    return false;
  }
}

/**
 * 处理支付结果
 * @param {Object} paymentData - 支付数据
 * @returns {Object} 处理结果
 */
async function processPaymentResult(paymentData) {
  try {
    if (paymentData.result_code !== 'SUCCESS') {
      // 支付失败处理
      return await handlePaymentFailure(paymentData);
    }

    // 支付成功处理
    return await handlePaymentSuccess(paymentData);

  } catch (error) {
    console.error('处理支付结果失败:', error);
    return {
      success: false,
      reason: error.message
    };
  }
}

/**
 * 处理支付成功
 * @param {Object} paymentData - 支付数据
 * @returns {Object} 处理结果
 */
async function handlePaymentSuccess(paymentData) {
  try {
    // 1. 查询订单信息
    const orderResult = await db.collection('orders')
      .where({
        out_trade_no: paymentData.out_trade_no
      })
      .get();

    if (orderResult.data.length === 0) {
      throw new Error(`订单不存在: ${paymentData.out_trade_no}`);
    }

    const order = orderResult.data[0];

    // 2. 检查订单状态
    if (order.payment_status === 'paid') {
      console.log(`订单已支付: ${paymentData.out_trade_no}`);
      return {
        success: true,
        reason: 'order_already_paid',
        orderId: order._id
      };
    }

    // 3. 原子性更新订单状态
    const updateResult = await db.collection('orders')
      .where({
        _id: order._id,
        payment_status: 'unpaid'  // 条件更新，防止并发修改
      })
      .update({
        data: {
          status: ORDER_STATUS.PAID,
          payment_status: 'paid',
          paid_time: new Date(),
          payment_info: {
            transaction_id: paymentData.transaction_id,
            total_fee: paymentData.total_fee,
            cash_fee: paymentData.cash_fee,
            time_end: paymentData.time_end,
            bank_type: paymentData.bank_type
          },
          updated_time: new Date()
        }
      });

    if (updateResult.stats.updated === 0) {
      throw new Error('订单状态更新失败，可能存在并发修改');
    }

    // 4. 记录支付交易
    await recordPaymentTransaction(paymentData, order);

    // 5. 扣发后续业务流程
    await triggerPostPaymentProcesses(order, paymentData);

    console.log(`支付成功处理完成: ${paymentData.out_trade_no}`);
    return {
      success: true,
      reason: 'payment_success_processed',
      orderId: order._id,
      orderStatus: ORDER_STATUS.PAID
    };

  } catch (error) {
    console.error('处理支付成功失败:', error);
    return {
      success: false,
      reason: error.message
    };
  }
}

/**
 * 处理支付失败
 * @param {Object} paymentData - 支付数据
 * @returns {Object} 处理结果
 */
async function handlePaymentFailure(paymentData) {
  try {
    // 1. 查询订单信息
    const orderResult = await db.collection('orders')
      .where({
        out_trade_no: paymentData.out_trade_no
      })
      .get();

    if (orderResult.data.length === 0) {
      throw new Error(`订单不存在: ${paymentData.out_trade_no}`);
    }

    const order = orderResult.data[0];

    // 2. 更新订单为支付失败状态
    await db.collection('orders')
      .where({
        _id: order._id
      })
      .update({
        data: {
          status: ORDER_STATUS.CANCELLED,
          payment_status: 'failed',
          payment_error: {
            err_code: paymentData.err_code,
            err_code_des: paymentData.err_code_des,
            transaction_id: paymentData.transaction_id
          },
          updated_time: new Date()
        }
      });

    // 3. 释放预扣库存
    await releaseReservedInventory(order);

    // 4. 记录支付交易
    await recordPaymentTransaction(paymentData, order);

    console.log(`支付失败处理完成: ${paymentData.out_trade_no}, 错误: ${paymentData.err_code}`);
    return {
      success: true,
      reason: 'payment_failure_processed',
      orderId: order._id,
      orderStatus: ORDER_STATUS.CANCELLED
    };

  } catch (error) {
    console.error('处理支付失败失败:', error);
    return {
      success: false,
      reason: error.message
    };
  }
}

/**
 * 记录支付交易
 * @param {Object} paymentData - 支付数据
 * @param {Object} order - 订单信息
 */
async function recordPaymentTransaction(paymentData, order) {
  try {
    const transactionRecord = {
      out_trade_no: paymentData.out_trade_no,
      transaction_id: paymentData.transaction_id,
      order_id: order._id,
      openid: order.openid,
      total_amount: paymentData.total_fee,
      cash_amount: paymentData.cash_fee,
      result_code: paymentData.result_code,
      err_code: paymentData.err_code,
      err_code_des: paymentData.err_code_des,
      time_end: paymentData.time_end,
      bank_type: paymentData.bank_type,
      trade_type: paymentData.trade_type,
      attach: paymentData.attach,
      created_time: new Date(),
      status: 'processed'
    };

    await db.collection('payment_transactions').add({
      data: transactionRecord
    });

  } catch (error) {
    console.error('记录支付交易失败:', error);
    // 交易记录失败不影响主流程
  }
}

/**
 * 释放预扣库存
 * @param {Object} order - 订单信息
 */
async function releaseReservedInventory(order) {
  try {
    for (const item of order.order_items) {
      await db.collection('inventory')
        .where({
          sku_id: item.sku_id,
          last_order_id: order._id
        })
        .update({
          data: {
            reserved_quantity: db.command.inc(-item.quantity),
            available_quantity: db.command.inc(item.quantity),
            updated_time: new Date(),
            last_order_id: null
          }
        });
    }

    console.log(`释放预扣库存成功: ${order._id}`);

  } catch (error) {
    console.error('释放预扣库存失败:', error);
    // 库存释放失败需要人工介入
  }
}

/**
 * 触发支付后业务流程
 * @param {Object} order - 订单信息
 * @param {Object} paymentData - 支付数据
 */
async function triggerPostPaymentProcesses(order, paymentData) {
  try {
    // 1. 发送支付成功通知
    await cloud.invokeFunction('send-payment-notification', {
      order_id: order._id,
      openid: order.openid,
      total_amount: paymentData.total_fee,
      payment_time: paymentData.time_end
    });

    // 2. 更新用户积分
    const pointsEarned = Math.floor(paymentData.total_fee / 100); // 1元=1积分
    await cloud.invokeFunction('update-user-points', {
      openid: order.openid,
      points_earned: pointsEarned,
      order_id: order._id,
      reason: 'purchase'
    });

    // 3. 更新商品销量统计
    await cloud.invokeFunction('update-product-sales', {
      order_items: order.order_items,
      order_id: order._id
    });

    // 4. 如果是虚拟商品，自动发货
    const hasVirtualProducts = order.order_items.some(item => item.is_virtual);
    if (hasVirtualProducts) {
      await cloud.invokeFunction('process-virtual-delivery', {
        order_id: order._id,
        order_items: order.order_items
      });
    }

    console.log(`支付后业务流程触发成功: ${order._id}`);

  } catch (error) {
    console.error('触发支付后业务流程失败:', error);
    // 业务流程失败不影响主支付流程
  }
}

/**
 * 记录回调处理
 * @param {Object} paymentData - 支付数据
 * @param {Object} processResult - 处理结果
 */
async function recordCallbackProcessing(paymentData, processResult) {
  try {
    const callbackRecord = {
      out_trade_no: paymentData.out_trade_no,
      transaction_id: paymentData.transaction_id,
      result_code: paymentData.result_code,
      process_result: processResult.reason,
      order_id: processResult.orderId,
      order_status: processResult.orderStatus,
      received_time: new Date(),
      process_time: new Date()
    };

    await db.collection('payment_callback_logs').add({
      data: callbackRecord
    });

  } catch (error) {
    console.error('记录回调处理失败:', error);
  }
}

/**
 * 记录回调错误
 * @param {Object} event - 回调事件
 * @param {Error} error - 错误对象
 */
async function recordCallbackError(event, error) {
  try {
    const errorRecord = {
      error_id: generateErrorId(),
      error_message: error.message,
      error_stack: error.stack,
      callback_data: JSON.stringify(event),
      timestamp: new Date(),
      severity: 'high'
    };

    await db.collection('payment_callback_errors').add({
      data: errorRecord
    });

  } catch (loggingError) {
    console.error('记录回调错误失败:', loggingError);
  }
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
function generateUniqueId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 生成错误ID
 * @returns {string} 错误ID
 */
function generateErrorId() {
  return `ERR_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * 计算签名 - 实际项目中需要实现
 * @param {Object} params - 参数对象
 * @returns {string} 签名
 */
function calculateSignature(params) {
  // TODO: 实现微信支付签名算法
  // 1. 参数排序
  // 2. 字符串拼接
  // 3. MD5或HMAC-SHA256加密
  return '';
}