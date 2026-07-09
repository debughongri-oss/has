const worksService = require('../../services/works')
const profileService = require('../../services/profile')
const authService = require('../../services/auth')
const { SERVICE_CATEGORIES } = require('../../utils/constants')

// 分类 key → 中文标签（与 detail 页一致）
var CATEGORY_MAP = {}
SERVICE_CATEGORIES.forEach(function (c) { CATEGORY_MAP[c.key] = c.label })

// 海报布局常量
var POSTER_WIDTH = 750
var POSTER_HEIGHT = 1260
var IMAGE_AREA_HEIGHT = 760
var INFO_AREA_HEIGHT = 500

/**
 * Canvas 文本自动换行（中文按字断行）。
 * 超过 maxLines 时，最后一行补省略号。返回「下一行 baseline」的 y 坐标，便于接力排版。
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  text = String(text || '')
  var lines = []
  var line = ''
  for (var i = 0; i < text.length; i++) {
    var test = line + text[i]
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = text[i]
    } else {
      line = test
    }
  }
  if (line) lines.push(line)

  var truncated = lines.length > maxLines
  if (truncated) lines = lines.slice(0, maxLines)

  for (var j = 0; j < lines.length; j++) {
    var lt = lines[j]
    if (truncated && j === maxLines - 1) {
      while (ctx.measureText(lt + '…').width > maxWidth && lt.length) lt = lt.slice(0, -1)
      lt += '…'
    }
    ctx.fillText(lt, x, y + j * lineHeight)
  }
  return y + lines.length * lineHeight
}

/**
 * 把任意图片来源解析为 canvas 可绘制的地址。
 *
 * 关键坑：Canvas 2D 的 createImage() 不能直接加载 cloud:// fileID（只有 <image>
 * 组件内部会解析 cloud://）。必须先用 wx.getImageInfo 把 cloud:// 下载成本地
 * 临时路径，canvas 才能绘制 —— 否则图片加载静默失败，海报主图区只剩灰底占位。
 */
function resolveImageSource(src) {
  return new Promise(function (resolve, reject) {
    if (!src) return reject(new Error('无图片源'))
    // 非 cloud://（网络/本地路径）可直接交给 canvas
    if (String(src).indexOf('cloud://') !== 0) return resolve(src)
    // cloud:// 须经云能力解析为本地临时路径
    wx.getImageInfo({
      src: src,
      success: function (info) { resolve(info.path) },
      fail: function () {
        // 降级：换取临时 https URL（受 downloadFile 域名白名单影响，未必可用）
        wx.cloud.getTempFileURL({
          fileList: [src],
          success: function (res) {
            var item = res.fileList && res.fileList[0]
            if (item && item.tempFileURL) resolve(item.tempFileURL)
            else reject(new Error('getTempFileURL 为空'))
          },
          fail: function (err) { reject(err) }
        })
      }
    })
  })
}

/**
 * 加载一张图片到 canvas；失败返回 null（调用方各自降级，不影响其它图片）。
 */
function loadCanvasImage(canvas, src) {
  return resolveImageSource(src)
    .then(function (url) {
      return new Promise(function (resolve, reject) {
        var img = canvas.createImage()
        img.onload = function () { resolve(img) }
        img.onerror = function (err) {
          console.error('canvas 图片加载失败:', src, err)
          reject(err)
        }
        img.src = url
      })
    })
    .catch(function () { return null })
}

