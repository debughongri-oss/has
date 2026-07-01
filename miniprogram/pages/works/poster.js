const worksService = require('../../services/works')
const profileService = require('../../services/profile')
const authService = require('../../services/auth')

// 海报布局常量 per D-09/D-11
var POSTER_WIDTH = 750
var POSTER_HEIGHT = 1060
var IMAGE_AREA_HEIGHT = 750
var INFO_AREA_HEIGHT = 310

Page({
  data: {
    loading: true,
    posterImage: '',
    error: false,
    saving: false,
    statusBarHeight: 20
  },

  _canvas: null,
  _dpr: 1,
  _workId: '',

  onLoad: async function (options) {
    // SEC-03: 等待登录态就绪后再判身份，消除冷启动竞态
    try { await authService.ensureLogin() } catch (e) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      var self0 = this
      setTimeout(function () { self0.onClose() }, 1500)
      return
    }
    // 权限检查 per D-02
    if (!authService.isArtist()) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      var self = this
      setTimeout(function () { self.onClose() }, 1500)
      return
    }

    var sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight })
    // wx.getWindowInfo is base-lib 2.20.1+, fall back to getSystemInfoSync for older clients
    this._dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : sysInfo.pixelRatio) || 1

    if (!options.id) {
      this.onClose()
      return
    }

    this._workId = options.id
    this.loadAndGenerate(options.id)
  },

  /**
   * 并行加载所有数据，然后生成海报 per D-23
   */
  loadAndGenerate: function (workId) {
    var self = this

    // 并行加载：作品详情 + 化妆师资料 + QR 码
    Promise.all([
      worksService.getWorkDetail(workId).catch(function (err) {
        console.error('加载作品失败:', err)
        return null
      }),
      profileService.getArtistProfile().catch(function (err) {
        console.error('加载资料失败:', err)
        return null
      }),
      worksService.getShareQRCode(workId).catch(function (err) {
        console.error('获取QR码失败:', err)
        return null
      })
    ]).then(function (results) {
      var work = results[0]
      var artist = results[1]
      var qrData = results[2]

      if (!work) {
        self.setData({ loading: false, error: true })
        return
      }

      if (!qrData) {
        // QR 码生成失败 per D-29
        self.setData({ loading: false, error: true })
        wx.showToast({ title: '生成海报失败，请重试', icon: 'none' })
        return
      }

      // 获取 QR 码临时 URL
      wx.cloud.getTempFileURL({
        fileList: [qrData.fileID]
      }).then(function (tempRes) {
        var qrUrl = tempRes.fileList[0].tempFileURL
        self.generatePoster(work, artist || {}, qrUrl)
      }).catch(function (err) {
        console.error('获取QR临时URL失败:', err)
        self.setData({ loading: false, error: true })
      })
    })
  },

  /**
   * 生成海报 — 初始化 Canvas + 加载图片 + 绘制 + 导出
   */
  generatePoster: function (work, artist, qrUrl) {
    var self = this
    var dpr = this._dpr

    var query = wx.createSelectorQuery()
    query.select('#posterCanvas')
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (!res || !res[0]) {
          console.error('Canvas 节点获取失败')
          self.setData({ loading: false, error: true })
          return
        }

        var canvas = res[0].node
        var ctx = canvas.getContext('2d')
        self._canvas = canvas

        // DPR 适配 per D-10
        canvas.width = POSTER_WIDTH * dpr
        canvas.height = POSTER_HEIGHT * dpr
        ctx.scale(dpr, dpr)

        // 并行加载所有图片 per D-13
        self.loadImages(canvas, work, artist, qrUrl)
          .then(function (images) {
            // 绘制海报
            self.drawPoster(ctx, work, artist, images)
            // 导出图片
            self.exportPoster(canvas, dpr)
          })
          .catch(function (err) {
            console.error('海报生成失败:', err)
            // 图片加载失败仍尝试绘制 per D-30
            var fallbackImages = { workImage: null, avatar: null, qr: null }
            self.drawPoster(ctx, work, artist, fallbackImages)
            self.exportPoster(canvas, dpr)
          })
      })
  },

  /**
   * 并行加载 3 张图片 per D-13
   * 返回 { workImage, avatar, qr }
   */
  loadImages: function (canvas, work, artist, qrUrl) {
    function loadImage(src) {
      return new Promise(function (resolve, reject) {
        var img = canvas.createImage()
        img.onload = function () { resolve(img) }
        img.onerror = function (err) {
          console.error('图片加载失败:', src, err)
          reject(err)
        }
        img.src = src
      })
    }

    // 加载作品主图 per D-14
    var workImagePromise = work.images && work.images.length > 0
      ? loadImage(work.images[0])
      : Promise.reject(new Error('无作品图片'))

    // 加载头像 per D-15
    var avatarPromise = artist.avatar
      ? loadImage(artist.avatar)
      : Promise.reject(new Error('无头像'))

    // 加载 QR 码 per D-16
    var qrPromise = loadImage(qrUrl)

    // 每张图片独立 fallback per D-30
    return Promise.all([
      workImagePromise.catch(function () { return null }),
      avatarPromise.catch(function () { return null }),
      qrPromise.catch(function () { return null })
    ]).then(function (results) {
      return { workImage: results[0], avatar: results[1], qr: results[2] }
    })
  },

  /**
   * 绘制海报 per D-11 layout
   * ┌─────────────────────────┐
   * │   作品图片 750×750      │
   * ├─────────────────────────┤
   * │ 头像 名字 标签    QR码   │  310px 信息区
   * │        扫码查看作品      │
   * └─────────────────────────┘
   */
  drawPoster: function (ctx, work, artist, images) {
    // 清空画布
    ctx.clearRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT)

    // === 主图区域 750×750 per D-11 ===
    if (images.workImage) {
      // aspectFill 裁切模式
      var img = images.workImage
      var imgRatio = img.width / img.height
      var targetRatio = POSTER_WIDTH / IMAGE_AREA_HEIGHT
      var sx, sy, sw, sh
      if (imgRatio > targetRatio) {
        sh = img.height
        sw = img.height * targetRatio
        sx = (img.width - sw) / 2
        sy = 0
      } else {
        sw = img.width
        sh = img.width / targetRatio
        sx = 0
        sy = (img.height - sh) / 2
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, POSTER_WIDTH, IMAGE_AREA_HEIGHT)
    } else {
      // 占位：灰色背景 per D-30
      ctx.fillStyle = '#E8E4DF'
      ctx.fillRect(0, 0, POSTER_WIDTH, IMAGE_AREA_HEIGHT)
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.font = '24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('作品图片', POSTER_WIDTH / 2, IMAGE_AREA_HEIGHT / 2)
    }

    // === 信息区域背景 per D-11 ===
    var infoY = IMAGE_AREA_HEIGHT
    ctx.fillStyle = '#FDFCF9'
    ctx.fillRect(0, infoY, POSTER_WIDTH, INFO_AREA_HEIGHT)

    // 底部分隔线
    ctx.strokeStyle = 'rgba(0,0,0,0.05)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, infoY)
    ctx.lineTo(POSTER_WIDTH, infoY)
    ctx.stroke()

    // === 左侧：头像 + 名字 + 标签 ===
    var leftX = 40
    var avatarY = infoY + 45
    var avatarSize = 80

    // 头像（圆形裁切）
    if (images.avatar) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(leftX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(images.avatar, leftX, avatarY, avatarSize, avatarSize)
      ctx.restore()
    } else {
      // 默认头像：灰色圆形
      ctx.fillStyle = '#D5D0CB'
      ctx.beginPath()
      ctx.arc(leftX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '32px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('妆', leftX + avatarSize / 2, avatarY + avatarSize / 2 + 11)
    }

    // 名字 per D-12
    var nameX = leftX + avatarSize + 20
    var name = artist.name || '化妆师'
    ctx.fillStyle = '#1F1B18'
    ctx.font = 'bold 28px -apple-system, PingFang SC, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(name, nameX, avatarY + 32)

    // 风格标签 per D-12
    var tags = artist.style_tags || []
    var tagText = ''
    if (Array.isArray(tags) && tags.length > 0) {
      // 将标签对象数组转为文字
      tagText = tags.map(function (t) { return typeof t === 'string' ? t : t.label || '' }).filter(Boolean).join(' · ')
    }
    if (tagText) {
      // 截断过长标签
      if (tagText.length > 12) tagText = tagText.substring(0, 12) + '...'
      ctx.fillStyle = 'rgba(0,0,0,0.42)'
      ctx.font = '20px -apple-system, PingFang SC, sans-serif'
      ctx.fillText(tagText, nameX, avatarY + 60)
    }

    // === 右侧：QR 码 + 提示文字 ===
    var qrSize = 150
    var qrX = POSTER_WIDTH - qrSize - 40
    var qrY = infoY + 50

    if (images.qr) {
      ctx.drawImage(images.qr, qrX, qrY, qrSize, qrSize)
    } else {
      // QR 占位
      ctx.fillStyle = '#E8E4DF'
      ctx.fillRect(qrX, qrY, qrSize, qrSize)
    }

    // "扫码查看作品" 提示文字 per D-11/D-12
    ctx.fillStyle = 'rgba(0,0,0,0.32)'
    ctx.font = '18px -apple-system, PingFang SC, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('扫码查看作品', qrX + qrSize / 2, qrY + qrSize + 28)

    // 重置 textAlign
    ctx.textAlign = 'left'
  },

  /**
   * 导出 Canvas 为临时图片 per D-17
   */
  exportPoster: function (canvas, dpr) {
    var self = this
    wx.canvasToTempFilePath({
      canvas: canvas,
      x: 0,
      y: 0,
      width: POSTER_WIDTH * dpr,
      height: POSTER_HEIGHT * dpr,
      destWidth: POSTER_WIDTH * dpr,
      destHeight: POSTER_HEIGHT * dpr,
      fileType: 'png',
      quality: 1,
      success: function (res) {
        self.setData({
          posterImage: res.tempFilePath,
          loading: false
        })
      },
      fail: function (err) {
        console.error('导出海报失败:', err)
        self.setData({ loading: false, error: true })
      }
    })
  },

  /**
   * 保存到相册 per D-18/D-19/D-20
   */
  onSavePoster: function () {
    var self = this
    var filePath = this.data.posterImage
    if (!filePath) return

    this.setData({ saving: true })

    // 检查相册权限 per D-19
    wx.getSetting({
      success: function (res) {
        if (res.authSetting['scope.writePhotosAlbum']) {
          // 已授权 → 直接保存
          self.doSave(filePath)
        } else {
          // 请求授权
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: function () {
              self.doSave(filePath)
            },
            fail: function () {
              // 用户拒绝 → 引导到设置页 per D-19
              wx.showModal({
                title: '需要相册权限',
                content: '需要相册权限才能保存海报，请前往设置开启',
                confirmText: '去设置',
                success: function (modalRes) {
                  if (modalRes.confirm) {
                    wx.openSetting({
                      success: function (settingRes) {
                        if (settingRes.authSetting['scope.writePhotosAlbum']) {
                          self.doSave(filePath)
                        }
                      }
                    })
                  }
                  self.setData({ saving: false })
                }
              })
            }
          })
        }
      },
      fail: function () {
        self.setData({ saving: false })
      }
    })
  },

  doSave: function (filePath) {
    var self = this
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: function () {
        wx.showToast({ title: '海报已保存到相册', icon: 'success' }) // per D-20
        self.setData({ saving: false })
      },
      fail: function (err) {
        console.error('保存失败:', err)
        wx.showToast({ title: '保存失败', icon: 'none' })
        self.setData({ saving: false })
      }
    })
  },

  /**
   * 重试（QR 码失败时）per D-29
   */
  onRetry: function () {
    this.setData({ loading: true, error: false })
    this.loadAndGenerate(this._workId)
  },

  /**
   * 关闭页面 per D-21
   */
  onClose: function () {
    wx.navigateBack()
  }
})
