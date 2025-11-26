# 微信小程序茶叶商城系统 - 数据模型设计

**版本**: 1.0 | **日期**: 2025-11-26 | **基于**: `/specs/1-tea-ecommerce/spec.md`

## 架构概述

### 技术栈选择
- **前端**: 微信小程序原生框架 + TDesign UI组件库
- **后端**: 微信云开发 + 云函数
- **数据库**: 微信云数据库 (NoSQL文档数据库)
- **支付**: 微信支付API
- **内容安全**: 腾讯云内容安全API
- **身份验证**: 微信OpenID + RBAC权限控制

### 数据库设计原则
1. **云函数独占原则**: 所有CRUD操作通过云函数执行，前端禁止直接数据库访问
2. **文档数据模型**: 使用NoSQL文档数据库，支持嵌套结构和动态字段
3. **SKU矩阵生成**: 基于产品规格配置动态生成SKU组合
4. **实时库存同步**: 通过云函数确保库存数据一致性

## 核心数据模型

### 1. 产品相关数据模型

#### TeaProduct (茶叶产品)
```javascript
{
  _id: "product_12345",           // 文档ID
  _openid: "admin_openid",          // 创建者OpenID (仅管理员)

  // 基本信息
  name: "龙井茶叶",                  // 产品名称
  description: "正宗西湖龙井，清香淡雅",  // 产品描述
  category: "绿茶",                   // 产品分类
  brand: "西湖茶庄",                  // 品牌

  // 图片资源
  images: [
    {
      url: "https://...",
      type: "main",                   // main, detail, package
      alt: "龙井茶叶主图"
    }
  ],

  // 规格配置 (用于生成SKU矩阵)
  specs: {
    materials: [                      // 材质规格
      {
        id: "material_1",
        name: "明前茶",
        price: 128.00,                // 基础价格加成
        description: "清明前采摘的嫩芽"
      },
      {
        id: "material_2",
        name: "雨前茶",
        price: 88.00,
        description: "谷雨前采摘的茶叶"
      }
    ],
    capacities: [                     // 容量规格
      {
        id: "capacity_1",
        name: "50g",
        price: 0.00,                 // 基础价格
        description: "50克装"
      },
      {
        id: "capacity_2",
        name: "100g",
        price: 168.00,               // 容量价格加成
        description: "100克装"
      },
      {
        id: "capacity_3",
        name: "200g",
        price: 298.00,
        description: "200克装"
      }
    ],
    grades: [                         // 等级规格
      {
        id: "grade_1",
        name: "特级",
        price: 58.00,                 // 等级价格加成
        description: "最高品质"
      },
      {
        id: "grade_2",
        name: "一级",
        price: 28.00,
        description: "优质茶叶"
      }
    ]
  },

  // 基础价格
  basePrice: 88.00,                  // 基础价格 (各规格叠加计算)

  // 状态管理
  status: "active",                   // active, inactive, deleted
  sortOrder: 100,                    // 显示排序

  // 时间戳
  createTime: new Date(),            // 创建时间
  updateTime: new Date(),            // 更新时间

  // SEO和搜索
  tags: ["绿茶", "明前茶", "西湖"], // 搜索标签
  searchKeywords: "龙井,绿茶,明前茶" // 搜索关键词
}
```

#### SKU (库存单位)
```javascript
{
  _id: "sku_12345",                 // 文档ID
  productId: "product_12345",         // 关联产品ID

  // 规格组合
  combination: {
    materialId: "material_1",          // 材质ID
    capacityId: "capacity_2",          // 容量ID
    gradeId: "grade_1"                 // 等级ID
  },

  // 规格显示名称
  specName: "明前茶 100g 特级",      // 规格组合显示名

  // 价格计算
  price: 342.00,                     // 计算后的最终价格
    // basePrice + materialPrice + capacityPrice + gradePrice
    // 88.00 + 128.00 + 168.00 + 58.00 = 442.00

  // 库存管理
  inventory: {
    total: 100,                        // 总库存
    available: 85,                     // 可用库存
    reserved: 15                        // 预留库存 (未付款订单)
  },

  // SKU状态
  status: "active",                   // active, inactive, out_of_stock

  // 商品编码
  skuCode: "LJ_MP_100G_S",           // 商品编码 (用于管理)

  // 时间戳
  createTime: new Date(),
  updateTime: new Date()
}
```

