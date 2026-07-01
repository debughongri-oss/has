const reviewsService = require('../../../services/reviews')
const authService = require('../../../services/auth')

Page({
  data: {
    reviews: [],
    loading: true,
    hasMore: true,
    page: 1
  },

  onLoad: async function () {
    // SEC-03: 等待登录态就绪后再判身份，消除冷启动竞态
    try { await authService.ensureLogin() } catch (e) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      setTimeout(function () { wx.navigateBack() }, 1500)
      return
    }
    if (!authService.isArtist()) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      setTimeout(function () { wx.navigateBack() }, 1500)
      return
    }
    this.loadReviews()
  },

  onPullDownRefresh: function () {
    this.setData({ page: 1 })
    this.loadReviews(true).then(function () { wx.stopPullDownRefresh() })
  },

  onReachBottom: function () {
    if (this.data.hasMore) {
      this.setData({ page: this.data.page + 1 })
      this.loadReviews()
    }
  },

  /**
   * 加载评价列表 per D-19
   */
  loadReviews: function (reset) {
    if (typeof reset === 'undefined') reset = false
    var page = reset ? 1 : this.data.page
    var self = this
    this.setData({ loading: reset })

    return reviewsService.getReviewsList(page, 10)
      .then(function (result) {
        // 格式化时间显示
        var reviews = result.list.map(function (r) {
          return Object.assign({}, r, {
            timeLabel: self.formatTime(r.created_at)
          })
        })
        self.setData({
          reviews: reset ? reviews : self.data.reviews.concat(reviews),
          hasMore: result.hasMore,
          loading: false
        })
      })
      .catch(function (err) {
        console.error('加载评价列表失败:', err)
        self.setData({ loading: false })
      })
  },

  /**
   * 格式化时间为日期字符串
   */
  formatTime: function (date) {
    if (!date) return ''
    var d = new Date(date)
    var month = String(d.getMonth() + 1).padStart(2, '0')
    var day = String(d.getDate()).padStart(2, '0')
    return d.getFullYear() + '-' + month + '-' + day
  }
})
