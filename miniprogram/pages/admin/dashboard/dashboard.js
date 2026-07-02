const bookingsService = require('../../../services/bookings')
const authService = require('../../../services/auth')
const { callCloudFunction } = require('../../../services/api')

Page({
  data: {
    loading: true,
    stats: null
  },

  onLoad: async function () {
    try { await authService.ensureLogin() } catch (e) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    if (!authService.isArtist()) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.loadStats()
  },

  loadStats: function () {
    this.setData({ loading: true })
    callCloudFunction('bookings', { action: 'getDashboard' })
      .then(result => {
        const d = result.data
        const mom = d.lastMonthTotal > 0
          ? Math.round((d.thisMonth.total - d.lastMonthTotal) / d.lastMonthTotal * 100)
          : d.thisMonth.total > 0 ? 100 : 0
        this.setData({
          loading: false,
          stats: {
            ...d,
            momText: mom >= 0 ? '+' + mom + '%' : mom + '%',
            momUp: mom >= 0
          }
        })
      })
      .catch(err => {
        console.error('加载看板失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  }
})
