// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 获取用户信息云函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action } = event

  try {
    if (action === 'profile') {
      // 模拟用户数据
      const mockData = {
        userInfo: {
          nickname: '茶友用户',
          avatarUrl: '/images/default-avatar.png'
        },
        memberLevel: {
          name: '品茶客',
          discount: 9,
          benefits: ['新品优先体验', '专属客服', '生日特惠', '积分翻倍']
        },
        statistics: {
          totalAmount: '1288',
          orderCount: 28,
          avgOrderAmount: '46',
          pendingOrders: 2,
          availableCoupons: 5
        }
      }

      return {
        errcode: 0,
        errmsg: 'ok',
        data: mockData
      }
    }

    return {
      errcode: -1,
      errmsg: '不支持的操作'
    }
  } catch (error) {
    console.error('云函数错误:', error)
    return {
      errcode: -1,
      errmsg: '服务器错误'
    }
  }
}