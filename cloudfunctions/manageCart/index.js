// cloud/functions/manageCart/index.js
const cloud = require('wx-server-sdk')
const db = cloud.database()

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext

  try {
    const { action } = event

    // 模拟购物车数据存储（实际应使用Redis或数据库）
    const cartCollection = db.collection('cart')

    switch (action) {
      case 'add': {
        const { skuId, quantity = 1, reserve = true } = event

        // 获取产品信息
        const productCollection = db.collection('products')
        const productResult = await productCollection.doc(skuId).get()

        if (!productResult.data) {
          return {
            errcode: 4001,
            errmsg: '商品不存在'
          }
        }

        const product = productResult.data

        // 检查库存
        const cartItem = {
          id: new Date().getTime().toString(),
          skuId: skuId,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: quantity,
          selectedSpecs: event.selectedSpecs || {},
          createTime: new Date().getTime()
        }

        // 查找用户购物车
        const userCart = await cartCollection.where({
          _openid: OPENID
        }).get()

        let items = []
        if (userCart.data.length > 0) {
          items = userCart.data[0].items || []

          // 检查是否已存在
          const existingItemIndex = items.findIndex(item => item.skuId === skuId)
          if (existingItemIndex !== -1) {
            // 更新数量
            items[existingItemIndex].quantity += quantity
          } else {
            // 添加新商品
            items.push(cartItem)
          }
        } else {
          // 创建新购物车
          items = [cartItem]
        }

        // 保存购物车
        if (userCart.data.length > 0) {
          await cartCollection.doc(userCart.data[0]._id).update({
            data: {
              items: items,
              updateTime: new Date().getTime()
            }
          })
        } else {
          await cartCollection.add({
            data: {
              _openid: OPENID,
              items: items,
              createTime: new Date().getTime(),
              updateTime: new Date().getTime()
            }
          })
        }

        // 计算汇总信息
        const summary = calculateSummary(items)

        return {
          errcode: 0,
          errmsg: '添加成功',
          data: {
            items,
            summary
          }
        }
      }

      case 'remove': {
        const { itemId } = event

        const userCart = await cartCollection.where({
          _openid: OPENID
        }).get()

        if (userCart.data.length > 0) {
          let items = userCart.data[0].items || []
          items = items.filter(item => item.id !== itemId)

          await cartCollection.doc(userCart.data[0]._id).update({
            data: {
              items: items,
              updateTime: new Date().getTime()
            }
          })

          const summary = calculateSummary(items)

          return {
            errcode: 0,
            errmsg: '移除成功',
            data: {
              items,
              summary
            }
          }
        }

        return {
          errcode: 4002,
          errmsg: '购物车为空'
        }
      }

      case 'update': {
        const { itemId, quantity } = event

        if (quantity <= 0) {
          return {
            errcode: 4003,
            errmsg: '数量必须大于0'
          }
        }

        const userCart = await cartCollection.where({
          _openid: OPENID
        }).get()

        if (userCart.data.length > 0) {
          let items = userCart.data[0].items || []
          const itemIndex = items.findIndex(item => item.id === itemId)

          if (itemIndex !== -1) {
            items[itemIndex].quantity = quantity
            items[itemIndex].selectedSpecs = event.selectedSpecs || items[itemIndex].selectedSpecs

            await cartCollection.doc(userCart.data[0]._id).update({
              data: {
                items: items,
                updateTime: new Date().getTime()
              }
            })

            const summary = calculateSummary(items)

            return {
              errcode: 0,
              errmsg: '更新成功',
              data: {
                items,
                summary
              }
            }
          }
        }

        return {
          errcode: 4004,
          errmsg: '商品不存在'
        }
      }

      case 'list': {
        const userCart = await cartCollection.where({
          _openid: OPENID
        }).get()

        if (userCart.data.length > 0) {
          const items = userCart.data[0].items || []
          const summary = calculateSummary(items)

          return {
            errcode: 0,
            errmsg: '获取成功',
            data: {
              items,
              summary
            }
          }
        }

        return {
          errcode: 0,
          errmsg: '购物车为空',
          data: {
            items: [],
            summary: {
              itemCount: 0,
              quantity: 0,
              subtotal: 0,
              shipping: 0,
              discount: 0,
              total: 0
            }
          }
        }
      }

      case 'clear': {
        const userCart = await cartCollection.where({
          _openid: OPENID
        }).get()

        if (userCart.data.length > 0) {
          await cartCollection.doc(userCart.data[0]._id).remove()
        }

        return {
          errcode: 0,
          errmsg: '清空成功',
          data: {
            items: [],
            summary: {
              itemCount: 0,
              quantity: 0,
              subtotal: 0,
              shipping: 0,
              discount: 0,
              total: 0
            }
          }
        }
      }

      default:
        return {
          errcode: 4005,
          errmsg: '无效的操作'
        }
    }
  } catch (error) {
    console.error('购物车管理失败:', error)
    return {
      errcode: 5001,
      errmsg: error.message || '系统错误',
      trace_id: context.request_id
    }
  }
}

// 计算购物车汇总信息
function calculateSummary(items) {
  const itemCount = items.length
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const shipping = subtotal > 0 ? (subtotal >= 288 ? 0 : 18) : 0 // 满288免运费
  const discount = 0 // 可以根据会员等级或其他条件计算折扣

  return {
    itemCount,
    quantity,
    subtotal: Number(subtotal.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    total: Number((subtotal + shipping - discount).toFixed(2))
  }
}