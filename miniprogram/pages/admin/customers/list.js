const customersService = require('../../../services/customers')
const authService = require('../../../services/auth')

// Tag label and color mapping per D-02/D-03 and CONTEXT specifics
const TAG_LABELS = {
  new: '新客',
  returning: '回头客',
  vip: 'VIP'
}

// "2026-06-25" → "6/25"
const formatDateShort = (dateStr) => {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : dateStr
}

// "2026-06-25" → "3 天前" / "上周" / "上月" / "3 月前" 等
const formatRelativeDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return formatDateShort(dateStr)
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days <= 7) return `${days} 天前`
  if (days <= 14) return '上周'
  if (days <= 30) return `${Math.floor(days / 7)} 周前`
  if (days <= 60) return '上月'
  return `${Math.floor(days / 30)} 月前`
}

// v2.3-r2: 客户列表重设计 — 风险优先视图 + 搜索
Page({
  data: {
    customers: [],
    loading: true,
    currentTag: '',
    tagFilters: [
      { key: '', label: '全部', count: 0 },
      { key: 'new', label: '新客', count: 0 },
      { key: 'returning', label: '回头客', count: 0 },
      { key: 'vip', label: 'VIP', count: 0 }
    ],
    // v2.3-r2: 需要关注（过敏/流失/新客）
    attention: { allergy: [], churn: [], new_customer: [] },
    hasAttention: false,
    // v2.3-r2: 搜索
    searchKeyword: '',
    searchedCustomers: [],
    isSearching: false
  },

  onLoad: async function () {
    try { await authService.ensureLogin() } catch (e) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    if (!authService.isArtist()) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.loadCustomers()
  },

  onShow: async function () {
    try { await authService.ensureLogin() } catch (e) {}
    if (authService.isArtist() && !this.data.loading) {
      this.loadCustomers()
    }
  },

  loadCustomers: function () {
    this.setData({ loading: true })
    const tag = this.data.currentTag || undefined
    customersService.getCustomerList(tag)
      .then(result => {
        const all = result.list || []
        const customers = all.map(c => ({
          ...c,
          tagLabel: TAG_LABELS[c.tag] || c.tag,
          lastBookingLabel: formatDateShort(c.last_booking_date),
          lastServiceName: c.last_service_name || '',
          // v2.3-r2: 风险指示器（来自云函数）
          hasAllergy: !!c.has_allergy,
          isChurnRisk: !!c.is_churn_risk,
          isNewCustomer: !!c.is_new_customer,
          // 头像 fallback 取 nickname 首字符（与 index 页 profile 一致）
          avatarInitial: (c.nickname || '?').charAt(0)
        }))

        // v2.3-r2: 需要关注三类客户（服务端已算好）
        const att = result.attention || { allergy: [], churn: [], new_customer: [] }
        const formatAttention = (arr) => arr.map(a => ({
          ...a,
          lastBookingLabel: formatRelativeDate(a.last_booking_date),
          lastServiceName: a.last_service_name || '',
          daysLabel: a.days_since_last === Infinity ? '从未到店' : `${a.days_since_last} 天前`,
          avatarInitial: (a.nickname || '?').charAt(0)
        }))
        const attention = {
          allergy: formatAttention(att.allergy || []),
          churn: formatAttention(att.churn || []),
          new_customer: formatAttention(att.new_customer || [])
        }
        const hasAttention = attention.allergy.length + attention.churn.length + attention.new_customer.length > 0

        this.setData({
          customers,
          loading: false,
          attention,
          hasAttention,
          // 重新计算搜索结果（如果在搜索中）
          searchedCustomers: this.data.searchKeyword ? this.filterByKeyword(customers, this.data.searchKeyword) : []
        })
        this.updateTagCounts()
      })
      .catch(err => {
        console.error('加载客户列表失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
        this.setData({ loading: false })
      })
  },

  // Load unfiltered list to compute tag counts, then re-apply filter
  updateTagCounts: function () {
    customersService.getCustomerList()
      .then(result => {
        const all = result.list || []
        const counts = { '': all.length, new: 0, returning: 0, vip: 0 }
        all.forEach(c => { counts[c.tag] = (counts[c.tag] || 0) + 1 })
        const tagFilters = this.data.tagFilters.map(f => ({ ...f, count: counts[f.key] || 0 }))
        this.setData({ tagFilters })
      })
      .catch(() => {/* counts are best-effort */})
  },

  onTagChange: function (e) {
    this.setData({ currentTag: e.currentTarget.dataset.key })
    this.loadCustomers()
  },

  // v2.3-r2: 搜索（昵称/服务名，本地过滤，300ms 防抖）
  _searchTimer: null,
  onSearchInput: function (e) {
    const keyword = (e.detail.value || '').trim()
    if (this._searchTimer) clearTimeout(this._searchTimer)
    this._searchTimer = setTimeout(() => {
      const isSearching = keyword.length > 0
      const searchedCustomers = isSearching ? this.filterByKeyword(this.data.customers, keyword) : []
      this.setData({
        searchKeyword: keyword,
        isSearching,
        searchedCustomers
      })
    }, 300)
  },

  onClearSearch: function () {
    if (this._searchTimer) clearTimeout(this._searchTimer)
    this.setData({ searchKeyword: '', isSearching: false, searchedCustomers: [] })
  },

  filterByKeyword: function (customers, keyword) {
    const kw = keyword.toLowerCase()
    return customers.filter(c => {
      const nickname = (c.nickname || '').toLowerCase()
      const service = (c.lastServiceName || '').toLowerCase()
      return nickname.indexOf(kw) >= 0 || service.indexOf(kw) >= 0
    })
  },

  goToDetail: function (e) {
    const openid = e.currentTarget.dataset.openid
    wx.navigateTo({ url: `/pages/admin/customers/detail?user_openid=${openid}` })
  }
})
