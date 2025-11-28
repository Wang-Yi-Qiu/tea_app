// pages/user/profile/index.js - 简化版个人中心
const app = getApp()

Page({
  data: {
    userInfo: null,
    memberLevel: null,
    statistics: null,
    pendingOrders: 0,
    availableCoupons: 0,
    loading: false
  },

  onLoad() {
    this.loadUserInfo()
  },

  async loadUserInfo() {
    this.setData({ loading: true })

    try {
      // 检查云开发是否初始化
      if (!wx.cloud) {
        throw new Error('云开发未初始化')
      }

      // 暂时使用本地存储的用户信息，待云函数实现后切换
      const userInfo = wx.getStorageSync('userInfo')
      const memberInfo = wx.getStorageSync('memberInfo')

      if (userInfo) {
        this.setData({
          userInfo: userInfo,
          memberLevel: memberInfo || this.getDefaultMemberLevel(),
          statistics: this.getDefaultStatistics(),
          pendingOrders: 0,
          availableCoupons: 0
        })
      } else {
        // 使用默认数据
        this.setDefaultData()
      }

      // TODO: 云函数实现后启用此代码
      // const response = await wx.cloud.callFunction({
      //   name: 'getUserInfo',
      //   data: { action: 'profile' }
      // })
      // if (response.result && response.result.errcode === 0) {
      //   this.setData({
      //     userInfo: response.result.data.userInfo,
      //     memberLevel: response.result.data.memberLevel,
      //     statistics: response.result.data.statistics,
      //     pendingOrders: response.result.data.statistics.pendingOrders || 0,
      //     availableCoupons: response.result.data.statistics.availableCoupons || 0
      //   })
      // }

    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 使用默认数据
      this.setDefaultData()
    } finally {
      this.setData({ loading: false })
    }
  },

  getDefaultMemberLevel() {
    return {
      name: '品茶客',
      discount: 9,
      benefits: ['新品优先体验', '专属客服', '生日特惠', '积分翻倍']
    }
  },

  getDefaultStatistics() {
    return {
      totalAmount: '1288',
      orderCount: 28,
      avgOrderAmount: '46'
    }
  },

  setDefaultData() {
    const defaultData = {
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

    this.setData({
      userInfo: defaultData.userInfo,
      memberLevel: defaultData.memberLevel,
      statistics: defaultData.statistics,
      pendingOrders: defaultData.statistics.pendingOrders,
      availableCoupons: defaultData.statistics.availableCoupons
    })
  },

  onOrdersTap() {
    wx.navigateTo({
      url: '/pages/user/orders'
    })
  },

  onPointsTap() {
    wx.navigateTo({
      url: '/pages/user/points'
    })
  },

  onAddressTap() {
    wx.navigateTo({
      url: '/pages/user/address'
    })
  },

  onServiceTap() {
    wx.navigateTo({
      url: '/pages/customer-service'
    })
  },

  onFavoriteTap() {
    wx.navigateTo({
      url: '/pages/user/favorites'
    })
  },

  onSettingsTap() {
    wx.navigateTo({
      url: '/pages/user/settings'
    })
  }
})