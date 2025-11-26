#!/usr/bin/env node

/**
 * 小程序部署脚本
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始部署茶叶商城小程序...\n');

function checkWxCli() {
  try {
    const result = execSync('wx cloud --version', { encoding: 'utf8' });
    console.log('✅ 微信开发者工具已安装');
    return true;
  } catch (error) {
    console.error('❌ 微信开发者工具未安装:', error.message);
    return false;
  }
}

function uploadFiles() {
  console.log('📤 开始上传文件...\n');

  try {
    // 上传小程序代码
    execSync('wx cloud upload', {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    console.log('✅ 小程序文件上传完成');
    return true;

  } catch (error) {
    console.error('❌ 上传失败:', error.message);
    return false;
  }
}

function main() {
  try {
    // 检查微信开发者工具
    if (!checkWxCli()) {
      console.error('❌ 请先安装微信开发者工具：npm install -g @cloudbase/cli');
      return { success: false, error: '微信开发者工具未安装' };
    }

    // 确保构建产物存在
    const distPath = path.join(__dirname, '../dist');
    if (!fs.existsSync(distPath)) {
      console.error('❌ 构建产物不存在，请先运行：npm run build');
      return { success: false, error: '构建产物不存在' };
    }

    // 上传文件
    const uploadSuccess = uploadFiles();

    if (!uploadSuccess) {
      return { success: false, error: '文件上传失败' };
    }

    console.log('✅ 部署完成！');
    return { success: true, message: '小程序部署成功' };

  } catch (error) {
    console.error('❌ 部署失败:', error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  module.exports = main;
} else {
  main();
}