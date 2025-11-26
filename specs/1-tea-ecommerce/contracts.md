# 微信小程序茶叶商城系统 - API合约设计

**版本**: 1.0 | **日期**: 2025-11-26 | **基于**: `/specs/1-tea-ecommerce/data-model.md`

## 合约概述

### API设计原则
1. **云函数独占**: 所有业务逻辑通过云函数实现，前端无直接数据库访问
2. **RESTful设计**: 遵循REST API设计原则，统一响应格式
3. **幂等性**: 关键操作支持幂等性调用，防止重复执行
4. **安全优先**: 所有操作包含身份验证和权限检查
5. **错误处理**: 统一错误码和错误信息，支持前端友好提示

### 通用响应格式
```javascript
{
  "errcode": 0,                      // 错误码：0-成功，其他-失败
  "errmsg": "success",               // 错误信息
  "data": {},                         // 业务数据
  "trace_id": "202511260001",        // 请求追踪ID
  "timestamp": 1603459200000          // 响应时间戳
}
```

### 错误码定义
```javascript
// 通用错误码
0: "成功",                           // SUCCESS
-1: "系统错误",                      // SYSTEM_ERROR
-2: "参数错误",                      // PARAM_ERROR
-3: "权限不足",                      // PERMISSION_DENIED
-4: "资源不存在",                    // RESOURCE_NOT_FOUND
-5: "资源已存在",                    // RESOURCE_ALREADY_EXISTS
-6: "操作频率过高",                   // RATE_LIMIT_EXCEEDED

// 业务错误码
1001: "用户不存在",                   // USER_NOT_FOUND
1002: "库存不足",                     // INSUFFICIENT_INVENTORY
1003: "订单不存在",                   // ORDER_NOT_FOUND
1004: "积分不足",                     // INSUFFICIENT_POINTS
1005: "内容违规",                     // CONTENT_VIOLATION
1006: "支付失败",                     // PAYMENT_FAILED
1007: "操作状态错误",                 // INVALID_STATUS

// 微信支付错误码
2001: "支付参数错误",                 // WECHAT_PAY_PARAM_ERROR
2002: "支付签名错误",                 // WECHAT_PAY_SIGN_ERROR
2003: "支付网络错误",                 // WECHAT_PAY_NETWORK_ERROR
2004: "支付用户取消",                 // WECHAT_PAY_USER_CANCEL
2005: "支付余额不足",                 // WECHAT_PAY_INSUFFICIENT_BALANCE
```

## 核心业务API

### 1. 产品相关API

#### 1.1 获取产品列表
```javascript
// 云函数名: getProducts
// 请求方式: POST
// 权限要求: 无需登录

{
  "action": "list",
  "params": {
    "category": "绿茶",               // 可选，产品分类
    "keyword": "龙井",               // 可选，搜索关键词
    "tags": ["明前茶"],               // 可选，标签筛选
    "status": "active",               // 可选，产品状态
    "page": 1,                       // 可选，页码，默认1
    "pageSize": 20,                  // 可选，每页数量，默认20
    "sortField": "createTime",         // 可选，排序字段
    "sortOrder": "desc"                // 可选，排序方向
  }
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "total": 50,                      // 总数量
    "page": 1,                        // 当前页
    "pageSize": 20,                   // 每页数量
    "totalPages": 3,                   // 总页数
    "products": [                     // 产品列表
      {
        "_id": "product_12345",
        "name": "龙井茶叶",
        "description": "正宗西湖龙井...",
        "category": "绿茶",
        "images": [
          {
            "url": "https://...",
            "type": "main",
            "alt": "龙井茶叶主图"
          }
        ],
        "basePrice": 88.00,
        "specs": {
          "materials": [
            {
              "id": "material_1",
              "name": "明前茶",
              "price": 128.00,
              "description": "清明前采摘的嫩芽"
            }
          ],
          "capacities": [
            {
              "id": "capacity_2",
              "name": "100g",
              "price": 168.00,
              "description": "100克装"
            }
          ],
          "grades": [
            {
              "id": "grade_1",
              "name": "特级",
              "price": 58.00,
              "description": "最高品质"
            }
          ]
        },
        "status": "active",
        "createTime": 1603459200000,
        "updateTime": 1603459200000
      }
    ]
  }
}
```

