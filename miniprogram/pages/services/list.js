const servicesService = require('../../services/services')

Page({
  data: {
    services: [],
    loading: true
  },

  onLoad: function () {
    this.loadServices()
  },

  onPullDownRefresh: function () {
    this.loadServices().then(() => wx.stopPullDownRefresh())
  },

  goToBook: function () {
    wx.switchTab({ url: '/pages/booking/create' })
  },

  loadServices: function () {
    this.setData({ loading: true })
    return servicesService.getServicesList()
      .then(data => {
        this.setData({ services: data, loading: false })
      })
      .catch(err => {
        console.error('加载服务失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  }
})
