#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Claude Code 资讯系统部署脚本
用于自动化部署和配置提醒系统
"""

import subprocess
import os
import json
from pathlib import Path

class ClaudeCodeNewsDeployer:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.requirements_file = self.project_root / "claude_news_requirements.txt"
        self.env_file = self.project_root / ".env"

    def install_requirements(self):
        """安装依赖包"""
        print("📦 安装Python依赖包...")

        requirements = [
            "requests>=2.31.0",
            "schedule>=1.2.0",
            "python-dotenv>=1.0.0",
            "beautifulsoup4>=4.12.0",
            "lxml>=4.9.0"
        ]

        with open(self.requirements_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(requirements))

        try:
            subprocess.run([
                "pip", "install", "-r", str(self.requirements_file)
            ], check=True)
            print("✅ 依赖包安装成功")
        except subprocess.CalledProcessError as e:
            print(f"❌ 依赖包安装失败: {e}")
            return False

        return True

    def create_env_file(self):
        """创建环境变量配置文件"""
        print("📝 创建环境变量配置文件...")

        env_template = """# Claude Code 资讯系统配置文件
# 请根据实际情况修改以下配置

# 飞书访问令牌（需要配置）
FEISHU_ACCESS_TOKEN=your_feishu_access_token_here

# 飞书应用Token（已配置）
FEISHU_APP_TOKEN=WA7jbMXfWaiETWs95eOcS580n8d

# 飞书表格ID（已配置）
FEISHU_TABLE_ID=tbljVi5O1eNViSTe

# 飞书群组或用户ID（需要配置）
FEISHU_CHAT_ID=your_chat_id_here

# 搜索API配置（可选）
GOOGLE_SEARCH_API_KEY=your_google_search_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here

# 调试模式（True/False）
DEBUG=False
"""

        with open(self.env_file, 'w', encoding='utf-8') as f:
            f.write(env_template)

        print("✅ 环境变量配置文件已创建")
        print(f"📁 请编辑 {self.env_file} 文件，填入正确的配置信息")
        return True

    def create_systemd_service(self):
        """创建systemd服务文件（Linux系统）"""
        if os.name != 'posix':
            print("⚠️  当前系统不支持systemd服务，跳过此步骤")
            return True

        print("🔧 创建systemd服务文件...")

        service_content = f"""[Unit]
Description=Claude Code News Crawler Service
After=network.target

[Service]
Type=simple
User={os.getenv('USER', 'root')}
WorkingDirectory={self.project_root}
ExecStart=/usr/bin/python3 {self.project_root}/schedule_claude_news.py
Restart=always
RestartSec=10
Environment=PYTHONPATH={self.project_root}

[Install]
WantedBy=multi-user.target
"""

        service_path = "/etc/systemd/system/claude-news.service"

        try:
            with open('/tmp/claude-news.service', 'w', encoding='utf-8') as f:
                f.write(service_content)

            print("✅ systemd服务文件已创建在 /tmp/claude-news.service")
            print("📋 要启用服务，请执行以下命令：")
            print("   sudo cp /tmp/claude-news.service /etc/systemd/system/")
            print("   sudo systemctl daemon-reload")
            print("   sudo systemctl enable claude-news.service")
            print("   sudo systemctl start claude-news.service")

        except Exception as e:
            print(f"❌ 创建systemd服务文件失败: {e}")
            return False

        return True

    def create_cron_job(self):
        """创建cron定时任务"""
        print("⏰ 创建cron定时任务...")

        cron_content = f"""# Claude Code 资讯提醒任务 - 每三天执行一次
0 9 */3 * * cd {self.project_root} && /usr/bin/python3 {self.project_root}/claude_code_news_crawler.py >> {self.project_root}/claude_news.log 2>&1

# 如果需要每天检查，可以使用以下配置
# 0 9 * * * cd {self.project_root} && /usr/bin/python3 {self.project_root}/schedule_claude_news.py >> {self.project_root}/scheduler.log 2>&1
"""

        try:
            with open('/tmp/claude-news-cron', 'w', encoding='utf-8') as f:
                f.write(cron_content)

            print("✅ cron任务文件已创建在 /tmp/claude-news-cron")
            print("📋 要启用定时任务，请执行以下命令：")
            print("   crontab /tmp/claude-news-cron")
            print("   # 或者手动添加到现有crontab中")

        except Exception as e:
            print(f"❌ 创建cron任务失败: {e}")
            return False

        return True

    def test_system(self):
        """测试系统运行"""
        print("🧪 测试系统运行...")

        try:
            # 测试爬虫脚本
            result = subprocess.run([
                "python3", "claude_code_news_crawler.py"
            ], cwd=self.project_root, capture_output=True, text=True, timeout=30)

            if result.returncode == 0:
                print("✅ 爬虫脚本测试通过")
                print("📄 输出:")
                print(result.stdout)
            else:
                print("❌ 爬虫脚本测试失败")
                print("📄 错误:")
                print(result.stderr)
                return False

        except subprocess.TimeoutExpired:
            print("⚠️  脚本执行超时，但这可能是正常的")
        except Exception as e:
            print(f"❌ 测试失败: {e}")
            return False

        return True

    def create_readme(self):
        """创建使用说明文档"""
        print("📚 创建使用说明文档...")

        readme_content = """# Claude Code 资讯提醒系统

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
"""

        readme_path = self.project_root / "README.md"
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(readme_content)

        print("✅ 使用说明文档已创建")
        print(f"📄 请查看 {readme_path} 获取详细使用说明")
        return True

    def deploy_all(self):
        """执行完整部署流程"""
        print("🚀 开始部署Claude Code资讯提醒系统...")
        print("=" * 60)

        steps = [
            ("安装依赖包", self.install_requirements),
            ("创建环境变量配置", self.create_env_file),
            ("创建系统服务", self.create_systemd_service),
            ("创建定时任务", self.create_cron_job),
            ("创建说明文档", self.create_readme),
            ("测试系统运行", self.test_system),
        ]

        failed_steps = []

        for step_name, step_func in steps:
            print(f"\n📋 {step_name}...")
            try:
                if not step_func():
                    failed_steps.append(step_name)
                    print(f"❌ {step_name} 失败")
                else:
                    print(f"✅ {step_name} 成功")
            except Exception as e:
                print(f"❌ {step_name} 出错: {e}")
                failed_steps.append(step_name)

        print("\n" + "=" * 60)
        print("🎉 部署完成!")

        if failed_steps:
            print(f"⚠️  以下步骤失败，请手动处理: {', '.join(failed_steps)}")
        else:
            print("✅ 所有步骤都成功完成")

        print("\n📋 后续步骤:")
        print("1. 编辑 .env 文件，配置飞书访问令牌")
        print("2. 根据需要启用系统服务或定时任务")
        print("3. 测试系统是否正常工作")
        print("4. 查看 README.md 获取详细使用说明")

def main():
    """主函数"""
    deployer = ClaudeCodeNewsDeployer()
    deployer.deploy_all()

if __name__ == "__main__":
    main()