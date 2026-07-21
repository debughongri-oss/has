const bookingsService = require('../../services/bookings')
const reviewsService = require('../../services/reviews')
const authService = require('../../services/auth')
const storageService = require('../../services/storage')
const { REVIEW_TAGS } = require('../../utils/constants')

Page({
  data: {
    bookingId: '',
    booking: null,
    rating: 0,
    ratingLabel: '',
    // v2.3-r2: 情绪化两段式 label
    ratingTitle: '',
    ratingSubtext: '',
    stars: [1, 2, 3, 4, 5],
    content: '',
    contentLength: 0,
    maxLength: 200,
    submitting: false,
    // REVW-10/11/12 enhancement
    tags: REVIEW_TAGS,           // 预设标签清单（渲染用）
    selectedTagKeys: [],         // 已选标签 key 数组（≤5）
    images: [],                  // 本地临时图片路径
    maxImages: 3,
    isAnonymous: false,
    uploading: false,
    // v2.3-r2: 提交按钮状态提示
    canSubmit: false,
    statusHint: '',
    statusHintTone: 'warn'       // 'warn' | 'ready' | 'busy'
  },

  onLoad: function (options) {
    if (!options.booking_id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(function () { wx.navigateBack() }, 1500)
      return
    }
    this.setData({ bookingId: options.booking_id })
    this.loadBooking(options.booking_id)
    // 初始 status hint
    this._updateStatusHint()
  },

  /**
   * 加载预约详情，验证状态为已完成 per D-05
   */
  loadBooking: function (bookingId) {
    bookingsService.getBookingDetail(bookingId)
      .then(function (data) {
        if (data.status !== 'completed') {
          wx.showToast({ title: '只能评价已完成的预约', icon: 'none' })
          setTimeout(function () { wx.navigateBack() }, 1500)
          return
        }
        this.setData({
          booking: {
            service_name: data.service_name,
            booking_date: data.booking_date,
            booking_time: data.booking_time
          }
        })
      }.bind(this))
      .catch(function (err) {
        console.error('加载预约详情失败:', err)
        wx.showToast({ title: '预约不存在', icon: 'none' })
        setTimeout(function () { wx.navigateBack() }, 1500)
      })
  },

  /**
   * t-rate bind:change — 评分变化 per D-06
   * v2.3-r2: 情绪化两段式 label（title 大字 + subtext 具象解释）
   */
  onRateStar: function (e) {
    var v = e.currentTarget.dataset.value
    // v2.3-r2: 每档配具象解释，降低用户"打分焦虑"
    var LABELS = [
      '',
      { label: '不满意', title: '有点失望', sub: '和预期差距较大，会私下反馈' },
      { label: '一般',   title: '还可以',   sub: '基本满足期待，没惊喜' },
      { label: '还可以', title: '还不错',   sub: '整体满意，会再来' },
      { label: '满意',   title: '真的很满意', sub: '体验超出预期，会推荐给朋友' },
      { label: '非常满意', title: '惊喜！强烈推荐', sub: '让你忍不住安利给所有闺蜜' }
    ]
    var entry = LABELS[v] || { label: '', title: '', sub: '' }
    this.setData({
      rating: v,
      ratingLabel: entry.label,
      ratingTitle: entry.title,
      ratingSubtext: entry.sub
    })
    this._updateStatusHint()
  },

  /**
   * v2.3-r2: 计算提交按钮状态提示
   *   rating === 0            → '请先打分' (warn)
   *   rating > 0 && idle      → '✓ 已就绪，可以提交' (ready)
   *   submitting && uploading → '上传图片中...' (busy)
   *   submitting && !uploading→ '提交中...' (busy)
   */
  _updateStatusHint: function () {
    var d = this.data
    if (d.submitting) {
      var hint = d.uploading ? '上传图片中...' : '提交中...'
      this.setData({ statusHint: hint, statusHintTone: 'busy', canSubmit: false })
      return
    }
    if (d.rating < 1) {
      this.setData({ statusHint: '请先打分', statusHintTone: 'warn', canSubmit: false })
      return
    }
    this.setData({ statusHint: '✓ 已就绪，可以提交', statusHintTone: 'ready', canSubmit: true })
  },

  /**
   * textarea input — 文字评价输入
   */
  onContentInput: function (e) {
    this.setData({
      content: e.detail.value,
      contentLength: e.detail.value.length
    })
  },

  /**
   * REVW-10/D-02: 标签多选切换（最多 5 个）
   */
  onToggleTag: function (e) {
    var key = e.currentTarget.dataset.key
    var keys = this.data.selectedTagKeys.slice()
    var idx = keys.indexOf(key)
    if (idx >= 0) {
      keys.splice(idx, 1)
    } else {
      if (keys.length >= 5) {
        wx.showToast({ title: '最多选择5个标签', icon: 'none' })
        return
      }
      keys.push(key)
    }
    this.setData({ selectedTagKeys: keys })
  },

  /**
   * REVW-11/D-05/D-06: 选择图片（最多 3 张，复用 works/edit chooseMedia 模式）
   */
  onChooseImage: function () {
    var remaining = this.data.maxImages - this.data.images.length
    if (remaining <= 0) {
      wx.showToast({ title: '最多3张图片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        var newPaths = res.tempFiles.map(function (f) { return f.tempFilePath })
        this.setData({
          images: this.data.images.concat(newPaths)
        })
      }
    })
  },

  /**
   * REVW-11: 移除已选图片
   */
  onRemoveImage: function (e) {
    var index = e.currentTarget.dataset.index
    var images = this.data.images.slice()
    images.splice(index, 1)
    this.setData({ images: images })
  },

  /**
   * REVW-12/D-10: 匿名评价开关（默认关闭）— 自定义品牌开关，点击切换
   */
  onToggleAnonymous: function () {
    this.setData({ isAnonymous: !this.data.isAnonymous })
  },

  /**
   * 提交评价 per D-05/D-06（先上传图片得 fileID[]，再创建评价）
   */
  onSubmit: async function () {
    if (this.data.submitting) return
    if (this.data.rating < 1) {
      wx.showToast({ title: '请先选择评分', icon: 'none' })
      return
    }

    this.setData({ submitting: true, uploading: this.data.images.length > 0 })
    this._updateStatusHint()

    // 截断200字
    var content = (this.data.content || '').slice(0, 200)

    // SEC-03/SEC-06: 从 authService 单一缓存读用户信息，不再直读 globalData
    try { await authService.ensureLogin() } catch (e) {}

    // REVW-11/D-06: 先上传图片到云存储得 fileID[]
    var fileIDs = []
    if (this.data.images.length > 0) {
      try {
        fileIDs = await storageService.uploadWorkImages(this.data.images)
      } catch (upErr) {
        console.error('图片上传失败:', upErr)
        wx.showToast({ title: '图片上传失败，请重试', icon: 'none', duration: 2000 })
        this.setData({ submitting: false, uploading: false })
        this._updateStatusHint()
        return
      }
    }
    this.setData({ uploading: false })
    this._updateStatusHint()

    // REVW-10: 把 selectedTagKeys 映射回完整标签对象，服务端按 key 白名单过滤
    var selectedTags = REVIEW_TAGS.filter((t) => this.data.selectedTagKeys.indexOf(t.key) >= 0)

    // SEC-05: 服务端按 openid 权威取昵称/头像，客户端不再传 user info
    reviewsService.createReview(this.data.bookingId, this.data.rating, content, {
      tags: selectedTags,
      imageFileIDs: fileIDs,
      isAnonymous: this.data.isAnonymous
    })
      .then(function () {
        wx.showToast({ title: '评价成功', icon: 'success' })
        setTimeout(function () {
          wx.navigateBack()
        }, 1500)
      })
      .catch(function (err) {
        console.error('提交评价失败:', err)
        wx.showToast({ title: err.message || '提交失败', icon: 'none', duration: 2000 })
        this.setData({ submitting: false, uploading: false })
        this._updateStatusHint()
      }.bind(this))
  }
})
