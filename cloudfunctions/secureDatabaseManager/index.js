const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// 安全日志记录
const logSecurityOperation = async (operation, collection, openid, details, success) => {
  try {
    await db.collection('security_logs').add({
      data: {
        timestamp: new Date(),
        operation: operation,
        collection: collection,
        openid: openid || 'system',
        details: details,
        success: success,
        ip: cloud.getWXContext().CLIENTIP
      }
    });
  } catch (error) {
    console.error('安全日志记录失败:', error);
  }
};

// 验证管理员权限
const verifyAdminPermission = async (openid, requiredPermission) => {
  try {
    const adminUser = await db.collection('admin_users').where({
      openid: openid,
      is_active: true
    }).get();

    if (adminUser.data.length === 0) {
      return { authorized: false, reason: '管理员不存在或未激活' };
    }

    const admin = adminUser.data[0];

    if (requiredPermission && !admin.permissions.includes(requiredPermission)) {
      return { authorized: false, reason: '权限不足' };
    }

    return { authorized: true, admin: admin };
  } catch (error) {
    return { authorized: false, reason: '权限验证失败' };
  }
};

// 创建订单（安全写入）
const createOrder = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 数据验证
    if (!event.product_id || !event.quantity || !event.address) {
      throw new Error('缺少必要参数');
    }

    if (event.quantity <= 0) {
      throw new Error('数量必须大于0');
    }

    // 获取商品信息和库存
    const product = await db.collection('products')
      .where({
        _id: event.product_id,
        is_active: true
      })
      .get();

    if (product.data.length === 0) {
      throw new Error('商品不存在或已下架');
    }

    const productInfo = product.data[0];

    // 检查库存
    if (productInfo.inventory_count < event.quantity) {
      throw new Error('库存不足');
    }

    // 计算总价
    const total_amount = productInfo.price * event.quantity;

    // 创建订单数据
    const orderData = {
      openid: openid,
      product_id: event.product_id,
      product_name: productInfo.name,
      product_image: productInfo.images[0] || '',
      quantity: event.quantity,
      unit_price: productInfo.price,
      total_amount: total_amount,
      address: event.address,
      contact_phone: event.contact_phone || '',
      status: 'pending',
      payment_status: 'unpaid',
      create_time: new Date(),
      update_time: new Date(),
      order_no: generateOrderNo()
    };

    // 原子操作：创建订单并更新库存
    const transaction = await db.startTransaction();

    try {
      // 创建订单
      const orderResult = await transaction.collection('orders').add({
        data: orderData
      });

      // 更新库存
      await transaction.collection('products').doc(event.product_id).update({
        data: {
          inventory_count: _.inc(-event.quantity),
          sold_count: _.inc(event.quantity),
          update_time: new Date()
        }
      });

      await transaction.commit();

      // 记录操作日志
      await logSecurityOperation('create_order', 'orders', openid, {
        order_id: orderResult._id,
        product_id: event.product_id,
        quantity: event.quantity,
        total_amount: total_amount
      }, true);

      return {
        success: true,
        order_id: orderResult._id,
        order_no: orderData.order_no,
        total_amount: total_amount
      };

    } catch (transError) {
      await transaction.rollback();
      throw transError;
    }

  } catch (error) {
    await logSecurityOperation('create_order', 'orders', openid, {
      error: error.message,
      input_data: event
    }, false);

    return {
      success: false,
      error: error.message
    };
  }
};

