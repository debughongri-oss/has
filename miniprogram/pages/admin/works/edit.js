const worksService = require('../../../services/works')
const storageService = require('../../../services/storage')
const authService = require('../../../services/auth')
const { SERVICE_CATEGORIES } = require('../../../utils/constants')

Page({
  data: {
    isEdit: false,
    workId: '',
    title: '',
    category: 'bridal',
    categories: SERVICE_CATEGORIES,
    images: [],
    description: '',
    isFeatured: false,
    beforeImage: '',
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
      this.setData({ isEdit: true, workId: options.id })
      wx.setNavigationBarTitle({ title: '编辑作品' })
      this.loadWork(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '添加作品' })
    }
  },

  loadWork: function (id) {
    wx.showLoading({ title: '加载中...' })
    worksService.getWorkDetail(id)
      .then(data => {
        this.setData({
          title: data.title,
          category: data.category,
          images: data.images || [],
          description: data.description || '',
          isFeatured: data.is_featured || false,
          beforeImage: data.before_image || ''
        })
        wx.hideLoading()
      })
      .catch(err => {
        wx.hideLoading()
        console.error('加载作品失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  onTitleInput: function (e) {
    this.setData({ title: e.detail.value })
  },

  onCategoryPick: function (e) {
    this.setData({ category: e.currentTarget.dataset.key })
  },

  onDescInput: function (e) {
    this.setData({ description: e.detail.value })
  },

  onFeaturedChange: function (e) {
    this.setData({ isFeatured: e.detail.value })
  },

  chooseImages: function () {
    const remaining = 9 - this.data.images.length
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newPaths = res.tempFiles.map(f => f.tempFilePath)
        this.setData({
          images: this.data.images.concat(newPaths)
        })
      }
    })
  },

  removeImage: function (e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.images
    images.splice(index, 1)
    this.setData({ images })
  },

  chooseBeforeImage: function () {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          beforeImage: res.tempFiles[0].tempFilePath
        })
      }
    })
  },

  removeBeforeImage: function () {
    this.setData({ beforeImage: '' })
  },

  saveWork: function () {
    const { title, category, images, description, isFeatured, beforeImage } = this.data
    if (!title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
    }
    if (!images.length) {
      wx.showToast({ title: '请至少添加一张图片', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    wx.showLoading({ title: '保存中...' })

    this.processImages().then(processedImages => {
      // Process before image (reuse uploadWorkImages)
      const beforeImagePromise = beforeImage && !beforeImage.startsWith('cloud://')
        ? storageService.uploadWorkImages([beforeImage]).then(function (ids) { return ids[0] })
        : Promise.resolve(beforeImage || '')

      return beforeImagePromise.then(function (processedBeforeImage) {
        const workData = {
          title: title.trim(),
          category: category,
          images: processedImages,
          description: description.trim(),
          is_featured: isFeatured,
          sort_order: 0,
          before_image: processedBeforeImage
        }

        const promise = this.data.isEdit
          ? worksService.updateWork(this.data.workId, workData)
          : worksService.createWork(workData)

        return promise
      }.bind(this))
    }).then(() => {
      wx.hideLoading()
      this.setData({ saving: false })
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(err => {
      wx.hideLoading()
      this.setData({ saving: false })
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  processImages: function () {
    const { images } = this.data
    const isNewImage = (path) => !path.startsWith('cloud://')
    const newImages = images.filter(isNewImage)
    const existingImages = images.filter(path => !isNewImage(path))

    if (newImages.length === 0) {
      return Promise.resolve(existingImages)
    }

    wx.showLoading({ title: '上传图片中...' })
    return storageService.uploadWorkImages(newImages, (progress) => {
      wx.showLoading({ title: `上传 ${progress.current}/${progress.total}` })
    }).then(fileIDs => {
      return existingImages.concat(fileIDs)
    })
  }
})
