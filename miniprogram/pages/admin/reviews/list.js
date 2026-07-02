const reviewsService = require('../../../services/reviews')
const authService = require('../../../services/auth')

Page({
  data: {
    reviews: [],
    loading: true,
    hasMore: true,
    page: 1,
    // REVW-08: 回复编辑器状态
    replyingId: '',
    replyText: '',
    replySubmitting: false
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

  loadReviews: function (reset) {
    if (typeof reset === 'undefined') reset = false
    var page = reset ? 1 : this.data.page
    var self = this
    this.setData({ loading: reset })

    return reviewsService.getReviewsList(page, 10)
      .then(function (result) {
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

  // REVW-08: 回复相关方法
  onToggleReply: function (e) {
    var id = e.currentTarget.dataset.id
    var current = this.data.replyingId === id ? '' : id
    var replyText = ''
    if (current) {
      var review = this.data.reviews.find(function (r) { return r._id === id })
      replyText = (review && review.artist_reply) || ''
    }
    this.setData({ replyingId: current, replyText: replyText })
  },

  onReplyInput: function (e) {
    this.setData({ replyText: e.detail.value })
  },

  onSubmitReply: function () {
    var self = this
    var reviewId = this.data.replyingId
    var content = (this.data.replyText || '').slice(0, 200)

    if (!reviewId) return
    if (this.data.replySubmitting) return

    this.setData({ replySubmitting: true })

    reviewsService.replyReview(reviewId, content)
      .then(function () {
        // 更新本地列表中的回复
        var reviews = self.data.reviews.map(function (r) {
          if (r._id === reviewId) {
            return Object.assign({}, r, {
              artist_reply: content,
              artist_reply_at: new Date().toISOString()
            })
          }
          return r
        })
        self.setData({
          reviews: reviews,
          replyingId: '',
          replyText: '',
          replySubmitting: false
        })
        wx.showToast({ title: content ? '回复成功' : '已删除回复', icon: 'success' })
      })
      .catch(function (err) {
        console.error('回复失败:', err)
        wx.showToast({ title: err.message || '回复失败', icon: 'none' })
        self.setData({ replySubmitting: false })
      })
  },

  formatTime: function (date) {
    if (!date) return ''
    var d = new Date(date)
    var month = String(d.getMonth() + 1).padStart(2, '0')
    var day = String(d.getDate()).padStart(2, '0')
    return d.getFullYear() + '-' + month + '-' + day
  }
})
