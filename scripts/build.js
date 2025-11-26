#!/usr/bin/env node

/**
 * 简化版小程序构建脚本
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 开始构建茶叶商城小程序...\n');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

function copyDir(src, dest) {
  ensureDir(dest);

  if (!fs.existsSync(src)) {
    console.warn(`⚠️ 源目录不存在: ${src}`);
    return;
  }

  const files = fs.readdirSync(src);

  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      ensureDir(path.dirname(destPath));
      fs.copyFileSync(srcPath, destPath);
      console.log(`📄 复制: ${path.relative(process.cwd(), srcPath)}`);
    }
  });
}

function generateAppJson() {
  const appJson = {
    pages: [
      "pages/home/index",
      "pages/products/list",
      "pages/products/detail",
      "pages/products/search",
      "pages/cart/index",
      "pages/order/confirm",
      "pages/order/payment",
      "pages/order/result",
      "pages/user/profile",
      "pages/user/orders",
      "pages/user/points",
      "pages/user/address",
      "pages/admin/login",
      "pages/admin/dashboard",
      "pages/admin/products"
    ],
    window: {
      backgroundTextStyle: "light",
      navigationBarBackgroundColor: "#f8f6e4",
      navigationBarTitleText: "茶叶商城",
      navigationBarTextStyle: "white"
    },
    tabBar: {
      color: "#7A7E8",
      selectedColor: "#1aad19",
      backgroundColor: "#f8f6e4",
      borderStyle: "black",
      list: [
        {
          pagePath: "pages/home/index",
          text: "首页",
          iconPath: "images/tab/home.png",
          selectedIconPath: "images/tab/home-active.png"
        },
        {
          pagePath: "pages/products/list",
          text: "茶叶",
          iconPath: "images/tab/tea.png",
          selectedIconPath: "images/tab/tea-active.png"
        },
        {
          pagePath: "pages/cart/index",
          text: "购物车",
          iconPath: "images/tab/cart.png",
          selectedIconPath: "images/tab/cart-active.png"
        },
        {
          pagePath: "pages/user/profile",
          text: "我的",
          iconPath: "images/tab/user.png",
          selectedIconPath: "images/tab/user-active.png"
        }
      ]
    },
    permission: {
      "scope.userLocation": {
        desc: "您的位置信息将用于收货地址"
      }
    },
    networkTimeout: 60000,
    usingComponents: {},
    sitemapLocation: "sitemap.json"
  };

  const distPath = path.join(process.cwd(), 'dist');
  ensureDir(distPath);
  fs.writeFileSync(
    path.join(distPath, 'app.json'),
    JSON.stringify(appJson, null, 2)
  );
  console.log('✅ app.json 生成完成');
}

function main() {
  try {
    // 创建输出目录
    const distPath = path.join(process.cwd(), 'dist');
    ensureDir(distPath);

    // 复制小程序文件
    console.log('📁 复制小程序文件...');
    copyDir('miniprogram', path.join(distPath, 'miniprogram'));

    // 复制云函数文件
    console.log('☁️ 复制云函数文件...');
    copyDir('cloudfunctions', path.join(distPath, 'cloudfunctions'));

    // 生成app.json
    console.log('📄 生成app.json...');
    generateAppJson();

    console.log('✅ 构建完成！');
    console.log('📂 输出目录:', distPath);

    // 显示构建结果统计
    try {
      const stats = execSync(`find "${distPath}" -type f | wc -l`, { encoding: 'utf8' });
      console.log(`📊 共复制 ${stats.trim()} 个文件`);
    } catch (error) {
      console.log('📊 文件统计完成');
    }

    return { success: true, distPath };

  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  module.exports = main();
} else {
  main();
}