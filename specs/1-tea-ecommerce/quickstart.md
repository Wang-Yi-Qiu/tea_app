# 微信小程序茶叶商城系统 - 快速开始指南

**版本**: 1.0 | **日期**: 2025-11-26 | **分支**: `1-tea-ecommerce`

## 项目概述

这是一个基于微信小程序的茶叶电商平台，支持多规格产品选择、微信支付集成、订单管理、社区分享、积分兑换和完整的后台管理系统。

### 核心特性
- 🍵 **多规格茶叶产品** - 支持材质、容量、等级多维度规格组合
- 💰 **微信支付集成** - 完整的支付流程和状态管理
- 📱 **传统国风UI** - 遵循微信小程序传统美学设计
- 🛡️ **零信任架构** - 云函数独占数据库访问权限
- 👥 **社区分享功能** - 用户茶叶体验分享，AI内容审核
- 🎯 **积分兑换系统** - 完整的积分获取和使用机制
- 👨‍💼 **RBAC管理后台** - 基于微信OpenID的角色权限控制

## 技术栈

### 前端技术
```javascript
{
  "framework": "微信小程序原生框架",
  "ui_library": "TDesign UI",
  "state_management": "MobX",
  "language": "JavaScript/ES6+",
  "styling": "传统国风设计系统"
}
```

### 后端技术
```javascript
{
  "platform": "微信云开发",
  "database": "微信云数据库 (NoSQL)",
  "functions": "Node.js 云函数",
  "payment": "微信支付API",
  "content_moderation": "腾讯云内容安全API",
  "authentication": "微信OpenID + RBAC"
}
```

## 开发环境准备

### 1. 前置条件
- 微信开发者账号 (已认证小程序)
- 微信支付商户号
- 腾讯云账号
- Node.js 16+ 开发环境
- 微信开发者工具

### 2. 项目初始化

#### 2.1 克隆项目
```bash
# 克隆项目到本地
git clone <repository_url> miniprogram-tea-shop
cd miniprogram-tea-shop

# 切换到功能分支
git checkout 1-tea-ecommerce
```

#### 2.2 配置微信云开发
```bash
# 在微信开发者工具中导入项目
# 选择项目目录: miniprogram-tea-shop
# 填写AppID和项目信息

# 初始化云开发环境
npm run cloud:init
```

#### 2.3 安装依赖
```bash
# 安装前端依赖
npm install

# 安装云函数依赖
cd cloud/functions
npm install
cd ../../
```

### 3. 环境配置

#### 3.1 前端配置 (project.config.json)
```json
{
  "appid": "YOUR_MINIPROGRAM_APPID",
  "projectname": "茶叶商城",
  "setting": {
    "urlCheck": false,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true
  },
  "cloudfunctionRoot": "./cloud/functions"
}
```

#### 3.2 云函数配置 (cloudbaselist.json)
```json
{
  "envList": [
    {
      "envId": "tea-shop-env-1",
      "name": "茶叶商城生产环境",
      "desc": "生产环境云函数和数据库"
    }
  ]
}
```

#### 3.3 环境变量配置
```javascript
// cloud/config/index.js
module.exports = {
  // 微信小程序配置
  wxappId: 'YOUR_MINIPROGRAM_APPID',
  wxAppSecret: 'YOUR_MINIPROGRAM_SECRET',

  // 微信支付配置
  wxPayMchId: 'YOUR_MCH_ID',
  wxPayKey: 'YOUR_PAY_KEY',
  wxPayNotifyUrl: 'YOUR_NOTIFY_URL',

  // 腾讯云内容安全配置
  tencentSecretId: 'YOUR_SECRET_ID',
  tencentSecretKey: 'YOUR_SECRET_KEY',

  // 管理员白名单
  adminOpenids: [
    'ADMIN_OPENID_1',
    'ADMIN_OPENID_2'
  ],

  // 开发环境标识
  isDev: process.env.NODE_ENV === 'development'
}
```

## 核心业务数据模型

