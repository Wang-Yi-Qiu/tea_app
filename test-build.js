#!/usr/bin/env node

console.log('开始测试构建脚本...');
console.log('当前目录:', process.cwd());

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 测试目录创建
const testDistPath = path.join(process.cwd(), 'test-dist');
if (!fs.existsSync(testDistPath)) {
  fs.mkdirSync(testDistPath, { recursive: true });
  console.log('✅ 测试目录创建成功');
}

// 检查文件是否存在并测试复制
const testSrcFile = path.join(process.cwd(), 'miniprogram', 'app.js');
const testDestFile = path.join(testDistPath, 'miniprogram', 'app.js');

if (fs.existsSync(testSrcFile)) {
  console.log('✅ 源文件存在:', testSrcFile);
  if (!fs.existsSync(path.dirname(testDestFile))) {
    fs.mkdirSync(path.dirname(testDestFile), { recursive: true });
  }
  fs.copyFileSync(testSrcFile, testDestFile);
  console.log('✅ 文件复制测试成功');
} else {
  console.log('❌ 源文件不存在:', testSrcFile);
}
console.log('✅ 文件复制测试成功');

console.log('测试完成！');
process.exit(0);