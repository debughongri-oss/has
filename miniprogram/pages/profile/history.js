const bookingsService = require('../../services/bookings')

Page({
  data: {
    bookings: [],
    loading: true,
    hasMore: true,
    page: 1
  },

  onLoad: function () {
    this.loadBookings()
  },

  onPullDownRefresh: function () {
    this.setData({ page: 1 })
    this.loadBookings(true).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom: function () {
    if (this.data.hasMore) {
      this.setData({ page: this.data.page + 1 })
      this.loadBookings(false)
    }
  },

  loadBookings: function (reset = false) {
    const page = reset ? 1 : this.data.page
    this.setData({ loading: reset })
    return bookingsService.getMyBookings(page, 10)
      .then(result => {
        const bookings = result.list.map(b => ({
          ...b,
          statusLabel: bookingsService.getStatusLabel(b.status),
          statusColor: bookingsService.getStatusColor(b.status)
        }))
        this.setData({
          bookings: reset ? bookings : this.data.bookings.concat(bookings),
          hasMore: result.hasMore,
          loading: false
        })
      })
      .catch(err => {
        console.error('加载预约记录失败:', err)
        this.setData({ loading: false })
      })
  },

  cancelBooking: function (e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消预约',
      content: '确定要取消这个预约吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' })
          bookingsService.cancelBooking(id)
            .then(() => {
              wx.hideLoading()
              wx.showToast({ title: '已取消', icon: 'success' })
              this.loadBookings(true)
            })
            .catch(err => {
              wx.hideLoading()
              wx.showToast({ title: err.message || '取消失败', icon: 'none' })
            })
        }
      }
    })
  }
})
