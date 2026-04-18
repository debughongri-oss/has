const servicesService = require('../../../services/services')
const authService = require('../../../services/auth')
const { SERVICE_CATEGORIES } = require('../../../utils/constants')

Page({
  data: {
    isEdit: false,
    serviceId: '',
    name: '',
    category: 'bridal',
    categories: SERVICE_CATEGORIES,
    price: '',
    duration: '',
    description: '',
    sortOrder: 0,
    saving: false
  },

  onLoad: function (options) {
    if (!authService.isArtist()) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    if (options.id) {
      this.setData({ isEdit: true, serviceId: options.id })
      wx.setNavigationBarTitle({ title: '编辑服务' })
      this.loadService(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '添加服务' })
    }
  },

  loadService: function (id) {
    wx.showLoading({ title: '加载中...' })
    servicesService.getServiceDetail(id)
      .then(data => {
        this.setData({
          name: data.name,
          category: data.category || 'bridal',
          price: data.price || '',
          duration: data.duration ? String(data.duration) : '',
          description: data.description || '',
          sortOrder: data.sort_order || 0
        })
        wx.hideLoading()
      })
      .catch(err => {
        wx.hideLoading()
        console.error('加载服务失败:', err)
      })
  },

  onNameInput: function (e) { this.setData({ name: e.detail.value }) },
  onPriceInput: function (e) { this.setData({ price: e.detail.value }) },
  onDurationInput: function (e) { this.setData({ duration: e.detail.value }) },
  onDescInput: function (e) { this.setData({ description: e.detail.value }) },
  onSortInput: function (e) { this.setData({ sortOrder: Number(e.detail.value) || 0 }) },

  onCategoryPick: function (e) {
    this.setData({ category: e.currentTarget.dataset.key })
  },

  saveService: function () {
    const { name, category, price, duration, description, sortOrder } = this.data
    if (!name.trim()) {
      wx.showToast({ title: '请输入服务名称', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    const data = {
      name: name.trim(),
      category,
      price: price.trim() || '面议',
      duration: Number(duration) || 0,
      description: description.trim(),
      sort_order: sortOrder
    }

    const promise = this.data.isEdit
      ? servicesService.updateService(this.data.serviceId, data)
      : servicesService.createService(data)

    promise.then(() => {
      this.setData({ saving: false })
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(err => {
      this.setData({ saving: false })
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  }
})
