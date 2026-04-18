const worksService = require('../../../services/works')
const storageService = require('../../../services/storage')
const authService = require('../../../services/auth')

Page({
  data: {
    works: [],
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
    this.loadWorks()
  },

  onShow: function () {
    if (authService.isArtist() && !this.data.loading) {
      this.loadWorks()
    }
  },

  loadWorks: function () {
    this.setData({ loading: true })
    worksService.getWorksList('all', 1, 100)
      .then(result => {
        this.setData({ works: result.list, loading: false })
      })
      .catch(err => {
        console.error('加载作品列表失败:', err)
        this.setData({ loading: false })
      })
  },

  goToAdd: function () {
    wx.navigateTo({ url: '/pages/admin/works/edit' })
  },

  goToEdit: function (e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/admin/works/edit?id=${id}` })
  },

  confirmDelete: function (e) {
    const id = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index
    this.setData({
      showDeleteDialog: true,
      deleteTargetId: id,
      deleteTargetIndex: index
    })
  },

  onDeleteConfirm: function () {
    const { deleteTargetId, deleteTargetIndex } = this.data
    this.setData({ showDeleteDialog: false })

    wx.showLoading({ title: '删除中...' })
    worksService.deleteWork(deleteTargetId)
      .then(() => {
        const work = this.data.works[deleteTargetIndex]
        if (work && work.images && work.images.length) {
          storageService.deleteCloudFile(work.images)
        }
        wx.hideLoading()
        wx.showToast({ title: '已删除', icon: 'success' })
        this.loadWorks()
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
