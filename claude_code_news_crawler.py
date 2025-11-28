#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Claude Code 资讯爬虫和提醒系统
每三天自动搜索最新Claude Code相关信息并发送飞书提醒
"""

import requests
import json
import time
from datetime import datetime, timedelta
import logging
from typing import List, Dict
import os

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ClaudeCodeNewsCrawler:
    def __init__(self):
        self.feishu_app_token = "WA7jbMXfWaiETWs95eOcS580n8d"
        self.feishu_table_id = "tbljVi5O1eNViSTe"
        # 可以通过环境变量配置飞书token
        self.feishu_access_token = os.getenv('FEISHU_ACCESS_TOKEN', '')

    def search_claude_code_news(self) -> List[Dict]:
        """搜索最新的Claude Code相关资讯"""
        search_queries = [
            "Claude Code AI assistant 更新 使用技巧",
            "Claude Code 编程助手 教程 功能",
            "Claude Code terminal AI tool 新功能",
            "Claude Code development guide best practices"
        ]

        all_news = []

        for query in search_queries:
            try:
                # 这里可以集成不同的搜索API
                # 目前使用示例数据
                news_results = self._mock_search_results(query)
                all_news.extend(news_results)
                time.sleep(1)  # 避免请求过快
            except Exception as e:
                logger.error(f"搜索 '{query}' 时出错: {e}")

        return self._filter_latest_news(all_news)

    def _mock_search_results(self, query: str) -> List[Dict]:
        """模拟搜索结果，实际使用时应该替换为真实的搜索API"""
        # 这里只是示例，实际应该调用搜索API
        return [
            {
                "title": f"Claude Code 最新功能更新 - {query}",
                "link": "https://docs.anthropic.com/claude-code",
                "summary": f"基于搜索词 '{query}' 找到的最新Claude Code功能和更新信息",
                "source": "anthropic.com",
                "category": "更新",
                "publish_time": int(time.time()) * 1000  # 转换为毫秒时间戳
            }
        ]

    def _filter_latest_news(self, news_list: List[Dict]) -> List[Dict]:
        """过滤最新的资讯（最近3天的）"""
        three_days_ago = (datetime.now() - timedelta(days=3)).timestamp() * 1000
        return [news for news in news_list if news.get('publish_time', 0) > three_days_ago]

    def add_to_feishu_table(self, news_item: Dict) -> bool:
        """将资讯添加到飞书表格"""
        if not self.feishu_access_token:
            logger.warning("未配置飞书access token，跳过添加到表格")
            return False

        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{self.feishu_app_token}/tables/{self.feishu_table_id}/records"

        headers = {
            "Authorization": f"Bearer {self.feishu_access_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "fields": {
                "标题": news_item.get("title", ""),
                "链接": {"link": news_item.get("link", "")},
                "发布时间": news_item.get("publish_time", int(time.time()) * 1000),
                "摘要": news_item.get("summary", ""),
                "来源": news_item.get("source", ""),
                "分类": news_item.get("category", "资讯"),
                "处理状态": "待处理"
            }
        }

        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                logger.info(f"成功添加资讯到飞书表格: {news_item.get('title')}")
                return True
            else:
                logger.error(f"添加到飞书表格失败: {response.status_code}, {response.text}")
                return False
        except Exception as e:
            logger.error(f"请求飞书API时出错: {e}")
            return False

    def generate_summary_message(self, news_list: List[Dict]) -> str:
        """生成汇总消息"""
        if not news_list:
            return "📭 暂无新的Claude Code相关资讯"

        message = "🤖 Claude Code 最新资讯汇总\n"
        message += f"📅 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
        message += f"📊 共找到 {len(news_list)} 条最新资讯\n\n"

        for i, news in enumerate(news_list, 1):
            message += f"**{i}. {news.get('title', '无标题')}**\n"
            message += f"📝 {news.get('summary', '无摘要')}\n"
            message += f"🔗 [查看详情]({news.get('link', '')})\n"
            message += f"🏷️ {news.get('category', '资讯')} | 来源: {news.get('source', '未知')}\n\n"

        message += "💡 提示: 所有资讯已保存到飞书表格中，便于后续查看和管理。"
        return message

    def send_feishu_notification(self, message: str, chat_id: str = None):
        """发送飞书通知"""
        if not self.feishu_access_token:
            logger.warning("未配置飞书access token，打印消息到控制台")
            print("="*50)
            print(message)
            print("="*50)
            return

        # 这里需要配置具体的飞书群组或用户ID
        url = "https://open.feishu.cn/open-apis/im/v1/messages"

        headers = {
            "Authorization": f"Bearer {self.feishu_access_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "receive_id_type": "chat_id",
            "receive_id": chat_id or "YOUR_CHAT_ID",  # 需要配置具体的chat_id
            "msg_type": "post",
            "content": json.dumps({
                "post": {
                    "zh_cn": {
                        "title": "Claude Code 最新资讯提醒",
                        "content": [
                            [{"tag": "text", "text": message}]
                        ]
                    }
                }
            })
        }

        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                logger.info("飞书通知发送成功")
            else:
                logger.error(f"发送飞书通知失败: {response.status_code}, {response.text}")
        except Exception as e:
            logger.error(f"发送飞书通知时出错: {e}")

    def run_daily_crawl(self):
        """执行每日爬虫任务"""
        logger.info("开始执行Claude Code资讯爬虫任务...")

        # 1. 搜索最新资讯
        news_list = self.search_claude_code_news()
        logger.info(f"搜索到 {len(news_list)} 条最新资讯")

        if not news_list:
            logger.info("未找到新的资讯")
            return

        # 2. 添加到飞书表格
        success_count = 0
        for news in news_list:
            if self.add_to_feishu_table(news):
                success_count += 1
                time.sleep(0.5)  # 避免请求过快

        logger.info(f"成功添加 {success_count}/{len(news_list)} 条资讯到飞书表格")

        # 3. 生成汇总消息
        summary_message = self.generate_summary_message(news_list)

        # 4. 发送通知
        self.send_feishu_notification(summary_message)

        logger.info("Claude Code资讯爬虫任务完成")

def main():
    """主函数"""
    crawler = ClaudeCodeNewsCrawler()
    crawler.run_daily_crawl()

if __name__ == "__main__":
    main()