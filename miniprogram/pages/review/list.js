const reviewsService = require('../../services/reviews')

/**
 * v2.3-r2: 公开评价列表页（"查看全部 N 条评价" 目的地）
 *
 * 与 admin/reviews/list 区别：
 *   - 匿名评价显示「匿名用户」+ 不显示头像（admin 侧显示真实昵称）
 *   - 无删除/回复操作（只读展示）
 *   - 排序选项更少（客户视角只关心最新/最高/最低）
 *   - 不显示「待回复」徽标（化妆师内部状态，客户不关心）
 */
const TAG_LABELS = {
  professional: '手法专业',
  natural: '妆面自然',
  punctual: '准时',
  friendly: '态度好',
  value: '性价比高'
}

const SORT_OPTIONS = [
  { key: 'latest', label: '最新' },
  { key: 'highest', label: '最高' },
  { key: 'lowest', label: '最低' }
]

// "2026-07-18T..." → "7 月 18 日"
const formatDate = (val) => {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

Page({
  data: {
    stats: null,           // { average, total, distribution: [...] }
    reviews: [],
    loading: true,
    loadingMore: false,
    page: 1,
    pageSize: 10,
    hasMore: true,
    currentSort: 'latest',
    sortOptions: SORT_OPTIONS
  },

  onLoad: function () {
    this.loadStats()
    this.loadReviews(true)
  },

  /**
   * 加载概览统计（avg + total + distribution）— 与首页一致
   */
  loadStats: function () {
    reviewsService.getReviewStats()
      .then(data => {
        const total = data.total || 0
        const safeTotal = total > 0 ? total : 1
        const rawDist = data.distribution || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        const distribution = [5, 4, 3, 2, 1].map(star => {
          const count = rawDist[String(star)] || rawDist[star] || 0
          return { star, count, percent: Math.round(count / safeTotal * 100) }
        })
        this.setData({
          stats: {
            average: Number(data.average || 0).toFixed(1),
            total,
            distribution
          }
        })
      })
      .catch(err => {
        console.error('加载评价统计失败:', err)
      })
  },

  /**
   * 加载评价列表（分页 + 服务端排序）
   */
  loadReviews: function (reset) {
    const page = reset ? 1 : this.data.page + 1
    if (reset) {
      this.setData({ loading: true, reviews: [], page: 1, hasMore: true })
    } else {
      if (this.data.loadingMore || !this.data.hasMore) return
      this.setData({ loadingMore: true })
    }

    reviewsService.getReviewsList(page, this.data.pageSize, {
      sortBy: this.data.currentSort
    })
      .then(result => {
        const list = (result.list || []).map(r => this._decorateReview(r))
        const next = reset ? list : this.data.reviews.concat(list)
        this.setData({
          reviews: next,
          page,
          hasMore: !!result.hasMore,
          loading: false,
          loadingMore: false
        })
      })
      .catch(err => {
        console.error('加载评价列表失败:', err)
        this.setData({ loading: false, loadingMore: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  _decorateReview: function (r) {
    // 公开侧匿名化：is_anonymous 评价显示「匿名用户」+ 清空头像
    const isAnon = !!r.is_anonymous
    return {
      _id: r._id,
      nickname: isAnon ? '匿名用户' : (r.user_nickname || '匿名用户'),
      avatar_url: isAnon ? '' : (r.user_avatar || ''),
      avatarInitial: isAnon ? '匿' : (r.user_nickname || '?').charAt(0),
      rating: r.rating,
      content: r.content || '',
      service_name: r.service_name || '',
      tagLabels: (r.tags || []).map(k => TAG_LABELS[k] || k),
      images: r.images || [],
      artist_reply: r.artist_reply || '',
      createdLabel: formatDate(r.created_at),
      isAnonymous: isAnon
    }
  },

  onSortChange: function (e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.currentSort) return
    this.setData({ currentSort: key })
    this.loadReviews(true)
  },

  onPreviewImage: function (e) {
    const { url, id } = e.currentTarget.dataset
    const review = this.data.reviews.find(r => r._id === id)
    if (!review) return
    wx.previewImage({
      current: url,
      urls: review.images
    })
  },

  onReachBottom: function () {
    this.loadReviews(false)
  },

  onShareAppMessage: function () {
    return {
      title: '客户评价 — 化妆师作品',
      path: '/pages/review/list'
    }
  }
})
