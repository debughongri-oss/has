const servicesService = require('../../../services/services')
const authService = require('../../../services/auth')

Page({
  data: {
    services: [],
    loading: true,
    showDeleteDialog: false,
    deleteTargetId: '',
    deleteTargetIndex: -1
  },

  onLoad: function () {
    if (!authService.isArtist()) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.loadServices()
  },

  onShow: function () {
    if (authService.isArtist() && !this.data.loading) {
      this.loadServices()
    }
  },

  loadServices: function () {
    this.setData({ loading: true })
    servicesService.getAllServices()
      .then(data => {
        this.setData({ services: data, loading: false })
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
