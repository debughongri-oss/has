// miniprogram/pages/index/index.js
const profileService = require('../../services/profile')
const worksService = require('../../services/works')
const reviewsService = require('../../services/reviews')
const servicesService = require('../../services/services')
const { SERVICE_CATEGORIES } = require('../../utils/constants')

const CATEGORY_MAP = {}
SERVICE_CATEGORIES.forEach(c => { CATEGORY_MAP[c.key] = c.label })

// 把作品拆成档案页拼贴（1 张大图 + 侧边小图）
const buildGallery = (works) => {
  const decorated = works
    .filter(w => w.images && w.images[0])
    .map(w => ({
      ...w,
      categoryLabel: CATEGORY_MAP[w.category] || w.category || ''
    }))
  return {
    heroWork: decorated[0] || null,
    mosaicWorks: decorated.slice(1, 3)
  }
}

Page({
  data: {
    artist: null,
    loading: true,
    error: '',
    heroWork: null,
    mosaicWorks: [],
    categories: SERVICE_CATEGORIES,
    services: [],
    reviewStats: null
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
        this.setData({ artist: data, loading: false })
        // 增强模块并行加载，失败不阻塞首页
        this.loadFeaturedWorks()
        this.loadServices()
        this.loadReviewStats()
      })
      .catch(err => {
        console.error('加载资料失败:', err)
        this.setData({ loading: false, error: '加载失败，请下拉刷新重试' })
      })
  },

  onPrivacyAgree: function () {
    console.log('用户已同意隐私协议')
  },

  /**
   * 加载精选作品 — 1 张大图 + 侧边拼贴
   */
  loadFeaturedWorks: function () {
    worksService.getWorksList('all', 1, 3)
      .then(result => {
        const { heroWork, mosaicWorks } = buildGallery(result.list || [])
        this.setData({ heroWork, mosaicWorks })
      })
      .catch(err => {
        console.error('加载精选作品失败:', err)
      })
  },

  /**
   * 加载热门服务 — 横滑卡片
   */
  loadServices: function () {
    servicesService.getServicesList()
      .then(list => {
        const services = (list || []).slice(0, 3).map(s => {
          const categoryLabel = CATEGORY_MAP[s.category] || s.category || ''
          const parts = []
          if (categoryLabel) parts.push(categoryLabel)
          if (s.duration) parts.push(s.duration + '分钟')
          return {
            ...s,
            categoryLabel,
            meta: parts.join(' · ')
          }
        })
        this.setData({ services })
      })
      .catch(err => {
        console.error('加载服务失败:', err)
      })
  },

  /**
   * 加载评价统计 per D-16/D-17
   */
  loadReviewStats: function () {
    reviewsService.getReviewStats()
      .then(data => {
        this.setData({ reviewStats: data })
      })
      .catch(err => {
        console.error('加载评价统计失败:', err)
      })
  },

  goToWorks: function () {
    wx.switchTab({ url: '/pages/works/list' })
  },

  /**
   * 分类 chip — 经 globalData 把预选分类带到作品页
   */
  goToCategory: function (e) {
    const key = e.currentTarget.dataset.key
    getApp().globalData.pendingWorksCategory = key
    wx.switchTab({ url: '/pages/works/list' })
  },

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