#### 1.2 获取产品详情
```javascript
// 云函数名: getProductDetail
// 请求方式: POST
// 权限要求: 无需登录

{
  "action": "detail",
  "params": {
    "productId": "product_12345"      // 必需，产品ID
  }
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "product": {
      "_id": "product_12345",
      "name": "龙井茶叶",
      "description": "正宗西湖龙井...",
      "category": "绿茶",
      "brand": "西湖茶庄",
      "images": [...],
      "specs": {
        "materials": [...],
        "capacities": [...],
        "grades": [...]
      },
      "basePrice": 88.00,
      "status": "active",
      "createTime": 1603459200000,
      "updateTime": 1603459200000
    },
    "skus": [                         // 生成的SKU列表
      {
        "_id": "sku_12345",
        "combination": {
          "materialId": "material_1",
          "capacitYId": "capacity_2",
          "gradeId": "grade_1"
        },
        "specName": "明前茶 100g 特级",
        "price": 442.00,
        "inventory": {
          "total": 100,
          "available": 85,
          "reserved": 15
        },
        "status": "active",
        "skuCode": "LJ_MP_100G_S"
      }
    ]
  }
}
```

#### 1.3 获取SKU库存信息
```javascript
// 云函数名: getSKUInventory
// 请求方式: POST
// 权限要求: 无需登录

{
  "action": "inventory",
  "params": {
    "skuIds": ["sku_12345", "sku_12346"], // SKU ID列表
    "productId": "product_12345"       // 可选，按产品查询
  }
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "skus": [
      {
        "_id": "sku_12345",
        "combination": {...},
        "specName": "明前茶 100g 特级",
        "price": 442.00,
        "inventory": {
          "total": 100,
          "available": 85,
          "reserved": 15,
          "lowStockThreshold": 10       // 低库存阈值
        },
        "status": "active"
      }
    ]
  }
}
```

### 2. 购物车和订单API

#### 2.1 添加到购物车
```javascript
// 云函数名: manageCart
// 请求方式: POST
// 权限要求: 需要用户登录

{
  "action": "add",
  "params": {
    "skuId": "sku_12345",             // 必需，SKU ID
    "quantity": 2,                     // 必需，数量
    "reserve": true                     // 可选，是否预留库存，默认false
  }
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "cartId": "cart_12345",
    "itemId": "cart_item_12345",
    "sku": {
      "_id": "sku_12345",
      "specName": "明前茶 100g 特级",
      "price": 442.00,
      "inventory": {
        "available": 83                // 预留后库存
      }
    },
    "quantity": 2,
    "subtotal": 884.00
  }
}
```

#### 2.2 获取购物车
```javascript
// 云函数名: manageCart
// 请求方式: POST
// 权限要求: 需要用户登录

{
  "action": "list"
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "cartId": "cart_12345",
    "items": [
      {
        "_id": "cart_item_12345",
        "skuId": "sku_12345",
        "productId": "product_12345",
        "productName": "龙井茶叶",
        "specName": "明前茶 100g 特级",
        "price": 442.00,
        "quantity": 2,
        "subtotal": 884.00,
        "inventory": {
          "available": 83
        },
        "status": "active"              // active, out_of_stock, removed
      }
    ],
    "summary": {
      "itemCount": 2,                // 商品种类数
      "quantity": 2,                  // 商品总数量
      "subtotal": 884.00,             // 商品小计
      "shipping": 0.00,               // 运费
      "discount": 0.00,               // 优惠
      "total": 884.00                 // 总计
    },
    "updateTime": 1603459200000
  }
}
```