### 1. 产品数据结构
```javascript
// 茶叶产品 (TeaProduct)
const TeaProduct = {
  _id: "product_12345",
  _openid: "admin_openid",              // 创建者

  // 基本信息
  name: "龙井茶叶",
  description: "正宗西湖龙井，清香淡雅",
  category: "绿茶",
  brand: "西湖茶庄",

  // 规格配置（用于生成SKU矩阵）
  specs: {
    materials: [
      {
        id: "material_1",
        name: "明前茶",
        price: 128.00,
        description: "清明前采摘的嫩芽"
      }
    ],
    capacities: [
      {
        id: "capacity_2",
        name: "100g",
        price: 168.00
      }
    ],
    grades: [
      {
        id: "grade_1",
        name: "特级",
        price: 58.00
      }
    ]
  },

  basePrice: 88.00,
  status: "active"
}
```

### 2. SKU数据结构
```javascript
// 库存单位 (SKU)
const SKU = {
  _id: "sku_12345",
  productId: "product_12345",

  // 规格组合
  combination: {
    materialId: "material_1",
    capacityId: "capacity_2",
    gradeId: "grade_1"
  },

  specName: "明前茶 100g 特级",
  price: 442.00,                      // 计算后的最终价格

  // 库存管理
  inventory: {
    total: 100,
    available: 85,                     // 可用库存
    reserved: 15                        // 预留库存
  },

  status: "active"
}
```

### 3. 订单数据结构
```javascript
// 订单 (Order)
const Order = {
  _id: "order_12345",
  orderNo: "ORDER202511260001",

  // 用户信息
  _openid: "user_openid",
  userInfo: {
    nickname: "茶友小明",
    phone: "138****8000"
  },

  // 订单状态
  status: "paid",                      // pending_payment, paid, processing, shipped, completed
  paymentStatus: "paid",

  // 商品清单
  items: [
    {
      skuId: "sku_12345",
      specName: "明前茶 100g 特级",
      price: 442.00,
      quantity: 2,
      subtotal: 884.00
    }
  ],

  // 金额计算
  amount: {
    subtotal: 884.00,
    shipping: 0.00,
    total: 884.00
  }
}
```

## 云函数开发指南

### 1. 云函数结构
```
cloud/functions/
├── src/
│   ├── services/           # 业务逻辑服务
│   │   ├── productService.js
│   │   ├── orderService.js
│   │   ├── userService.js
│   │   └── communityService.js
│   ├── models/            # 数据模型定义
│   │   ├── TeaProduct.js
│   │   ├── SKU.js
│   │   ├── Order.js
│   │   └── User.js
│   ├── utils/             # 工具函数
│   │   ├── auth.js           # 身份验证
│   │   ├── validator.js      # 参数校验
│   │   ├── payment.js        # 支付处理
│   │   └── contentModeration.js
│   └── config/            # 配置文件
│       ├── database.js
│       ├── wechat.js
│       └── constants.js
├── getProducts/          # 获取产品列表
│   └── index.js
├── createOrder/         # 创建订单
│   └── index.js
├── wechatPay/           # 微信支付
│   └── index.js
├── paymentCallback/     # 支付回调
│   └── index.js
└── package.json
```

### 2. 标准云函数模板
```javascript
// cloud/functions/getProducts/index.js
const cloud = require('wx-server-sdk')
const ProductService = require('../src/services/productService')
const AuthMiddleware = require('../src/utils/auth')
const Validator = require('../src/utils/validator')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  try {
    // 身份验证（可选）
    await AuthMiddleware.optional(event)

    // 参数校验
    const params = Validator.validate(event.params, {
      category: { type: 'string', required: false },
      keyword: { type: 'string', required: false },
      page: { type: 'number', required: false, default: 1 },
      pageSize: { type: 'number', required: false, default: 20 }
    })

    // 业务逻辑处理
    const result = await ProductService.getProducts(params)

    return {
      errcode: 0,
      errmsg: 'success',
      data: result,
      trace_id: context.request_id
    }

  } catch (error) {
    console.error('获取产品列表失败:', error)
    return {
      errcode: -1,
      errmsg: error.message || '系统错误',
      trace_id: context.request_id
    }
  }
}
```

