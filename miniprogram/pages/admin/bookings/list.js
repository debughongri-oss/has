const bookingsService = require('../../../services/bookings')
const authService = require('../../../services/auth')

// "2026-06-25" → "6/25"
const formatDateShort = (dateStr) => {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : dateStr
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
      { key: 'completed', label: '已完成', count: 0 }
    ]
  },

  onLoad: function () {
    if (!authService.isArtist()) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.loadBookings()
  },

  onShow: function () {
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