#### 2.3 创建订单
```javascript
// 云函数名: createOrder
// 请求方式: POST
// 权限要求: 需要用户登录

{
  "action": "create",
  "params": {
    "items": [                         // 必需，商品列表
      {
        "skuId": "sku_12345",
        "quantity": 2,
        "price": 442.00               // 下单时价格（防止价格变动）
      }
    ],
    "shipping": {                      // 必需，收货信息
      "name": "小明",
      "phone": "13800138000",
      "province": "浙江省",
      "city": "杭州市",
      "district": "西湖区",
      "address": "西湖大道1号",
      "postalCode": "310000"
    },
    "usePoints": 100,                  // 可选，使用积分
    "remark": "请尽快发货",             // 可选，订单备注
    "reserveInventory": true            // 可选，预留库存，默认true
  }
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "orderId": "order_12345",
    "orderNo": "ORDER202511260001",
    "status": "pending_payment",
    "paymentStatus": "unpaid",
    "items": [...],
    "amount": {
      "subtotal": 884.00,
      "shipping": 0.00,
      "discount": 0.00,
      "pointsUsed": 100,
      "pointsValue": 1.00,
      "total": 883.00
    },
    "points": {
      "earned": 88,                   // 获得积分
      "used": 100,                   // 使用积分
      "net": -12                     // 净获得积分
    },
    "payment": {
      "method": "wechat_pay",
      "transactionId": null,
      "payTime": null,
      "expireTime": 1603459800000   // 支付过期时间（15分钟）
    },
    "createTime": 1603459200000
  }
}
```

#### 2.4 微信支付
```javascript
// 云函数名: wechatPay
// 请求方式: POST
// 权限要求: 需要用户登录

{
  "action": "create",
  "params": {
    "orderId": "order_12345"           // 必需，订单ID
  }
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "paymentParams": {
      "appId": "wx1234567890",
      "timeStamp": "16034592",
      "nonceStr": "5K8264ILTKCH16CQ",
      "package": "prepay_id=wx123456789",
      "signType": "MD5",
      "paySign": "C380BEC2BFD727A4B6845133519F3AD6"
    },
    "transactionId": "wx123456789",
    "expireTime": 1603459800000
  }
}
```

#### 2.5 支付回调处理（微信调用）
```javascript
// 云函数名: paymentCallback
// 请求方式: POST
// 权限要求: 微信服务器调用

// 微信支付回调数据
{
  "action": "callback",
  "params": {
    "return_code": "SUCCESS",
    "appid": "wx1234567890",
    "mch_id": "1234567890",
    "nonce_str": "5K8264ILTKCH16CQ",
    "sign": "C380BEC2BFD727A4B6845133519F3AD6",
    "result_code": "SUCCESS",
    "openid": "user_openid",
    "transaction_id": "420000045220211111501111111111",
    "out_trade_no": "ORDER202511260001",
    "total_fee": "88300",            // 分为单位
    "fee_type": "CNY"
  }
}

// 返回给微信的响应
{
  "return_code": "SUCCESS",
  "return_msg": "OK"
}
```

#### 2.6 获取订单列表
```javascript
// 云函数名: getOrders
// 请求方式: POST
// 权限要求: 需要用户登录

{
  "action": "list",
  "params": {
    "status": "paid",                 // 可选，订单状态
    "startDate": "2025-11-01",       // 可选，开始日期
    "endDate": "2025-11-30",         // 可选，结束日期
    "page": 1,
    "pageSize": 20
  }
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "total": 15,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1,
    "orders": [
      {
        "_id": "order_12345",
        "orderNo": "ORDER202511260001",
        "status": "paid",
        "paymentStatus": "paid",
        "items": [
          {
            "productId": "product_12345",
            "productName": "龙井茶叶",
            "specName": "明前茶 100g 特级",
            "price": 442.00,
            "quantity": 2,
            "subtotal": 884.00
          }
        ],
        "amount": {
          "total": 883.00
        },
        "shipping": {
          "name": "小明",
          "phone": "138****8000",
          "province": "浙江省",
          "city": "杭州市"
        },
        "createTime": 1603459200000,
        "payTime": 16034595000000
      }
    ]
  }
}
```

### 3. 用户相关API

