# 新增图像组件说明

基于 shadcn/ui 设计风格，为茶叶商城小程序新增了以下图像组件：

## 1. 图片缩放组件 (image-zoom)

### 功能特性
- 点击图片放大查看
- 支持触摸缩放
- 优雅的动画效果
- 自适应屏幕尺寸

### 使用方法
```xml
<image-zoom
  src="{{imageUrl}}"
  width="300"
  height="200"
  mode="aspectFill"
  className="product-image"
  bindtap="onImageTap"
/>
```

### 属性说明
- `src`: 图片地址
- `width`: 初始宽度 (rpx)
- `height`: 初始高度 (rpx)
- `mode`: 图片裁剪模式
- `className`: 自定义样式类名

---

## 2. 评分组件 (rating)

### 功能特性
- 可交互式评分
- 支持半星显示
- 自定义最大值
- 多种尺寸和颜色
- 只读模式支持

### 使用方法
```xml
<rating
  value="{{productRating}}"
  max="5"
  size="24"
  color="#FFD700"
  readonly="{{false}}"
  bindchange="onRatingChange"
  className="product-rating"
/>
```

### 属性说明
- `value`: 当前评分数值
- `max`: 最大评分值
- `size`: 星星大小 (rpx)
- `color`: 星星颜色
- `readonly`: 是否只读
- `className`: 自定义样式类名

### 事件
- `change`: 评分改变事件 `{ value: number }`
- `hover`: 鼠标悬停事件 `{ value: number }`

---

## 3. 头像组组件 (avatar-group)

### 功能特性
- 头像堆叠显示
- 超出数量显示
- 在线状态指示
- 响应式布局

### 使用方法
```xml
<avatar-group
  avatars="{{userList}}"
  max="5"
  size="50"
  spacing="-20"
  bindavatartap="onUserTap"
  bindmoretap="onMoreUsers"
  className="user-avatars"
/>
```

### 属性说明
- `avatars`: 用户头像数组 `[ { avatar, name, status } ]`
- `max`: 最大显示数量
- `size`: 头像大小 (rpx)
- `spacing`: 重叠间距 (rpx)
- `className`: 自定义样式类名

### 数据格式
```javascript
const users = [
  {
    avatar: 'https://example.com/avatar1.jpg',
    name: '张三',
    status: 'online' // online, busy, offline
  },
  // ... 更多用户
]
```

### 事件
- `avatartap`: 头像点击事件 `{ avatar: object, index: number }`
- `moretap`: 更多用户点击事件 `{ count: number }`

---

## 4. 动画标签组件 (animated-badge)

### 功能特性
- 多种预设样式 (hot, new, sale, discount, default)
- 闪烁动画效果
- 多种尺寸
- 渐变背景

### 使用方法
```xml
<animated-badge
  text="热销"
  type="hot"
  size="medium"
  animated="{{true}}"
  bindtap="onBadgeTap"
  className="product-badge"
/>
```

### 属性说明
- `text`: 标签文字
- `type`: 标签类型 (`default`, `hot`, `new`, `sale`, `discount`)
- `size`: 标签尺寸 (`small`, `medium`, `large`)
- `animated`: 是否启用动画
- `className`: 自定义样式类名

### 标签类型
- `default`: 蓝紫渐变
- `hot`: 红色渐变 + 脉冲动画
- `new`: 蓝色渐变
- `sale`: 橙色渐变 + 脉冲动画
- `discount`: 绿色渐变

---

## 5. 流星空加载组件 (loading-stars)

### 功能特性
- 流星划过动画
- 自定义加载文字
- 全屏遮罩效果
- 模糊背景

### 使用方法
```xml
<loading-stars
  show="{{loading}}"
  text="正在加载中..."
  size="medium"
  className="page-loading"
/>
```

### 属性说明
- `show`: 是否显示加载
- `text`: 加载提示文字
- `size`: 动画尺寸 (`small`, `medium`, `large`)
- `className`: 自定义样式类名

---

## 演示页面

访问 `pages/demo/components` 查看所有组件的实际效果演示。

### 在产品列表页面的应用示例

#### 1. 产品图片缩放
```xml
<view class="product-image-container">
  <image-zoom
    src="{{item.image}}"
    width="350"
    height="250"
    mode="aspectFill"
    className="product-thumb"
  />
  <animated-badge
    wx:if="{{item.isHot}}"
    text="热销"
    type="hot"
    size="small"
    className="product-hot-badge"
  />
</view>
```

#### 2. 产品评分
```xml
<view class="product-rating">
  <rating
    value="{{item.rating}}"
    max="5"
    size="20"
    color="#FFD700"
    readonly="{{true}}"
    className="product-star-rating"
  />
  <text class="rating-text">{{item.rating}}分</text>
</view>
```

#### 3. 用户评价头像组
```xml
<view class="review-users">
  <avatar-group
    avatars="{{item.recentReviews}}"
    max="4"
    size="32"
    spacing="-12"
    className="review-avatars"
  />
  <text class="review-count">{{item.reviewCount}}人评价</text>
</view>
```

### 在产品详情页面的应用示例

#### 1. 产品图片轮播 + 缩放
```xml
<swiper class="product-images" bindchange="onImageChange">
  <swiper-item wx:for="{{product.images}}" wx:key="index">
    <image-zoom
      src="{{item}}"
      width="750"
      height="500"
      mode="aspectFit"
      className="product-detail-image"
    />
  </swiper-item>
</swiper>
```

#### 2. 促销标签
```xml
<view class="product-badges">
  <animated-badge
    wx:if="{{product.isNew}}"
    text="新品"
    type="new"
    size="medium"
    className="product-new-badge"
  />
  <animated-badge
    wx:if="{{product.discount > 0}}"
    text="{{product.discount}}折"
    type="discount"
    size="large"
    className="product-discount-badge"
  />
</view>
```

#### 3. 加载状态
```xml
<loading-stars
  show="{{addToCartLoading}}"
  text="正在加入购物车..."
  size="medium"
  className="add-to-cart-loading"
/>
```

---

## 样式定制

所有组件都支持 `className` 属性来自定义样式。组件内部使用了 CSS 变量和现代 CSS 特性，便于主题定制。

### 主要 CSS 变量
- `--primary-color`: 主色调
- `--secondary-color`: 次要色调
- `--success-color`: 成功色调
- `--warning-color`: 警告色调
- `--danger-color`: 危险色调
- `--border-radius`: 圆角大小
- `--shadow`: 阴影效果

---

## 技术特点

1. **现代 CSS 特性**: 使用 CSS Grid、Flexbox、CSS 变量等
2. **动画性能**: 使用 transform 和 opacity 进行动画，确保 60fps
3. **响应式设计**: 适配不同屏幕尺寸
4. **无障碍支持**: 包含适当的 ARIA 属性
5. **微信小程序优化**: 适配小程序环境和限制

---

## 浏览器兼容性

- 微信小程序原生支持
- iOS Safari 12+
- Android Chrome 80+
- 其他现代浏览器

---

## 更新日志

### v1.0.0 (2024-11-28)
- 新增图片缩放组件
- 新增评分组件
- 新增头像组组件
- 新增动画标签组件
- 新增流星空加载组件
- 创建组件演示页面
- 添加完整文档和使用示例