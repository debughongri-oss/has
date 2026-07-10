const customersService = require('../../../services/customers')
const authService = require('../../../services/auth')

const TAG_LABELS = { new: '新客', returning: '回头客', vip: 'VIP' }

// "2026-06-25" → "6月25日"
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  return parts.length === 3 ? `${Number(parts[1])}月${Number(parts[2])}日` : dateStr
}

// Booking status labels (subset of bookings.js getStatusLabel)
const STATUS_LABELS = {
  pending: '待确认', accepted: '已确认', rejected: '已拒绝',
  completed: '已完成', cancelled: '已取消', no_show: '缺席'
}

// "2026-06-25T..." or Date → "M月D日" for review timestamps
const formatReviewDate = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const HISTORY_PREVIEW_COUNT = 5 // D-09: default 5 items

Page({
  data: {
    userOpenid: '',
    customer: null,       // { nickname, avatar_url, completed_count, tag, tagLabel }
    note: null,           // customer_notes doc or null (loaded in Task 2)
    bookings: [],         // full history
    bookingsPreview: [],  // first 5 for default display
    showAllHistory: false,
    reviews: [],
    loading: true
  },

  onLoad: async function (options) {
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
    if (options.user_openid) {
      this.setData({ userOpenid: options.user_openid })
      this.loadDetail(options.user_openid)
    }
  },

  onShow: async function () {
    // Refresh on return from booking detail (notes may have been viewed)
    try { await authService.ensureLogin() } catch (e) {}
    if (authService.isArtist() && this.data.userOpenid && !this.data.loading) {
      this.loadDetail(this.data.userOpenid)
    }
  },

  loadDetail: function (userOpenid) {
    this.setData({ loading: true })
    customersService.getCustomerDetail(userOpenid)
      .then(data => {
        const bookings = (data.bookings || []).map(b => ({
          ...b,
          statusLabel: STATUS_LABELS[b.status] || b.status,
          dateLabel: formatDate(b.booking_date)
        }))
        const reviews = (data.reviews || []).map(r => ({
          ...r,
          dateLabel: formatReviewDate(r.created_at)
        }))
        this.setData({
          customer: {
            nickname: data.nickname || '微信用户',
            avatar_url: data.avatar_url || '',
            completed_count: data.completed_count || 0,
            tag: data.tag,
            tagLabel: TAG_LABELS[data.tag] || data.tag
          },
          bookings,
          bookingsPreview: bookings.slice(0, HISTORY_PREVIEW_COUNT),
          reviews,
          loading: false
        })
        // Load note (may be null)
        return customersService.getCustomerNote(userOpenid)
      })
      .then(noteData => {
        this.setData({ note: noteData })
      })
      .catch(err => {
        console.error('加载客户详情失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
        this.setData({ loading: false })
      })
  },

  // D-09: Toggle history list between preview (5) and full
  toggleHistory: function () {
    this.setData({ showAllHistory: !this.data.showAllHistory })
  },

  // D-10: Navigate to booking detail
  goToBooking: function (e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/admin/bookings/detail?id=${id}` })
  }
})
