const servicesService = require('../../services/services')
const { SERVICE_CATEGORIES } = require('../../utils/constants')

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

const decorate = (s) => {
  const label = CATEGORY_MAP[s.category] || ''
  return {
    ...s,
    icon: label.charAt(0) || '妆',
    tone: TONE_MAP[s.category] || 'rose'
  }
}

const groupServices = (services) => {
  const grouped = {}
  services.forEach(s => {
    const cat = s.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  })

  const groups = []
  SERVICE_CATEGORIES.forEach(c => {
    if (grouped[c.key]) {
      groups.push({ key: c.key, label: c.label, tone: TONE_MAP[c.key] || 'rose', services: grouped[c.key] })
    }
  })
  if (grouped['other']) {
    groups.push({ key: 'other', label: '其他服务', tone: 'rose', services: grouped['other'] })
  }
  return groups
}

Page({
  data: {
    services: [],
    serviceGroups: [],
    totalCount: 0,
    loading: true
  },

  onLoad: function () {
    this.loadServices()
  },

  onPullDownRefresh: function () {
    this.loadServices().then(() => wx.stopPullDownRefresh())
  },

  // 点击服务 → 带着服务 id 跳到预约页（由预约页预选该服务）
  goToBook: function (e) {
    const id = e && e.currentTarget && e.currentTarget.dataset.id
    if (id) getApp().globalData.pendingServiceId = id
    wx.switchTab({ url: '/pages/booking/create' })
  },

  loadServices: function () {
    this.setData({ loading: true })
    return servicesService.getServicesList()
      .then(data => {
        const services = (data || []).map(decorate)
        const serviceGroups = groupServices(services)
        this.setData({ services, serviceGroups, totalCount: services.length, loading: false })
      })
      .catch(err => {
        console.error('加载服务失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  }
})
