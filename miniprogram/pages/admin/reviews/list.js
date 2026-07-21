const reviewsService = require('../../../services/reviews')
const authService = require('../../../services/auth')
const { REVIEW_TAGS, SUBSCRIBE_TEMPLATE_ID } = require('../../../utils/constants')

Page({
  data: {
    reviews: [],
    loading: true,
    hasMore: true,
    page: 1,
    stats: null,
    // REVW-08: 回复编辑器状态
    replyingId: '',
    replyText: '',
    replySubmitting: false,
    // REVW-13: 筛选 + 排序状态
    ratingSegs: [
      { key: 0, label: '全部' },
      { key: 5, label: '5星' },
      { key: 4, label: '4星' },
      { key: 3, label: '3星' },
      { key: 2, label: '2星' },
      { key: 1, label: '1星' }
    ],
    tagSegs: [{ key: '', label: '全部标签' }].concat(REVIEW_TAGS),
    currentRating: 0,        // 0 = 全部
    currentTag: '',          // '' = 全部标签
    sortBy: 'latest',
    sortOptions: [
      { key: 'latest', label: '最新' },
      { key: 'highest', label: '最高' },
      { key: 'lowest', label: '最低' }
    ],
    // ADM-01: 折叠状态（默认只显示评分段，标签/排序收进 "筛选 ⌄"）
    filterExpanded: false,
    // REVW-14: 删除状态
    deletingId: ''
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

    // REVW-15/D-23: 进入评价管理页时请求「新评价」订阅授权（非阻塞，失败/拒绝均吞掉）
    // 微信订阅消息「一次授权 = 一次发送」，每次进入页面都请求可累积发送配额
    this.requestSubscribeAuthorization()

    this.loadReviews()
    this.loadStats()
  },

  /**
   * 概览统计：平均分 + 总数（非阻塞，失败不影响列表）
   */
  loadStats: function () {
    var self = this
    reviewsService.getReviewStats()
      .then(function (data) {
        self.setData({
          stats: {
            average: Number(data.average || 0).toFixed(1),
            total: data.total || 0
          }
        })
      })
      .catch(function () { /* 概览为增强项，失败静默 */ })
  },

  /**
   * REVW-15: 请求订阅消息授权（新评价通知）
   * 非阻塞 — 化妆师拒绝或 API 失败均不影响页面加载
   */
  requestSubscribeAuthorization: function () {
    try {
      wx.requestSubscribeMessage({
        tmplIds: [SUBSCRIBE_TEMPLATE_ID],
        success: function () {},
        fail: function () {}
      })
    } catch (e) {
      // 老版本基础库可能不支持，吞掉
    }
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
   * REVW-13/D-15: 加载评价列表（带筛选 + 排序）
   */
  loadReviews: function (reset) {
    if (typeof reset === 'undefined') reset = false
    var page = reset ? 1 : this.data.page
    var self = this
    this.setData({ loading: reset })

    // 构造 filters（currentRating=0 / currentTag='' 视为不筛选）
    var filters = {
      ratingFilter: this.data.currentRating || undefined,
      tagFilter: this.data.currentTag || undefined,
      sortBy: this.data.sortBy
    }

    return reviewsService.getReviewsList(page, 10, filters)
      .then(function (result) {
        var reviews = result.list.map(function (r) {
          return Object.assign({}, r, {
            timeLabel: self.formatTime(r.created_at),
            // REVW-10: 标签 label 数组（服务端存 key，但 list 返回完整 doc；
            // 兼容两种情况：若服务端只回 key 数组，用 REVIEW_TAGS 映射回 label）
            tagLabels: self.mapTagLabels(r.tags),
            // REVW-11: 缩略图信息
            thumb: (r.images && r.images[0]) || '',
            imageCount: (r.images && r.images.length) || 0,
            // REVW-12: 匿名标记（后台仍显示真实昵称，加「匿名」徽标）
            isAnonymous: !!r.is_anonymous,
            // 情感分级（左侧色条）：4-5 好 / 3 中 / 1-2 差
            ratingTier: r.rating >= 4 ? 'good' : (r.rating === 3 ? 'mid' : 'low')
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
   * 标签 key → label 映射（兼容服务端返回 key 数组或 {key,label} 对象数组）
   */
  mapTagLabels: function (tags) {
    if (!Array.isArray(tags)) return []
    return tags.map(function (t) {
      if (typeof t === 'string') {
        var found = REVIEW_TAGS.find(function (rt) { return rt.key === t })
        return found ? found.label : t
      }
      return t.label || t.key || ''
    }).filter(function (l) { return !!l })
  },

  // REVW-13: 筛选/排序变化（每次都重置到第 1 页重新加载）
  onRatingSeg: function (e) {
    var key = parseInt(e.currentTarget.dataset.key, 10) || 0
    if (key === this.data.currentRating) return
    this.setData({ currentRating: key, page: 1 })
    this.loadReviews(true)
  },

  onTagSeg: function (e) {
    var key = e.currentTarget.dataset.key || ''
    if (key === this.data.currentTag) return
    this.setData({ currentTag: key, page: 1 })
    this.loadReviews(true)
  },

  onSortChange: function (e) {
    var key = e.currentTarget.dataset.key
    if (key === this.data.sortBy) return
    this.setData({ sortBy: key, page: 1 })
    this.loadReviews(true)
  },

  /**
   * ADM-01: 展开/收起次要筛选（标签 + 排序）
   * 默认收起以节省列表可见区；点 "筛选 ⌄" 展开
   */
  onToggleFilterExpand: function () {
    this.setData({ filterExpanded: !this.data.filterExpanded })
  },

  /**
   * REVW-11: 图片预览（wx.previewImage 接受 cloud fileID 作为 urls）
   */
  onPreviewImage: function (e) {
    var url = e.currentTarget.dataset.url
    var id = e.currentTarget.dataset.id
    var review = this.data.reviews.find(function (r) { return r._id === id })
    if (!review || !Array.isArray(review.images) || !review.images.length) return
    wx.previewImage({
      current: url,
      urls: review.images
    })
  },

  /**
   * REVW-14/D-18: 删除评价（二次确认 + 调 deleteReview + 刷新）
   */
  onDeleteReview: function (e) {
    var reviewId = e.currentTarget.dataset.id
    if (!reviewId || this.data.deletingId) return
    var self = this

    wx.showModal({
      title: '删除评价',
      content: '确定删除该评价？评价图片将一并删除。',
      confirmText: '删除',
      confirmColor: '#E85575',
      success: function (res) {
        if (!res.confirm) return
        self.setData({ deletingId: reviewId })
        reviewsService.deleteReview(reviewId)
          .then(function () {
            // 从本地列表移除
            var reviews = self.data.reviews.filter(function (r) { return r._id !== reviewId })
            self.setData({ reviews: reviews, deletingId: '' })
            wx.showToast({ title: '已删除', icon: 'success' })
          })
          .catch(function (err) {
            console.error('删除评价失败:', err)
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
            self.setData({ deletingId: '' })
          })
      }
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

  /**
   * ADM-02: 显式删除已有回复（仅当 artist_reply 存在时显示）
   * 走 wx.showModal 二次确认 → 清空 replyText → 复用 onSubmitReply
   */
  onDeleteReply: function () {
    var self = this
    wx.showModal({
      title: '删除回复',
      content: '确定删除这条回复？',
      confirmText: '删除',
      confirmColor: '#E85575',
      success: function (res) {
        if (!res.confirm) return
        self.setData({ replyText: '' })
        self.onSubmitReply()
      }
    })
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
