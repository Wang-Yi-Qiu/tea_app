// cloud/functions/createOrder/index.js
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
      items: { type: 'array', required: true },
      shipping: {
        name: { type: 'string', required: true },
        phone: { type: 'string', required: true },
        province: { type: 'string', required: true },
        city: { type: 'string', required: true },
        district: { type: 'string', required: true },
        address: { type: 'string', required: true },
        postalCode: { type: 'string', required: true }
      },
      usePoints: { type: 'boolean', required: false, default: false },
      remark: { type: 'string', required: false }
    })

    // 业务逻辑处理
    const orderService = new OrderService()
    const result = await orderService.createOrder(params)

    return result
  } catch (error) {
    console.error('创建订单失败:', error)
    return {
      errcode: -1,
      errmsg: error.message || '系统错误',
      trace_id: context.request_id
    }
  }
}