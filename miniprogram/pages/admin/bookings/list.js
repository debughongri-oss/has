const bookingsService = require('../../../services/bookings')
const authService = require('../../../services/auth')

Page({
  data: {
    bookings: [],
    loading: true,
    currentStatus: '',
    statusFilters: [
      { key: '', label: '全部' },
      { key: 'pending', label: '待确认', count: 0 },
      { key: 'accepted', label: '已确认' },
      { key: 'rejected', label: '已拒绝' },
      { key: 'completed', label: '已完成' }
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
          statusColor: bookingsService.getStatusColor(b.status)
        }))
        this.setData({
          bookings,
          loading: false,
          'statusFilters[1].count': bookings.filter(b => b.status === 'pending').length
        })
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
  }
})
