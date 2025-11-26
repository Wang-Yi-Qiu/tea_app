// cloud/functions/src/services/cartService.js
const cloud = require('wx-server-sdk').init()
const DatabaseService = require('../config/database')
const constants = require('../config/constants')

class CartService {
  constructor() {
    this.db = new DatabaseService()
  }

  async getCart() {
    try {
      const result = await cloud.callFunction({
        name: 'manageCart',
        data: { action: 'list' }
      })

      if (result.result.errcode === constants.ERROR_CODES.SUCCESS) {
        const { items, summary } = result.result.data

        return {
          errcode: constants.ERROR_CODES.SUCCESS,
          errmsg: 'success',
          data: {
            items,
            summary
          }
        }
      } else {
        return result.result
      }
    } catch (error) {
      console.error('获取购物车失败:', error)
      return {
        errcode: constants.ERROR_CODES.SYSTEM_ERROR,
        errmsg: error.message || '系统错误'
      }
    }
  }

  async addItem(skuId, quantity, reserve = true) {
    try {
      // 先检查库存
      const inventoryResult = await cloud.callFunction({
        name: 'getSKUInventory',
        data: { skuIds: [skuId] }
      })

      if (inventoryResult.result.errcode !== constants.ERROR_CODES.SUCCESS) {
        return inventoryResult.result
      }

      const sku = inventoryResult.result.data.skus[0]

      if (sku.inventory.available < quantity) {
        return {
          errcode: constants.ERROR_CODES.INSUFFICIENT_INVENTORY,
          errmsg: '库存不足'
        }
      }

      // 添加到购物车
      const result = await cloud.callFunction({
        name: 'manageCart',
        data: {
          action: 'add',
          skuId,
          quantity,
          reserve
        }
      })

      if (result.result.errcode === constants.ERROR_CODES.SUCCESS) {
        return result.result
      } else {
        return result.result
      }
    } catch (error) {
      console.error('添加到购物车失败:', error)
      return {
        errcode: constants.ERROR_CODES.SYSTEM_ERROR,
        errmsg: error.message || '系统错误'
      }
    }
  }

  async updateQuantity(itemId, quantity) {
    try {
      // 检查库存
      const cartResult = await this.getCart()
      const cartItem = cartResult.data.data.items.find(item => item.skuId === itemId)

      if (!cartItem) {
        return {
          errcode: constants.ERROR_CODES.RESOURCE_NOT_FOUND,
          errmsg: '商品不存在'
        }
      }

      const inventoryResult = await cloud.callFunction({
        name: 'getSKUInventory',
        data: { skuIds: [cartItem.skuId] }
      })

      if (inventoryResult.result.errcode !== constants.ERROR_CODES.SUCCESS) {
        return inventoryResult.result
      }

      const sku = inventoryResult.result.data.skus[0]

      if (sku.inventory.available < quantity) {
        return {
          errcode: constants.ERROR_CODES.INSUFFICIENT_INVENTORY,
          errmsg: '库存不足'
        }
      }

      // 如果库存充足，更新数量
      const quantityDiff = quantity - cartItem.quantity
      const newAvailable = sku.inventory.available + quantityDiff
      const newReserved = sku.inventory.reserved + quantityDiff

      // 更新购物车项目数量
      const result = await cloud.callFunction({
        name: 'manageCart',
        data: {
          action: 'update',
          itemId,
          quantity
        }
      })

      if (result.result.errcode === constants.ERROR_CODES.SUCCESS) {
        return result.result
      } else {
        return result.result
      }
    } catch (error) {
      console.error('更新数量失败:', error)
      return {
        errcode: constants.ERROR_CODES.SYSTEM_ERROR,
        errmsg: error.message || '系统错误'
      }
    }
  }

  async removeItem(itemId) {
    try {
      // 获取购物车项目
      const cartResult = await this.getCart()
      const cartItem = cartResult.data.data.items.find(item => item.skuId === itemId)

      if (!cartItem) {
        return {
          errcode: constants.ERROR_CODES.RESOURCE_NOT_FOUND,
          errmsg: '商品不存在'
        }
      }

      // 获取SKU信息
      const inventoryResult = await cloud.callFunction({
        name: 'getSKUInventory',
        data: { skuIds: [cartItem.skuId] }
      })

      if (inventoryResult.result.errcode !== constants.ERROR_CODES.SUCCESS) {
        return inventoryResult.result
      }

      const sku = inventoryResult.result.data.skus[0]

      // 释放库存
      const quantity = cartItem.quantity

      // 更新SKU库存
      await this.db.update('skus', sku._id, {
        data: {
          inventory: {
            available: sku.inventory.available + quantity,
            reserved: sku.inventory.reserved - quantity
          }
        }
      })

      // 更新预留记录
      await this.db.collection('inventory_reservations').where({
        skuId: cartItem.skuId,
        status: constants.BUSINESS.INVENTORY_STATUS.RESERVED
      }).update({
        data: {
          status: constants.BUSINESS.INVENTORY_STATUS.RELEASED
        }
      })

      // 移除购物车项目
      const result = await cloud.callFunction({
        name: 'manageCart',
        data: {
          action: 'remove',
          itemId
        }
      })

      return result.result
    } catch (error) {
      console.error('移除商品失败:', error)
      return {
        errcode: constants.ERROR_CODES.SYSTEM_ERROR,
        errmsg: error.message || '系统错误'
      }
    }
  }

  async clearCart() {
    try {
      const result = await cloud.callFunction({
        name: 'manageCart',
        data: { action: 'clear' }
      })

      if (result.result.errcode === constants.ERROR_CODES.SUCCESS) {
        // 清空本地存储
        wx.removeStorageSync('cartItems')
        wx.setTabBarBadge({
          index: 2,
          text: ''
        })
      }

      return result.result
    } catch (error) {
      console.error('清空购物车失败:', error)
      return {
        errcode: constants.ERROR_CODES.SYSTEM_ERROR,
        errmsg: error.message || '系统错误'
      }
    }
  }

  module.exports = new CartService()