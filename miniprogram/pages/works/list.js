const worksService = require('../../services/works')
const { SERVICE_CATEGORIES } = require('../../utils/constants')

const CATEGORY_MAP = {}
SERVICE_CATEGORIES.forEach(c => { CATEGORY_MAP[c.key] = c.label })

const splitWorks = (works) => {
  if (!works.length) {
    return { heroWork: null, leftColumn: [], rightColumn: [] }
  }
  const heroWork = works[0]
  const rest = works.slice(1)
  const leftColumn = []
  const rightColumn = []
  rest.forEach((item, i) => {
    if (i % 2 === 0) leftColumn.push(item)
    else rightColumn.push(item)
  })
  return { heroWork, leftColumn, rightColumn }
}

Page({
  data: {
    works: [],
    heroWork: null,
    leftColumn: [],
    rightColumn: [],
    galleryTitle: '全部作品',
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
    const pending = this.consumePendingCategory()
    this.setData({ categories, currentCategory: pending || this.data.currentCategory })
    this.loadWorks(true)
  },

  onShow: function () {
    const pending = this.consumePendingCategory()
    if (pending && pending !== this.data.currentCategory) {
      this.setData({ currentCategory: pending })
      this.loadWorks(true)
    }
  },

  // 接收首页分类 chips 传来的预选分类
  consumePendingCategory: function () {
    const app = getApp()
    const cat = app.globalData && app.globalData.pendingWorksCategory
    if (cat) {
      app.globalData.pendingWorksCategory = null
      return cat
    }
    return null
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
          categoryLabel: CATEGORY_MAP[w.category] || w.category || '',
          hasBeforeAfter: !!w.before_image
        }))
        const works = reset ? list : this.data.works.concat(list)
        const { heroWork, leftColumn, rightColumn } = splitWorks(works)
        const currentCat = this.data.categories.find(c => c.key === this.data.currentCategory)
        const galleryTitle = (currentCat ? currentCat.label : '全部') + '作品'
        this.setData({
          works,
          heroWork,
          leftColumn,
          rightColumn,
          galleryTitle,
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
