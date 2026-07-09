const bookingsService = require('../../services/bookings')

const BOOKING_WINDOW = 30
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const formatDate = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// "2026-06-25" → "6月25日 周三"
const formatDateLabel = (dateStr) => {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  if (parts.length !== 3) return dateStr
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return `${Number(parts[1])}月${Number(parts[2])}日 ${WEEKDAYS[d.getDay()]}`
}

Page({
  data: {
    id: '',
    booking: null,
    loading: true,
    submitting: false,
    serviceName: '',
    serviceId: '',
    minDate: '',
    maxDate: '',
    selectedDate: '',
    selectedDateLabel: '',
    selectedTime: '',
    timeSlots: [],
    loadingSlots: false,
    allBooked: false
  },

  onLoad: function (options) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + BOOKING_WINDOW)
    this.setData({
      id: options.id || '',
      minDate: formatDate(today),
      maxDate: formatDate(maxDate)
    })
    this.loadBooking()
  },

  loadBooking: function () {
    bookingsService.getBookingDetail(this.data.id)
      .then(data => {
        this.setData({
          booking: data,
          serviceName: data.service_name || '化妆服务',
          serviceId: data.service_id || '',
          selectedDate: data.booking_date,
          selectedDateLabel: formatDateLabel(data.booking_date),
          loading: false
        })
        if (data.booking_date) this.loadSlots(data.booking_date)
      })
      .catch(err => {
        console.error('加载预约失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  loadSlots: function (date) {
    this.setData({ loadingSlots: true, selectedTime: '' })
    bookingsService.getAvailableSlots(date, this.data.serviceId)
      .then(data => {
        const slots = data.all.map(time => ({
          time,
          available: data.available.includes(time)
        }))
        this.setData({
          timeSlots: slots,
          allBooked: data.available.length === 0,
          loadingSlots: false
        })
      })
      .catch(err => {
        console.error('获取时段失败:', err)
        this.setData({ loadingSlots: false })
      })
  },

  onDateChange: function (e) {
    const date = e.detail.value
    this.setData({ selectedDate: date, selectedDateLabel: formatDateLabel(date) })
    this.loadSlots(date)
  },

  onPickTime: function (e) {
    const available = e.currentTarget.dataset.available
    if (!available) {
      wx.showToast({ title: '该时段不可选', icon: 'none' })
      return
    }
    this.setData({ selectedTime: e.currentTarget.dataset.time })
  },

  onConfirm: function () {
    if (this.data.submitting) return
    if (!this.data.selectedDate || !this.data.selectedTime) {
      wx.showToast({ title: '请选择新的日期和时段', icon: 'none' })
      return
    }
    const b = this.data.booking
    if (b && b.booking_date === this.data.selectedDate && b.booking_time === this.data.selectedTime) {
      wx.showToast({ title: '请选择不同的时间', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    bookingsService.rescheduleBooking(this.data.id, this.data.selectedDate, this.data.selectedTime)
      .then(() => {
        this.setData({ submitting: false })
        wx.showToast({ title: '改期成功，等待确认', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1000)
      })
      .catch(err => {
        this.setData({ submitting: false })
        wx.showToast({ title: err.message || '改期失败', icon: 'none' })
      })
  }
})