### 2. 订单相关数据模型

#### Order (订单)
```javascript
{
  _id: "order_12345",                // 文档ID
  orderNo: "ORDER202511260001",       // 订单号

  // 用户信息
  _openid: "user_openid",             // 用户OpenID
  userInfo: {
    nickname: "茶友小明",
    avatarUrl: "https://...",
    phone: "138****1234"              // 脱敏手机号
  },

  // 订单状态
  status: "pending_payment",          // pending_payment, paid, processing, shipped, completed, cancelled
  paymentStatus: "unpaid",            // unpaid, paid, refunded

  // 商品清单
  items: [
    {
      skuId: "sku_12345",
      productId: "product_12345",
      specName: "明前茶 100g 特级",
      price: 442.00,                 // 下单时价格
      quantity: 2,                    // 数量
      subtotal: 884.00                // 小计
    }
  ],

  // 金额计算
  amount: {
    subtotal: 884.00,                 // 商品小计
    shipping: 0.00,                    // 运费
    discount: 0.00,                    // 优惠金额
    pointsUsed: 0,                     // 使用积分
    pointsValue: 0.00,                  // 积分抵扣金额
    total: 884.00                     // 总金额
  },

  // 收货信息
  shipping: {
    name: "小明",
    phone: "13800138000",
    province: "浙江省",
    city: "杭州市",
    district: "西湖区",
    address: "西湖大道1号",
    postalCode: "310000"
  },

  // 支付信息
  payment: {
    method: "wechat_pay",              // wechat_pay, points
    transactionId: "wx123456789",     // 微信支付交易号
    payTime: null,                      // 支付时间
    callbackTime: null                   // 支付回调时间
  },

  // 积分信息
  points: {
    earned: 88,                         // 获得积分
    used: 0,                           // 使用积分
    net: 88                            // 净获得积分
  },

  // 时间戳
  createTime: new Date(),             // 下单时间
  updateTime: new Date(),             // 更新时间
  payTime: null,                      // 支付时间
  shipTime: null,                     // 发货时间
  completeTime: null                    // 完成时间
}
```

### 3. 用户相关数据模型

#### User (用户)
```javascript
{
  _id: "user_12345",                 // 文档ID
  _openid: "user_openid",             // 微信OpenID (唯一标识)

  // 基本信息
  profile: {
    nickname: "茶友小明",
    avatarUrl: "https://...",
    gender: 1,                         // 0-未知, 1-男, 2-女
    phone: "13800138000",               // 手机号
    birthday: "1990-01-01",            // 生日
    province: "浙江省",
    city: "杭州市"
  },

  // 积分系统
  points: {
    current: 1250,                      // 当前积分
    total: 5000,                       // 累计获得积分
    used: 3750                         // 累计使用积分
  },

  // 用户状态
  status: "active",                   // active, inactive, banned

  // 会员等级
  memberLevel: {
    level: "gold",                      // bronze, silver, gold, diamond
    name: "黄金会员",
    discount: 0.95,                    // 会员折扣
    benefits: ["95折优惠", "专属客服"]  // 会员权益
  },

  // 统计数据
  statistics: {
    orderCount: 15,                     // 订单数量
    totalAmount: 5680.00,              // 累计消费
    avgOrderAmount: 378.67,            // 平均订单金额
    lastOrderTime: new Date()            // 最后下单时间
  },

  // 收货地址
  addresses: [
    {
      id: "address_1",
      name: "小明",
      phone: "13800138000",
      province: "浙江省",
      city: "杭州市",
      district: "西湖区",
      address: "西湖大道1号",
      postalCode: "310000",
      isDefault: true                    // 默认地址
    }
  ],

  // 偏好设置
  preferences: {
    notifications: true,                // 接收通知
    newsletter: false,                  // 订阅邮件
    teaTypes: ["绿茶", "红茶", "乌龙茶"] // 喜好茶类
  },

  // 时间戳
  createTime: new Date(),             // 注册时间
  updateTime: new Date(),             // 更新时间
  lastLoginTime: new Date()           // 最后登录时间
}
```

