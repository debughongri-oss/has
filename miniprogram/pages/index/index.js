// miniprogram/pages/index/index.js
const profileService = require('../../services/profile')
const worksService = require('../../services/works')

Page({
  data: {
    artist: null,
    loading: true,
    error: '',
    featuredWorks: [],
    loadingFeatured: false
  },

  onLoad: function () {
    this.loadProfile()
  },

  onPullDownRefresh: function () {
    this.loadProfile(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  /**
   * 加载化妆师资料 — AUTH-02
   */
  loadProfile: function (forceRefresh = false) {
    this.setData({ loading: true, error: '' })

    return profileService.getArtistProfile(forceRefresh)
      .then(data => {
        this.setData({
          artist: data,
          loading: false
        })
        // Load featured works after profile loads
        this.loadFeaturedWorks()
      })
      .catch(err => {
        console.error('加载资料失败:', err)
        this.setData({
          loading: false,
          error: '加载失败，请下拉刷新重试'
        })
      })
  },

  /**
   * 隐私协议同意回调
   */
  onPrivacyAgree: function () {
    console.log('用户已同意隐私协议')
  },

  /**
   * 加载精选作品 — 首页展示3个
   */
  loadFeaturedWorks: function () {
    this.setData({ loadingFeatured: true })
    worksService.getWorksList('all', 1, 3)
      .then(result => {
        this.setData({
          featuredWorks: result.list,
          loadingFeatured: false
        })
      })
      .catch(err => {
        console.error('加载精选作品失败:', err)
        this.setData({ loadingFeatured: false })
      })
  },

  /**
   * 跳转到作品列表（TabBar 页面）
   */
  goToWorks: function () {
    wx.switchTab({ url: '/pages/works/list' })
  },

  /**
   * 跳转到作品详情
   */
  goToWorkDetail: function (e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/works/detail?id=${id}` })
  },

  goToServices: function () {
    wx.switchTab({ url: '/pages/services/list' })
  },

  goToBooking: function () {
    wx.switchTab({ url: '/pages/booking/create' })
  },

  copyWechat: function () {
    const wechat = this.data.artist && this.data.artist.contact_info && this.data.artist.contact_info.wechat
    if (!wechat) {
      wx.showToast({ title: '化妆师暂未设置微信号', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: wechat,
      success: () => {
        wx.showToast({ title: '微信号已复制', icon: 'success' })
      }
    })
  },

  /**
   * 分享到微信聊天 — MGMT-02
   */
  onShareAppMessage: function () {
    const artist = this.data.artist
    return {
      title: artist ? `${artist.name} — 化妆师作品` : '化妆师作品展示',
      path: '/pages/index/index'
    }
  },

  /**
   * 分享到朋友圈 — MGMT-02
   */
  onShareTimeline: function () {
    const artist = this.data.artist
    return {
      title: artist ? `${artist.name} — 化妆师作品` : '化妆师作品展示'
    }
  }
})
