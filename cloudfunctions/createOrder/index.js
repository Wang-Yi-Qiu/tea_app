// cloud/functions/createOrder/index.js
const cloud = require('wx-server-sdk')
const db = cloud.database()

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext

  try {
    const {
      items,
      shipping = {},
      usePoints = 0,
      remark = ''
    } = event

    // 参数校验
    if (!items || !Array.isArray(items) || items.length === 0) {
      return {
        errcode: 4001,
        errmsg: '商品列表不能为空'
      }
    }

    // 验证商品信息和库存
    const productCollection = db.collection('products')
    const validatedItems = []

    for (const item of items) {
      const productResult = await productCollection.doc(item.skuId).get()
      if (!productResult.data) {
        return {
          errcode: 4002,
          errmsg: `商品 ${item.skuId} 不存在`
        }
      }

      const product = productResult.data
      if (product.stock < item.quantity) {
        return {
          errcode: 4003,
          errmsg: `商品 ${product.name} 库存不足`
        }
      }

      validatedItems.push({
        ...item,
        name: product.name,
        image: product.image,
        price: product.price,
        originalPrice: product.originalPrice
      })
    }

    // 计算订单金额
    const subtotal = validatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const shipping = subtotal >= 288 ? 0 : 18 // 满288免运费
    const discount = usePoints ? Math.min(usePoints * 0.01, subtotal * 0.1) : 0 // 积分抵扣，最多10%
    const total = subtotal + shipping - discount

    // 生成订单号
    const orderId = 'TEA' + new Date().getTime() + Math.random().toString(36).substr(2, 5).toUpperCase()

    // 创建订单数据
    const orderData = {
      _id: orderId,
      _openid: OPENID,
      items: validatedItems.map(item => ({
        ...item,
        createTime: new Date().getTime()
      })),
      amount: {
        subtotal: Number(subtotal.toFixed(2)),
        shipping: Number(shipping.toFixed(2)),
        discount: Number(discount.toFixed(2)),
        pointsUsed: Number((usePoints * 0.01).toFixed(2)),
        total: Number(total.toFixed(2))
      },
      shipping: {
        name: shipping.name || '用户',
        phone: shipping.phone || '13800138000',
        province: shipping.province || '浙江省',
        city: shipping.city || '杭州市',
        district: shipping.district || '西湖区',
        address: shipping.address || '西湖大道1号',
        postalCode: shipping.postalCode || '310000'
      },
      status: 'pending', // pending, paid, shipped, delivered, cancelled
      remark,
      createTime: new Date().getTime(),
      updateTime: new Date().getTime()
    }

    // 保存订单到数据库
    const orderCollection = db.collection('orders')
    const result = await orderCollection.add({
      data: orderData
    })

    // 同时清空购物车
    const cartCollection = db.collection('cart')
    const userCart = await cartCollection.where({
      _openid: OPENID
    }).get()

    if (userCart.data.length > 0) {
      await cartCollection.doc(userCart.data[0]._id).remove()
    }

    // 返回成功结果
    return {
      errcode: 0,
      errmsg: '订单创建成功',
      data: {
        orderId: orderData._id,
        amount: orderData.amount,
        items: orderData.items,
        shipping: orderData.shipping,
        status: orderData.status,
        createTime: orderData.createTime
      }
    }

  } catch (error) {
    console.error('创建订单失败:', error)
    return {
      errcode: 5001,
      errmsg: error.message || '系统错误',
      trace_id: context.request_id
    }
  }
}