#### 3.1 获取用户信息
```javascript
// 云函数名: getUserInfo
// 请求方式: POST
// 权限要求: 需要用户登录

{
  "action": "profile"
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "_openid": "user_openid",
    "profile": {
      "nickname": "茶友小明",
      "avatarUrl": "https://...",
      "phone": "13800138000",
      "province": "浙江省",
      "city": "杭州市"
    },
    "points": {
      "current": 1250,
      "total": 5000,
      "used": 3750
    },
    "memberLevel": {
      "level": "gold",
      "name": "黄金会员",
      "discount": 0.95,
      "benefits": ["95折优惠", "专属客服"]
    },
    "statistics": {
      "orderCount": 15,
      "totalAmount": 5680.00,
      "avgOrderAmount": 378.67,
      "lastOrderTime": 1603459200000
    },
    "addresses": [...]
  }
}
```

#### 3.2 获取积分记录
```javascript
// 云函数名: getPointsHistory
// 请求方式: POST
// 权限要求: 需要用户登录

{
  "action": "history",
  "params": {
    "type": "earn",                   // 可选，earn, use, refund
    "startDate": "2025-11-01",
    "endDate": "2025-11-30",
    "page": 1,
    "pageSize": 20
  }
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "total": 50,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3,
    "transactions": [
      {
        "_id": "points_12345",
        "transaction": {
          "type": "earn",
          "amount": 88,
          "description": "购物获得积分",
          "orderId": "order_12345"
        },
        "balance": {
          "before": 1162,
          "after": 1250,
          "change": 88
        },
        "createTime": 1603459200000
      }
    ]
  }
}
```

### 4. 社区内容API

#### 4.1 发布社区帖子
```javascript
// 云函数名: managePost
// 请求方式: POST
// 权限要求: 需要用户登录

{
  "action": "create",
  "params": {
    "content": {
      "text": "今天品尝了明前龙井，香气清香，口感甘甜...",
      "images": [
        {
          "url": "https://...",
          "description": "龙井茶叶汤色"
        }
      ],
      "tags": ["龙井茶", "品茶体验"]
    },
    "category": "tea_experience"       // tea_experience, tea_knowledge, tea_culture
  }
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "postId": "post_12345",
    "moderation": {
      "status": "pending",              // pending, approved, rejected
      "autoModerated": true,
      "riskLevel": "low"                // low, medium, high
    },
    "createTime": 1603459200000
  }
}
```

#### 4.2 获取社区帖子列表
```javascript
// 云函数名: getPosts
// 请求方式: POST
// 权限要求: 无需登录

{
  "action": "list",
  "params": {
    "category": "tea_experience",     // 可选，分类筛选
    "status": "published",            // 可选，状态筛选
    "keyword": "龙井",               // 可选，关键词搜索
    "page": 1,
    "pageSize": 20
  }
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "posts": [
      {
        "_id": "post_12345",
        "_openid": "user_openid",
        "userInfo": {
          "nickname": "茶友小明",
          "avatarUrl": "https://..."
        },
        "content": {
          "text": "今天品尝了明前龙井，香气清香...",
          "images": [
            {
              "url": "https://...",
              "description": "龙井茶叶汤色"
            }
          ],
          "tags": ["龙井茶", "品茶体验"]
        },
        "moderation": {
          "status": "approved",
          "riskLevel": "low"
        },
        "engagement": {
          "likes": 12,
          "comments": 3,
          "shares": 1,
          "views": 156
        },
        "category": "tea_experience",
        "status": "published",
        "createTime": 1603459200000,
        "publishTime": 1603459800000
      }
    ]
  }
}
```

### 5. 管理员API

#### 5.1 管理员登录验证
```javascript
// 云函数名: adminAuth
// 请求方式: POST
// 权限要求: 无需登录

{
  "action": "login",
  "params": {
    "openid": "admin_openid"           // 管理员微信OpenID
  }
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "admin": {
      "_id": "admin_12345",
      "_openid": "admin_openid",
      "profile": {
        "name": "张管理员",
        "avatarUrl": "https://...",
        "phone": "13900139000"
      },
      "role": {
        "id": "super_admin",
        "name": "超级管理员",
        "permissions": [
          "product.manage",
          "order.manage",
          "user.manage",
          "community.moderate",
          "points.manage",
          "system.config"
        ]
      }
    },
    "token": "admin_token_12345",     // 管理员会话令牌
    "expiresIn": 7200                // 过期时间（秒）
  }
}
```

