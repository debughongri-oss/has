const bookingsService = require('../../../services/bookings')
const authService = require('../../../services/auth')
const customersService = require('../../../services/customers')

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const TAG_LABELS = { new: '新客', returning: '回头客', vip: 'VIP' }

// "2026-06-25" → "6月25日 周三"
const formatDateLabel = (dateStr) => {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  if (parts.length !== 3) return dateStr
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return `${Number(parts[1])}月${Number(parts[2])}日 ${WEEKDAYS[d.getDay()]}`
}

const normalizeBookingMeta = (booking) => {
  const mode = booking.service_mode || 'store'
  const contactInfo = booking.contact_info || booking.user_info || {}
  booking.serviceMode = mode
  booking.serviceModeLabel = booking.service_mode_label || (mode === 'home' ? '上门' : '到店')
  booking.serviceAddress = booking.service_address || ''
  booking.serviceImage = booking.service_image || ''
  booking.contactPhone = contactInfo.phone || ''
  booking.contactWechat = contactInfo.wechat || ''
  return booking
}

Page({
  data: {
    booking: null,
    loading: true,
    statusLabel: '',
    statusColor: '',
    artistNotes: '',
    showRejectDialog: false,
    rejectReason: '',
    customerNote: null,
    customerTag: ''
  },

  onLoad: async function (options) {
    // SEC-03: 等待登录态就绪后再判身份，消除冷启动竞态
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
    if (options.id) this.loadDetail(options.id)
  },

  loadDetail: function (id) {
    this.setData({ loading: true })
    bookingsService.getBookingDetail(id)
      .then(data => {
        // 转换 skin_type key 为中文标签
        if (data.skin_type) {
          const SKIN_LABELS = { dry: '干性', oily: '油性', combination: '混合性', sensitive: '敏感性', unknown: '不确定' }
          data.skin_type_label = SKIN_LABELS[data.skin_type] || data.skin_type
        }
        data.dateLabel = formatDateLabel(data.booking_date)
        data = normalizeBookingMeta(data)
        this.setData({
          booking: data,
          loading: false,
          statusLabel: bookingsService.getStatusLabel(data.status),
          statusColor: bookingsService.getStatusColor(data.status),
          artistNotes: data.artist_notes || '',
          customerNote: null,
          customerTag: ''
        })

        // CUST-04: Load customer note for this booking's user_openid
        if (data.user_openid) {
          customersService.getCustomerNote(data.user_openid)
            .then(note => {
              this.setData({ customerNote: note })
            })
            .catch(err => {
              console.error('加载客户备注失败:', err)
            })

          // Also load customer tag (best-effort via detail action)
          customersService.getCustomerDetail(data.user_openid)
            .then(detail => {
              this.setData({ customerTag: detail.tag || '' })
            })
            .catch(() => {/* tag is best-effort */})
        }
      })
      .catch(err => {
        console.error('加载详情失败:', err)
        this.setData({ loading: false })
      })
  },

  // CUST-04 D-14: Navigate to customer detail page (empty-state guidance + full-detail link)
  goToCustomerDetail: function () {
    const openid = this.data.booking && this.data.booking.user_openid
    if (openid) {
      wx.navigateTo({ url: `/pages/admin/customers/detail?user_openid=${openid}` })
    }
  },

  onNotesInput: function (e) {
    this.setData({ artistNotes: e.detail.value })
  },

  saveNotes: function () {
    bookingsService.updateBookingStatus(this.data.booking._id, this.data.booking.status, {
      artist_notes: this.data.artistNotes
    }).then(() => {
      wx.showToast({ title: '备注已保存', icon: 'success' })
    }).catch(err => {
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  onAccept: function () {
    wx.showLoading({ title: '处理中...' })
    bookingsService.updateBookingStatus(this.data.booking._id, 'accepted')
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '已接受', icon: 'success' })
        this.loadDetail(this.data.booking._id)
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: '操作失败', icon: 'none' })
      })
  },

  onReject: function () {
    this.setData({ showRejectDialog: true })
  },

  onRejectReasonInput: function (e) {
    this.setData({ rejectReason: e.detail.value })
  },

  onRejectConfirm: function () {
    this.setData({ showRejectDialog: false })
    wx.showLoading({ title: '处理中...' })
    bookingsService.updateBookingStatus(this.data.booking._id, 'rejected', {
      reject_reason: this.data.rejectReason
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '已拒绝', icon: 'success' })
      this.loadDetail(this.data.booking._id)
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: '操作失败', icon: 'none' })
    })
  },

  onRejectCancel: function () {
    this.setData({ showRejectDialog: false })
  },

  onComplete: function () {
    wx.showLoading({ title: '处理中...' })
    bookingsService.updateBookingStatus(this.data.booking._id, 'completed')
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '已标记完成', icon: 'success' })
        this.loadDetail(this.data.booking._id)
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: '操作失败', icon: 'none' })
      })
  },

  onNoShow: function () {
    wx.showModal({
      title: '标记缺席',
      content: '确认将该预约标记为缺席？此状态仅管理端可见。',
      confirmText: '标记缺席',
      confirmColor: '#e85575',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '处理中...' })
        bookingsService.updateBookingStatus(this.data.booking._id, 'no_show')
          .then(() => {
            wx.hideLoading()
            wx.showToast({ title: '已标记缺席', icon: 'success' })
            this.loadDetail(this.data.booking._id)
          })
          .catch(err => {
            wx.hideLoading()
            wx.showToast({ title: err.message || '操作失败', icon: 'none' })
          })
      }
    })
  }
})
