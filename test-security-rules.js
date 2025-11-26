// 微信云数据库安全规则测试脚本
// 使用方法：在微信开发者工具控制台或云函数中运行此脚本

const securityTests = {
  // 测试配置
  config: {
    test_openid: 'test_user_openid_12345',
    admin_openid: 'admin_user_openid_67890',
    test_product_id: 'test_product_001',
    test_order_id: 'test_order_001'
  },

  // 测试结果记录
  results: [],

  // 记录测试结果
  logResult(test, collection, operation, condition, expected, actual, passed) {
    this.results.push({
      test_name: test,
      collection: collection,
      operation: operation,
      condition: condition,
      expected_result: expected,
      actual_result: actual,
      passed: passed,
      timestamp: new Date()
    });

    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test}`);
    if (!passed) {
      console.log(`  期望: ${expected}, 实际: ${actual}`);
      console.log(`  条件: ${condition}`);
    }
  },

  // 模拟用户操作（实际使用时需要替换为真实的数据库调用）
  async simulateUserOperation(collection, operation, data, userContext) {
    // 这里模拟数据库操作，实际使用时替换为：
    // const db = cloud.database();
    // if (operation === 'read') {
    //   return await db.collection(collection).where(data).get();
    // } else if (operation === 'write') {
    //   return await db.collection(collection).add({ data });
    // }

    // 模拟基于安全规则的响应
    const rules = this.getSecurityRules(collection);
    const auth = userContext;

    try {
      // 检查读取权限
      if (operation === 'read') {
        if (rules.read && !this.evaluateCondition(rules.read.condition, auth, data)) {
          throw new Error('Permission denied: read');
        }
        return { success: true, data: 'mock_data' };
      }

      // 检查写入权限
      if (operation === 'write') {
        if (rules.write && !this.evaluateCondition(rules.write.condition, auth, data)) {
          throw new Error('Permission denied: write');
        }

        // 检查字段权限
        if (rules.fields) {
          for (const [field, rule] of Object.entries(rules.fields)) {
            if (data[field] !== undefined && rule.write &&
                !this.evaluateCondition(rule.write, auth, data)) {
              throw new Error(`Permission denied: write field ${field}`);
            }
          }
        }

        return { success: true, _id: 'mock_id' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 获取安全规则（简化版本，实际规则应该从微信云控制台获取）
  getSecurityRules(collection) {
    const rules = {
      'orders': {
        read: { condition: "auth.openid == resource.data.openid || auth.isSystem == true" },
        write: { condition: "auth.isSystem == true" },
        fields: {
          status: { write: "auth.isSystem == true" }
        }
      },
      'point_records': {
        read: { condition: "auth.openid == resource.data.openid || auth.isSystem == true" },
        write: { condition: "auth.isSystem == true" }
      },
      'admin_users': {
        read: { condition: "auth.isSystem == true" },
        write: { condition: "auth.isSystem == true" }
      },
      'products': {
        read: { condition: "auth.openid != null || auth.isSystem == true" },
        write: { condition: "auth.isSystem == true" }
      },
      'community_posts': {
        read: { condition: "(resource.data.status == 'approved' && auth.openid != null) || auth.openid == resource.data.author_openid || auth.isSystem == true" },
        write: { condition: "auth.openid == resource.data.author_openid || auth.isSystem == true" },
        fields: {
          status: { write: "auth.isSystem == true" }
        }
      }
    };

    return rules[collection] || {};
  },

  // 评估条件（简化版本）
  evaluateCondition(condition, auth, resource) {
    // 简化的条件评估，实际应该使用微信云的安全规则引擎
    if (condition === "auth.isSystem == true") {
      return auth.isSystem === true;
    }
    if (condition === "auth.openid != null") {
      return auth.openid != null;
    }
    if (condition.includes("auth.openid == resource.data.openid")) {
      return auth.openid === resource.openid;
    }
    if (condition.includes("auth.openid == resource.data.author_openid")) {
      return auth.openid === resource.author_openid;
    }
    if (condition.includes("|| auth.isSystem == true")) {
      return auth.isSystem === true;
    }
    return false;
  },

  // 运行所有测试
  async runAllTests() {
    console.log('🚀 开始安全规则测试...\n');

    // 1. 订单相关测试
    await this.testOrderPermissions();

    // 2. 积分记录测试
    await this.testPointRecordsPermissions();

    // 3. 管理员用户测试
    await this.testAdminUserPermissions();

    // 4. 商品管理测试
    await this.testProductPermissions();

    // 5. 社区帖子测试
    await this.testCommunityPostPermissions();

    // 6. 系统权限测试
    await this.testSystemPermissions();

    // 生成测试报告
    this.generateTestReport();
  },

  // 测试订单权限
  async testOrderPermissions() {
    console.log('📋 测试订单集合权限...');

    // 用户查看自己订单
    const selfOrderResult = await this.simulateUserOperation(
      'orders', 'read',
      { openid: this.config.test_openid },
      { openid: this.config.test_openid, isSystem: false }
    );
    this.logResult(
      '用户查看自己订单',
      'orders', 'read',
      'auth.openid == resource.data.openid || auth.isSystem == true',
      'success', selfOrderResult.success, selfOrderResult.success
    );

    // 用户查看他人订单
    const otherOrderResult = await this.simulateUserOperation(
      'orders', 'read',
      { openid: 'other_user_openid' },
      { openid: this.config.test_openid, isSystem: false }
    );
    this.logResult(
      '用户查看他人订单',
      'orders', 'read',
      'auth.openid != resource.data.openid && auth.isSystem == false',
      'denied', !otherOrderResult.success, !otherOrderResult.success
    );

    // 用户直接创建订单
    const createOrderResult = await this.simulateUserOperation(
      'orders', 'write',
      { openid: this.config.test_openid, product_id: 'test' },
      { openid: this.config.test_openid, isSystem: false }
    );
    this.logResult(
      '用户直接创建订单',
      'orders', 'write',
      'auth.isSystem == false',
      'denied', !createOrderResult.success, !createOrderResult.success
    );

    // 系统创建订单
    const systemCreateOrderResult = await this.simulateUserOperation(
      'orders', 'write',
      { openid: this.config.test_openid, product_id: 'test' },
      { openid: null, isSystem: true }
    );
    this.logResult(
      '系统创建订单',
      'orders', 'write',
      'auth.isSystem == true',
      'success', systemCreateOrderResult.success, systemCreateOrderResult.success
    );
  },

  // 测试积分记录权限
  async testPointRecordsPermissions() {
    console.log('🎯 测试积分记录集合权限...');

    // 用户查看自己积分记录
    const selfPointsResult = await this.simulateUserOperation(
      'point_records', 'read',
      { openid: this.config.test_openid },
      { openid: this.config.test_openid, isSystem: false }
    );
    this.logResult(
      '用户查看自己积分记录',
      'point_records', 'read',
      'auth.openid == resource.data.openid || auth.isSystem == true',
      'success', selfPointsResult.success, selfPointsResult.success
    );

    // 用户修改积分
    const modifyPointsResult = await this.simulateUserOperation(
      'point_records', 'write',
      { openid: this.config.test_openid, points_change: 100 },
      { openid: this.config.test_openid, isSystem: false }
    );
    this.logResult(
      '用户修改积分',
      'point_records', 'write',
      'auth.isSystem == false',
      'denied', !modifyPointsResult.success, !modifyPointsResult.success
    );

    // 系统操作积分
    const systemPointsResult = await this.simulateUserOperation(
      'point_records', 'write',
      { openid: this.config.test_openid, points_change: 100 },
      { openid: null, isSystem: true }
    );
    this.logResult(
      '系统操作积分',
      'point_records', 'write',
      'auth.isSystem == true',
      'success', systemPointsResult.success, systemPointsResult.success
    );
  },

  // 测试管理员权限
  async testAdminUserPermissions() {
    console.log('👮 测试管理员用户集合权限...');

    // 用户查看管理员列表
    const viewAdminResult = await this.simulateUserOperation(
      'admin_users', 'read',
      {},
      { openid: this.config.test_openid, isSystem: false }
    );
    this.logResult(
      '用户查看管理员列表',
      'admin_users', 'read',
      'auth.isSystem == false',
      'denied', !viewAdminResult.success, !viewAdminResult.success
    );

    // 系统查看管理员列表
    const systemViewAdminResult = await this.simulateUserOperation(
      'admin_users', 'read',
      {},
      { openid: null, isSystem: true }
    );
    this.logResult(
      '系统查看管理员列表',
      'admin_users', 'read',
      'auth.isSystem == true',
      'success', systemViewAdminResult.success, systemViewAdminResult.success
    );
  },

  // 测试商品权限
  async testProductPermissions() {
    console.log('🛍️ 测试商品集合权限...');

    // 用户查看商品信息
    const viewProductResult = await this.simulateUserOperation(
      'products', 'read',
      { is_active: true },
      { openid: this.config.test_openid, isSystem: false }
    );
    this.logResult(
      '用户查看商品信息',
      'products', 'read',
      'auth.openid != null',
      'success', viewProductResult.success, viewProductResult.success
    );

    // 用户创建商品
    const createProductResult = await this.simulateUserOperation(
      'products', 'write',
      { name: 'test product', price: 99 },
      { openid: this.config.test_openid, isSystem: false }
    );
    this.logResult(
      '用户创建商品',
      'products', 'write',
      'auth.isSystem == false',
      'denied', !createProductResult.success, !createProductResult.success
    );

    // 系统创建商品
    const systemCreateProductResult = await this.simulateUserOperation(
      'products', 'write',
      { name: 'test product', price: 99 },
      { openid: null, isSystem: true }
    );
    this.logResult(
      '系统创建商品',
      'products', 'write',
      'auth.isSystem == true',
      'success', systemCreateProductResult.success, systemCreateProductResult.success
    );
  },

  // 测试社区帖子权限
  async testCommunityPostPermissions() {
    console.log('📝 测试社区帖子集合权限...');

    // 用户查看已审核帖子
    const viewApprovedPostResult = await this.simulateUserOperation(
      'community_posts', 'read',
      { status: 'approved', author_openid: 'other_user' },
      { openid: this.config.test_openid, isSystem: false }
    );
    this.logResult(
      '用户查看已审核帖子',
      'community_posts', 'read',
      'resource.data.status == \'approved\' && auth.openid != null',
      'success', viewApprovedPostResult.success, viewApprovedPostResult.success
    );

    // 用户查看待审核帖子
    const viewPendingPostResult = await this.simulateUserOperation(
      'community_posts', 'read',
      { status: 'pending', author_openid: 'other_user' },
      { openid: this.config.test_openid, isSystem: false }
    );
    this.logResult(
      '用户查看待审核帖子',
      'community_posts', 'read',
      'resource.data.status == \'pending\' && auth.openid != resource.data.author_openid',
      'denied', !viewPendingPostResult.success, !viewPendingPostResult.success
    );

    // 用户创建帖子
    const createPostResult = await this.simulateUserOperation(
      'community_posts', 'write',
      { author_openid: this.config.test_openid, status: 'pending' },
      { openid: this.config.test_openid, isSystem: false }
    );
    this.logResult(
      '用户创建帖子',
      'community_posts', 'write',
      'auth.openid == resource.data.author_openid',
      'success', createPostResult.success, createPostResult.success
    );

    // 用户更新帖子状态
    const updatePostStatusResult = await this.simulateUserOperation(
      'community_posts', 'write',
      { status: 'approved' },
      { openid: this.config.test_openid, isSystem: false }
    );
    this.logResult(
      '用户更新帖子状态',
      'community_posts', 'write',
      'auth.isSystem == false',
      'denied', !updatePostStatusResult.success, !updatePostStatusResult.success
    );
  },

  // 测试系统权限
  async testSystemPermissions() {
    console.log('⚙️ 测试系统级权限...');

    // 系统访问安全日志
    const systemLogsResult = await this.simulateUserOperation(
      'security_logs', 'read',
      {},
      { openid: null, isSystem: true }
    );
    this.logResult(
      '系统访问安全日志',
      'security_logs', 'read',
      'auth.isSystem == true',
      'success', systemLogsResult.success, systemLogsResult.success
    );

    // 用户访问安全日志
    const userLogsResult = await this.simulateUserOperation(
      'security_logs', 'read',
      {},
      { openid: this.config.test_openid, isSystem: false }
    );
    this.logResult(
      '用户访问安全日志',
      'security_logs', 'read',
      'auth.isSystem == false',
      'denied', !userLogsResult.success, !userLogsResult.success
    );
  },

  // 生成测试报告
  generateTestReport() {
    console.log('\n📊 测试报告生成中...\n');

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log('='.repeat(60));
    console.log('安全规则测试报告');
    console.log('='.repeat(60));
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过: ${passedTests} ✅`);
    console.log(`失败: ${failedTests} ❌`);
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
    console.log('\n');

    if (failedTests > 0) {
      console.log('失败的测试:');
      console.log('-'.repeat(40));
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`❌ ${result.test_name}`);
        console.log(`   集合: ${result.collection}`);
        console.log(`   操作: ${result.operation}`);
        console.log(`   期望: ${result.expected_result}`);
        console.log(`   实际: ${result.actual_result}`);
        console.log(`   条件: ${result.condition}`);
        console.log('');
      });
    }

    // 按集合分组显示结果
    const groupedResults = {};
    this.results.forEach(result => {
      if (!groupedResults[result.collection]) {
        groupedResults[result.collection] = [];
      }
      groupedResults[result.collection].push(result);
    });

    console.log('按集合分组的测试结果:');
    console.log('-'.repeat(40));
    Object.entries(groupedResults).forEach(([collection, tests]) => {
      const passed = tests.filter(t => t.passed).length;
      const total = tests.length;
      console.log(`${collection}: ${passed}/${total} 通过 (${((passed/total)*100).toFixed(1)}%)`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('测试完成时间:', new Date().toLocaleString());
    console.log('='.repeat(60));
  }
};

// 导出测试对象（用于Node.js环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = securityTests;
}

// 自动运行测试（如果在浏览器环境或微信开发者工具中）
if (typeof wx !== 'undefined') {
  // 云函数中运行
  exports.main = async (event, context) => {
    await securityTests.runAllTests();
    return {
      success: true,
      results: securityTests.results,
      summary: {
        total: securityTests.results.length,
        passed: securityTests.results.filter(r => r.passed).length,
        failed: securityTests.results.filter(r => !r.passed).length
      }
    };
  };
} else if (typeof window !== 'undefined') {
  // 浏览器中运行
  securityTests.runAllTests();
}

// 使用示例:
/*
// 在微信开发者工具控制台中运行:
securityTests.runAllTests();

// 或者单独运行某个测试组:
await securityTests.testOrderPermissions();

// 或者直接在云函数中使用:
const testResult = await exports.main({}, {});
*/

console.log('🔧 安全规则测试工具已加载，使用 securityTests.runAllTests() 开始测试');