const worksService = require('../../services/works')
const { SERVICE_CATEGORIES } = require('../../utils/constants')

const CATEGORY_MAP = {}
SERVICE_CATEGORIES.forEach(c => { CATEGORY_MAP[c.key] = c.label })

Page({
  data: {
    works: [],
    categories: [],
    currentCategory: 'all',
    loading: false,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 10
  },

  onLoad: function () {
    const categories = worksService.getCategories()
    this.setData({ categories })
    this.loadWorks(true)
  },

  onPullDownRefresh: function () {
    this.loadWorks(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMore()
    }
  },

  loadWorks: function (reset = false) {
    const page = reset ? 1 : this.data.page
    this.setData({ loading: reset, loadingMore: !reset })

    return worksService.getWorksList(this.data.currentCategory, page, this.data.pageSize)
      .then(result => {
        const list = result.list.map(w => ({
          ...w,
          categoryLabel: CATEGORY_MAP[w.category] || w.category || ''
        }))
        const works = reset ? list : this.data.works.concat(list)
        this.setData({
          works,
          hasMore: result.hasMore,
          page: result.page,
          loading: false,
          loadingMore: false
        })
      })
      .catch(err => {
        console.error('加载作品失败:', err)
        this.setData({ loading: false, loadingMore: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  loadMore: function () {
    this.setData({ page: this.data.page + 1 })
    this.loadWorks(false)
  },

  onCategoryChange: function (e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.currentCategory) return
    this.setData({ currentCategory: key })
    this.loadWorks(true)
  },

  goToDetail: function (e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/works/detail?id=${id}` })
  },

  onImageError: function (e) {
    const index = e.currentTarget.dataset.index
    const key = `works[${index}]._imageError`
    this.setData({ [key]: true })
  },

  /**
   * 分享到微信聊天 — MGMT-02
   */
  onShareAppMessage: function () {
    return {
      title: '化妆师作品集 — 查看全部作品',
      path: '/pages/works/list'
    }
  },

  /**
   * 分享到朋友圈 — MGMT-02
   */
  onShareTimeline: function () {
    return {
      title: '化妆师作品集'
    }
  }
})
