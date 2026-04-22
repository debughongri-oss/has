const servicesService = require('../../services/services')
const bookingsService = require('../../services/bookings')
const authService = require('../../services/auth')
const { SUBSCRIBE_TEMPLATE_ID, SKIN_TYPE_OPTIONS } = require('../../utils/constants')

Page({
  data: {
    services: [],
    selectedService: null,
    dateList: [],
    selectedDate: '',
    timeSlots: [],
    selectedTime: '',
    loadingSlots: false,
    availableCount: 0,
    allBooked: false,
    skinType: '',
    specialNeeds: '',
    occasion: '',
    skinTypeOptions: [],
    loading: true,
    submitting: false
  },

  onLoad: function () {
    this.setData({
      skinTypeOptions: SKIN_TYPE_OPTIONS.map(t => ({ ...t, selected: false }))
    })
    this.loadServices()
  },

  loadServices: function () {
    this.setData({ loading: true })
    servicesService.getServicesList()
      .then(data => {
        this.setData({ services: data, loading: false })
      })
      .catch(err => {
        console.error('加载服务失败:', err)
        this.setData({ loading: false })
      })
  },

  generateDateList: function () {
    const dates = []
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    for (let i = 1; i <= 14; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      dates.push({
        date: dateStr,
        weekday: '周' + weekdays[d.getDay()],
        day: d.getDate(),
        month: (d.getMonth() + 1) + '月'
      })
    }
    return dates
  },

  onSelectService: function (e) {
    const index = e.currentTarget.dataset.index
    const service = this.data.services[index]
    this.setData({
      selectedService: service,
      selectedDate: '',
      selectedTime: '',
      dateList: this.generateDateList()
    })
  },

  onSelectDate: function (e) {
    const date = e.currentTarget.dataset.date
    this.setData({ selectedDate: date, selectedTime: '', loadingSlots: true })
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

  submitBooking: function () {
    const { selectedService, selectedDate, selectedTime, skinType, specialNeeds, occasion } = this.data
    if (!selectedService || !selectedDate || !selectedTime) {
      wx.showToast({ title: '请完成选择', icon: 'none' })
      return
    }

    const userInfo = authService.getUserInfo() || {}
    this.setData({ submitting: true })

    bookingsService.createBooking({
      service_id: selectedService._id,
      service_name: selectedService.name,
      booking_date: selectedDate,
      booking_time: selectedTime,
      skin_type: skinType || '',
      special_needs: specialNeeds.trim().slice(0, 200),
      occasion: occasion.trim().slice(0, 200),
      user_info: {
        nickname: userInfo.nickname || '',
        phone: ''
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