### 3. 身份验证中间件
```javascript
// cloud/functions/src/utils/auth.js
const cloud = require('wx-server-sdk')

class AuthMiddleware {
  static async required(event, context) {
    const { OPENID } = cloud.getWXContext()

    if (!OPENID) {
      throw new Error('需要用户登录')
    }

    // 添加用户信息到请求对象
    event.user = {
      _openid: OPENID
    }

    return OPENID
  }

  static async admin(event, context) {
    const { OPENID } = cloud.getWXContext()

    if (!OPENID) {
      throw new Error('需要管理员登录')
    }

    // 检查管理员权限
    const db = cloud.database()
    const adminUser = await db.collection('admin_users')
      .where({
        _openid: OPENID,
        status: 'active'
      })
      .get()

    if (!adminUser.data.length) {
      throw new Error('权限不足')
    }

    // 添加管理员信息到请求对象
    event.admin = adminUser.data[0]

    return OPENID
  }
}

module.exports = AuthMiddleware
```

### 4. 业务服务示例
```javascript
// cloud/functions/src/services/productService.js
const cloud = require('wx-server-sdk')

class ProductService {
  constructor() {
    this.db = cloud.database()
  }

  async getProducts(params) {
    const {
      category,
      keyword,
      page = 1,
      pageSize = 20,
      sortField = 'createTime',
      sortOrder = 'desc'
    } = params

    let query = this.db.collection('products').where({
      status: 'active'
    })

    // 分类筛选
    if (category) {
      query = query.where('category', '==', category)
    }

    // 关键词搜索
    if (keyword) {
      query = query.where('searchKeywords', 'array-contains', keyword)
    }

    // 排序
    query = query.orderBy(sortField, sortOrder)

    // 分页
    const skip = (page - 1) * pageSize
    query = query.skip(skip).limit(pageSize)

    const result = await query.get()
    const total = (await query.count()).total

    return {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      products: result.data
    }
  }

  async generateSKUs(productId) {
    const product = await this.getProductDetail(productId)
    const { materials, capacities, grades } = product.specs

    const skus = []
    const skuTransactions = []

    // 生成所有规格组合
    for (const material of materials) {
      for (const capacity of capacities) {
        for (const grade of grades) {
          const price = product.basePrice + material.price + capacity.price + grade.price
          const specName = `${material.name} ${capacity.name} ${grade.name}`

          const sku = {
            productId,
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
            status: 'active'
          }

          skus.push(sku)
          skuTransactions.push(this.db.collection('skus').add({
            data: {
              ...sku,
              createTime: new Date(),
              updateTime: new Date()
            }
          }))
        }
      }
    }

    // 批量创建SKU
    await Promise.all(skuTransactions)
    return skus
  }

  async checkInventory(skuId, quantity) {
    const skuDoc = await this.db.collection('skus').doc(skuId).get()

    if (!skuDoc.data) {
      throw new Error('SKU不存在')
    }

    const sku = skuDoc.data
    if (sku.status !== 'active') {
      throw new Error('SKU已下架')
    }

    if (sku.inventory.available < quantity) {
      throw new Error('库存不足')
    }

    return sku
  }

  async reserveInventory(skuId, quantity, orderId) {
    return await this.db.runTransaction(async (transaction) => {
      const skuDoc = await transaction.collection('skus').doc(skuId).get()
      const sku = skuDoc.data

      if (sku.inventory.available < quantity) {
        throw new Error('库存不足')
      }

      // 更新库存
      await transaction.collection('skus').doc(skuId).update({
        data: {
          'inventory.available': sku.inventory.available - quantity,
          'inventory.reserved': sku.inventory.reserved + quantity,
          updateTime: new Date()
        }
      })

      // 记录预留信息
      await transaction.collection('inventory_reservations').add({
        data: {
          skuId,
          quantity,
          orderId,
          status: 'active',
          createTime: new Date()
        }
      })

      return sku
    })
  }
}

module.exports = new ProductService()
```

