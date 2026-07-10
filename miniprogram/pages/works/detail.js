const worksService = require('../../services/works')
const authService = require('../../services/auth')
const { SERVICE_CATEGORIES } = require('../../utils/constants')

const CATEGORY_MAP = {}
SERVICE_CATEGORIES.forEach(c => { CATEGORY_MAP[c.key] = c.label })

Page({
  data: {
    work: null,
    loading: true,
    currentImage: 0,
    isArtist: false,
    // 右上操作簇的 top(px)：onLoad 按微信胶囊底部精确定位，避免被胶囊遮挡
    actionTop: 88
  },

  onLoad: async function (options) {
    // 右上操作簇需让开微信胶囊按钮：custom 导航下胶囊仍在，按其底部对齐
    var menu = wx.getMenuButtonBoundingClientRect()
    if (menu && menu.bottom) {
      this.setData({ actionTop: menu.bottom + 8 })
    }

    // SEC-03: 等待登录态就绪后再读身份，消除冷启动竞态（按钮可能不显示）
    try { await authService.ensureLogin() } catch (e) {}
    this.setData({ isArtist: authService.isArtist() })
    if (options.id) {
      this.loadDetail(options.id)
    } else {
      this.setData({ loading: false })
    }
  },

  goBack: function () {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({ url: '/pages/works/list' })
    }
  },

  loadDetail: function (id) {
    this.setData({ loading: true })
    worksService.getWorkDetail(id)
      .then(data => {
        data.categoryLabel = CATEGORY_MAP[data.category] || data.category || ''
        this.setData({
          work: data,
          loading: false
        })
      })
      .catch(err => {
        console.error('加载作品详情失败:', err)
        this.setData({ loading: false })
      })
  },

  onSwiperChange: function (e) {
    this.setData({ currentImage: e.detail.current })
  },

  onThumbTap: function (e) {
    const index = e.currentTarget.dataset.index
    if (this.data.work.before_image) {
      const urls = this.data.work.images
      wx.previewImage({
        current: urls[index],
        urls
      })
      return
    }
    this.setData({ currentImage: index })
  },

  onPreviewImage: function (e) {
    const index = e.currentTarget.dataset.index
    const urls = this.data.work.images
    wx.previewImage({
      current: urls[index],
      urls: urls
    })
  },

  goToBooking: function () {
    wx.switchTab({ url: '/pages/booking/create' })
  },

  goToPoster: function () {
    const work = this.data.work
    if (!work || !work._id) return
    wx.navigateTo({
      url: '/pages/works/poster?id=' + work._id
    })
  },

  onSliderFullscreen: function () {
    const work = this.data.work
    if (!work || !work._id) return
    wx.navigateTo({
      url: '/pages/works/compare?id=' + work._id
    })
  },

  onShareAppMessage: function () {
    const work = this.data.work
    return {
      title: work ? `${work.title} — 化妆师作品` : '化妆师作品展示',
      path: `/pages/works/detail?id=${work._id}`,
      imageUrl: work && work.images.length ? work.images[0] : ''
    }
  }
})
