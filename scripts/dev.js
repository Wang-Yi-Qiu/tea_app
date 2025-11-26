#!/usr/bin/env node

/**
 * 开发环境启动脚本
 */

const { execSync } = require('child_process');

console.log('🚀 启动茶叶商城小程序开发环境...\n');

function startDevServer() {
  try {
    console.log('📂 启动云开发环境...\n');
    execSync('wx cloud open', {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    console.log('✅ 开发环境启动成功！');
    console.log('📱 请在微信开发者工具中预览和调试');

    return { success: true };

  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    return { success: false, error: error.message };
  }
}

function main() {
  return startDevServer();
}

if (require.main === module) {
  module.exports = main;
} else {
  main();
}