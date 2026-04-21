const worksService = require('../../services/works')

Page({
  data: {
    work: null,
    loading: true,
    statusBarHeight: 20
  },

  onLoad: function (options) {
    var sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight })

    if (options.id) {
      this.loadWork(options.id)
    } else {
      wx.navigateBack()
    }
  },

  loadWork: function (id) {
    this.setData({ loading: true })
    worksService.getWorkDetail(id)
      .then(function (data) {
        this.setData({
          work: data,
          loading: false
        })
      }.bind(this))
      .catch(function (err) {
        console.error('加载作品失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      }.bind(this))
  },

  onSliderFullscreen: function () {
    // Already in fullscreen — no-op
  },

  onBack: function () {
    wx.navigateBack()
  },

  onShareAppMessage: function () {
    var work = this.data.work
    return {
      title: work ? work.title + ' — 妆前妆后对比' : '化妆效果对比',
      path: '/pages/works/detail?id=' + (work ? work._id : ''),
      imageUrl: work && work.images.length ? work.images[0] : ''
    }
  }
})
