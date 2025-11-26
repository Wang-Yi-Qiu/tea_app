// cloud/functions/src/models/SKU.js

module.exports = {
  // 数据校验规则
  validate(data) {
    if (!data.productId || typeof data.productId !== 'string') {
      throw new Error('产品ID是必需的')
    }
    if (!data.combination || typeof data.combination !== 'object') {
      throw new Error('规格组合是必需的')
    }
    if (!data.specName || typeof data.specName !== 'string') {
      throw new Error('规格名称是必需的')
    }
    if (!data.price || typeof data.price !== 'number') {
      throw new Error('价格是必需的')
    }
    if (!data.inventory || typeof data.inventory !== 'object') {
      throw new Error('库存信息是必需的')
    }
    if (!data.skuCode || typeof data.skuCode !== 'string') {
      throw new Error('SKU编码是必需的')
    }

    // 验证库存结构
    const { total, available, reserved } = data.inventory
    if (total < 0 || available < 0 || available > total || reserved < 0 || available > total - reserved) {
      throw new Error('无效的库存数据')
    }

    // 默认值
    const defaults = {
      status: 'active',
      createTime: new Date(),
      updateTime: new Date()
    }

    return {
      ...data,
      ...defaults
    }
  }
}