#### 5.2 产品管理
```javascript
// 云函数名: manageProduct
// 请求方式: POST
// 权限要求: 需要管理员权限

// 创建产品
{
  "action": "create",
  "params": {
    "name": "龙井茶叶",
    "description": "正宗西湖龙井...",
    "category": "绿茶",
    "brand": "西湖茶庄",
    "images": [...],
    "specs": {
      "materials": [...],
      "capacities": [...],
      "grades": [...]
    },
    "basePrice": 88.00,
    "status": "active"
  }
}

// 更新产品
{
  "action": "update",
  "params": {
    "productId": "product_12345",
    "updateData": {
      "name": "特级龙井茶叶",
      "basePrice": 98.00
    }
  }
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "productId": "product_12345",
    "affectedSKUs": 9,                 // 受影响的SKU数量
    "updateTime": 1603459200000
  }
}
```

#### 5.3 订单管理
```javascript
// 云函数名: manageOrder
// 请求方式: POST
// 权限要求: 需要管理员权限

// 更新订单状态
{
  "action": "updateStatus",
  "params": {
    "orderId": "order_12345",
    "status": "shipped",               // paid, processing, shipped, completed
    "tracking": {
      "company": "顺丰快递",
      "number": "SF1234567890"
    },
    "remark": "已打包发货"
  }
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "orderId": "order_12345",
    "oldStatus": "processing",
    "newStatus": "shipped",
    "updateTime": 1603459200000
  }
}
```

#### 5.4 内容审核
```javascript
// 云函数名: moderateContent
// 请求方式: POST
// 权限要求: 需要社区审核权限

{
  "action": "approve",
  "params": {
    "postId": "post_12345",           // 帖子ID
    "decision": "approved",           // approved, rejected
    "reason": "",                     // 拒绝原因（当decision为rejected时）
    "reviewer": "admin_openid"        // 审核员OpenID
  }
}

// 响应
{
  "errcode": 0,
  "errmsg": "success",
  "data": {
    "postId": "post_12345",
    "status": "approved",
    "reviewer": "admin_openid",
    "reviewTime": 1603459200000
  }
}
```

## 安全和权限控制

### 1. 身份验证
```javascript
// 所有云函数都需要身份验证中间件
const authMiddleware = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  // 验证用户是否登录
  if (!OPENID) {
    return {
      errcode: -3,
      errmsg: "需要登录"
    }
  }

  // 验证管理员权限（管理员API）
  if (event.action.startsWith('admin.')) {
    const adminUser = await db.collection('admin_users')
      .where({
        _openid: OPENID,
        status: 'active'
      })
      .get()

    if (!adminUser.data.length) {
      return {
        errcode: -3,
        errmsg: "权限不足"
      }
    }

    // 添加管理员信息到event对象
    event.admin = adminUser.data[0]
  } else {
    // 添加用户信息到event对象
    event.user = await getUserInfo(OPENID)
  }

  return null  // 验证通过
}
```

### 2. 数据权限控制
```javascript
// 用户只能访问自己的数据
const userDataFilter = (openid, data) => {
  if (Array.isArray(data)) {
    return data.filter(item => item._openid === openid)
  }
  if (data && typeof data === 'object') {
    return data._openid === openid ? data : null
  }
  return null
}

// 管理员数据权限控制
const adminDataFilter = (admin, data) => {
  const permissions = admin.role.permissions

  if (!permissions.includes('user.manage')) {
    // 移除敏感用户信息
    delete data.phone
    delete data.email
  }

  if (!permissions.includes('system.config')) {
    // 移除系统配置信息
    delete data.config
  }

  return data
}
```

