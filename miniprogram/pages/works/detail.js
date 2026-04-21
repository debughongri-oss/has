const worksService = require('../../services/works')
const { SERVICE_CATEGORIES } = require('../../utils/constants')

const CATEGORY_MAP = {}
SERVICE_CATEGORIES.forEach(c => { CATEGORY_MAP[c.key] = c.label })

Page({
  data: {
    work: null,
    loading: true,
    currentImage: 0
  },

  onLoad: function (options) {
    if (options.id) {
      this.loadDetail(options.id)
    } else {
      this.setData({ loading: false })
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
