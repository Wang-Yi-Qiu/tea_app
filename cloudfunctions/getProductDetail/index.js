// cloud/functions/getProductDetail/index.js
const cloud = require('wx-server-sdk').init()
const ProductService = require('../src/services/productService')
const AuthMiddleware = require('../src/utils/auth')
const Validator = require('../src/utils/validator')

exports.main = async (event, context) => {
  try {
    // 身份验证（可选）
    await AuthMiddleware.optional(event, context)

    // 参数校验
    const params = Validator.validate(event.params, {
      productId: { type: 'string', required: true }
    })

    // 业务逻辑处理
    const productService = new ProductService()
    const result = await productService.getProductDetail(params.productId)

    return result
  } catch (error) {
    console.error('获取产品详情失败:', error)
    return {
      errcode: -1,
      errmsg: error.message || '系统错误',
      trace_id: context.request_id
    }
  }
}