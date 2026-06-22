const bookingsService = require('../../services/bookings')
const reviewsService = require('../../services/reviews')

var WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// "2026-06-25" → "6/25"
function formatDateShort(dateStr) {
  if (!dateStr) return ''
  var parts = String(dateStr).split('-')
  return parts.length === 3 ? Number(parts[1]) + '/' + Number(parts[2]) : dateStr
}

// "2026-06-25" → "6月25日 周三"
function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  var parts = String(dateStr).split('-')
  if (parts.length !== 3) return dateStr
  var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return Number(parts[1]) + '月' + Number(parts[2]) + '日 ' + WEEKDAYS[d.getDay()]
}

Page({
  data: {
    bookings: [],
    loading: true,
    hasMore: true,
    page: 1,
    reviewMap: {}
  },

  onLoad: function () {
    this.loadBookings()
  },

  /**
   * onShow 刷新列表 — 评价提交后 navigateBack 触发 per D-07
   */
  onShow: function () {
    if (this.data.bookings.length > 0) {
      this.loadBookings(true)
    }
  },

  onPullDownRefresh: function () {
    this.setData({ page: 1 })
    this.loadBookings(true).then(function () { wx.stopPullDownRefresh() })
  },

  onReachBottom: function () {
    if (this.data.hasMore) {
      this.setData({ page: this.data.page + 1 })
      this.loadBookings(false)
    }
  },

  loadBookings: function (reset) {
    if (typeof reset === 'undefined') reset = false
    var page = reset ? 1 : this.data.page
    var self = this
    this.setData({ loading: reset })

    return bookingsService.getMyBookings(page, 10)
      .then(function (result) {
        var bookings = result.list.map(function (b) {
          return Object.assign({}, b, {
            statusLabel: bookingsService.getStatusLabel(b.status),
            statusColor: bookingsService.getStatusColor(b.status),
            dateShort: formatDateShort(b.booking_date),
            dateLabel: formatDateLabel(b.booking_date)
          })
        })

        // D-12: 批量检查已完成预约的评价状态
        var completedIds = bookings
          .filter(function (b) { return b.status === 'completed' })
          .map(function (b) { return b._id })

        if (completedIds.length > 0) {
          Promise.all(
            completedIds.map(function (id) {
              return reviewsService.getByBooking(id)
                .then(function (review) { return { id: id, reviewed: !!review } })
                .catch(function () { return { id: id, reviewed: false } })
            })
          ).then(function (results) {
            var reviewMap = {}
            results.forEach(function (r) { reviewMap[r.id] = r.reviewed })
            self.setData({ reviewMap: reviewMap })
          })
        }

        self.setData({
          bookings: reset ? bookings : self.data.bookings.concat(bookings),
          hasMore: result.hasMore,
          loading: false
        })
      })
      .catch(function (err) {
        console.error('加载预约记录失败:', err)
        self.setData({ loading: false })
      })
  },

  cancelBooking: function (e) {
    var id = e.currentTarget.dataset.id
    var self = this
    wx.showModal({
      title: '取消预约',
      content: '确定要取消这个预约吗？',
      success: function (res) {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' })
          bookingsService.cancelBooking(id)
            .then(function () {
              wx.hideLoading()
              wx.showToast({ title: '已取消', icon: 'success' })
              self.loadBookings(true)
            })
            .catch(function (err) {
              wx.hideLoading()
              wx.showToast({ title: err.message || '取消失败', icon: 'none' })
            })
        }
      }
    })
  },

  /**
   * 跳转到评价表单页 per D-04
   */
  goToReview: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/review/create?booking_id=' + id })
  }
})
