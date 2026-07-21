const customersService = require('../../../services/customers')
const authService = require('../../../services/auth')

const TAG_LABELS = { new: '新客', returning: '回头客', vip: 'VIP' }

// "2026-06-25" → "6月25日"
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  return parts.length === 3 ? `${Number(parts[1])}月${Number(parts[2])}日` : dateStr
}

// "2026-06-25" → "2024 年 3 月"（用于 member-since 显示）
const formatMemberSince = (dateStr) => {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  return parts.length === 3 ? `${parts[0]} 年 ${Number(parts[1])} 月` : ''
}

// 联系电话脱敏："13812345678" → "138 **** 5678"
const maskPhone = (phone) => {
  if (!phone || phone.length < 7) return phone || ''
  return phone.slice(0, 3) + ' **** ' + phone.slice(-4)
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
    loading: true,
    editing: false,
    editForm: {
      skin_type: '',
      skin_type_index: 0,
      preference: '',
      allergy: '',
      custom_notes: ''
    },
    skinTypeOptions: ['干性', '油性', '混合性', '敏感性', '不确定'],
    saving: false
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

        // v2.3-r2 DTL-02: 计算 member-since（最早 booking 的日期）+ 联系方式（最新 booking 的）
        // bookings 已按 booking_date 倒序，最早 = 最后一个；最新 = 第一个
        let memberSince = ''
        let contactPhone = ''
        let contactWechat = ''
        if (bookings.length > 0) {
          const latest = bookings[0] || {}
          contactPhone = latest.contact_phone || ''
          contactWechat = latest.contact_wechat || ''
          // 找最早的 booking_date
          const allDates = bookings
            .map(b => b.booking_date)
            .filter(Boolean)
            .sort()
          if (allDates.length > 0) {
            memberSince = formatMemberSince(allDates[0])
          }
        }

        this.setData({
          customer: {
            nickname: data.nickname || '微信用户',
            avatar_url: data.avatar_url || '',
            avatarInitial: ((data.nickname || '?').charAt(0)),
            completed_count: data.completed_count || 0,
            tag: data.tag,
            tagLabel: TAG_LABELS[data.tag] || data.tag,
            memberSince: memberSince,
            contactPhoneMasked: maskPhone(contactPhone),
            contactWechat: contactWechat
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
  },

  // D-08: Toggle to edit mode — populate form from existing note or empty
  toggleEdit: function () {
    const note = this.data.note
    const skinOptions = ['干性', '油性', '混合性', '敏感性', '不确定']
    let skinIdx = 0
    if (note && note.skin_type) {
      skinIdx = skinOptions.indexOf(note.skin_type)
      if (skinIdx < 0) { skinOptions.unshift(note.skin_type); skinIdx = 0 }
    }
    this.setData({
      editing: true,
      editForm: {
        skin_type: note ? (note.skin_type || '') : '',
        skin_type_index: skinIdx,
        preference: note ? (note.preference || '') : '',
        allergy: note ? (note.allergy || '') : '',
        custom_notes: note ? (note.custom_notes || '') : ''
      },
      skinTypeOptions: skinOptions
    })
  },

  cancelEdit: function () {
    this.setData({ editing: false })
  },

  onSkinTypeChange: function (e) {
    const idx = Number(e.detail.value)
    const val = this.data.skinTypeOptions[idx]
    this.setData({
      'editForm.skin_type_index': idx,
      'editForm.skin_type': val
    })
  },

  onPreferenceInput: function (e) {
    this.setData({ 'editForm.preference': e.detail.value })
  },

  onAllergyInput: function (e) {
    this.setData({ 'editForm.allergy': e.detail.value })
  },

  onCustomNotesInput: function (e) {
    this.setData({ 'editForm.custom_notes': e.detail.value })
  },

  // D-07: Save note (upsert handled by cloud function)
  saveNote: function () {
    if (this.data.saving) return
    this.setData({ saving: true })
    const form = this.data.editForm
    customersService.saveCustomerNote(this.data.userOpenid, {
      skin_type: form.skin_type,
      preference: form.preference,
      allergy: form.allergy,
      custom_notes: form.custom_notes
    })
      .then(() => {
        wx.showToast({ title: '备注已保存', icon: 'success' })
        this.setData({ editing: false, saving: false })
        // Reload note to reflect saved state
        return customersService.getCustomerNote(this.data.userOpenid)
      })
      .then(noteData => {
        this.setData({ note: noteData })
      })
      .catch(err => {
        console.error('保存备注失败:', err)
        wx.showToast({ title: '保存失败', icon: 'none' })
        this.setData({ saving: false })
      })
  }
})
