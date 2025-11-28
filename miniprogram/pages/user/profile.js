// pages/profile/profile.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      username: '清风徐来',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDLw7nExw8UfY8H_YtQOGGdA93CF7NYhVK61xtQ44TjAnKA9pUmwg1-1BeWajtGYQ5YJ0h28OrAwKw-fiX_tDUy0C7u_Zal6JvFS7TsUiRLl0FDhQCVhZKK7iICgvIbBdtwkIkDeyc4_CCMzaBjG3e8lRyeCbH0LCUGrvTZgJas_6xUP3Stkg9a4rwh5_L9WkMR5sdFhr6xp3jf6B0HP1zXi_F5tyiRHPF_7aBYSd65mjGcHvTCBwVw9cA7IGgo_jofd8ZHab03kCgP',
      description: '查看并编辑个人资料'
    },
    menuItems: [
      {
        id: 'orders',
        icon: '📋',
        text: '我的订单'
      },
      {
        id: 'favorites',
        icon: '❤️',
        text: '我的收藏'
      },
      {
        id: 'address',
        icon: '📍',
        text: '地址管理'
      },
      {
        id: 'service',
        icon: '💬',
        text: '联系客服'
      }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 菜单项点击处理函数
   */
  onMenuItemTap(e) {
    const itemId = e.currentTarget.dataset.id;

    switch(itemId) {
      case 'orders':
        wx.navigateTo({
          url: '/pages/orders/orders'
        });
        break;
      case 'favorites':
        wx.navigateTo({
          url: '/pages/favorites/favorites'
        });
        break;
      case 'address':
        wx.navigateTo({
          url: '/pages/address/address'
        });
        break;
      case 'service':
        wx.makePhoneCall({
          phoneNumber: '400-123-4567'
        });
        break;
      default:
        console.log('未知菜单项:', itemId);
    }
  },

  /**
   * 设置按钮点击处理函数
   */
  onSettingsTap() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  }
})