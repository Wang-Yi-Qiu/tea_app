# 雅致小程序 - 东方生活美学

## 项目简介

雅致小程序是一个融合中国风美学与现代设计的茶叶商城，致力于为用户提供优雅、精致的东方生活美学体验。

## 设计理念

### 中国风设计系统
- **主色调**: 黛青色(#465d62)为主品牌色，象征中国传统色彩
- **配色方案**:
  - 米白(#f5f3f0) - 背景底色
  - 朱红(#c83c23) - 点缀和强调色
  - 土黄(#d2a065) - 温暖辅助色
- **字体**: 采用Noto Sans SC和Noto Serif SC，保证可读性的同时体现东方韵味
- **视觉元素**: 融合传统纹理、水墨渐变、印章等中国元素

### 界面特色
- **顶部应用栏**: 简洁导航，配毛玻璃效果
- **搜索功能**: 东方美学搜索框设计
- **横幅展示**: 四季雅集主题横幅
- **商品展示**: 卡片式布局，支持动画交互
- **底部导航**: Material Icons图标，清晰的功能分区

## 技术栈

- **前端框架**: 微信小程序原生框架
- **样式语言**: WXSS (微信小程序样式)
- **图标库**: Material Symbols Outlined
- **字体**: Google Fonts (Noto Sans SC, Noto Serif SC)
- **开发工具**: 微信开发者工具

## 项目结构

```
miniprogram/
├── app.js                 # 小程序入口
├── app.json              # 小程序配置
├── app.wxss              # 全局样式
├── pages/                 # 页面目录
│   ├── home/             # 首页
│   ├── products/         # 产品相关页面
│   ├── cart/             # 购物车
│   ├── user/             # 用户中心
│   └── admin/            # 管理后台
├── components/            # 公共组件
├── images/               # 静态资源
├── cloudfunctions/        # 云函数
└── ...
```

## 核心功能

### 首页功能
- ✅ 中国风主题设计
- ✅ 商品展示和推荐
- ✅ 分类导航
- ✅ 搜索功能
- ✅ 底部导航栏
- ✅ 购物车计数

### 商品功能
- 📋 商品详情展示
- 📋 购买流程
- 📋 分类筛选
- 📋 搜索功能

### 用户功能
- 👤 个人中心
- 📦 订单管理
- 📦 地址管理
- 📦 积分系统

## 开发和构建

### 环境要求
- Node.js >= 14.0
- 微信开发者工具
- 微信小程序账号

### 开发命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 上传部署
npm run deploy
```

### 构建流程

1. **代码构建**: `npm run build` - 编译XML、WXSS、JS
2. **云函数部署**: 自动部署云函数到微信云开发
3. **包上传**: 生成小程序包
4. **预览测试**: 在开发者工具中预览效果

## 设计系统

### 色彩规范
```css
:root {
  --brand-indigo: #465d62;      /* 黛青 - 主品牌色 */
  --brand-offwhite: #f5f3f0;     /* 米白 - 背景色 */
  --brand-vermilion: #c83c23;    /* 朱红 - 强调色 */
  --brand-earthy: #d2a065;      /* 土黄 - 辅助色 */
  --brand-text-primary: #2d373a;   /* 主要文字色 */
  --brand-text-secondary: #6a7b80; /* 次要文字色 */
}
```

### 组件设计原则
- **一致性**: 统一的色彩和字体规范
- **可用性**: 清晰的交互反馈和状态提示
- **美观性**: 融合中国风元素的现代化设计
- **响应性**: 适配不同屏幕尺寸的设备

## 部署说明

### 环境配置
1. 配置`project.config.json`中的appid
2. 设置云开发环境ID
3. 配置微信支付商户号
4. 上传云函数并配置数据库

### 云函数部署
```bash
# 部署所有云函数
npm run deploy:cloud

# 单独部署
wx cloud deploy:functionName
```

## 特色亮点

### 视觉设计
- 🎨 中国风色彩体系
- 🎨 Material Icons现代化图标
- 🎨 流畅的动画过渡效果
- 🎨 毛玻璃和阴影效果

### 用户体验
- 📱 移动端优先设计
- 📱 直观的导航结构
- 📱 快速的页面加载
- 📱 流畅的交互动画

### 技术特性
- ⚡ 微信云开发支持
- ⚡ 组件化开发模式
- ⚡ 响应式布局设计
- ⚡ 模块化代码架构

## 版本历史

- **v1.0.0** (2025-01-27)
  - ✨ 完成中国风首页设计
  - ✨ 实现商品展示功能
  - ✨ 添加Material Icons支持
  - ✨ 构建完整的项目结构

## 贡献指南

欢迎提交Issue和Pull Request来改进项目：

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

- 项目地址: https://github.com/your-username/tea_app
- 开发者微信: your-wechat-id
- 邮箱: your-email@example.com

---

**雅致** - 传承东方美学，雅致现代生活

