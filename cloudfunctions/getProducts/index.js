// cloud/functions/getProducts/index.js
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
      category: { type: 'string', required: false },
      keyword: { type: 'string', required: false },
      page: { type: 'number', required: false, default: 1 },
      pageSize: { type: 'number', required: false, default: 20 }
    })

    // 业务逻辑处理
    const productService = new ProductService()
    const result = await productService.getProducts(params)

    return result
  } catch (error) {
    console.error('获取产品列表失败:', error)
    return {
      errcode: -1,
      errmsg: error.message || '系统错误',
      trace_id: context.request_id
    }
  }
}