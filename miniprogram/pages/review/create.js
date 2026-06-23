const bookingsService = require('../../services/bookings')
const reviewsService = require('../../services/reviews')

Page({
  data: {
    bookingId: '',
    booking: null,
    rating: 0,
    ratingLabel: '',
    stars: [1, 2, 3, 4, 5],
    content: '',
    contentLength: 0,
    maxLength: 200,
    submitting: false
  },

  onLoad: function (options) {
    if (!options.booking_id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(function () { wx.navigateBack() }, 1500)
      return
    }
    this.setData({ bookingId: options.booking_id })
    this.loadBooking(options.booking_id)
  },

  /**
   * 加载预约详情，验证状态为已完成 per D-05
   */
  loadBooking: function (bookingId) {
    bookingsService.getBookingDetail(bookingId)
      .then(function (data) {
        if (data.status !== 'completed') {
          wx.showToast({ title: '只能评价已完成的预约', icon: 'none' })
          setTimeout(function () { wx.navigateBack() }, 1500)
          return
        }
        this.setData({
          booking: {
            service_name: data.service_name,
            booking_date: data.booking_date,
            booking_time: data.booking_time
          }
        })
      }.bind(this))
      .catch(function (err) {
        console.error('加载预约详情失败:', err)
        wx.showToast({ title: '预约不存在', icon: 'none' })
        setTimeout(function () { wx.navigateBack() }, 1500)
      })
  },

  /**
   * t-rate bind:change — 评分变化 per D-06
   */
  onRateStar: function (e) {
    var v = e.currentTarget.dataset.value
    var LABELS = ['', '不满意', '一般', '还可以', '满意', '非常满意']
    this.setData({ rating: v, ratingLabel: LABELS[v] || '' })
  },

  /**
   * textarea input — 文字评价输入
   */
  onContentInput: function (e) {
    this.setData({
      content: e.detail.value,
      contentLength: e.detail.value.length
    })
  },

  /**
   * 提交评价 per D-05
   */
  onSubmit: function () {
    if (this.data.submitting) return
    if (this.data.rating < 1) {
      wx.showToast({ title: '请先选择评分', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    // 截断200字
    var content = (this.data.content || '').slice(0, 200)

    // 从 app globalData 或缓存获取 userInfo
    var app = getApp()
    var userInfo = {}
    if (app.globalData && app.globalData.userInfo) {
      userInfo = app.globalData.userInfo
    }

    reviewsService.createReview(this.data.bookingId, this.data.rating, content, userInfo)
      .then(function () {
        wx.showToast({ title: '评价成功', icon: 'success' })
        setTimeout(function () {
          wx.navigateBack()
        }, 1500)
      })
      .catch(function (err) {
        console.error('提交评价失败:', err)
        wx.showToast({ title: err.message || '提交失败', icon: 'none', duration: 2000 })
        this.setData({ submitting: false })
      }.bind(this))
  }
})
