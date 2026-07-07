const bookingsService = require('../../../services/bookings')
const authService = require('../../../services/auth')
const { callCloudFunction } = require('../../../services/api')

function formatMoney(value) {
  const amount = Math.round(Number(value) || 0)
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function buildStatusBreakdown(thisMonth) {
  const total = thisMonth.total || 0
  return [
    { key: 'pending', name: '待确认', count: thisMonth.pending || 0 },
    { key: 'accepted', name: '已确认', count: thisMonth.accepted || 0 },
    { key: 'completed', name: '已完成', count: thisMonth.completed || 0 },
    { key: 'rejected', name: '已拒绝', count: thisMonth.rejected || 0 },
    { key: 'cancelled', name: '已取消', count: thisMonth.cancelled || 0 }
  ].map(item => ({
    ...item,
    percent: total ? Math.round(item.count / total * 100) : 0
  }))
}

function buildTopServices(services) {
  const max = services.reduce((acc, item) => Math.max(acc, item.count || 0), 0) || 1
  return services.map(item => ({
    ...item,
    percent: Math.round((item.count || 0) / max * 100)
  }))
}

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
        const now = new Date()
        const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`
        const completedRate = d.thisMonth.total
          ? Math.round((d.thisMonth.completed || 0) / d.thisMonth.total * 100)
          : 0
        const mom = d.lastMonthTotal > 0
          ? Math.round((d.thisMonth.total - d.lastMonthTotal) / d.lastMonthTotal * 100)
          : d.thisMonth.total > 0 ? 100 : 0
        this.setData({
          loading: false,
          stats: {
            ...d,
            monthLabel,
            revenueText: formatMoney(d.revenue),
            completedRate,
            statusBreakdown: buildStatusBreakdown(d.thisMonth),
            statusSummary: d.thisMonth.pending
              ? `${d.thisMonth.pending} 单待确认`
              : d.thisMonth.total ? '本月预约已处理' : '暂无本月预约',
            topServices: buildTopServices(d.topServices || []),
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
