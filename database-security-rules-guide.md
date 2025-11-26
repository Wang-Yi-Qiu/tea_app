# 微信云数据库安全规则配置指南

## 1. 微信云数据库权限规则的详细语法和配置方式

### 1.1 基础语法结构

微信云数据库安全规则基于JSON格式，主要包含以下关键字段：

```json
{
  "read": {
    "condition": "访问控制条件"
  },
  "write": {
    "condition": "写入控制条件"
  }
}
```

### 1.2 认证系统变量

微信云开发提供以下内置认证变量：

- `auth.openid`: 当前用户的微信openid
- `auth.appid`: 当前小程序的appid
- `auth.uid`: 用户的唯一标识符
- `auth.isSystem`: **系统调用标识**（关键）
- `auth.isAnonymous`: 是否匿名用户

### 1.3 数据访问变量

- `resource.data`: 文档数据
- `resource._id`: 文档ID
- `request.data`: 请求写入的数据

## 2. auth.isSystem == true的具体实现和使用场景

### 2.1 核心概念

`auth.isSystem == true` 是微信云开发中的系统级权限标识，用于标识请求是否来自云函数或管理后台等可信源。

### 2.2 使用场景

1. **云函数代理访问**：禁止客户端直接写入，强制通过云函数处理
2. **管理后台操作**：仅允许系统级操作直接访问数据库
3. **批量数据处理**：系统初始化或数据迁移时的安全访问
4. **定时任务**：后台定时任务的安全数据访问

### 2.3 实现方式

```json
{
  "write": "auth.isSystem == true"
}
```

这个规则表示：**只有系统调用（云函数、管理后台等）才能进行写入操作**。

## 3. 禁止客户端直接写入，强制通过云函数代理

### 3.1 基础配置

```json
{
  "read": "auth.openid != null",  // 登录用户可读
  "write": "auth.isSystem == true"  // 仅系统可写
}
```

### 3.2 分层权限控制

```json
{
  "read": {
    "condition": "auth.openid != null",
    "fields": {
      "sensitive_field": "auth.openid == resource.data.owner_openid"
    }
  },
  "write": "auth.isSystem == true"
}
```

### 3.3 云函数实现示例

```javascript
// 云函数：createOrder
const cloud = require("wx-server-sdk");
cloud.init();

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();

  // 数据验证
  if (!event.product_id || !event.quantity || !event.address) {
    return { success: false, error: "缺少必要参数" };
  }

  // 创建订单数据
  const orderData = {
    openid: wxContext.OPENID,
    product_id: event.product_id,
    quantity: event.quantity,
    address: event.address,
    total_amount: event.total_amount,
    status: "pending",
    create_time: new Date(),
    update_time: new Date()
  };

  // 通过云函数写入数据库（拥有auth.isSystem权限）
  const result = await db.collection('orders').add({
    data: orderData
  });

  return {
    success: true,
    order_id: result._id,
    order_data: orderData
  };
};
```

## 4. 各集合的安全规则配置

### 4.1 orders 集合（订单管理）

```json
{
  "read": {
    "condition": "auth.openid == resource.data.openid || auth.isSystem == true",
    "description": "用户只能查看自己的订单，系统可查看所有订单"
  },
  "write": {
    "condition": "auth.isSystem == true",
    "description": "仅允许系统通过云函数创建和更新订单"
  },
  "fields": {
    "status": {
      "write": "auth.isSystem == true",
      "description": "订单状态只能由系统更新"
    },
    "payment_info": {
      "read": "auth.isSystem == true",
      "write": "auth.isSystem == true",
      "description": "支付信息仅系统可读写"
    }
  }
}
```

### 4.2 pointRecords 集合（积分记录）

```json
{
  "read": {
    "condition": "auth.openid == resource.data.user_openid || auth.isSystem == true",
    "description": "用户只能查看自己的积分记录，系统可查看所有记录"
  },
  "write": "auth.isSystem == true",
  "fields": {
    "user_openid": {
      "condition": "resource.data.user_openid == auth.openid || auth.isSystem == true",
      "description": "用户openid字段只能设置为自己或由系统设置"
    },
    "points_change": {
      "condition": "auth.isSystem == true",
      "description": "积分变更只能由系统操作"
    },
    "transaction_type": {
      "condition": "auth.isSystem == true",
      "description": "交易类型只能由系统定义"
    }
  }
}
```

### 4.3 admin_users 集合（管理员用户）

```json
{
  "read": {
    "condition": "auth.isSystem == true",
    "description": "仅系统可读取管理员列表"
  },
  "write": "auth.isSystem == true",
  "description": "仅系统可写入管理员配置"
}
```

### 4.4 products 集合（商品信息）

```json
{
  "read": {
    "condition": "auth.openid != null || auth.isSystem == true",
    "description": "所有登录用户可查看商品信息"
  },
  "write": "auth.isSystem == true",
  "description": "仅系统可创建和更新商品信息"
},
"fields": {
  "inventory_count": {
    "read": "auth.isSystem == true",
    "write": "auth.isSystem == true",
    "description": "库存信息仅系统可读写"
  },
  "cost_price": {
    "read": "auth.isSystem == true",
    "write": "auth.isSystem == true",
    "description": "成本价格仅系统可读写"
  },
  "specifications": {
    "read": "auth.openid != null || auth.isSystem == true",
    "write": "auth.isSystem == true",
    "description": "规格信息所有用户可读，仅系统可写"
  }
}
```

### 4.5 community_posts 集合（社区帖子）

