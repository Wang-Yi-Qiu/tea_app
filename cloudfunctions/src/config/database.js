// cloud/functions/src/config/database.js
const cloud = require('wx-server-sdk').init()

class DatabaseService {
  constructor() {
    this.db = cloud.database()
  }

  // 通用查询方法
  async find(collection, query = {}, options = {}) {
    const { limit = 20, skip = 0, sort = {}, projection = {} } = options

    let queryBuilder = this.db.collection(collection)

    // 应用查询条件
    Object.keys(query).forEach(key => {
      if (query[key]) {
        queryBuilder = queryBuilder.where(key, '==', query[key])
      }
    })

    // 应用排序
    if (Object.keys(sort).length > 0) {
      Object.keys(sort).forEach(key => {
        queryBuilder = queryBuilder.orderBy(key, sort[key])
      })
    }

    // 应用分页
    queryBuilder = queryBuilder.skip(skip).limit(limit)

    return await queryBuilder.get()
  }

  // 通用创建方法
  async create(collection, data) {
    const result = await this.db.collection(collection).add({
      data: {
        ...data,
        createTime: new Date(),
        updateTime: new Date()
      }
    })
    return result._id
  }

  // 通用更新方法
  async update(collection, id, data) {
    return await this.db.collection(collection).doc(id).update({
      data: {
        ...data,
        updateTime: new Date()
      }
    })
  }

  // 事务操作
  async transaction(callback) {
    return await this.db.startTransaction().then(async (transaction) => {
      try {
        const result = await callback(transaction)
        await transaction.commit()
        return result
      } catch (error) {
        await transaction.rollback()
        throw error
      }
    })
  }
}

module.exports = new DatabaseService()