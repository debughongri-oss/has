const bookingsService = require('../../services/bookings')
const servicesService = require('../../services/services')
const { SERVICE_CATEGORIES, SKIN_TYPE_OPTIONS } = require('../../utils/constants')

const CATEGORY_MAP = {}
SERVICE_CATEGORIES.forEach(c => { CATEGORY_MAP[c.key] = c.label })

// 服务分类 → 图标色调（与 app.wxss 调色板、create 页保持一致）
const TONE_MAP = {
  bridal: 'rose',
  bridesmaid: 'purple',
  engagement: 'gold',
  daily: 'green',
  creative: 'blue'
}
const SERVICE_ICON_PATH = '../../images/booking-sparkles.png'

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const SERVICE_MODE_OPTIONS = [
  { key: 'store', label: '到店服务', shortLabel: '到店', desc: '前往化妆师工作室', iconPath: '../../images/booking-building-store.png' },
  { key: 'home', label: '上门服务', shortLabel: '上门', desc: '化妆师到指定地址', iconPath: '../../images/booking-home.png' }
]

const formatDate = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
// "2026-06-25" → "6月25日 周三"
const formatDateLabel = (dateStr) => {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  if (parts.length !== 3) return dateStr
  return `${Number(parts[1])}月${Number(parts[2])}日 ${WEEKDAY_NAMES[new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay()]}`
}
// "2026-06-25" → "周三"
const formatWeekday = (dateStr) => {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  if (parts.length !== 3) return ''
  return WEEKDAY_NAMES[new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay()]
}

const buildTimeSlotGroups = (slots) => {
  const morning = []
  const afternoon = []
  ;(slots || []).forEach(slot => {
    const hour = Number(String(slot.time || '').split(':')[0])
    if (!Number.isNaN(hour) && hour < 12) morning.push(slot)
    else afternoon.push(slot)
  })
  return [
    { key: 'morning', label: '上午', iconPath: '../../images/booking-sun.png', slots: morning },
    { key: 'afternoon', label: '下午', iconPath: '../../images/booking-moon.png', slots: afternoon }
  ].filter(group => group.slots.length)
}