// 更新订单状态（管理员操作）
const updateOrderStatus = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 验证管理员权限
    const authResult = await verifyAdminPermission(openid, 'order_management');
    if (!authResult.authorized) {
      throw new Error(authResult.reason);
    }

    // 参数验证
    if (!event.order_id || !event.status) {
      throw new Error('缺少必要参数');
    }

    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled'];
    if (!validStatuses.includes(event.status)) {
      throw new Error('无效的订单状态');
    }

    // 获取订单信息
    const order = await db.collection('orders')
      .where({
        _id: event.order_id
      })
      .get();

    if (order.data.length === 0) {
      throw new Error('订单不存在');
    }

    const orderInfo = order.data[0];
    const oldStatus = orderInfo.status;

    // 更新订单状态
    const updateData = {
      status: event.status,
      update_time: new Date(),
      admin_openid: openid,
      admin_remark: event.remark || ''
    };

    // 如果是发货，添加物流信息
    if (event.status === 'shipped' && event.tracking_info) {
      updateData.tracking_info = event.tracking_info;
      updateData.ship_time = new Date();
    }

    const result = await db.collection('orders').doc(event.order_id).update({
      data: updateData
    });

    // 记录操作日志
    await logSecurityOperation('update_order_status', 'orders', openid, {
      order_id: event.order_id,
      old_status: oldStatus,
      new_status: event.status,
      admin_remark: event.remark
    }, true);

    return {
      success: true,
      updated: result.stats.updated
    };

  } catch (error) {
    await logSecurityOperation('update_order_status', 'orders', openid, {
      error: error.message,
      input_data: event
    }, false);

    return {
      success: false,
      error: error.message
    };
  }
};

// 积分操作（安全写入）
const managePoints = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 验证参数
    if (!event.action || !event.points || !event.reason) {
      throw new Error('缺少必要参数');
    }

    const validActions = ['earn', 'redeem', 'admin_adjust'];
    if (!validActions.includes(event.action)) {
      throw new Error('无效的积分操作');
    }

    const points = Math.abs(event.points);
    if (points <= 0) {
      throw new Error('积分数值必须大于0');
    }

    // 获取用户当前积分
    const userPoints = await db.collection('user_points')
      .where({
        openid: event.target_openid || openid
      })
      .get();

    let currentPoints = 0;
    let userPointsDoc = null;

    if (userPoints.data.length > 0) {
      currentPoints = userPoints.data[0].total_points;
      userPointsDoc = userPoints.data[0];
    }

    // 根据操作类型计算最终积分
    let finalPoints = currentPoints;
    if (event.action === 'earn') {
      finalPoints += points;
    } else if (event.action === 'redeem') {
      if (currentPoints < points) {
        throw new Error('积分余额不足');
      }
      finalPoints -= points;
    } else if (event.action === 'admin_adjust') {
      // 管理员调整需要特殊权限
      if (event.action === 'admin_adjust') {
        const authResult = await verifyAdminPermission(openid, 'points_management');
        if (!authResult.authorized) {
          throw new Error('无积分管理权限');
        }
      }
      finalPoints = event.points; // 直接设置为目标值
    }

    // 积分变更记录
    const recordData = {
      openid: event.target_openid || openid,
      action: event.action,
      points_change: event.action === 'admin_adjust' ? finalPoints - currentPoints :
                      (event.action === 'earn' ? points : -points),
      points_before: currentPoints,
      points_after: finalPoints,
      reason: event.reason,
      related_order_id: event.related_order_id || null,
      create_time: new Date(),
      operator_openid: openid
    };

    // 原子操作：更新积分余额并记录变更
    const transaction = await db.startTransaction();

    try {
      // 记录积分变更
      await transaction.collection('point_records').add({
        data: recordData
      });

      // 更新用户积分余额
      if (userPointsDoc) {
        await transaction.collection('user_points').doc(userPointsDoc._id).update({
          data: {
            total_points: finalPoints,
            update_time: new Date()
          }
        });
      } else {
        await transaction.collection('user_points').add({
          data: {
            openid: event.target_openid || openid,
            total_points: finalPoints,
            create_time: new Date(),
            update_time: new Date()
          }
        });
      }

      await transaction.commit();

      // 记录操作日志
      await logSecurityOperation('manage_points', 'point_records', openid, {
        target_openid: event.target_openid || openid,
        action: event.action,
        points_change: recordData.points_change,
        reason: event.reason
      }, true);

      return {
        success: true,
        points_before: currentPoints,
        points_after: finalPoints,
        change: recordData.points_change
      };

    } catch (transError) {
      await transaction.rollback();
      throw transError;
    }

  } catch (error) {
    await logSecurityOperation('manage_points', 'point_records', openid, {
      error: error.message,
      input_data: event
    }, false);

    return {
      success: false,
      error: error.message
    };
  }
};

