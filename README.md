# Claude Code 资讯提醒系统

## 🎯 功能概述

这个系统可以：
- 每3天自动搜索最新的Claude Code相关资讯
- 将资讯保存到飞书多维表格中
- 发送汇总消息到飞书群组或个人
- 支持分类管理和状态跟踪

## 📋 文件结构

```
claude-code-news-system/
├── claude_code_news_crawler.py    # 核心爬虫脚本
├── schedule_claude_news.py         # 调度器脚本
├── deploy_claude_news_system.py   # 部署脚本
├── .env                          # 环境变量配置
├── claude_news_requirements.txt     # Python依赖
├── README.md                      # 使用说明（本文件）
└── logs/                          # 日志目录
```

## 🚀 快速开始

### 1. 部署系统

```bash
# 1. 克隆或下载项目文件
git clone <repository_url>
cd claude-code-news-system

# 2. 运行部署脚本
python3 deploy_claude_news_system.py

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入必要的配置信息
```

### 2. 配置飞书

1. 获取飞书访问令牌：
   - 登录飞书开发者后台
   - 创建应用并获取 access_token
   - 配置机器人权限（发送消息、读取多维表格）

2. 配置群组或个人ID：
   - 获取要发送消息的群组或用户的 chat_id

### 3. 运行系统

#### 方式一：直接运行（单次执行）
```bash
python3 claude_code_news_crawler.py
```

#### 方式二：调度器运行（推荐）
```bash
# 启动调度器（持续运行）
python3 schedule_claude_news.py

# 测试运行
python3 schedule_claude_news.py --test
```

#### 方式三：系统服务（生产环境）
```bash
# Linux系统使用systemd
sudo systemctl enable claude-news.service
sudo systemctl start claude-news.service

# 或使用cron定时任务
crontab -e
# 添加：0 9 */3 * * cd /path/to/project && python3 claude_code_news_crawler.py
```

## ⚙️ 配置说明

### 环境变量 (.env 文件)

```bash
# 必需配置
FEISHU_ACCESS_TOKEN=your_feishu_access_token_here
FEISHU_CHAT_ID=your_chat_id_here

# 已配置（无需修改）
FEISHU_APP_TOKEN=WA7jbMXfWaiETWs95eOcS580n8d
FEISHU_TABLE_ID=tbljVi5O1eNViSTe

# 可选配置
GOOGLE_SEARCH_API_KEY=your_google_search_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
DEBUG=False
```

### 飞书多维表格结构

系统会自动创建包含以下字段的表格：
- 标题：资讯标题
- 链接：相关链接
- 发布时间：资讯发布时间
- 摘要：内容摘要
- 来源：信息来源
- 分类：资讯分类（教程、技巧、更新等）
- 处理状态：待处理、已处理、重要

## 🔧 自定义配置

### 修改搜索关键词

编辑 `claude_code_news_crawler.py` 中的 `search_queries` 列表：

```python
search_queries = [
    "Claude Code AI assistant 更新 使用技巧",
    "Claude Code 编程助手 教程 功能",
    # 添加你自己的搜索关键词
]
```

### 修改执行频率

编辑 `schedule_claude_news.py` 中的调度配置：

```python
# 每3天执行一次
schedule.every(3).days.at("09:00").do(self.run_scheduled_task)

# 改为每周一早上9点执行
schedule.every().monday.at("09:00").do(self.run_scheduled_task)
```

## 📊 监控和日志

系统会生成以下日志文件：
- `claude_news.log`：爬虫执行日志
- `claude_news_scheduler.log`：调度器运行日志

查看日志：
```bash
tail -f claude_news.log
tail -f claude_news_scheduler.log
```

## 🛠️ 故障排除

### 常见问题

1. **飞书token无效**
   - 检查 token 是否过期
   - 确认应用权限配置正确

2. **搜索结果为空**
   - 检查网络连接
   - 尝试更换搜索关键词

3. **定时任务不执行**
   - 检查系统时间是否正确
   - 确认调度器正在运行

4. **依赖包安装失败**
   - 确认Python版本 >= 3.7
   - 尝试使用虚拟环境

### 手动测试

```bash
# 测试爬虫功能
python3 -c "
from claude_code_news_crawler import ClaudeCodeNewsCrawler
crawler = ClaudeCodeNewsCrawler()
news = crawler.search_claude_code_news()
print(f'找到 {len(news)} 条资讯')
"

# 测试飞书连接
python3 -c "
from claude_code_news_crawler import ClaudeCodeNewsCrawler
crawler = ClaudeCodeNewsCrawler()
crawler.send_feishu_notification('测试消息')
"
```

## 🔄 更新和维护

### 更新系统
```bash
# 拉取最新代码
git pull origin main

# 重新安装依赖
pip install -r claude_news_requirements.txt

# 重启服务
sudo systemctl restart claude-news.service
```

### 备份数据
```bash
# 备份飞书表格数据（手动操作）
# 1. 登录飞书
# 2. 导出多维表格数据
# 3. 保存到安全位置
```

## 📞 支持

如果遇到问题：
1. 查看日志文件确定错误原因
2. 检查配置文件是否正确
3. 参考故障排除部分
4. 联系技术支持

---

**注意**：请确保遵守相关网站的使用条款和robots.txt规定，合理使用爬虫功能。