## 前端开发指南

### 1. 项目结构
```
miniprogram/
├── pages/               # 页面目录
│   ├── home/           # 首页
│   ├── products/       # 产品列表/详情
│   ├── cart/          # 购物车
│   ├── order/          # 订单流程
│   ├── user/           # 用户中心
│   ├── community/      # 社区
│   └── admin/          # 管理后台
├── components/          # 公共组件
│   ├── tea-card/       # 茶叶卡片
│   ├── spec-selector/  # 规格选择器
│   ├── address-picker/ # 地址选择
│   └── payment/        # 支付组件
├── services/           # 业务服务
│   ├── api.js          # API调用封装
│   ├── auth.js         # 身份验证
│   ├── storage.js       # 本地存储
│   └── utils.js         # 工具函数
├── styles/             # 样式文件
│   ├── variables.wxss  # 样式变量
│   └── mixins.wxss    # 样式混入
├── images/             # 静态资源
├── app.js              # 应用入口
├── app.json            # 应用配置
├── app.wxss            # 全局样式
└── project.config.json # 项目配置
```

### 2. 页面开发示例

#### 2.1 产品列表页 (pages/products/list.js)
```javascript
// pages/products/list.js
const ApiService = require('../../services/api')
const StorageService = require('../../services/storage')

Page({
  data: {
    products: [],
    loading: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    category: '',
    keyword: '',
    sortField: 'createTime',
    sortOrder: 'desc'
  },

  onLoad(options) {
    if (options.category) {
      this.setData({ category: options.category })
    }
    this.loadProducts()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreProducts()
    }
  },

  onPullDownRefresh() {
    this.refreshProducts()
  },

  async loadProducts() {
    this.setData({ loading: true })

    try {
      const response = await ApiService.call('getProducts', {
        category: this.data.category,
        keyword: this.data.keyword,
        page: this.data.page,
        pageSize: this.data.pageSize,
        sortField: this.data.sortField,
        sortOrder: this.data.sortOrder
      })

      if (response.errcode === 0) {
        const newProducts = this.data.page === 1
          ? response.data.products
          : [...this.data.products, ...response.data.products]

        this.setData({
          products: newProducts,
          hasMore: response.data.page < response.data.totalPages
        })
      } else {
        wx.showToast({
          title: response.errmsg,
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载产品失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  async loadMoreProducts() {
    this.setData({
      page: this.data.page + 1
    })
    await this.loadProducts()
  },

  async refreshProducts() {
    this.setData({
      page: 1,
      products: []
    })
    await this.loadProducts()
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearchConfirm() {
    this.setData({
      page: 1,
      products: []
    })
    this.loadProducts()
  },

  onCategoryChange(e) {
    const category = e.detail.value
    this.setData({
      category,
      page: 1,
      products: []
    })
    this.loadProducts()
  },

  onSortChange(e) {
    const { field, order } = e.detail
    this.setData({
      sortField: field,
      sortOrder: order,
      page: 1,
      products: []
    })
    this.loadProducts()
  },

  onProductTap(e) {
    const { productId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/products/detail?id=${productId}`
    })
  }
})
```

#### 2.2 产品详情页 (pages/products/detail.js)
```javascript
// pages/products/detail.js
const ApiService = require('../../services/api')
const StorageService = require('../../services/storage')

