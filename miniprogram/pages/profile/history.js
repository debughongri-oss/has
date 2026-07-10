const bookingsService = require('../../services/bookings')
const reviewsService = require('../../services/reviews')

var WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
var FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'accepted', label: '已确认', statuses: ['accepted', 'rescheduled'] },
  { key: 'completed', label: '已完成' },
  { key: 'closed', label: '未成行', statuses: ['cancelled', 'rejected'] }
]

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

function getStatusMeta(status) {
  var meta = {
    pending: { step: '等待化妆师确认', tone: 'warm' },
    accepted: { step: '预约已确认，请按时到达', tone: 'green' },
    rejected: { step: '预约未通过', tone: 'muted' },
    rescheduled: { step: '预约时间已调整', tone: 'blue' },
    completed: { step: '服务已完成', tone: 'purple' },
    cancelled: { step: '预约已取消', tone: 'muted' }
  }
  return meta[status] || { step: '预约状态已更新', tone: 'muted' }
}

function normalizeBookingMeta(booking) {
  var mode = booking.service_mode || 'store'
  var contactInfo = booking.contact_info || booking.user_info || {}
  return {
    serviceMode: mode,
    serviceModeLabel: booking.service_mode_label || (mode === 'home' ? '上门' : '到店'),
    serviceAddress: booking.service_address || '',
    serviceImage: booking.service_image || '',
    contactPhone: contactInfo.phone || '',
    contactWechat: contactInfo.wechat || ''
  }
}

function buildViewState(bookings, activeStatus) {
  var counts = { all: bookings.length }
  var upcomingCount = 0
  var completedCount = 0

  bookings.forEach(function (booking) {
    counts[booking.status] = (counts[booking.status] || 0) + 1
    if (booking.status === 'rescheduled') {
      counts.accepted = (counts.accepted || 0) + 1
    }
    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      counts.closed = (counts.closed || 0) + 1
    }
    if (booking.status === 'pending' || booking.status === 'accepted' || booking.status === 'rescheduled') {
      upcomingCount += 1
    }
    if (booking.status === 'completed') {
      completedCount += 1
    }
  })

  var statusFilters = FILTERS.map(function (filter) {
    return {
      key: filter.key,
      label: filter.label,
      count: counts[filter.key] || 0,
      active: activeStatus === filter.key
    }
  })

  var activeFilter = FILTERS.filter(function (filter) { return filter.key === activeStatus })[0]
  var filteredBookings = activeStatus === 'all'
    ? bookings
    : bookings.filter(function (booking) {
      if (activeFilter && activeFilter.statuses) {
        return activeFilter.statuses.indexOf(booking.status) !== -1
      }
      return booking.status === activeStatus
    })

  return {
    filteredBookings: filteredBookings,
    statusFilters: statusFilters,
    stats: {
      total: bookings.length,
      upcoming: upcomingCount,
      completed: completedCount
    }
  }
}

Page({
  data: {
    bookings: [],
    filteredBookings: [],
    activeStatus: 'all',
    statusFilters: FILTERS.map(function (filter) {
      return { key: filter.key, label: filter.label, count: 0, active: filter.key === 'all' }
    }),
    stats: {
      total: 0,
      upcoming: 0,
      completed: 0
    },
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

  refreshViewState: function (bookings) {
    var viewState = buildViewState(bookings || this.data.bookings, this.data.activeStatus)
    this.setData(viewState)
  },

  onFilterTap: function (e) {
    var status = e.currentTarget.dataset.status
    this.setData({ activeStatus: status })
    this.refreshViewState()
  },

  loadBookings: function (reset) {
    if (typeof reset === 'undefined') reset = false
    var page = reset ? 1 : this.data.page
    var self = this
    this.setData({ loading: page === 1 && this.data.bookings.length === 0 })

    return bookingsService.getMyBookings(page, 10)
      .then(function (result) {
        var bookings = result.list.map(function (b) {
          var statusMeta = getStatusMeta(b.status)
          var bookingMeta = normalizeBookingMeta(b)
          return Object.assign({}, b, bookingMeta, {
            statusLabel: bookingsService.getStatusLabel(b.status),
            statusColor: bookingsService.getStatusColor(b.status),
            statusStep: statusMeta.step,
            statusTone: statusMeta.tone,
            dateShort: formatDateShort(b.booking_date),
            dateLabel: formatDateLabel(b.booking_date)
          })
        })
        var nextBookings = reset ? bookings : self.data.bookings.concat(bookings)
        var viewState = buildViewState(nextBookings, self.data.activeStatus)

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
            var reviewMap = Object.assign({}, self.data.reviewMap)
            results.forEach(function (r) { reviewMap[r.id] = r.reviewed })
            self.setData({ reviewMap: reviewMap })
          })
        }

        self.setData(Object.assign({
          bookings: nextBookings,
          hasMore: result.hasMore,
          loading: false
        }, viewState))
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

  // D: 改期 — 跳转改期页
  goReschedule: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/booking/reschedule?id=' + id })
  },

  /**
   * 跳转到评价表单页 per D-04
   */
  goToReview: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/review/create?booking_id=' + id })
  },

  goToBooking: function () {
    wx.switchTab({ url: '/pages/booking/create' })
  }
})
