#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Claude Code 资讯定时调度系统
每三天自动运行一次爬虫并发送提醒
"""

import schedule
import time
import logging
from datetime import datetime
from claude_code_news_crawler import ClaudeCodeNewsCrawler

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('claude_news_scheduler.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ClaudeCodeNewsScheduler:
    def __init__(self):
        self.crawler = ClaudeCodeNewsCrawler()

    def run_scheduled_task(self):
        """执行定时任务"""
        logger.info("=" * 50)
        logger.info(f"开始执行定时Claude Code资讯任务 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 50)

        try:
            self.crawler.run_daily_crawl()
            logger.info("定时任务执行成功")
        except Exception as e:
            logger.error(f"定时任务执行失败: {e}")

    def start_scheduler(self):
        """启动调度器"""
        logger.info("启动Claude Code资讯调度器...")
        logger.info("设置为每3天执行一次任务")

        # 每3天执行一次
        schedule.every(3).days.at("09:00").do(self.run_scheduled_task)

        # 也可以设置为每周的特定时间
        # schedule.every().monday.at("09:00").do(self.run_scheduled_task)
        # schedule.every().wednesday.at("09:00").do(self.run_scheduled_task)
        # schedule.every().friday.at("09:00").do(self.run_scheduled_task)

        logger.info("调度器启动成功，等待执行时间...")

        # 立即执行一次（可选）
        # self.run_scheduled_task()

        while True:
            schedule.run_pending()
            time.sleep(60)  # 每分钟检查一次

    def test_run(self):
        """测试运行"""
        logger.info("执行测试运行...")
        self.run_scheduled_task()

def main():
    """主函数"""
    import sys

    scheduler = ClaudeCodeNewsScheduler()

    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        # 测试模式
        scheduler.test_run()
    else:
        # 正式运行调度器
        try:
            scheduler.start_scheduler()
        except KeyboardInterrupt:
            logger.info("用户中断，停止调度器")
        except Exception as e:
            logger.error(f"调度器运行出错: {e}")

if __name__ == "__main__":
    main()