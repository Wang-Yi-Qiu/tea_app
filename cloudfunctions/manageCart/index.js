// cloud/functions/manageCart/index.js
const cloud = require('wx-server-sdk').init()
const CartService = require('../src/services/cartService')
const AuthMiddleware = require('../src/utils/auth')
const Validator = require('../src/utils/validator')

exports.main = async (event, context) => {
  try {
    // 身份验证（必需）
    await AuthMiddleware.required(event, context)

    // 参数校验
    const params = Validator.validate(event.params, {
      action: { type: 'string', required: true },
      skuId: { type: 'string', required: true },
      quantity: { type: 'number', required: true },
      reserve: { type: 'boolean', required: false, default: true },
      itemId: { type: 'string', required: false }
    })

    // 业务逻辑处理
    const cartService = new CartService()

    let result
    switch (event.params.action) {
      case 'add':
        result = await cartService.addItem(
          params.skuId,
          params.quantity,
          params.reserve
        )
        break
      case 'remove':
        result = await cartService.removeItem(params.itemId)
        break
      case 'update':
        result = await cartService.updateQuantity(
          params.itemId,
          params.quantity
        )
        break
      case 'list':
        result = await cartService.getCart()
        break
      case 'clear':
        result = await cartService.clearCart()
        break
      default:
        result = {
          errcode: -2,
          errmsg: '无效的操作'
        }
    }

    return result
  } catch (error) {
    console.error('购物车管理失败:', error)
    return {
      errcode: -1,
      errmsg: error.message || '系统错误',
      trace_id: context.request_id
    }
  }
}