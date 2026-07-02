// miniprogram/pages/profile/index.js
const authService = require('../../services/auth')
const { callCloudFunction } = require('../../services/api')

Page({
  data: {
    userInfo: {},
    isArtist: false,
    isLoggedIn: false
  },

  onShow: async function () {
    // SEC-03: 等待登录态就绪后再读身份，消除冷启动竞态（入口可能不显示）
    try { await authService.ensureLogin() } catch (e) {}
    this.refreshUserState()
  },

  refreshUserState: function () {
    const userInfo = authService.getUserInfo() || {}
    this.setData({
      userInfo,
      isArtist: authService.isArtist(),
      isLoggedIn: authService.isLoggedIn()
    })
  },

  onChooseAvatar: function (e) {
    const avatarUrl = e.detail.avatarUrl
    if (!avatarUrl) return
    this.setData({ 'userInfo.avatar_url': avatarUrl })
    callCloudFunction('login', {
      action: 'updateProfile',
      avatar_url: avatarUrl
    }).catch(err => console.error('保存头像失败:', err))
  },

  onNicknameInput: function (e) {
    const nickname = e.detail.value
    if (!nickname) return
    this.setData({ 'userInfo.nickname': nickname })
    callCloudFunction('login', {
      action: 'updateProfile',
      nickname
    }).catch(err => console.error('保存昵称失败:', err))
  },

  goToAdminWorks: function () {
    wx.navigateTo({ url: '/pages/admin/works/list' })
  },
  goToAdminServices: function () {
    wx.navigateTo({ url: '/pages/admin/services/list' })
  },
  goToAdminBookings: function () {
    wx.navigateTo({ url: '/pages/admin/bookings/list' })
  },
  goToAdminProfile: function () {
    wx.navigateTo({ url: '/pages/admin/profile/edit' })
  },
  goToAdminReviews: function () {
    wx.navigateTo({ url: '/pages/admin/reviews/list' })
  },
  goToBookingHistory: function () {
    wx.navigateTo({ url: '/pages/profile/history' })
  }
})
