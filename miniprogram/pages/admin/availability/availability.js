const bookingsService = require('../../../services/bookings')
const authService = require('../../../services/auth')

Page({
  data: {
    blocks: [],
    loading: true,
    showAdd: false,
    newDate: '',
    newTime: '',
    newReason: '',
    timeSlots: ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30']
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
    this.loadBlocks()
  },

  loadBlocks: function () {
    const now = new Date()
    this.setData({ loading: true })
    bookingsService.getBlockedTimes(now.getFullYear(), now.getMonth() + 1)
      .then(data => {
        const blocks = (data.blocks || []).map(b => ({
          ...b,
          dateLabel: b.block_date,
          timeLabel: b.block_time ? b.block_time : '全天',
          reasonLabel: b.reason || '未备注'
        }))
        this.setData({ blocks, loading: false })
      })
      .catch(err => {
        console.error('加载屏蔽时间失败:', err)
        this.setData({ loading: false })
      })
  },

  onToggleAdd: function () {
    this.setData({ showAdd: !this.data.showAdd, newDate: '', newTime: '', newReason: '' })
  },

  onDateChange: function (e) {
    this.setData({ newDate: e.detail.value })
  },

  onTimePick: function (e) {
    this.setData({ newTime: e.currentTarget.dataset.time })
  },

  onReasonInput: function (e) {
    this.setData({ newReason: e.detail.value })
  },

  onAddBlock: function () {
    if (!this.data.newDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    bookingsService.blockTime(this.data.newDate, this.data.newTime, this.data.newReason)
      .then(() => {
        wx.showToast({ title: '已添加屏蔽', icon: 'success' })
        this.setData({ showAdd: false })
        this.loadBlocks()
      })
      .catch(err => {
        wx.showToast({ title: err.message || '添加失败', icon: 'none' })
      })
  },

  onRemoveBlock: function (e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消屏蔽',
      content: '确认取消此时间屏蔽？',
      success: (res) => {
        if (res.confirm) {
          bookingsService.unblockTime(id)
            .then(() => {
              wx.showToast({ title: '已取消', icon: 'success' })
              this.loadBlocks()
            })
            .catch(err => {
              wx.showToast({ title: err.message || '取消失败', icon: 'none' })
            })
        }
      }
    })
  }
})
