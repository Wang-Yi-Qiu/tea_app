// cloud/functions/src/services/orderService.js
const cloud = require('wx-server-sdk').init()
const DatabaseService = require('../config/database')
const constants = require('../config/constants')

class OrderService {
  constructor() {
    this.db = new DatabaseService()
  }

  async createOrder(orderData) {
    try {
      // 生成订单号
      const orderNo = `ORDER${Date.now().getTime()}`
      const { items, shipping, usePoints, remark } = orderData

      // 计算金额
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const total = subtotal + (shipping.fee || 0) - (usePoints ? (usePoints * constants.DEFAULT_CONFIG.POINTS_REDEEM_RATE) : 0)

      // 使用积分
      let pointsUsed = 0
      let pointsValue = 0

      if (usePoints && pointsUsed > 0) {
        pointsValue = Math.min(pointsUsed, subtotal * constants.DEFAULT_CONFIG.MAX_POINTS_USE_RATIO / 100)
        pointsValue = Math.floor(pointsValue)
        pointsUsed = Math.min(pointsUsed, subtotal / constants.DEFAULT_CONFIG.POINTS_EARN_RATE)
      }

      // 创建订单数据
      const orderData = {
        orderNo,
        _openid: cloud.getWXContext().OPENID,
        items,
        amount: {
          subtotal,
          shipping: shipping.fee || 0,
          discount: 0,
          pointsUsed,
          pointsValue,
          total
        },
        status: constants.BUSINESS.ORDER_STATUS.PENDING_PAYMENT,
        paymentStatus: constants.BUSINESS.PAYMENT_STATUS.UNPAID,
        shipping,
        createTime: new Date()
      }

      // 事务性创建订单和库存预留
      const result = await this.db.transaction(async (transaction) => {
        // 创建订单
        const orderResult = await this.db.collection('orders').add({
          data: orderData
        }, transaction)

        if (!orderResult._id) {
          throw new Error('创建订单失败')
        }

        // 预留库存
        for (const item of items) {
          const inventoryResult = await cloud.callFunction({
            name: 'getSKUInventory',
            data: { skuIds: [item.skuId] }
          })

          if (inventoryResult.result.errcode !== constants.ERROR_CODES.SUCCESS) {
            throw new Error(`库存不足: ${item.skuId}`)
          }

          const sku = inventoryResult.result.data.skus[0]
          const newAvailable = sku.inventory.available - item.quantity
          const newReserved = sku.inventory.reserved + item.quantity

          // 更新SKU库存
          await this.db.update('skus', sku._id, {
            data: {
              inventory: {
                available: newAvailable,
                reserved: newReserved
              }
            }
          }, transaction)

          // 创建预留记录
          await this.db.collection('inventory_reservations').add({
            data: {
              skuId: item.skuId,
              quantity: item.quantity,
              orderId: orderResult._id,
              status: constants.BUSINESS.INVENTORY_STATUS.RESERVED
            }
          }, transaction)
        }

        return {
          errcode: constants.ERROR_CODES.SUCCESS,
          errmsg: 'success',
          data: {
            orderId: orderResult._id
            orderNo
          amount: orderData.amount
          items: orderData.items,
            status: orderData.status,
            paymentStatus: orderData.paymentStatus,
            shipping: orderData.shipping,
            createTime: orderData.createTime
          }
        }
      })

      return result
    } catch (error) {
      console.error('创建订单失败:', error)
      return {
        errcode: constants.ERROR_CODES.SYSTEM_ERROR,
        errmsg: error.message || '系统错误'
      }
    }
  }

  async getOrders(params) {
    try {
      const { status, page = 1, pageSize = 20 } = params
      const { OPENID } = cloud.getWXContext()

      let queryBuilder = this.db.collection('orders')
        .where('_openid', '==', OPENID)

      // 状态筛选
      if (status) {
        queryBuilder = queryBuilder.where('status', '==', status)
      }

      // 排序
      queryBuilder = queryBuilder.orderBy('createTime', 'desc')

      const skip = (page - 1) * pageSize
      queryBuilder = queryBuilder.skip(skip).limit(pageSize)

      const result = await queryBuilder.get()

      // 获取总数
      const countResult = await queryBuilder.count()

      return {
        errcode: constants.ERROR_CODES.SUCCESS,
        errmsg: 'success',
        data: {
          total: countResult.total,
          page: page,
          pageSize: pageSize,
          totalPages: Math.ceil(countResult.total / pageSize),
          orders: result.data
        }
      }
    } catch (error) {
      console.error('获取订单列表失败:', error)
      return {
        errcode: constants.ERROR_CODES.SYSTEM_ERROR,
        errmsg: error.message || '系统错误'
      }
    }
  }

  async updateOrderStatus(orderId, status, tracking) {
    try {
      const updateData = {
        status,
        updateTime: new Date()
      }

      if (tracking) {
        updateData.tracking = {
          company: tracking.company,
          number: tracking.number
        }
      }

      const result = await this.db.update('orders', orderId, {
        data: updateData
      })

      return result
    } catch (error) {
      console.error('更新订单状态失败:', error)
      return {
        errcode: constants.ERROR_CODES.SYSTEM_ERROR,
        errmsg: error.message || '系统错误'
      }
    }
  }

  module.exports = new OrderService()