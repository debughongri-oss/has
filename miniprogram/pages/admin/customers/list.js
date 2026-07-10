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
    ]
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
        const customers = (result.list || []).map(c => ({
          ...c,
          tagLabel: TAG_LABELS[c.tag] || c.tag,
          lastBookingLabel: formatDateShort(c.last_booking_date)
        }))
        this.setData({ customers, loading: false })
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

  goToDetail: function (e) {
    const openid = e.currentTarget.dataset.openid
    wx.navigateTo({ url: `/pages/admin/customers/detail?user_openid=${openid}` })
  }
})