Page({
  data: {
    productId: '',
    product: null,
    skus: [],
    selectedSpecs: {},      // 选中的规格
    selectedSku: null,       // 选中的SKU
    quantity: 1,
    loading: false,
    addingToCart: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ productId: options.id })
      this.loadProductDetail()
    }
  },

  async loadProductDetail() {
    this.setData({ loading: true })

    try {
      const response = await ApiService.call('getProductDetail', {
        productId: this.data.productId
      })

      if (response.errcode === 0) {
        const { product, skus } = response.data

        // 初始化默认选中规格
        const defaultSpecs = this.getDefaultSpecs(product.specs)
        const defaultSku = this.findSKUBySpecs(skus, defaultSpecs)

        this.setData({
          product,
          skus,
          selectedSpecs: defaultSpecs,
          selectedSku: defaultSku
        })
      } else {
        wx.showToast({
          title: response.errmsg,
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载产品详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  getDefaultSpecs(specs) {
    return {
      material: specs.materials[0]?.id || '',
      capacity: specs.capacities[0]?.id || '',
      grade: specs.grades[0]?.id || ''
    }
  },

  findSKUBySpecs(skus, specs) {
    return skus.find(sku =>
      sku.combination.materialId === specs.material &&
      sku.combination.capacitYId === specs.capacity &&
      sku.combination.gradeId === specs.grade
    ) || null
  },

  onSpecChange(e) {
    const { type, value } = e.detail
    const selectedSpecs = {
      ...this.data.selectedSpecs,
      [type]: value
    }

    const selectedSku = this.findSKUBySpecs(this.data.skus, selectedSpecs)

    this.setData({
      selectedSpecs,
      selectedSku
    })
  },

  onQuantityChange(e) {
    this.setData({ quantity: e.detail.value })
  },

  async onAddToCart() {
    if (!this.data.selectedSku) {
      wx.showToast({
        title: '请选择产品规格',
        icon: 'none'
      })
      return
    }

    if (this.data.selectedSku.inventory.available < this.data.quantity) {
      wx.showToast({
        title: '库存不足',
        icon: 'none'
      })
      return
    }

    this.setData({ addingToCart: true })

    try {
      const response = await ApiService.call('manageCart', {
        action: 'add',
        params: {
          skuId: this.data.selectedSku._id,
          quantity: this.data.quantity,
          reserve: true
        }
      })

      if (response.errcode === 0) {
        wx.showToast({
          title: '已加入购物车',
          icon: 'success'
        })

        // 更新本地购物车数量
        this.updateCartBadge()
      } else {
        wx.showToast({
          title: response.errmsg,
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加入购物车失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    } finally {
      this.setData({ addingToCart: false })
    }
  },

  async onBuyNow() {
    // 先加入购物车
    await this.onAddToCart()

    // 跳转到购物车页面
    wx.switchTab({
      url: '/pages/cart/index'
    })
  },

  updateCartBadge() {
    StorageService.getCartCount().then(count => {
      if (count > 0) {
        wx.setTabBarBadge({
          index: 2,  // 购物车在tabBar的索引
          text: count.toString()
        })
      } else {
        wx.removeTabBarBadge({
          index: 2
        })
      }
    })
  }
})
```

### 3. API调用封装
```javascript
// services/api.js
const AuthService = require('./auth')

class ApiService {
  constructor() {
    this.baseUrl = 'https://your-domain.com/api'
  }

  async call(functionName, params = {}, options = {}) {
    try {
      // 检查是否需要登录
      if (options.requireAuth !== false) {
        await AuthService.checkLogin()
      }

      // 调用云函数
      const result = await wx.cloud.callFunction({
        name: functionName,
        data: {
          ...params,
          ...this.getAuthData()
        }
      })

      return result.result
    } catch (error) {
      console.error('API调用失败:', error)
      throw error
    }
  }

  getAuthData() {
    const openid = AuthService.getOpenId()
    return openid ? { _openid: openid } : {}
  }

  // 产品相关API
  async getProducts(params) {
    return await this.call('getProducts', params)
  }

  async getProductDetail(productId) {
    return await this.call('getProductDetail', { productId })
  }

  async getSKUInventory(params) {
    return await this.call('getSKUInventory', params)
  }

  // 购物车相关API
  async addToCart(skuId, quantity) {
    return await this.call('manageCart', {
      action: 'add',
      params: { skuId, quantity, reserve: true }
    })
  }

  async getCart() {
    return await this.call('manageCart', { action: 'list' })
  }

  // 订单相关API
  async createOrder(orderData) {
    return await this.call('createOrder', {
      action: 'create',
      params: orderData
    })
  }

  async wechatPay(orderId) {
    return await this.call('wechatPay', {
      action: 'create',
      params: { orderId }
    })
  }

  // 用户相关API
  async getUserInfo() {
    return await this.call('getUserInfo', { action: 'profile' })
  }

  // 社区相关API
  async getPosts(params) {
    return await this.call('getPosts', {
      action: 'list',
      params
    })
  }
}

module.exports = new ApiService()
```

## 部署和运维

### 1. 部署清单
- [ ] 前置条件检查
  - [ ] 微信小程序认证完成
  - [ ] 微信支付商户号配置
  - [ ] 腾讯云服务开通
- [ ] 域名和SSL证书配置

- [ ] 项目配置
  - [ ] AppID和AppSecret配置
  - [ ] 微信支付参数配置
  - [ ] 管理员OpenID白名单配置
  - [ ] 环境变量配置完成

- [ ] 数据库初始化
  - [ ] 创建数据库集合和索引
  - [ ] 初始化系统配置数据
  - [ ] 导入示例产品数据
  - [ ] 配置管理员账户

- [ ] 云函数部署
  - [ ] 部署所有云函数
  - [ ] 配置云函数环境变量
  - [ ] 测试云函数连通性
  - [ ] 配置微信支付回调

### 2. 上线流程
```bash
# 1. 上传代码
git add .
git commit -m "feat: 完成茶叶商城核心功能"
git push origin 1-tea-ecommerce

# 2. 在微信开发者工具中上传代码
# 选择云开发环境
# 点击上传

# 3. 部署云函数
cd cloud/functions
npm run deploy

# 4. 测试核心功能
# - 产品浏览和搜索
# - 购物车操作
# - 订单创建和支付
# - 用户登录和权限验证
```

### 3. 监控和维护
```javascript
// 云函数监控中间件
const monitorMiddleware = async (event, context) => {
  const startTime = Date.now()
  const traceId = context.request_id || generateTraceId()

  try {
    const result = await next(event, context)
    const duration = Date.now() - startTime

    // 记录成功日志
    console.log('API_SUCCESS', {
      traceId,
      action: event.action,
      duration,
      userOpenid: event.user?._openid
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    // 记录错误日志
    console.error('API_ERROR', {
      traceId,
      action: event.action,
      duration,
      error: error.message,
      userOpenid: event.user?._openid
    })

    throw error
  }
}
```

## 常见问题

### 1. 开发环境问题
**问题**: 微信开发者工具报错"云函数调用失败"
**解决**:
- 检查云函数是否正确部署
- 验证环境ID是否配置正确
- 确认云函数依赖是否安装完成
- 检查网络权限和安全规则

### 2. 支付问题
**问题**: 微信支付调起失败
**解决**:
- 验证商户号配置是否正确
- 检查支付参数是否正确
- 确认域名是否已添加到支付白名单
- 测试支付目录是否正确配置

### 3. 数据库问题
**问题**: 数据读写权限失败
**解决**:
- 检查数据库安全规则配置
- 验证云函数环境变量
- 确认数据库索引是否创建
- 测试数据库连接状态

### 4. 内容审核问题
**问题**: 社区内容审核失败
**解决**:
- 验证腾讯云内容安全API配置
- 检查API密钥是否正确
- 测试内容格式是否符合要求
- 确认API调用频率限制

## 技术支持

- **微信小程序官方文档**: https://developers.weixin.qq.com/miniprogram/dev/
- **微信云开发文档**: https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html
- **微信支付文档**: https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml
- **腾讯云内容安全**: https://cloud.tencent.com/document/product/436/121075

这个快速开始指南提供了完整的开发、部署和运维指导，帮助团队快速上手茶叶商城系统的开发工作。