const servicesService = require('../../services/services')
const bookingsService = require('../../services/bookings')
const authService = require('../../services/auth')
const { SUBSCRIBE_TEMPLATE_ID, SKIN_TYPE_OPTIONS, SERVICE_CATEGORIES } = require('../../utils/constants')

const CATEGORY_MAP = {}
SERVICE_CATEGORIES.forEach(c => { CATEGORY_MAP[c.key] = c.label })

// 服务分类 → 图标色调（对应 app.wxss 调色板）
const TONE_MAP = {
  bridal: 'rose',
  bridesmaid: 'purple',
  engagement: 'gold',
  daily: 'green',
  creative: 'blue'
}

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const BOOKING_WINDOW = 30
const SERVICE_MODE_OPTIONS = [
  { key: 'store', label: '到店', desc: '前往化妆师工作室' },
  { key: 'home', label: '上门', desc: '化妆师到指定地址' }
]

const formatDate = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// "2026-06-25" → "6月25日"
const formatDateLabel = (dateStr) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  return parts.length === 3 ? `${Number(parts[1])}月${Number(parts[2])}日` : dateStr
}

Page({
  data: {
    services: [],
    selectedService: null,
    selectedDate: '',
    selectedDateLabel: '',
    timeSlots: [],
    selectedTime: '',
    loadingSlots: false,
    availableCount: 0,
    allBooked: false,
    skinType: '',
    specialNeeds: '',
    occasion: '',
    serviceMode: 'store',
    serviceModeOptions: [],
    serviceAddress: '',
    contactPhone: '',
    contactWechat: '',
    skinTypeOptions: [],
    loading: true,
    submitting: false,
    calYear: 0,
    calMonth: 0,
    calMonthLabel: '',
    calCells: [],
    calCanPrev: false,
    calCanNext: false
  },

  onLoad: function () {
    this.setData({
      serviceModeOptions: SERVICE_MODE_OPTIONS.map(t => ({ ...t, selected: t.key === 'store' })),
      skinTypeOptions: SKIN_TYPE_OPTIONS.map(t => ({ ...t, selected: false }))
    })
    this.loadServices()
  },

  // 从服务菜单跳来时，预选对应服务
  onShow: function () {
    const app = getApp()
    const pid = app.globalData && app.globalData.pendingServiceId
    if (pid) {
      app.globalData.pendingServiceId = null
      this._pendingServiceId = pid
      this.applyPendingService()
    }
  },

  applyPendingService: function () {
    if (!this._pendingServiceId || !this.data.services.length) return
    const svc = this.data.services.find(s => s._id === this._pendingServiceId)
    if (svc) {
      this._pendingServiceId = null
      this.selectService(svc)
    }
  },

  loadServices: function () {
    this.setData({ loading: true })
    servicesService.getServicesList()
      .then(data => {
        const services = (data || []).map(s => {
          const categoryLabel = CATEGORY_MAP[s.category] || s.category || ''
          return {
            ...s,
            categoryLabel,
            icon: categoryLabel.charAt(0) || '妆',
            tone: TONE_MAP[s.category] || 'rose'
          }
        })
        this.setData({ services, loading: false })
        this.applyPendingService()
      })
      .catch(err => {
        console.error('加载服务失败:', err)
        this.setData({ loading: false })
      })
  },

  generateCalendar: function (year, month, selectedDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + BOOKING_WINDOW)
    maxDate.setHours(23, 59, 59, 999)

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
        selectable: cellDate >= today && cellDate <= maxDate,
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

    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + BOOKING_WINDOW)

    const calCanPrev = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())
    const calCanNext = year < maxDate.getFullYear() || (year === maxDate.getFullYear() && month < maxDate.getMonth())

    const calCells = this.generateCalendar(year, month, selDate)
    const calMonthLabel = year + '年' + MONTH_NAMES[month]

    this.setData({
      calYear: year,
      calMonth: month,
      calMonthLabel,
      calCells,
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

  onSelectService: function (e) {
    const index = e.currentTarget.dataset.index
    this.selectService(this.data.services[index])
  },

  selectService: function (service) {
    if (!service) return
    const today = new Date()
    this.setData({
      selectedService: service,
      selectedDate: '',
      selectedDateLabel: '',
      selectedTime: ''
    })
    this.renderCalendar(today.getFullYear(), today.getMonth(), '')
  },

  onSelectDate: function (e) {
    const date = e.currentTarget.dataset.date
    const selectable = e.currentTarget.dataset.selectable
    if (!selectable || !date) return

    this.setData({ selectedDate: date, selectedDateLabel: formatDateLabel(date), selectedTime: '', loadingSlots: true })
    this.renderCalendar(this.data.calYear, this.data.calMonth, date)

    bookingsService.getAvailableSlots(date)
      .then(data => {
        const slots = data.all.map(time => ({
          time,
          available: data.available.includes(time)
        }))
        this.setData({
          timeSlots: slots,
          availableCount: data.available.length,
          allBooked: data.available.length === 0,
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

  onSelectSkinType: function (e) {
    const key = e.currentTarget.dataset.key
    const currentSkinType = this.data.skinType
    const newSkinType = currentSkinType === key ? '' : key
    this.setData({
      skinType: newSkinType,
      skinTypeOptions: SKIN_TYPE_OPTIONS.map(t => ({
        ...t,
        selected: t.key === newSkinType
      }))
    })
  },

  onSpecialNeedsInput: function (e) {
    this.setData({ specialNeeds: e.detail.value })
  },

  onOccasionInput: function (e) {
    this.setData({ occasion: e.detail.value })
  },

  onSelectServiceMode: function (e) {
    const key = e.currentTarget.dataset.key
    this.setData({
      serviceMode: key,
      serviceModeOptions: SERVICE_MODE_OPTIONS.map(t => ({
        ...t,
        selected: t.key === key
      }))
    })
  },

  onServiceAddressInput: function (e) {
    this.setData({ serviceAddress: e.detail.value })
  },

  onContactPhoneInput: function (e) {
    this.setData({ contactPhone: e.detail.value })
  },

  onContactWechatInput: function (e) {
    this.setData({ contactWechat: e.detail.value })
  },

  submitBooking: function () {
    const { selectedService, selectedDate, selectedTime, skinType, specialNeeds, occasion, serviceMode, serviceAddress, contactPhone, contactWechat } = this.data
    if (!selectedService || !selectedDate || !selectedTime) {
      wx.showToast({ title: '请完成选择', icon: 'none' })
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

    const userInfo = authService.getUserInfo() || {}
    const serviceModeLabel = serviceMode === 'home' ? '上门' : '到店'
    this.setData({ submitting: true })

    bookingsService.createBooking({
      service_id: selectedService._id,
      service_name: selectedService.name,
      booking_date: selectedDate,
      booking_time: selectedTime,
      service_mode: serviceMode,
      service_mode_label: serviceModeLabel,
      service_address: serviceMode === 'home' ? cleanAddress.slice(0, 200) : '',
      skin_type: skinType || '',
      special_needs: specialNeeds.trim().slice(0, 200),
      occasion: occasion.trim().slice(0, 200),
      contact_info: {
        phone: cleanPhone.slice(0, 30),
        wechat: cleanWechat.slice(0, 60)
      },
      user_info: {
        nickname: userInfo.nickname || '',
        phone: cleanPhone.slice(0, 30),
        wechat: cleanWechat.slice(0, 60)
      }
    }).then(result => {
      this.setData({ submitting: false })
      wx.requestSubscribeMessage({
        tmplIds: [SUBSCRIBE_TEMPLATE_ID],
        complete: () => {
          wx.showModal({
            title: '预约提交成功',
            content: `${selectedService.name}\n${selectedDate} ${selectedTime}\n\n化妆师将尽快确认您的预约`,
            showCancel: false,
            confirmText: '好的',
            success: () => {
              wx.switchTab({ url: '/pages/profile/index' })
            }
          })
        }
      })
    }).catch(err => {
      this.setData({ submitting: false })
      wx.showToast({ title: err.message || '提交失败', icon: 'none' })
    })
  }
})