Page({
  data: {
    id: '',
    booking: null,
    loading: true,
    submitting: false,
    // 服务（只读）
    serviceName: '',
    serviceId: '',
    serviceDetail: { tone: 'rose', categoryLabel: '', iconPath: SERVICE_ICON_PATH, iconMode: 'aspectFit', hasCover: false, price: '' },
    serviceWindow: null,
    currentDateLabel: '',
    // 日期 / 日历
    selectedDate: '',
    selectedDateLabel: '',
    weekdayLabel: '',
    calYear: 0,
    calMonth: 0,
    calMonthLabel: '',
    calCells: [],
    calCanPrev: false,
    calCanNext: false,
    // 时段
    selectedTime: '',
    timeSlots: [],
    timeSlotGroups: [],
    loadingSlots: false,
    availableCount: 0,
    allBooked: false,
    // 联系信息
    contactPhone: '',
    contactWechat: '',
    serviceMode: 'store',
    serviceModeOptions: [],
    serviceAddress: '',
    skinType: '',
    skinTypeOptions: [],
    skinTypeLabel: '',
    specialNeeds: '',
    occasion: ''
  },

  onLoad: function (options) {
    this.setData({ id: options.id || '' })
    this.loadBooking()
  },

  loadBooking: function () {
    bookingsService.getBookingDetail(this.data.id)
      .then(data => {
        if (!data) {
          this.setData({ loading: false })
          wx.showToast({ title: '预约不存在', icon: 'none' })
          return
        }
        const bd = data.booking_date || ''
        const parts = bd ? bd.split('-').map(Number) : []
        const today = new Date()
        const y = parts.length === 3 ? parts[0] : today.getFullYear()
        const m = parts.length === 3 ? parts[1] - 1 : today.getMonth()
        const skinKey = data.skin_type || ''
        const skinOpt = SKIN_TYPE_OPTIONS.find(t => t.key === skinKey) || {}
        const mode = data.service_mode === 'home' ? 'home' : 'store'
        const contact = data.contact_info || {}

        this.setData({
          booking: data,
          serviceName: data.service_name || '化妆服务',
          serviceId: data.service_id || '',
          selectedDate: bd,
          selectedDateLabel: formatDateLabel(bd),
          weekdayLabel: formatWeekday(bd),
          currentDateLabel: formatDateLabel(bd),
          selectedTime: data.booking_time || '',
          contactPhone: contact.phone || '',
          contactWechat: contact.wechat || '',
          serviceMode: mode,
          serviceModeOptions: SERVICE_MODE_OPTIONS.map(t => ({ ...t, selected: t.key === mode })),
          serviceAddress: data.service_address || '',
          skinType: skinKey,
          skinTypeLabel: skinOpt.label || '',
          skinTypeOptions: SKIN_TYPE_OPTIONS.map(t => ({ ...t, selected: t.key === skinKey })),
          specialNeeds: data.special_needs || '',
          occasion: data.occasion || '',
          loading: false
        })
        this.renderCalendar(y, m, bd)
        this.applyServiceWindow(data.service_id)
        if (bd) this.loadSlots(bd)
      })
      .catch(err => {
        console.error('加载预约失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  // 取服务详情：分类色调/标签/价格 + 可预约窗口（收紧日历上限）
  applyServiceWindow: function (serviceId) {
    if (!serviceId) return
    servicesService.getServiceDetail(serviceId)
      .then(svc => {
        if (!svc) return
        const win = svc.booking_window > 0 ? svc.booking_window : 0
        const patch = {
          serviceDetail: {
            tone: TONE_MAP[svc.category] || 'rose',
            categoryLabel: CATEGORY_MAP[svc.category] || svc.category || '',
            iconPath: svc.cover_image || SERVICE_ICON_PATH,
            iconMode: svc.cover_image ? 'aspectFill' : 'aspectFit',
            hasCover: !!svc.cover_image,
            price: (svc.price !== undefined && svc.price !== null && svc.price !== '') ? svc.price : ''
          },
          serviceWindow: win || null
        }
        this.setData(patch)
        this.renderCalendar(this.data.calYear, this.data.calMonth, this.data.selectedDate)
      })
      .catch(err => { console.error('获取服务详情失败:', err) })
  },

  generateCalendar: function (year, month, selectedDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const win = this.data.serviceWindow
    let maxDate = null
    if (win) {
      maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + win)
      maxDate.setHours(23, 59, 59, 999)
    }

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startWeekday = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    const todayStr = formatDate(today)

    const cells = []
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ day: 0, date: '', selectable: false, isToday: false, isSelected: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d)
      const dateStr = formatDate(cellDate)
      cells.push({
        day: d,
        date: dateStr,
        selectable: cellDate >= today && (!maxDate || cellDate <= maxDate),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      })
    }
    const remaining = cells.length % 7
    if (remaining > 0) {
      for (let i = 0; i < 7 - remaining; i++) {
        cells.push({ day: 0, date: '', selectable: false, isToday: false, isSelected: false })
      }
    }
    return cells
  },

  renderCalendar: function (year, month, selectedDate) {
    const selDate = selectedDate !== undefined ? selectedDate : this.data.selectedDate
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const win = this.data.serviceWindow
    let maxDate = null
    if (win) {
      maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + win)
    }

    const calCanPrev = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())
    const calCanNext = !maxDate || (year < maxDate.getFullYear() || (year === maxDate.getFullYear() && month < maxDate.getMonth()))

    this.setData({
      calYear: year,
      calMonth: month,
      calMonthLabel: year + '年' + MONTH_NAMES[month],
      calCells: this.generateCalendar(year, month, selDate),
      calCanPrev,
      calCanNext
    })
  },

  prevMonth: function () {
    if (!this.data.calCanPrev) return
    let y = this.data.calYear
    let m = this.data.calMonth - 1
    if (m < 0) { m = 11; y-- }
    this.renderCalendar(y, m)
  },

  nextMonth: function () {
    if (!this.data.calCanNext) return
    let y = this.data.calYear
    let m = this.data.calMonth + 1
    if (m > 11) { m = 0; y++ }
    this.renderCalendar(y, m)
  },

  onSelectDate: function (e) {
    const date = e.currentTarget.dataset.date
    const selectable = e.currentTarget.dataset.selectable
    if (!selectable || !date) return
    this.setData({
      selectedDate: date,
      selectedDateLabel: formatDateLabel(date),
      weekdayLabel: formatWeekday(date),
      selectedTime: '',
      loadingSlots: true
    })
    this.renderCalendar(this.data.calYear, this.data.calMonth, date)
    this.loadSlots(date)
  },

  // 加载某日时段；若该日 == 当前预约日，则把原时段强制视为可选（否则自己占用的时段会被标为已约满）
  loadSlots: function (date) {
    const ownDate = this.data.booking && this.data.booking.booking_date
    const ownTime = this.data.booking && this.data.booking.booking_time
    const isOwnDate = !!(date && ownDate && date === ownDate)
    this.setData({ loadingSlots: true })
    bookingsService.getAvailableSlots(date, this.data.serviceId)
      .then(data => {
        const slots = (data.all || []).map(time => ({
          time,
          available: (isOwnDate && time === ownTime) ? true : (data.available || []).includes(time)
        }))
        this.setData({
          timeSlots: slots,
          timeSlotGroups: buildTimeSlotGroups(slots),
          availableCount: slots.filter(s => s.available).length,
          allBooked: !slots.some(s => s.available),
          loadingSlots: false
        })
      })
      .catch(err => {
        console.error('获取时段失败:', err)
        this.setData({ loadingSlots: false })
      })
  },

  onSelectTime: function (e) {
    const available = e.currentTarget.dataset.available
    if (!available) {
      wx.showToast({ title: '该时段已被预约', icon: 'none' })
      return
    }
    this.setData({ selectedTime: e.currentTarget.dataset.time })
  },

  onContactPhoneInput: function (e) {
    this.setData({ contactPhone: e.detail.value })
  },

  onContactWechatInput: function (e) {
    this.setData({ contactWechat: e.detail.value })
  },

  onSelectServiceMode: function (e) {
    const key = e.currentTarget.dataset.key
    this.setData({
      serviceMode: key,
      serviceModeOptions: SERVICE_MODE_OPTIONS.map(t => ({ ...t, selected: t.key === key }))
    })
  },

  onServiceAddressInput: function (e) {
    this.setData({ serviceAddress: e.detail.value })
  },

  onSelectSkinType: function (e) {
    const key = e.currentTarget.dataset.key
    const currentSkinType = this.data.skinType
    const newSkinType = currentSkinType === key ? '' : key
    this.setData({
      skinType: newSkinType,
      skinTypeLabel: (SKIN_TYPE_OPTIONS.find(t => t.key === newSkinType) || {}).label || '',
      skinTypeOptions: SKIN_TYPE_OPTIONS.map(t => ({ ...t, selected: t.key === newSkinType }))
    })
  },

  onSpecialNeedsInput: function (e) {
    this.setData({ specialNeeds: e.detail.value })
  },

  onOccasionInput: function (e) {
    this.setData({ occasion: e.detail.value })
  },

  onConfirm: function () {
    if (this.data.submitting) return
    const { selectedDate, selectedTime, serviceMode, serviceAddress, contactPhone, contactWechat, skinType, specialNeeds, occasion } = this.data
    if (!selectedDate || !selectedTime) {
      wx.showToast({ title: '请选择日期和时段', icon: 'none' })
      return
    }
    const cleanAddress = serviceAddress.trim()
    const cleanPhone = contactPhone.trim()
    const cleanWechat = contactWechat.trim()
    if (serviceMode === 'home' && !cleanAddress) {
      wx.showToast({ title: '请填写上门地址', icon: 'none' })
      return
    }
    if (!cleanPhone && !cleanWechat) {
      wx.showToast({ title: '请填写联系方式', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    bookingsService.rescheduleBooking(this.data.id, {
      booking_date: selectedDate,
      booking_time: selectedTime,
      service_mode: serviceMode,
      service_mode_label: serviceMode === 'home' ? '上门' : '到店',
      service_address: serviceMode === 'home' ? cleanAddress.slice(0, 200) : '',
      skin_type: skinType || '',
      special_needs: specialNeeds.trim().slice(0, 200),
      occasion: occasion.trim().slice(0, 200),
      contact_info: {
        phone: cleanPhone.slice(0, 30),
        wechat: cleanWechat.slice(0, 60)
      }
    }).then(() => {
      this.setData({ submitting: false })
      wx.showToast({ title: '改期成功，等待确认', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    }).catch(err => {
      this.setData({ submitting: false })
      wx.showToast({ title: err.message || '改期失败', icon: 'none' })
    })
  }
})
