const servicesService = require('../../../services/services')
const authService = require('../../../services/auth')
const { SERVICE_CATEGORIES } = require('../../../utils/constants')

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

Page({
  data: {
    services: [],
    loading: true,
    showDeleteDialog: false,
    deleteTargetId: '',
    deleteTargetIndex: -1
  },

  onLoad: async function () {
    // SEC-03: 等待登录态就绪后再判身份，消除冷启动竞态
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
    this.loadServices()
  },

  onShow: async function () {
    try { await authService.ensureLogin() } catch (e) {}
    if (authService.isArtist() && !this.data.loading) {
      this.loadServices()
    }
  },

  loadServices: function () {
    this.setData({ loading: true })
    servicesService.getAllServices()
      .then(data => {
        const services = data.map(s => {
          const categoryLabel = CATEGORY_MAP[s.category] || s.category || ''
          return {
            ...s,
            categoryLabel,
            icon: categoryLabel.charAt(0) || '妆',
            tone: TONE_MAP[s.category] || 'rose'
          }
        })
        this.setData({ services, loading: false })
      })
      .catch(err => {
        console.error('加载服务列表失败:', err)
        this.setData({ loading: false })
      })
  },

  goToAdd: function () {
    wx.navigateTo({ url: '/pages/admin/services/edit' })
  },

  goToEdit: function (e) {
    wx.navigateTo({ url: `/pages/admin/services/edit?id=${e.currentTarget.dataset.id}` })
  },

  confirmDelete: function (e) {
    this.setData({
      showDeleteDialog: true,
      deleteTargetId: e.currentTarget.dataset.id,
      deleteTargetIndex: e.currentTarget.dataset.index
    })
  },

  onDeleteConfirm: function () {
    const { deleteTargetId } = this.data
    this.setData({ showDeleteDialog: false })
    wx.showLoading({ title: '删除中...' })
    servicesService.deleteService(deleteTargetId)
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '已删除', icon: 'success' })
        this.loadServices()
      })
      .catch(err => {
        wx.hideLoading()
        console.error('删除失败:', err)
      })
  },

  onDeleteCancel: function () {
    this.setData({ showDeleteDialog: false })
  }
})