#### PointsTransaction (积分交易记录)
```javascript
{
  _id: "points_12345",              // 文档ID
  _openid: "user_openid",             // 用户OpenID

  // 交易信息
  transaction: {
    type: "earn",                       // earn, use, refund, admin_adjust
    amount: 88,                         // 积分数量
    description: "购物获得积分",          // 交易描述
    orderId: "order_12345",             // 关联订单ID (可选)
    refType: "order",                   // order, refund, manual
    refId: "order_12345"               // 关联ID
  },

  // 交易前后余额
  balance: {
    before: 1162,                       // 交易前余额
    after: 1250,                        // 交易后余额
    change: 88                            // 变化量
  },

  // 有效期
  validity: {
    expiresAt: new Date("2026-11-26"), // 积分过期时间
    isExpired: false                     // 是否已过期
  },

  // 状态
  status: "active",                   // active, expired, cancelled

  // 时间戳
  createTime: new Date()              // 交易时间
}
```

### 4. 社区内容数据模型

#### CommunityPost (社区帖子)
```javascript
{
  _id: "post_12345",                 // 文档ID
  _openid: "user_openid",             // 发布者OpenID

  // 内容信息
  content: {
    text: "今天品尝了明前龙井，香气清雅，口感甘甜...", // 文本内容
    images: [                          // 图片内容
      {
        url: "https://...",
        width: 800,
        height: 600,
        description: "龙井茶叶汤色"
      }
    ],
    tags: ["龙井茶", "品茶体验"]       // 用户标签
  },

  // 审核状态
  moderation: {
    status: "pending",                  // pending, approved, rejected
    reviewedBy: "admin_openid",          // 审核员OpenID
    reviewTime: null,                    // 审核时间
    reason: "",                          // 拒绝原因
    autoModerated: true,                // 是否自动审核
    riskLevel: "low"                    // 风险等级: low, medium, high
  },

  // 互动数据
  engagement: {
    likes: 12,                          // 点赞数
    comments: 3,                        // 评论数
    shares: 1,                          // 分享数
    views: 156                          // 浏览数
  },

  // 帖子分类
  category: "tea_experience",          // tea_experience, tea_knowledge, tea_culture

  // 状态
  status: "published",                // draft, published, hidden, deleted

  // 时间戳
  createTime: new Date(),             // 创建时间
  updateTime: new Date(),             // 更新时间
  publishTime: new Date()             // 发布时间
}
```

#### Comment (评论)
```javascript
{
  _id: "comment_12345",              // 文档ID
  postId: "post_12345",               // 关联帖子ID
  _openid: "user_openid",             // 评论者OpenID

  // 评论内容
  content: {
    text: "确实很香的龙井茶，我也很喜欢这种清雅的口感。",
    replyTo: "comment_12344",           // 回复的评论ID (可选)
    images: []                          // 评论图片
  },

  // 审核状态
  moderation: {
    status: "approved",                 // pending, approved, rejected
    reviewedBy: null,                   // 审核员OpenID
    reviewTime: new Date(),             // 审核时间
    reason: ""                          // 拒绝原因
  },

  // 互动数据
  engagement: {
    likes: 2,                          // 点赞数
    replies: 0                          // 回复数
  },

  // 状态
  status: "published",                // published, hidden, deleted

  // 时间戳
  createTime: new Date()              // 评论时间
}
```

### 5. 管理员数据模型

