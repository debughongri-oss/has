const bookingsService = require('../../../services/bookings')
const authService = require('../../../services/auth')

Page({
  data: {
    booking: null,
    loading: true,
    statusLabel: '',
    statusColor: '',
    artistNotes: '',
    showRejectDialog: false,
    rejectReason: ''
  },

  onLoad: function (options) {
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
        this.setData({
          booking: data,
          loading: false,
          statusLabel: bookingsService.getStatusLabel(data.status),
          statusColor: bookingsService.getStatusColor(data.status),
          artistNotes: data.artist_notes || ''
        })
      })
      .catch(err => {
        console.error('加载详情失败:', err)
        this.setData({ loading: false })
      })
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
  }
})