// 创建商品（管理员操作）
const createProduct = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 验证管理员权限
    const authResult = await verifyAdminPermission(openid, 'product_management');
    if (!authResult.authorized) {
      throw new Error(authResult.reason);
    }

    // 参数验证
    if (!event.name || !event.base_price || !event.category_id) {
      throw new Error('缺少必要参数');
    }

    if (event.base_price <= 0) {
      throw new Error('价格必须大于0');
    }

    // 商品数据
    const productData = {
      name: event.name,
      description: event.description || '',
      base_price: event.base_price,
      category_id: event.category_id,
      images: event.images || [],
      specifications: event.specifications || [],
      inventory_count: event.inventory_count || 0,
      sold_count: 0,
      is_active: event.is_active !== false,
      sort_order: event.sort_order || 0,
      create_time: new Date(),
      update_time: new Date(),
      creator_openid: openid
    };

    const result = await db.collection('products').add({
      data: productData
    });

    // 记录操作日志
    await logSecurityOperation('create_product', 'products', openid, {
      product_id: result._id,
      name: event.name,
      base_price: event.base_price
    }, true);

    return {
      success: true,
      product_id: result._id
    };

  } catch (error) {
    await logSecurityOperation('create_product', 'products', openid, {
      error: error.message,
      input_data: event
    }, false);

    return {
      success: false,
      error: error.message
    };
  }
};

// 审核社区帖子（管理员操作）
const moderateCommunityPost = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 验证管理员权限
    const authResult = await verifyAdminPermission(openid, 'content_moderation');
    if (!authResult.authorized) {
      throw new Error(authResult.reason);
    }

    // 参数验证
    if (!event.post_id || !event.status) {
      throw new Error('缺少必要参数');
    }

    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(event.status)) {
      throw new Error('无效的审核状态');
    }

    // 获取帖子信息
    const post = await db.collection('community_posts')
      .where({
        _id: event.post_id
      })
      .get();

    if (post.data.length === 0) {
      throw new Error('帖子不存在');
    }

    const postInfo = post.data[0];

    // 更新审核状态
    const updateData = {
      status: event.status,
      moderator_openid: openid,
      moderate_time: new Date(),
      moderate_remark: event.remark || ''
    };

    const result = await db.collection('community_posts').doc(event.post_id).update({
      data: updateData
    });

    // 如果审核通过，发送通知给作者
    if (event.status === 'approved') {
      // 可以在这里添加消息推送逻辑
      console.log('帖子审核通过，通知作者:', postInfo.author_openid);
    }

    // 记录操作日志
    await logSecurityOperation('moderate_community_post', 'community_posts', openid, {
      post_id: event.post_id,
      author_openid: postInfo.author_openid,
      status: event.status,
      remark: event.remark
    }, true);

    return {
      success: true,
      updated: result.stats.updated
    };

  } catch (error) {
    await logSecurityOperation('moderate_community_post', 'community_posts', openid, {
      error: error.message,
      input_data: event
    }, false);

    return {
      success: false,
      error: error.message
    };
  }
};

// 生成订单号
const generateOrderNo = () => {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TEA${timestamp}${random}`;
};

// 主入口函数
exports.main = async (event, context) => {
  // 记录所有API调用
  const wxContext = cloud.getWXContext();
  console.log('安全数据库管理器调用:', {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    action: event.action,
    timestamp: new Date()
  });

  switch (event.action) {
    case 'createOrder':
      return await createOrder(event, context);

    case 'updateOrderStatus':
      return await updateOrderStatus(event, context);

    case 'managePoints':
      return await managePoints(event, context);

    case 'createProduct':
      return await createProduct(event, context);

    case 'moderateCommunityPost':
      return await moderateCommunityPost(event, context);

    default:
      return {
        success: false,
        error: '不支持的操作类型'
      };
  }
};