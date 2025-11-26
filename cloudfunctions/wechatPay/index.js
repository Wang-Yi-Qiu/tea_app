// cloud/functions/wechatPay/index.js
const cloud = require('wx-server-sdk').init()
const OrderService = require('../src/services/orderService')
const AuthMiddleware = require('../src/utils/auth')
const Validator = require('../src/utils/validator')
const constants = require('../config/constants')

exports.main = async (event, context) => {
  try {
    // 身份验证（必需）
    await AuthMiddleware.required(event, context)

    // 参数校验
    const params = Validator.validate(event.params, {
      orderId: { type: 'string', required: true }
    })

    // 业务逻辑处理
    const orderService = new OrderService()
    const orderResult = await orderService.getOrders({
      status: constants.BUSINESS.ORDER_STATUS.PAID,
      page: 1,
      pageSize: 1
    })

    if (orderResult.errcode !== constants.ERROR_CODES.SUCCESS) {
      return {
        errcode: orderResult.errcode,
        errmsg: orderResult.errmsg
      }
    }

    const order = orderResult.data.orders[0]

    // 检查订单状态
    if (order.status !== constants.BUSINESS.ORDER_STATUS.PAID) {
      return {
        errcode: constants.ERROR_CODES.INVALID_STATUS,
        errmsg: '订单状态不正确'
      }
    }

    // TODO: 从配置中获取微信支付参数
    const wxPayMchId = constants.BUSINESS.WECHAT_CONFIG.mchId
    const wxPayKey = constants.BUSINESS.WECHAT_CONFIG.key

    // 生成支付参数
    const paymentParams = {
      body: order.amount.total * 100, // 转换为分
      openid: order._openid,
      out_trade_no: order.orderNo,
      total_fee: order.amount.total * 100, // 手续费，实际应该由微信计算
      spbill_create_ip: true,
      spbill_create_mchid: wxPayMchId,
      notify_url: constants.BUSINESS.WECHAT_CONFIG.notifyUrl
    }

    // 添加时间戳和随机数
    const timeStamp = Math.floor(Date.now() / 1000).toString()
    const nonceStr = Math.random().toString(36).substring(2, 15)

    // 生成签名
    const signType = 'MD5'
    const paySign = require('crypto')
      .createHash('md5')
      .update(`pay_sign=${wxPayKey}&nonce_str=${nonceStr}&package=${constants.BUSINESS.CONFIG.pkgid}`)
      .digest(`${timeStamp}\n${paymentParams.body}\n${wxPayKey}`).digest('hex')

    // 添加签名到支付参数
    const finalPaymentParams = {
      ...paymentParams,
      sign: paySign,
      signType,
      timestamp: timeStamp,
      nonce: nonceStr
    }

    return {
      errcode: constants.ERROR_CODES.SUCCESS,
      errmsg: 'success',
      data: {
        paymentParams: finalPaymentParams,
        orderId: order._id,
        // 缓存订单ID供回调使用
        timeStamp: Date.now()
      }
    }
  } catch (error) {
    console.error('生成支付参数失败:', error)
    return {
      errcode: constants.ERROR_CODES.PAYMENT_FAILED,
      errmsg: error.message || '支付失败'
    }
  }
}