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
   * REVW-14/D-20: avg/total 优先读已加载的 artist_profile 冗余字段（零计算、与首页其它展示一致）
   * REVW-10/D-04: 拉取 topTags 高频标签聚合（服务端算，用于「大家这样说」标签云）
   * REVW-12/D-11: 公开侧匿名化——is_anonymous 评价展示「匿名客户」
   * D-08: 首页评价摘要不渲染图片（保持加载轻量），recent 对象保留 images 字段但 WXML 不渲染
   */
  loadReviewStats: function () {
    reviewsService.getReviewStats()
      .then(data => {
        // REVW-14: 优先用已加载 profile 的冗余字段（避免与首页其它展示产生漂移）
        const artist = this.data.artist
        const avg = (artist && artist.avg_rating != null)
          ? Number(artist.avg_rating).toFixed(1)
          : data.average
        const total = (artist && artist.total_reviews != null)
          ? artist.total_reviews
          : data.total

        // REVW-12/D-11: 公开侧匿名化展示
        const recent = (data.recent || []).map(r => Object.assign({}, r, {
          displayNickname: r.is_anonymous ? '匿名客户' : (r.user_nickname || '匿名客户')
        }))

        // REVW-10/D-04: 高频标签 top 5
        const topTags = (data.topTags || []).slice(0, 5)

        this.setData({
          reviewStats: { average: avg, total: total, recent: recent, topTags: topTags }
        })
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
