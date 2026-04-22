const bookingsService = require('../../../services/bookings')
const authService = require('../../../services/auth')

const BUSY_DAY_THRESHOLD = 3  // per D-22

Page({
  data: {
    calendarValue: Date.now(),  // 当前选中日期（timestamp）
    minDate: Date.now(),        // 最小可选：今天
    format: null,               // format 函数引用（在 onLoad 中设置）
    grouped: {},                // 按日期分组的预约数据
    loading: true,
    selectedDate: '',           // 当前选中日期字符串 YYYY-MM-DD
    dayBookings: [],            // 选中日期的预约列表
    isBusyDay: false,           // 是否紧凑日程
    busyCount: 0                // 紧凑日程预约数
  },

  onLoad: function () {
    if (!authService.isArtist()) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    // TDesign Calendar 的 format 必须通过数据引用传递
    this.setData({ format: this._formatDay.bind(this) })
    this.loadCurrentMonth()
  },

  loadCurrentMonth: function () {
    const now = new Date()
    this.loadMonthData(now.getFullYear(), now.getMonth() + 1)
  },

  loadMonthData: function (year, month) {
    this.setData({ loading: true })
    bookingsService.getCalendarData(year, month)
      .then(data => {
        // 客户端也做分组（用服务端返回的 bookings 数组），保证数据一致性
        const grouped = {}
        data.bookings.forEach(b => {
          if (!grouped[b.booking_date]) grouped[b.booking_date] = []
          grouped[b.booking_date].push(b)
        })
        this.setData({ grouped, loading: false })
      })
      .catch(err => {
        console.error('加载日历数据失败:', err)
        this.setData({ loading: false })
      })
  },

  // TDesign Calendar format 回调 — 给有预约的日期添加标记（per D-14, D-23）
  _formatDay: function (day) {
    const d = day.date
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dayBookings = this.data.grouped[dateStr]

    if (dayBookings && dayBookings.length > 0) {
      if (dayBookings.length >= BUSY_DAY_THRESHOLD) {
        // per D-23: 3+ 预约的日期使用橙色标记
        day.className = 'calendar-day--busy'
        day.suffix = '•'
      } else {
        day.suffix = '•'
      }
    }
    return day
  },

  // 日期选择事件（per D-15）
  onSelectDate: function (e) {
    const timestamp = e.detail.value
    const d = new Date(timestamp)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const dayBookings = (this.data.grouped[dateStr] || [])
      .map(b => ({
        ...b,
        statusLabel: bookingsService.getStatusLabel(b.status),
        statusColor: bookingsService.getStatusColor(b.status)
      }))
      .sort((a, b) => a.booking_time.localeCompare(b.booking_time))

    this.setData({
      selectedDate: dateStr,
      dayBookings,
      isBusyDay: dayBookings.length >= BUSY_DAY_THRESHOLD,
      busyCount: dayBookings.length
    })
  },

  // 跳转预约详情
  goToDetail: function (e) {
    wx.navigateTo({ url: `/pages/admin/bookings/detail?id=${e.currentTarget.dataset.id}` })
  }
})