```json
{
  "read": {
    "condition": "(resource.data.status == 'approved' && auth.openid != null) ||
                  auth.openid == resource.data.author_openid ||
                  auth.isSystem == true",
    "description": "用户可查看已审核的帖子，作者可查看自己的所有帖子，系统可查看所有"
  },
  "write": {
    "condition": "auth.openid == resource.data.author_openid || auth.isSystem == true",
    "description": "作者可创建帖子，系统可修改状态和内容"
  },
  "fields": {
    "status": {
      "write": "auth.isSystem == true",
      "description": "审核状态只能由系统更新"
    },
    "author_openid": {
      "condition": "resource.data.author_openid == auth.openid || auth.isSystem == true",
      "description": "作者openid只能设置为自己或由系统设置"
    }
  }
}
```

## 5. 读写权限的精细化控制

### 5.1 基于角色的访问控制（RBAC）

```json
{
  "read": {
    "condition": "auth.isSystem == true ||
                  (auth.openid != null && resource.data.visibility == 'public')"
  },
  "write": {
    "condition": "auth.isSystem == true ||
                  (auth.openid == resource.data.owner_openid &&
                   ['edit', 'admin'].includes(resource.data.user_role))"
  }
}
```

### 5.2 时间窗口限制

```json
{
  "write": {
    "condition": "auth.isSystem == true ||
                  (auth.openid == resource.data.author_openid &&
                   (resource.data.create_time == null ||
                    (new Date().getTime() - resource.data.create_time) < 3600000))"
  }
}
```

### 5.3 数据完整性验证

```json
{
  "write": {
    "condition": "auth.isSystem == true &&
                  request.data.required_fields &&
                  request.data.timestamp > 0"
  }
}
```

## 6. 安全规则的测试和验证方法

### 6.1 本地测试

使用微信开发者工具的数据库安全规则测试功能：

```javascript
// 测试读取权限
db.collection('orders').where({
  _openid: '{test_openid}'
}).get()

// 测试写入权限
db.collection('orders').add({
  data: {
    openid: '{test_openid}',
    product_id: 'test_product',
    // ... 其他字段
  }
})
```

### 6.2 云函数测试

```javascript
// 测试云函数系统权限
const testCloudFunction = async () => {
  try {
    const result = await wx.cloud.callFunction({
      name: 'orderManager',
      data: {
        action: 'create',
        orderData: {
          product_id: 'test_product',
          quantity: 1
        }
      }
    });
    console.log('云函数调用成功:', result);
  } catch (error) {
    console.error('云函数调用失败:', error);
  }
};
```

### 6.3 安全规则验证清单

#### 6.3.1 权限矩阵测试

| 集合 | 用户读取 | 用户写入 | 系统读取 | 系统写入 | 测试结果 |
|------|----------|----------|----------|----------|----------|
| orders | ✓ | ✗ | ✓ | ✓ | 通过 |
| pointRecords | ✓ | ✗ | ✓ | ✓ | 通过 |
| admin_users | ✗ | ✗ | ✓ | ✓ | 通过 |
| products | ✓ | ✗ | ✓ | ✓ | 通过 |
| community_posts | ✓* | ✓* | ✓ | ✓ | 通过 |

* 仅限特定条件下

#### 6.3.2 数据访问测试用例

```javascript
const securityTests = [
  {
    name: "用户查看自己订单",
    collection: "orders",
    operation: "read",
    condition: "auth.openid == resource.data.openid",
    expectedResult: "success"
  },
  {
    name: "用户查看他人订单",
    collection: "orders",
    operation: "read",
    condition: "auth.openid != resource.data.openid",
    expectedResult: "denied"
  },
  {
    name: "用户直接创建订单",
    collection: "orders",
    operation: "write",
    condition: "auth.isSystem == false",
    expectedResult: "denied"
  },
  {
    name: "系统创建订单",
    collection: "orders",
    operation: "write",
    condition: "auth.isSystem == true",
    expectedResult: "success"
  }
];
```

### 6.4 监控和日志

```javascript
// 云函数中添加安全日志
const securityLogger = async (operation, collection, result) => {
  const logData = {
    timestamp: new Date(),
    operation: operation,
    collection: collection,
    result: result,
    user_openid: cloud.getWXContext().OPENID,
    ip: cloud.getWXContext().CLIENTIP
  };

  await db.collection('security_logs').add({
    data: logData
  });
};
```

## 7. 最佳实践总结

### 7.1 核心原则

1. **最小权限原则**：仅授予必要的最小权限
2. **系统优先原则**：关键操作通过`auth.isSystem`限制为系统级访问
3. **数据隔离原则**：用户只能访问自己的数据
4. **审计日志原则**：记录所有敏感操作的访问日志

### 7.2 配置建议

1. **默认拒绝**：所有集合默认禁止写入，仅允许必要的读取
2. **分层验证**：在集合级别和字段级别都设置权限控制
3. **云函数代理**：所有业务逻辑通过云函数实现，利用`auth.isSystem`权限
4. **定期审计**：定期检查安全规则配置和访问日志

### 7.3 部署检查清单

- [ ] 所有敏感集合的写入权限设置为`auth.isSystem == true`
- [ ] 用户数据的读取权限基于`auth.openid`进行隔离
- [ ] 管理员相关集合仅允许系统访问
- [ ] 云函数正确实现了数据验证和权限检查
- [ ] 安全规则测试覆盖所有关键场景
- [ ] 配置了访问日志和监控机制
- [ ] 建立了安全规则变更的审核流程

通过以上配置，可以确保微信小程序数据库的安全访问，有效防止未授权的数据操作，同时保证业务功能的正常运行。