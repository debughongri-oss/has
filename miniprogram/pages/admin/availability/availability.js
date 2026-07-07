const bookingsService = require('../../../services/bookings')
const authService = require('../../../services/auth')

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function formatMonthLabel(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

function formatBlock(block) {
  const date = new Date(`${block.block_date}T00:00:00`)
  const isAllDay = !block.block_time
  return {
    ...block,
    dateLabel: block.block_date,
    dayLabel: block.block_date.slice(5),
    weekdayLabel: Number.isNaN(date.getTime()) ? '' : WEEKDAYS[date.getDay()],
    timeLabel: isAllDay ? '全天' : block.block_time,
    reasonLabel: block.reason || '未备注',
    isAllDay
  }
}

Page({
  data: {
    blocks: [],
    loading: true,
    showAdd: false,
    newDate: '',
    newTime: '',
    newReason: '',
    monthLabel: '',
    allDayCount: 0,
    slotCount: 0,
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
        const blocks = (data.blocks || []).map(formatBlock)
        const allDayCount = blocks.filter(item => item.isAllDay).length
        this.setData({
          blocks,
          allDayCount,
          slotCount: blocks.length - allDayCount,
          monthLabel: formatMonthLabel(now),
          loading: false
        })
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