#### AdminUser (管理员)
```javascript
{
  _id: "admin_12345",                // 文档ID
  _openid: "admin_openid",            // 微信OpenID

  // 基本信息
  profile: {
    name: "张管理员",
    avatarUrl: "https://...",
    phone: "13900139000",
    email: "admin@teamall.com"
  },

  // 角色权限 (RBAC)
  role: {
    id: "super_admin",                 // 角色ID
    name: "超级管理员",                 // 角色名称
    permissions: [                      // 权限列表
      "product.manage",                // 产品管理
      "order.manage",                  // 订单管理
      "user.manage",                   // 用户管理
      "community.moderate",           // 社区审核
      "points.manage",                 // 积分管理
      "system.config"                  // 系统配置
    ]
  },

  // 状态
  status: "active",                   // active, inactive, suspended

  // 登录记录
  loginHistory: [
    {
      loginTime: new Date(),            // 登录时间
      ipAddress: "192.168.1.100",     // IP地址
      userAgent: "Mozilla/5.0...",     // 用户代理
      location: "浙江省杭州市"          // 登录地点
    }
  ],

  // 操作日志
  auditLogs: [
    {
      action: "CREATE_PRODUCT",         // 操作类型
      resource: "product_12345",       // 操作资源
      details: "创建龙井茶叶产品",       // 操作详情
      ipAddress: "192.168.1.100",     // IP地址
      timestamp: new Date()            // 操作时间
    }
  ],

  // 时间戳
  createTime: new Date(),             // 创建时间
  updateTime: new Date(),             // 更新时间
  lastLoginTime: new Date()           // 最后登录时间
}
```

### 6. 系统配置数据模型

#### SystemConfig (系统配置)
```javascript
{
  _id: "config_main",                // 文档ID (固定)

  // 积分配置
  points: {
    earnRate: 0.01,                    // 积分获得比例 (消费1元获得0.01积分)
    redeemRate: 100,                    // 积分抵扣比例 (100积分=1元)
    minOrderAmount: 10.00,              // 最低订单金额 (可使用积分)
    maxPointsUse: 0.5,                  // 最大积分使用比例 (不超过订单金额50%)
    expireDays: 365                      // 积分有效期 (天)
  },

  // 运费配置
  shipping: {
    freeAmount: 199.00,                // 免运费金额
    defaultFee: 12.00                   // 默认运费
  },

  // 内容审核配置
  moderation: {
    autoApproveThreshold: 0.1,        // 自动通过阈值 (风险评分)
    manualReviewThreshold: 0.7,        // 人工审核阈值
    enabledContentTypes: ["text", "image"] // 启用审核的内容类型
  },

  // 微信支付配置
  payment: {
    mchId: "1234567890",              // 商户号
    notifyUrl: "https://...",           // 支付回调地址
    keyVersion: "v1"                   // 密钥版本
  },

  // 更新时间
  updateTime: new Date()              // 最后更新时间
}
```

## 数据库集合设计

### 集合列表
1. **products** - 茶叶产品集合
2. **skus** - SKU库存集合
3. **orders** - 订单集合
4. **users** - 用户集合
5. **points_transactions** - 积分交易集合
6. **community_posts** - 社区帖子集合
7. **comments** - 评论集合
8. **admin_users** - 管理员集合
9. **system_configs** - 系统配置集合

### 索引设计
```javascript
// products集合索引
db.collection('products').createIndex({
  "status": 1,
  "sortOrder": 1,
  "createTime": -1
})

// skus集合索引
db.collection('skus').createIndex({
  "productId": 1,
  "status": 1
})

db.collection('skus').createIndex({
  "inventory.available": 1,
  "status": 1
})

// orders集合索引
db.collection('orders').createIndex({
  "_openid": 1,
  "createTime": -1
})

db.collection('orders').createIndex({
  "status": 1,
  "createTime": -1
})

// users集合索引 (基于_openid自动创建唯一索引)
db.collection('users').createIndex({
  "status": 1,
  "createTime": -1
})

// community_posts集合索引
db.collection('community_posts').createIndex({
  "moderation.status": 1,
  "createTime": -1
})

db.collection('community_posts').createIndex({
  "status": 1,
  "category": 1,
  "createTime": -1
})
```

## 数据一致性保障

### 1. 事务操作
- 积分使用和抵扣必须在同一事务中完成
- 库存预留和释放必须保证原子性
- 订单状态变更必须关联库存变化

### 2. 并发控制
- 使用库存预留机制防止超卖
- 积分操作使用乐观锁防止并发问题
- 支付回调处理使用幂等性设计

### 3. 数据校验
- SKU价格计算必须通过公式校验
- 订单金额必须重新计算验证
- 用户积分余额必须实时校验

这个数据模型设计遵循了微信小程序云开发的最佳实践，确保了数据一致性、安全性和可扩展性。