Page({
  data: {
    loading: true,
    posterImage: '',
    error: false,
    saving: false,
    statusBarHeight: 20,
    work: null // 缓存作品，供「转发给好友」使用
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
   * 并行加载数据，然后生成海报
   * 注：个人主体小程序无法使用 wxacode 生成小程序码，海报不再依赖二维码；
   *     引流进小程序改由底部「转发给好友」按钮(open-type=share)承担。
   */
  loadAndGenerate: function (workId) {
    var self = this

    // 并行加载：作品详情 + 化妆师资料
    Promise.all([
      worksService.getWorkDetail(workId).catch(function (err) {
        console.error('加载作品失败:', err)
        return null
      }),
      profileService.getArtistProfile().catch(function (err) {
        console.error('加载资料失败:', err)
        return null
      })
    ]).then(function (results) {
      var work = results[0]
      var artist = results[1]

      if (!work) {
        self.setData({ loading: false, error: true })
        return
      }

      // 缓存作品，供 onShareAppMessage 转发使用
      self.setData({ work: work })
      self.generatePoster(work, artist || {})
    })
  },

  /**
   * 生成海报 — 初始化 Canvas + 加载图片 + 绘制 + 导出
   */
  generatePoster: function (work, artist) {
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

        // 并行加载图片 per D-13
        self.loadImages(canvas, work, artist)
          .then(function (images) {
            // 绘制海报
            self.drawPoster(ctx, work, artist, images)
            // 导出图片
            self.exportPoster(canvas, dpr)
          })
          .catch(function (err) {
            console.error('海报生成失败:', err)
            // 图片加载失败仍尝试绘制 per D-30
            var fallbackImages = { workImage: null, avatar: null }
            self.drawPoster(ctx, work, artist, fallbackImages)
            self.exportPoster(canvas, dpr)
          })
      })
  },

  /**
   * 并行加载作品主图 + 头像 per D-13
   * cloud:// fileID 经 resolveImageSource 解析为本地路径后再交给 canvas。
   * 返回 { workImage, avatar }
   */
  loadImages: function (canvas, work, artist) {
    var workSrc = work.images && work.images.length > 0 ? work.images[0] : ''
    var avatarSrc = artist.avatar || ''

    return Promise.all([
      workSrc ? loadCanvasImage(canvas, workSrc) : Promise.resolve(null),
      avatarSrc ? loadCanvasImage(canvas, avatarSrc) : Promise.resolve(null)
    ]).then(function (results) {
      return { workImage: results[0], avatar: results[1] }
    })
  },

  /**
   * 绘制海报布局
   * ┌─────────────────────────┐
   * │   作品主图 750×760      │
   * ├─────────────────────────┤
   * │ 分类                    │
   * │ 作品标题（最多2行）     │  500px 信息区
   * │ 作品故事（最多2行）     │
   * │ ─────────────────       │
   * │ ◯ 姓名                  │
   * │   头衔 · 地区           │
   * │   风格标签              │
   * │ ─────────────────       │
   * │ 底部 CTA（微信/预约）   │
   * └─────────────────────────┘
   */
  drawPoster: function (ctx, work, artist, images) {
    ctx.clearRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT)
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'

    // === 主图区域（aspectFill 裁切）===
    if (images.workImage) {
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
      ctx.textAlign = 'left'
    }

    // === 信息区域背景 ===
    var infoY = IMAGE_AREA_HEIGHT
    ctx.fillStyle = '#FDFCF9'
    ctx.fillRect(0, infoY, POSTER_WIDTH, INFO_AREA_HEIGHT)

    // 顶部分隔线
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, infoY + 0.5)
    ctx.lineTo(POSTER_WIDTH, infoY + 0.5)
    ctx.stroke()

    var padX = 48
    var contentW = POSTER_WIDTH - padX * 2
    var cursor = infoY + 46

    // 分类标签（eyebrow）
    var categoryLabel = ''
    if (work.category && CATEGORY_MAP[work.category]) categoryLabel = CATEGORY_MAP[work.category]
    if (categoryLabel) {
      ctx.fillStyle = '#B0895B'
      ctx.font = '22px -apple-system, PingFang SC, sans-serif'
      ctx.fillText(categoryLabel, padX, cursor)
      cursor += 34
    }

    // 作品标题（最多 2 行）
    var title = work.title || '作品展示'
    ctx.fillStyle = '#1F1B18'
    ctx.font = 'bold 34px -apple-system, PingFang SC, sans-serif'
    cursor = wrapText(ctx, title, padX, cursor, contentW, 46, 2)
    cursor += 12

    // 作品故事（可选，最多 2 行）
    if (work.description) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.font = '23px -apple-system, PingFang SC, sans-serif'
      cursor = wrapText(ctx, work.description, padX, cursor, contentW, 34, 2)
      cursor += 16
    }

    // 分隔线
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.beginPath()
    ctx.moveTo(padX, cursor)
    ctx.lineTo(POSTER_WIDTH - padX, cursor)
    ctx.stroke()
    cursor += 30

    // === 头像 + 化妆师信息 ===
    var avatarSize = 64
    var textX = padX + avatarSize + 20

    // 头像（圆形裁切）
    if (images.avatar) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(padX + avatarSize / 2, cursor + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(images.avatar, padX, cursor, avatarSize, avatarSize)
      ctx.restore()
    } else {
      // 默认头像：灰色圆形
      ctx.fillStyle = '#D5D0CB'
      ctx.beginPath()
      ctx.arc(padX + avatarSize / 2, cursor + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('妆', padX + avatarSize / 2, cursor + avatarSize / 2 + 10)
      ctx.textAlign = 'left'
    }

    // 姓名
    var name = artist.name || '化妆师'
    ctx.fillStyle = '#1F1B18'
    ctx.font = 'bold 28px -apple-system, PingFang SC, sans-serif'
    ctx.fillText(name, textX, cursor + 28)

    // 副信息：头衔/经验 · 服务地区
    var metaParts = []
    if (artist.experience) metaParts.push(artist.experience)
    var location = (artist.contact_info && (artist.contact_info.location || artist.contact_info.service_area)) || artist.service_area
    if (location) metaParts.push(location)
    if (metaParts.length) {
      var metaText = metaParts.join(' · ')
      if (metaText.length > 22) metaText = metaText.substring(0, 22) + '...'
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.font = '21px -apple-system, PingFang SC, sans-serif'
      ctx.fillText(metaText, textX, cursor + 56)
    }

    cursor += avatarSize + 4

    // 风格标签
    var tags = artist.style_tags || []
    var tagText = ''
    if (Array.isArray(tags) && tags.length > 0) {
      tagText = tags.map(function (t) { return typeof t === 'string' ? t : (t.label || '') }).filter(Boolean).join(' · ')
    }
    if (tagText) {
      if (tagText.length > 24) tagText = tagText.substring(0, 24) + '...'
      ctx.fillStyle = 'rgba(0,0,0,0.42)'
      ctx.font = '20px -apple-system, PingFang SC, sans-serif'
      ctx.fillText(tagText, padX, cursor + 24)
    }

    // 底部 CTA
    this.drawFooter(ctx, artist)
  },

  /**
   * 底部行动条：有微信号则突出微信号，否则显示品牌语 + 保存/转发提示。
   */
  drawFooter: function (ctx, artist) {
    var y = POSTER_HEIGHT - 44

    ctx.strokeStyle = 'rgba(0,0,0,0.06)'
    ctx.beginPath()
    ctx.moveTo(48, y - 28)
    ctx.lineTo(POSTER_WIDTH - 48, y - 28)
    ctx.stroke()

    var wechat = artist.contact_info && artist.contact_info.wechat
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.font = '20px -apple-system, PingFang SC, sans-serif'
    ctx.textAlign = 'left'
    if (wechat) {
      var t = '微信预约：' + wechat
      if (t.length > 22) t = t.substring(0, 22) + '...'
      ctx.fillText(t, 48, y)
    } else {
      ctx.fillText('专业化妆造型 · 欢迎咨询预约', 48, y)
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.font = '19px -apple-system, PingFang SC, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText('长按保存 · 转发分享', POSTER_WIDTH - 48, y)
    }
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
   * 重试（作品加载失败时）
   */
  onRetry: function () {
    this.setData({ loading: true, error: false })
    this.loadAndGenerate(this._workId)
  },

  /**
   * 转发给好友 — 个体主体无法生成小程序码，引流进小程序改由转发卡片承担。
   * 好友点开卡片直接进入该作品详情页。
   */
  onShareAppMessage: function () {
    var work = this.data.work
    return {
      title: work ? (work.title + ' — 化妆师作品') : '化妆师作品展示',
      path: '/pages/works/detail?id=' + this._workId,
      imageUrl: work && work.images && work.images.length ? work.images[0] : ''
    }
  },

  /**
   * 关闭页面 per D-21
   */
  onClose: function () {
    wx.navigateBack()
  }
})
