<!--
Sync Impact Report:
Version change: 1.0.0 → 1.1.0
List of modified principles:
- 传统雅致 UI 原则 → 传统雅致 UI 原则 (expanded scope to include backend management interface)
- 云函数独占原则 → 云函数独占原则 (Zero Trust) (added Zero Trust clarification and CRUD specificity)
- TDD 强制执行原则 → TDD 强制执行原则 (Test-Driven Development) (added TDD clarification)
Added sections:
- 后台身份隔离原则 (Backend Identity Isolation Principle)
Removed sections: N/A
Templates requiring updates:
✅ .specify/templates/plan-template.md - Contains Constitution Check section aligned with new principles
✅ .specify/templates/spec-template.md - Contains requirements section aligned with new principles
✅ .specify/templates/tasks-template.md - Contains TDD enforcement aligned with Principle 3
✅ .specify/templates/commands/*.md - Updated to include backend identity isolation considerations
⚠ Follow-up TODOs: TODO(PROJECT_NAME): Derive from project.config.json or README.md
-->

# 微信小程序 QuickStart Constitution

## Core Principles

### 传统雅致 UI 原则
所有前端组件，包括后台管理界面，必须遵循国风审美，使用扁平化设计，严格控制留白空间。界面设计必须体现中国传统美学，包括但不限于：
- 扁平化设计理念，避免过度装饰
- 笔触感强调线条和文字的质感
- 合理控制留白空间，营造雅致视觉效果
- 色彩搭配遵循传统配色方案
- 交互反馈符合国风用户体验习惯
- 后台管理界面同样遵循国风设计规范

### 云函数独占原则 (Zero Trust)
所有涉及数据库写入（CRUD：创建、更新、删除）的业务逻辑，必须且仅能通过微信云函数代理执行。前端禁止直接对数据库进行写操作。此原则确保：
- 敏感业务逻辑完全在后端执行
- 前端只负责UI展示和用户交互
- 数据库访问权限通过云函数统一管控
- 业务规则变更无需前端发版
- 安全性和可维护性得到保障
- 遵循零信任安全模型：永远不信任前端直接数据访问

### TDD 强制执行原则 (Test-Driven Development)
任何实现代码生成之前，必须先编写、验证并通过单元测试（TDD 原则）。开发流程严格遵循测试驱动开发：
- 测试优先：先编写失败的测试用例
- 实现最小代码：使测试通过的最简实现
- 重构优化：在测试保护下改进代码质量
- 红绿重构循环严格执行
- 代码覆盖率要求：核心业务逻辑100%覆盖
- 每个功能模块必须先有对应测试套件

### 后台身份隔离原则
管理员身份验证必须依赖于微信 openid 绑定和白名单（RBAC）验证。此原则确保：
- 管理员账户必须与真实微信用户身份绑定
- 基于角色的访问控制（RBAC）严格限制操作权限
- 白名单机制确保只有授权管理员可以访问后台功能
- 身份验证信息不可在前端硬编码或绕过
- 管理操作必须有完整的身份验证和权限检查日志
- 支持多级管理员权限，最小权限原则

## 开发规范要求

### 小程序架构规范
- 项目结构遵循微信小程序官方推荐架构
- 云函数代码组织清晰，职责单一
- 前端页面组件化，复用性优先
- 状态管理规范，避免复杂的数据流
- 后台管理系统遵循同样架构标准

### 代码质量标准
- 代码风格统一，使用ESLint规范
- 函数命名清晰，避免缩写和歧义
- 注释适度，重点说明业务逻辑
- 错误处理完善，用户友好的错误提示
- 身份验证代码必须经过安全审查

### 性能与安全要求
- 云函数冷启动优化，响应时间控制在合理范围
- 前端资源按需加载，避免首屏加载阻塞
- 敏感数据传输加密，存储安全
- 接口权限验证，防止越权访问
- 后台管理系统必须有额外的安全防护措施
- 身份验证失败需要有明确的安全日志记录

## 部署与运维规范

### 版本管理策略
- 遵循语义化版本控制（Semantic Versioning）
- 主版本号：不兼容的API修改
- 次版本号：向下兼容的功能性新增
- 修订号：向下兼容的问题修正

### 发布流程要求
- 代码审查必须通过，至少一人审核
- 自动化测试全量通过，覆盖率达标
- 发布回滚方案明确，风险可控
- 生产环境部署需要确认检查清单
- 后台权限变更需要额外的审批流程

## Governance

本宪法具有最高优先级，所有开发活动必须严格遵守。任何违反宪法原则的行为都应该被及时发现和纠正。

### 宪法修订程序
- 宪法修订需要团队讨论一致通过
- 修订内容需要明确记录变更原因和影响范围
- 重大变更需要重新培训团队成员
- 修订后的宪法需要更新到所有相关文档和模板
- 安全相关原则变更需要额外审查

### 合规性审查要求
- 每次代码合并前必须进行宪法合规性检查
- 定期进行项目架构和代码的宪法符合度评估
- 新技术引入需要评估是否与宪法原则冲突
- 团队成员需要定期接受宪法培训和教育
- 特别审查：云函数数据库访问、前端直接数据库操作、身份验证绕过

### 安全合规特别条款
- 任何违反云函数独占原则的直接数据库访问代码必须立即拒绝
- 身份验证逻辑必须经过双重审查
- 定期进行安全渗透测试验证宪法原则执行效果
- 发现安全漏洞时，相关宪法原则需要优先审查和加强

**Version**: 1.1.0 | **Ratified**: 2024-01-01 | **Last Amended**: 2025-11-26