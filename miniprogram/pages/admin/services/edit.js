const servicesService = require('../../../services/services')
const storageService = require('../../../services/storage')
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
    bookingWindow: '',
    coverImage: '',
    saving: false
  },

  onLoad: async function (options) {
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
          sortOrder: data.sort_order || 0,
          bookingWindow: data.booking_window > 0 ? String(data.booking_window) : '',
          coverImage: data.cover_image || ''
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
  onWindowInput: function (e) { this.setData({ bookingWindow: e.detail.value }) },

  onCategoryPick: function (e) {
    this.setData({ category: e.currentTarget.dataset.key })
  },

  chooseCover: function () {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this.setData({ coverImage: tempPath })
      }
    })
  },

  removeCover: function () {
    this.setData({ coverImage: '' })
  },

  saveService: function () {
    const { name, category, price, duration, description, sortOrder, bookingWindow, coverImage } = this.data
    if (!name.trim()) {
      wx.showToast({ title: '请输入服务名称', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    const winNum = Number(bookingWindow)
    const data = {
      name: name.trim(),
      category,
      price: price.trim() || '面议',
      duration: Number(duration) || 0,
      description: description.trim(),
      sort_order: sortOrder,
      // 留空 / 非正整数 → null（不限）；否则取该天数
      booking_window: Number.isInteger(winNum) && winNum > 0 ? winNum : null
    }

    // 封面：新选的本地临时文件需先上传得到 cloud:// fileID；已上传的或为空直接透传
    let coverPromise = Promise.resolve()
    if (coverImage && !coverImage.startsWith('cloud://')) {
      coverPromise = storageService.uploadImage(coverImage, `services/cover_${Date.now()}.jpg`)
        .then(fileID => { data.cover_image = fileID })
        .catch(err => {
          console.error('上传封面失败:', err)
          // 转成可识别的错误，避免与下方「保存失败」重复弹 toast
          const e = new Error('COVER_UPLOAD_FAILED')
          e.cause = err
          throw e
        })
    } else if (coverImage) {
      data.cover_image = coverImage
    } else {
      data.cover_image = ''
    }

    coverPromise
      .then(() => {
        const promise = this.data.isEdit
          ? servicesService.updateService(this.data.serviceId, data)
          : servicesService.createService(data)
        return promise
      })
      .then(() => {
        this.setData({ saving: false })
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      })
      .catch(err => {
        this.setData({ saving: false })
        if (err && err.message === 'COVER_UPLOAD_FAILED') {
          wx.showToast({ title: '封面上传失败', icon: 'none' })
        } else {
          console.error('保存失败:', err)
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      })
  }
})
