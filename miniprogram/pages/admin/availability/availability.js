const bookingsService = require('../../../services/bookings')
const authService = require('../../../services/auth')

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const INITIAL_MONTH = getCurrentMonth()

function getCurrentMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

function getMonthFromDateString(dateString) {
  const parts = String(dateString || '').split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  if (!year || !month) return getCurrentMonth()
  return { year, month }
}

function formatMonthLabelByParts(year, month) {
  return `${year}年${month}月`
}

function formatMonthValueByParts(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
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
    submitting: false,
    newDate: '',
    newTime: '',
    newReason: '',
    viewYear: INITIAL_MONTH.year,
    viewMonth: INITIAL_MONTH.month,
    monthLabel: formatMonthLabelByParts(INITIAL_MONTH.year, INITIAL_MONTH.month),
    monthValue: formatMonthValueByParts(INITIAL_MONTH.year, INITIAL_MONTH.month),
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

  loadBlocks: function (year, month) {
    const currentMonth = getCurrentMonth()
    const targetYear = year || this.data.viewYear || currentMonth.year
    const targetMonth = month || this.data.viewMonth || currentMonth.month
    this.setData({ loading: true })
    bookingsService.getBlockedTimes(targetYear, targetMonth)
      .then(data => {
        const blocks = (data.blocks || []).map(formatBlock)
        const allDayCount = blocks.filter(item => item.isAllDay).length
        this.setData({
          blocks,
          allDayCount,
          slotCount: blocks.length - allDayCount,
          viewYear: targetYear,
          viewMonth: targetMonth,
          monthLabel: formatMonthLabelByParts(targetYear, targetMonth),
          monthValue: formatMonthValueByParts(targetYear, targetMonth),
          loading: false
        })
      })
      .catch(err => {
        console.error('加载屏蔽时间失败:', err)
        this.setData({ loading: false })
      })
  },

  onToggleAdd: function () {
    this.setData({
      showAdd: !this.data.showAdd,
      submitting: false,
      newDate: '',
      newTime: '',
      newReason: ''
    })
  },

  onDateChange: function (e) {
    this.setData({ newDate: e.detail.value })
  },

  onMonthChange: function (e) {
    const targetMonth = getMonthFromDateString(e.detail.value)
    this.loadBlocks(targetMonth.year, targetMonth.month)
  },

  onTimePick: function (e) {
    this.setData({ newTime: e.currentTarget.dataset.time })
  },

  onReasonInput: function (e) {
    this.setData({ newReason: e.detail.value })
  },

  onAddBlock: function () {
    if (this.data.submitting) return
    if (!this.data.newDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    const targetMonth = getMonthFromDateString(this.data.newDate)
    bookingsService.blockTime(this.data.newDate, this.data.newTime, this.data.newReason)
      .then(() => {
        wx.showToast({ title: '已添加屏蔽', icon: 'success' })
        this.setData({ showAdd: false, submitting: false })
        this.loadBlocks(targetMonth.year, targetMonth.month)
      })
      .catch(err => {
        this.setData({ submitting: false })
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
              this.loadBlocks(this.data.viewYear, this.data.viewMonth)
            })
            .catch(err => {
              wx.showToast({ title: err.message || '取消失败', icon: 'none' })
            })
        }
      }
    })
  }
})
