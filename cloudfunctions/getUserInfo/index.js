// 获取用户信息云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 获取用户信息云函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action, userId } = event

  try {
    switch (action) {
      case 'profile':
        // 获取用户档案信息
        return await getUserProfile(wxContext.openid, userId)
      case 'statistics':
        // 获取用户统计信息
        return await getUserStatistics(wxContext.openid, userId)
      case 'memberInfo':
        // 获取会员信息
        return await getMemberInfo(wxContext.openid, userId)
      default:
        return {
          errcode: -1,
          errmsg: '不支持的操作'
        }
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return {
      errcode: -1,
      errmsg: '服务器错误'
    }
  }
}

// 获取用户基本信息
async function getUserProfile(openid, userId) {
  const db = cloud.database()
  const userCollection = db.collection('users')

  try {
    const user = await userCollection
      .where({
        _openid: openid
      })
      .get()

    if (user.data.length > 0) {
      const userData = user.data[0]
      return {
        errcode: 0,
        errmsg: 'ok',
        data: {
          userInfo: {
            nickname: userData.nickname || '茶友用户',
            avatarUrl: userData.avatarUrl || '/images/default-avatar.png',
            phone: userData.phone || ''
          }
        }
      }
    } else {
      return {
        errcode: 0,
        errmsg: 'ok',
        data: {
          userInfo: {
            nickname: '茶友用户',
            avatarUrl: '/images/default-avatar.png',
            phone: ''
          }
        }
      }
    }
  } catch (error) {
    throw error
  }
}

// 获取用户统计信息
async function getUserStatistics(openid, userId) {
  const db = cloud.database()
  const orderCollection = db.collection('orders')

  try {
    const orders = await orderCollection
      .where({
        _openid: openid,
        status: 'completed'
      })
      .get()

    const totalAmount = orders.data.reduce((sum, order) => {
      return sum + parseFloat(order.totalAmount || 0)
    }, 0)

    const pendingOrders = await orderCollection
      .where({
        _openid: openid,
        status: 'pending'
      })
      .count()

    return {
      errcode: 0,
      errmsg: 'ok',
      data: {
        statistics: {
          totalAmount: totalAmount.toFixed(2),
          orderCount: orders.data.length,
          avgOrderAmount: orders.data.length > 0 ? (totalAmount / orders.data.length).toFixed(2) : '0',
          pendingOrders: pendingOrders.total || 0
        }
      }
    }
  } catch (error) {
    throw error
  }
}

// 获取会员信息
async function getMemberInfo(openid, userId) {
  const db = cloud.database()
  const memberCollection = db.collection('members')

  try {
    const member = await memberCollection
      .where({
        _openid: openid
      })
      .get()

    if (member.data.length > 0) {
      const memberData = member.data[0]
      return {
        errcode: 0,
        errmsg: 'ok',
        data: {
          memberLevel: {
            name: memberData.levelName || '品茶客',
            discount: memberData.discount || 9,
            benefits: memberData.benefits || ['新品优先体验', '专属客服', '生日特惠', '积分翻倍']
          }
        }
      }
    } else {
      return {
        errcode: 0,
        errmsg: 'ok',
        data: {
          memberLevel: {
            name: '品茶客',
            discount: 9,
            benefits: ['新品优先体验', '专属客服', '生日特惠', '积分翻倍']
          }
        }
      }
    }
  } catch (error) {
    throw error
  }
}