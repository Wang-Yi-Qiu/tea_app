// cloud/functions/src/models/TeaProduct.js

module.exports = {
  // 数据校验规则
  validate(data) {
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('产品名称是必需的')
    }
    if (!data.category || typeof data.category !== 'string') {
      throw new Error('产品分类是必需的')
    }
    if (!Array.isArray(data.specs)) {
      throw new Error('产品规格必须是数组')
    }
    if (!data.basePrice || typeof data.basePrice !== 'number') {
      throw new Error('基础价格是必需的')
    }
    if (!data.images || !Array.isArray(data.images)) {
      throw new Error('产品图片必须是数组')
    }

    // 默认值
    const defaults = {
      status: 'active',
      sortOrder: 100,
      createTime: new Date(),
      updateTime: new Date()
    }

    // 添加默认值
    Object.keys(defaults).forEach(key => {
      if (data[key] === undefined || data[key] === '') {
        data[key] = defaults[key]
      }
    })

    return {
      ...data,
      ...defaults
    }
  }
}