### 3. 频率限制
```javascript
// 基于用户ID的频率限制
const rateLimitMiddleware = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const key = `rate_limit:${OPENID}:${event.action}`

  const current = await redis.get(key)
  const limit = RATE_LIMITS[event.action] || 100

  if (current && parseInt(current) >= limit) {
    return {
      errcode: -6,
      errmsg: "操作频率过高"
    }
  }

  // 增加计数
  await redis.incr(key)
  await redis.expire(key, 3600)  // 1小时过期

  return null  // 通过
}

const RATE_LIMITS = {
  'wechatPay': 5,        // 支付限制
  'createOrder': 10,     // 创建订单限制
  'managePost': 20       // 发布帖子限制
}
```

## 数据库操作封装

### 1. 基础数据库操作
```javascript
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
      queryBuilder = queryBuilder.where(key, '==', query[key])
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
```

### 2. 业务数据服务
```javascript
class ProductService extends DatabaseService {
  // 生成SKU矩阵
  async generateSKU(productId) {
    const product = await this.getProduct(productId)
    const { materials, capacities, grades } = product.specs

    const skus = []

    // 生成所有规格组合
    for (const material of materials) {
      for (const capacity of capacities) {
        for (const grade of grades) {
          const price = product.basePrice + material.price + capacity.price + grade.price
          const specName = `${material.name} ${capacity.name} ${grade.name}`
          const skuCode = this.generateSKUCode(product.name, material, capacity, grade)

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
            status: 'active',
            skuCode
          }

          skus.push(sku)
        }
      }
    }

    // 批量创建SKU
    return await this.transaction(async (transaction) => {
      const results = []
      for (const sku of skus) {
        const skuId = await this.create('skus', sku, transaction)
        results.push({ _id: skuId, ...sku })
      }
      return results
    })
  }

  generateSKUCode(productName, material, capacity, grade) {
    const abbreviations = {
      '龙井': 'LJ',
      '明前茶': 'MP',
      '特级': 'S',
      '一级': 'F'
    }

    const productAbbr = abbreviations[productName] || 'PR'
    const materialAbbr = abbreviations[material.name] || 'MT'
    const gradeAbbr = abbreviations[grade.name] || 'GR'
    const capacityStr = capacity.name.replace('g', 'G')

    return `${productAbbr}_${materialAbbr}_${capacityStr}_${gradeAbbr}`
  }

  // 检查库存和预留
  async checkInventory(skuId, quantity) {
    const sku = await this.findById('skus', skuId)

    if (!sku || sku.status !== 'active') {
      throw new Error('SKU不存在或已下架')
    }

    if (sku.inventory.available < quantity) {
      throw new Error('库存不足')
    }

    return sku
  }

  // 预留库存
  async reserveInventory(skuId, quantity, orderId) {
    return await this.transaction(async (transaction) => {
      const sku = await this.checkInventory(skuId, quantity)

      // 更新库存
      await this.update('skus', skuId, {
        'inventory.available': sku.inventory.available - quantity,
        'inventory.reserved': sku.inventory.reserved + quantity
      }, transaction)

      // 记录预留记录
      await this.create('inventory_reservations', {
        skuId,
        quantity,
        orderId,
        status: 'active'
      }, transaction)

      return sku
    })
  }

  // 释放库存
  async releaseInventory(skuId, quantity, orderId) {
    return await this.transaction(async (transaction) => {
      const sku = await this.findById('skus', skuId)

      // 更新库存
      await this.update('skus', skuId, {
        'inventory.available': sku.inventory.available + quantity,
        'inventory.reserved': sku.inventory.reserved - quantity
      }, transaction)

      // 更新预留记录
      await this.db.collection('inventory_reservations')
        .where({
          skuId,
          orderId,
          status: 'active'
        })
        .update({
          data: {
            status: 'released',
            updateTime: new Date()
          }
        })

      return sku
    })
  }
}
```

这个API合约设计完整覆盖了微信小程序茶叶商城系统的核心功能，遵循了云函数独占原则，包含了完善的权限控制、错误处理和数据一致性保障机制。