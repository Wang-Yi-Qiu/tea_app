// 个人中心页面逻辑 - 中国风雅致设计
Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      username: '清风徐来',
      avatar: 'https://via.placeholder.com/120x120/8B4513/ffffff?text=茶',
      description: '品茶论道 • 雅致生活',
      stats: {
        following: 128,
        followers: 256,
        favorites: 42
      }
    },
    vipInfo: {
      level: '茶叶雅士',
      description: '专属优惠 • 品质服务'
    },
    menuItems: [
      {
        id: 'orders',
        title: '我的订单',
        icon: 'icon-order',
        count: 0,
        badge: null,
        type: 'order'
      },
      {
        id: 'favorites',
        title: '我的收藏',
        icon: 'icon-favorite',
        count: 18,
        badge: null,
        type: 'default'
      },
      {
        id: 'address',
        title: '地址管理',
        icon: 'icon-location',
        count: 0,
        badge: null,
        type: 'default'
      },
      {
        id: 'invite',
        title: '邀请有礼',
        icon: 'icon-gift',
        count: 0,
        badge: '新',
        type: 'invite'
      },
      {
        id: 'help',
        title: '帮助中心',
        icon: 'icon-help',
        count: 0,
        badge: null,
        type: 'default'
      },
      {
        id: 'contact',
        title: '联系客服',
        icon: 'icon-service',
        count: 0,
        badge: '在线',
        type: 'contact'
      }
    ],
    orderStatus: {
      pending: 2, // 待收货数量
      text: '待收货 2'
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.initUserInfo();
    this.loadOrderStatus();
    this.loadFavoritesCount();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    // 设置导航栏
    wx.setNavigationBarTitle({
      title: '个人中心'
    });

    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#8B4513'
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 每次页面显示时刷新数据
    this.refreshPageData();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.refreshPageData();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '邀您品茶论道，共享雅致生活',
      path: '/pages/index/index',
      imageUrl: '/images/share-tea.jpg'
    };
  },

  /**
   * 初始化用户信息
   */
  initUserInfo: function () {
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: {
          ...this.data.userInfo,
          ...userInfo
        }
      });
    }

    // 模拟获取用户统计数据
    this.getUserStats();
  },

  /**
   * 获取用户统计数据
   */
  getUserStats: function () {
    // 这里应该调用后端API获取真实数据
    // 模拟异步请求
    setTimeout(() => {
      const stats = {
        following: Math.floor(Math.random() * 500),
        followers: Math.floor(Math.random() * 1000),
        favorites: Math.floor(Math.random() * 100)
      };

      this.setData({
        'userInfo.stats': stats
      });
    }, 500);
  },

  /**
   * 加载订单状态
   */
  loadOrderStatus: function () {
    // 调用后端API获取订单状态
    // 模拟数据
    const orderStatus = {
      pending: Math.floor(Math.random() * 5),
      text: `待收货 ${Math.floor(Math.random() * 5)}`
    };

    this.setData({
      orderStatus
    });
  },

  /**
   * 加载收藏数量
   */
  loadFavoritesCount: function () {
    // 调用后端API获取收藏数量
    // 更新菜单项中的收藏数量
    const favoritesCount = Math.floor(Math.random() * 50);
    this.setData({
      'menuItems[1].count': favoritesCount
    });
  },

  /**
   * 刷新页面数据
   */
  refreshPageData: function () {
    this.initUserInfo();
    this.loadOrderStatus();
    this.loadFavoritesCount();

    wx.showToast({
      title: '刷新成功',
      icon: 'success',
      duration: 1000
    });
  },

  /**
   * 设置按钮点击
   */
  onSettingsTap: function () {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  /**
   * 编辑资料点击
   */
  onEditProfile: function () {
    wx.navigateTo({
      url: '/pages/edit-profile/edit-profile'
    });
  },

  /**
   * 我的订单点击
   */
  onOrdersTap: function () {
    wx.navigateTo({
      url: '/pages/orders/orders'
    });
  },

  /**
   * 我的收藏点击
   */
  onFavoritesTap: function () {
    wx.navigateTo({
      url: '/pages/favorites/favorites'
    });
  },

  /**
   * 地址管理点击
   */
  onAddressTap: function () {
    wx.navigateTo({
      url: '/pages/address/address'
    });
  },

  /**
   * 邀请有礼点击
   */
  onInviteTap: function () {
    // 显示邀请弹窗或跳转到邀请页面
    wx.showModal({
      title: '邀请有礼',
      content: '邀请好友品茶，双方均可获得优惠券！',
      confirmText: '立即邀请',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          this.shareInvite();
        }
      }
    });
  },

  /**
   * 分享邀请
   */
  shareInvite: function () {
    wx.showShareMenu({
      withShareTicket: true
    });
  },

  /**
   * 帮助中心点击
   */
  onHelpTap: function () {
    wx.navigateTo({
      url: '/pages/help/help'
    });
  },

  /**
   * 联系客服点击
   */
  onContactTap: function () {
    // 检查是否在营业时间
    const now = new Date();
    const hour = now.getHours();
    const isBusinessHours = hour >= 9 && hour < 21;

    if (isBusinessHours) {
      // 营业时间内直接联系客服
      wx.navigateTo({
        url: '/pages/customer-service/customer-service'
      });
    } else {
      // 非营业时间显示提示
      wx.showModal({
        title: '客服提示',
        content: '客服服务时间：9:00-21:00\n您也可以留言，我们会在营业时间内回复您。',
        confirmText: '留言',
        cancelText: '知道了',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/customer-service/customer-service?type=message'
            });
          }
        }
      });
    }
  },

  /**
   * 会员卡片点击
   */
  onVipCardTap: function () {
    wx.navigateTo({
      url: '/pages/vip/vip'
    });
  },

  /**
   * 用户头像点击
   */
  onAvatarTap: function () {
    wx.previewImage({
      urls: [this.data.userInfo.avatar],
      current: this.data.userInfo.avatar
    });
  },

  /**
   * 用户名点击
   */
  onUsernameTap: function () {
    wx.showActionSheet({
      itemList: ['复制用户名', '查看主页'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.setClipboardData({
            data: this.data.userInfo.username,
            success: () => {
              wx.showToast({
                title: '复制成功',
                icon: 'success'
              });
            }
          });
        } else if (res.tapIndex === 1) {
          this.onEditProfile();
        }
      }
    });
  },

  /**
   * 统计数据点击
   */
  onStatsTap: function (e) {
    const type = e.currentTarget.dataset.type;

    switch (type) {
      case 'following':
        wx.navigateTo({
          url: '/pages/following/following'
        });
        break;
      case 'followers':
        wx.navigateTo({
          url: '/pages/followers/followers'
        });
        break;
      case 'favorites':
        this.onFavoritesTap();
        break;
    }
  }
});