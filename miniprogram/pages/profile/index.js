// miniprogram/pages/profile/index.js
const authService = require('../../services/auth')
const { callCloudFunction } = require('../../services/api')
const { SUBSCRIBE_TEMPLATE_ID } = require('../../utils/constants')

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
  // A: 化妆师开启新预约提醒（微信一次性订阅：每次授权可收 1 条）
  onEnableNewBookingNotify: function () {
    wx.requestSubscribeMessage({
      tmplIds: [SUBSCRIBE_TEMPLATE_ID],
      success: (res) => {
        const granted = res[SUBSCRIBE_TEMPLATE_ID] === 'accept'
        wx.showToast({
          title: granted ? '已开启，将通知下一条新预约' : '未开启',
          icon: granted ? 'success' : 'none'
        })
      },
      fail: () => {
        wx.showToast({ title: '开启失败', icon: 'none' })
      }
    })
  },
  goToAdminProfile: function () {
    wx.navigateTo({ url: '/pages/admin/profile/edit' })
  },
  goToAdminReviews: function () {
    wx.navigateTo({ url: '/pages/admin/reviews/list' })
  },
  goToDashboard: function () {
    wx.navigateTo({ url: '/pages/admin/dashboard/dashboard' })
  },
  goToAvailability: function () {
    wx.navigateTo({ url: '/pages/admin/availability/availability' })
  },
  goToBookingHistory: function () {
    wx.navigateTo({ url: '/pages/profile/history' })
  }
})
