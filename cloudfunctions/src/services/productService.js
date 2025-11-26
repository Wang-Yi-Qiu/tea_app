// cloud/functions/src/services/productService.js
const cloud = require('wx-server-sdk').init()
const DatabaseService = require('../config/database')
const constants = require('../config/constants')

class ProductService {
  constructor() {
    this.db = new DatabaseService()
  }

  async getProducts(params) {
    const { category, keyword, page = 1, pageSize = 20, sortField = 'createTime', sortOrder = 'desc' } = params

    let queryBuilder = this.db.collection('products')

    // 应用查询条件
    queryBuilder = queryBuilder.where('status', '==', 'active')

    // 分类筛选
    if (category) {
      queryBuilder = queryBuilder.where('category', '==', category)
    }

    // 关键词搜索
    if (keyword) {
      queryBuilder = queryBuilder.where('searchKeywords', 'array-contains', keyword)
    }

    // 排序
    queryBuilder = queryBuilder.orderBy(sortField, sortOrder)

    // 分页
    const skip = (page - 1) * pageSize
    queryBuilder = queryBuilder.skip(skip).limit(pageSize)

    try {
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
          products: result.data
        }
      }
    } catch (error) {
      console.error('获取产品列表失败:', error)
      return {
        errcode: constants.ERROR_CODES.SYSTEM_ERROR,
        errmsg: error.message || '系统错误'
      }
    }
  }

  async getProductDetail(productId) {
    try {
      const result = await this.db.find('products', productId)

      if (result.errcode !== constants.ERROR_CODES.SUCCESS) {
        return {
          errcode: result.errcode,
          errmsg: result.errmsg
        }
      }

      // 生成SKU矩阵
      const { specs } = result.data
      const skus = this.generateSKU(result.data._id, specs)

      return {
        errcode: constants.ERROR_CODES.SUCCESS,
        errmsg: 'success',
        data: {
          product: result.data,
          skus
        }
      }
    } catch (error) {
      console.error('获取产品详情失败:', error)
      return {
        errcode: constants.ERROR_CODES.SYSTEM_ERROR,
        errmsg: error.message || '系统错误'
      }
    }
  }

  generateSKU(productId, specs) {
    const skus = []

    // 生成所有规格组合
    for (const material of specs.materials || []) {
      for (const capacity of specs.capacities || []) {
        for (const grade of specs.grades || []) {
          // 计算价格
          const materialPrice = material.price || 0
          const capacityPrice = capacity.price || 0
          const gradePrice = grade.price || 0
          const basePrice = specs.basePrice || 0

          const price = basePrice + materialPrice + capacityPrice + gradePrice

          // 生成SKU标识
          const materialAbbr = material.name.substring(0, 2).toUpperCase()
          const capacityAbbr = capacity.name.substring(0, 2).toUpperCase()
          const gradeAbbr = grade.name.substring(0, 2).toUpperCase()

          const skuCode = `${materialAbbr}_${capacityAbbr}_${gradeAbbr}`

          // 生成规格名称
          const specName = `${material.name} ${capacity.name} ${grade.name}`

          skus.push({
            _productId: productId,
            _id: `sku_${productId}_${material.id}_${capacity.id}_${grade.id}`,
            combination: {
              materialId: material.id,
              capacityId: capacity.id,
              gradeId: grade.id
            },
            specName,
            price,
            inventory: {
              total: 100,
              available: 100,
              reserved: 0
            },
            skuCode,
            status: constants.BUSINESS.INVENTORY_STATUS.ACTIVE
          })
        }
      }
    }

    return skus
  }

  async checkInventory(skuId, quantity) {
    try {
      const result = await this.db.find('skus', skuId)

      if (result.errcode !== constants.ERROR_CODES.SUCCESS) {
        return {
          errcode: constants.ERROR_CODES.RESOURCE_NOT_FOUND,
          errmsg: '商品不存在'
        }
      }

      const sku = result.data

      if (sku.inventory.available < quantity) {
        return {
          errcode: constants.ERROR_CODES.INSUFFICIENT_INVENTORY,
          errmsg: '库存不足'
        }
      }

      if (sku.status !== constants.BUSINESS.INVENTORY_STATUS.ACTIVE) {
        return {
          errcode: constants.ERROR_CODES.RESOURCE_NOT_FOUND,
          errmsg: '商品已下架'
        }
      }

      return sku
    } catch (error) {
      console.error('检查库存失败:', error)
      return {
        errcode: constants.ERROR_CODES.SYSTEM_ERROR,
        errmsg: '系统错误'
      }
    }
  }

  async reserveInventory(skuId, quantity, orderId) {
    try {
      const result = await this.db.find('skus', skuId)

      if (result.errcode !== constants.ERROR_CODES.SUCCESS) {
        return {
          errcode: constants.ERROR_CODES.RESOURCE_NOT_FOUND,
          errmsg: '商品不存在'
        }
      }

      const sku = result.data

      // 更新库存
      const newAvailable = sku.inventory.available - quantity
      const newReserved = sku.inventory.reserved + quantity

      await this.db.update('skus', skuId, {
        data: {
          inventory: {
            available: newAvailable,
            reserved: newReserved
          }
        }
      })

      // 记录预留记录
      await this.db.collection('inventory_reservations').add({
        data: {
          skuId,
          quantity,
          orderId,
          status: 'active',
          createTime: new Date()
        }
      })

      return sku
    } catch (error) {
      console.error('预留库存失败:', error)
      return {
        errcode: constants.ERROR_CODES.SYSTEM_ERROR,
        errmsg: '系统错误'
      }
    }
  }
}

module.exports = new ProductService()