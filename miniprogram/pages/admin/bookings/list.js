const bookingsService = require('../../../services/bookings')
const authService = require('../../../services/auth')

// "2026-06-25" → "6/25"
const formatDateShort = (dateStr) => {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : dateStr
}

const getServiceModeLabel = (booking) => {
  if (booking.service_mode_label) return booking.service_mode_label
  return booking.service_mode === 'home' ? '上门' : '到店'
}

Page({
  data: {
    bookings: [],
    loading: true,
    currentStatus: '',
    statusFilters: [
      { key: '', label: '全部', count: 0 },
      { key: 'pending', label: '待确认', count: 0 },
      { key: 'accepted', label: '已确认', count: 0 },
      { key: 'rejected', label: '已拒绝', count: 0 },
      { key: 'completed', label: '已完成', count: 0 },
      { key: 'no_show', label: '缺席', count: 0 }
    ]
  },

  onLoad: async function () {
    // SEC-03: 等待登录态就绪后再判身份，消除冷启动竞态
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
    this.loadBookings()
  },

  onShow: async function () {
    try { await authService.ensureLogin() } catch (e) {}
    if (authService.isArtist() && !this.data.loading) {
      this.loadBookings()
    }
  },

  loadBookings: function () {
    this.setData({ loading: true })
    const status = this.data.currentStatus || undefined
    bookingsService.getBookingsList(status, 1, 50)
      .then(result => {
        const bookings = result.list.map(b => ({
          ...b,
          statusLabel: bookingsService.getStatusLabel(b.status),
          statusColor: bookingsService.getStatusColor(b.status),
          serviceModeLabel: getServiceModeLabel(b),
          isHomeService: b.service_mode === 'home',
          dateShort: formatDateShort(b.booking_date)
        }))
        const counts = result.statusCounts || {}
        const total = Object.values(counts).reduce((sum, n) => sum + n, 0)
        const statusFilters = this.data.statusFilters.map(f => ({
          ...f,
          count: f.key === '' ? total : (counts[f.key] || 0)
        }))
        this.setData({ bookings, loading: false, statusFilters })
      })
      .catch(err => {
        console.error('加载预约失败:', err)
        this.setData({ loading: false })
      })
  },

  onFilterChange: function (e) {
    this.setData({ currentStatus: e.currentTarget.dataset.key })
    this.loadBookings()
  },

  goToDetail: function (e) {
    wx.navigateTo({ url: `/pages/admin/bookings/detail?id=${e.currentTarget.dataset.id}` })
  },

  goToCalendar: function () {
    wx.navigateTo({ url: '/pages/admin/bookings/calendar' })
  },

  /**
   * 评价管理入口 per D-21
   */
  goToReviews: function () {
    wx.navigateTo({ url: '/pages/admin/reviews/list' })
  }
})
