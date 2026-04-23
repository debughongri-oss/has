# Phase 10: QR Code & Poster Generation - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

化妆师可在作品详情页一键生成包含作品图片、个人信息和小程序码的分享海报，用于线下和朋友圈推广。海报中的小程序码扫码后直接进入对应作品详情页。海报可保存到手机相册。

不包含：客户侧海报生成（仅化妆师功能）、海报模板选择（单一高质量模板）、社交媒体直接分享（仅保存到相册）。

</domain>

<decisions>
## Implementation Decisions

### 海报生成触发点

- **D-01:** "生成海报"按钮放在作品详情页（`pages/works/detail`）的 detail-action 区域，与"预约此妆容"和"咨询"按钮同级。使用按钮样式：outline 变体（`btn-outline`），文字"生成海报"，位于"预约"按钮上方。
- **D-02:** 仅化妆师可见——客户端通过 `wx.getStorageSync('isArtist')` 或直接比较 `ARTIST_OPENID` 判断。非化妆师不显示该按钮。理由：海报是化妆师的推广工具，客户不需要生成海报。
- **D-03:** 点击后跳转到独立海报页面 `pages/works/poster?id={workId}`。独立页面的理由：(1) canvas 元素需要自己的页面 DOM 空间；(2) 海报预览需要全屏展示空间；(3) 与 compare 全屏页面模式一致。

### 小程序码生成

- **D-04:** 在现有 `works` 云函数中新增 `getShareQRCode` action，不创建独立云函数。理由：QR 码与作品强关联，逻辑属于 works 领域。
- **D-05:** 使用 `cloud.openapi.wxacode.getUnlimitedQRCode()` 服务端 API。理由：(1) 云函数自动处理 access_token，无需手动获取；(2) 不限制生成数量（getQRCode 有数量限制，getUnlimitedQRCode 无限制）；(3) scene 参数最多 32 字符，work _id 通常 20 字符以内，足够。
- **D-06:** QR 码参数配置：
  - `scene: workId`（作品 ID，用于详情页 onLoad 解析）
  - `page: 'pages/works/detail'`（扫码跳转目标页）
  - `width: 280`（像素，适合海报底部展示）
  - `autoColor: false`
  - `lineColor: { r: 156, g: 122, b: 90 }`（品牌色 #9C7A5A）
  - `isHyaline: false`（白色背景，视觉清晰）
- **D-07:** QR 码缓存策略：生成的 QR 码 Buffer 上传到云存储 `qrcodes/{workId}.png`，下次请求同一作品时先检查云存储是否已有。实现方式：try-catch 中先 `cloud.downloadFile` 尝试获取，失败则重新生成。同一个 workId 的 QR 码永远不变（scene 参数相同），缓存是安全的。

### 海报 Canvas 渲染

- **D-08:** 使用 Canvas 2D API（`<canvas type="2d">`），不使用旧版 CanvasContext API。理由：(1) Canvas 2D 是微信推荐的新标准；(2) 性能更好，支持 Image 对象直接加载；(3) 旧版 API 已标记为 deprecated。
- **D-09:** Canvas 尺寸设计：
  - 逻辑尺寸：750 × 1060 px（宽度匹配 rpx 标准，高度为图片区 750 + 信息区 310）
  - 实际像素 = 逻辑尺寸 × DPR（通过 `wx.getWindowInfo().pixelRatio` 获取）
  - CSS 显示尺寸用 style 设置为屏幕宽度的 85%（居中预览）
- **D-10:** DPR 适配：canvas.width 和 canvas.height 设置为逻辑尺寸 × DPR，然后 `ctx.scale(dpr, dpr)` 缩放上下文，所有绘制坐标使用逻辑坐标。这是 Canvas 2D 在小程序中处理高分辨率屏幕的标准做法。
- **D-11:** 海报布局（从上到下）：
  ```
  ┌─────────────────────────────────────┐
  │                                     │
  │         作品图片 (750×750)           │  主图区域，aspectFill 裁切
  │                                     │
  ├─────────────────────────────────────┤
  │  ┌──────┐                           │
  │  │ 头像  │  化妆师名字               │  信息区域 310px 高
  │  │ 80×80 │  ⭐ 风格标签              │
  │  └──────┘                           │
  │                      ┌──────────┐   │
  │  "长按扫码查看作品"   │  小程序码  │   │
  │                      │  150×150  │   │
  │                      └──────────┘   │
  └─────────────────────────────────────┘
  ```
  - 主图区域：750×750，使用 `ctx.drawImage()` 的 aspectFill 模式（手动计算裁切区域）
  - 信息区域：背景色 `#FDFCF9`（`--bg-elevated`），高度 310px
  - 左侧：圆形头像 80px + 化妆师名字（`--text-primary`）+ 风格标签文字
  - 右侧：小程序码 150×150 + "长按扫码查看作品" 提示文字
  - 底部分隔线：1px solid rgba(0,0,0,0.05)（分隔主图和信息区）
- **D-12:** 字体设置：使用系统默认字体（`-apple-system, PingFang SC`）。名字用 28px bold，标签用 20px regular rgba(0,0,0,0.42)，提示文字用 18px regular rgba(0,0,0,0.32)。不加载自定义字体（增加复杂度且无必要）。

### 图片加载流程

- **D-13:** 海报需要加载 3 张图片：作品主图、化妆师头像、小程序码。全部使用 `canvas.createImage()` + `onload` 回调加载，使用 `Promise.all()` 并行等待全部加载完成后再开始绘制。
- **D-14:** 作品主图来源：`work.images[0]`（云存储 fileID 或 URL）。`canvas.createImage().src` 可以直接使用云存储 fileID（`cloud://...`）和临时 URL。
- **D-15:** 化妆师头像来源：从 `artist_profile` 的 `avatar` 字段获取。如果头像为空（未设置），使用默认占位头像图片（项目内置 `/images/default-avatar.png`）。
- **D-16:** 小程序码来源：调用 `getShareQRCode` 云函数获取 fileID，然后 `wx.cloud.getTempFileURL` 获取临时 URL，再用 `canvas.createImage()` 加载。

### 保存到相册

- **D-17:** Canvas 渲染完成后，使用 `wx.canvasToTempFilePath()` 将 canvas 内容导出为临时图片文件。参数设置：
  - `x: 0, y: 0, width: 750*dpr, height: 1060*dpr`
  - `destWidth: 750*dpr, destHeight: 1060*dpr`
  - `fileType: 'png'`
  - `quality: 1`
- **D-18:** 使用 `wx.saveImageToPhotosAlbum()` 保存临时文件到手机相册。
- **D-19:** 权限处理流程：
  1. 调用 `wx.getSetting()` 检查 `scope.writePhotosAlbum`
  2. 如已授权 → 直接保存
  3. 如未授权 → 调用 `wx.authorize({ scope: 'scope.writePhotosAlbum' })`
  4. 如用户拒绝 → 显示 Modal 说明"需要相册权限才能保存海报"，引导用户前往设置页 `wx.openSetting()`
  5. 从设置页返回后重新尝试保存
- **D-20:** 保存成功后显示 Toast "海报已保存到相册"。

### 海报预览页面 UI

- **D-21:** 海报页面 `pages/works/poster` 的 UI 结构：
  - 全屏背景：深色半透明 `rgba(0,0,0,0.7)`
  - 居中区域：海报图片预览（canvas 渲染完成后转为图片显示）
  - 底部操作栏："保存到相册" 按钮（accent 色 btn-primary 样式）
  - 顶部右侧：关闭按钮
  - 生成过程中：加载状态（t-loading + "海报生成中..."）
- **D-22:** Canvas 元素设置为不可见（`position: fixed; left: -9999px`），用于离屏渲染。用户看到的是 canvas 导出后的图片，不是 canvas 本身。理由：(1) 避免 canvas 在不同设备上的渲染差异影响视觉体验；(2) 图片预览更流畅。
- **D-23:** 页面数据流：
  1. `onLoad(options)` → 获取 workId
  2. 并行加载：作品详情（works.getWorkDetail）、化妆师资料（profile.get）、QR 码（works.getShareQRCode）
  3. 全部加载完成 → 初始化 Canvas → 加载图片 → 绘制海报 → 导出图片
  4. 显示海报预览 + "保存"按钮

### 云函数架构

- **D-24:** `works` 云函数新增 `getShareQRCode` action：
  ```javascript
  case 'getShareQRCode': {
    const { id } = event  // work ID
    // 1. 尝试从云存储获取已缓存的 QR 码
    // 2. 如无缓存，调用 cloud.openapi.wxacode.getUnlimitedQRCode()
    // 3. 上传到云存储 qrcodes/{id}.png
    // 4. 返回 fileID
  }
  ```
- **D-25:** QR 码云存储路径：`qrcodes/{workId}.png`。使用 workId 作为文件名，同一作品的 QR 码复用缓存。
- **D-26:** `getShareQRCode` 不需要 isArtist 验证——QR 码生成是只读操作，不修改数据。但添加 isArtist 检查可以防止滥用，所以保留 `requireArtist` 验证。

### 客户端服务层

- **D-27:** 在 `miniprogram/services/works.js` 中新增 `getShareQRCode(id)` 方法，调用 works 云函数的 `getShareQRCode` action。

### 路由配置

- **D-28:** `pages/works/poster` 添加到 `app.json` 主包 pages 数组。不放入 admin 子包——虽然只有化妆师使用，但它是从主包的 detail 页面跳转的，放在主包更自然（且避免跨包跳转的额外开销）。

### 错误处理

- **D-29:** QR 码生成失败（云函数错误）→ 显示 Toast "生成海报失败，请重试"，显示重试按钮。
- **D-30:** 图片加载失败（作品图或头像）→ 使用占位图（灰色背景 + 图标），不阻塞海报生成。
- **D-31:** 保存失败（权限拒绝）→ 按权限处理流程引导（D-19）。

### Agent's Discretion

- 海报页面的精确样式细节（间距、圆角、阴影）
- Canvas 绘制中的字体 fallback 处理
- QR 码缓存的过期策略（当前不过期）
- 作品图片 aspectFill 裁切的精确计算
- 头像圆形裁切的实现（ctx.arc + ctx.clip）
- 风格标签在海报中的截断策略（超长时显示省略号）
- 默认占位头像的具体设计
- 海报预览动画效果

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` §Growth — GROW-01/02/03 海报生成需求

### 现有代码（必须读取以理解当前实现）
- `miniprogram/pages/works/detail.js` — 作品详情页逻辑（添加"生成海报"按钮逻辑）
- `miniprogram/pages/works/detail.wxml` — 作品详情页模板（添加按钮到 detail-action 区域）
- `miniprogram/pages/works/detail.wxss` — 作品详情页样式
- `miniprogram/pages/works/detail.json` — 页面配置
- `miniprogram/pages/works/compare.js` — 全屏页面的参考模式（poster 页面类似模式）
- `miniprogram/pages/works/compare.wxml` — 全屏页面模板参考
- `cloudfunctions/works/index.js` — works 云函数（新增 getShareQRCode action）
- `miniprogram/services/works.js` — 客户端 works 服务（新增 getShareQRCode 方法）
- `miniprogram/services/api.js` — callCloudFunction 统一封装
- `miniprogram/utils/constants.js` — 常量定义（ARTIST_OPENID）
- `miniprogram/app.json` — 页面路由配置（新增 poster 页面）
- `miniprogram/app.wxss` — 全局样式变量（--accent, --bg-elevated 等）
- `cloudfunctions/shared/auth.js` — requireArtist 验证模块
- `cloudfunctions/profile/index.js` — 理解 artist_profile 数据结构

### 微信官方 API 文档
- [Canvas 2D API](https://developers.weixin.qq.com/miniprogram/dev/api/canvas/Canvas.html) — Canvas.getContext('2d'), createImage(), toDataURL()
- [wx.canvasToTempFilePath](https://developers.weixin.qq.com/miniprogram/dev/api/canvas/wx.canvasToTempFilePath.html) — Canvas 导出为临时图片
- [wx.saveImageToPhotosAlbum](https://developers.weixin.qq.com/miniprogram/dev/api/media/image/wx.saveImageToPhotosAlbum.html) — 保存图片到相册
- [getUnlimitedQRCode](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/get-unlimited-qr-code/getUnlimitedQRCode.html) — 无限制小程序码生成
- [cloud.openapi](https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/reference-sdk-api/open/Cloud.openapi.html) — 云函数调用服务端 API

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `miniprogram/services/api.js` — `callCloudFunction` 统一封装，新增 action 直接复用
- `cloudfunctions/shared/auth.js` — `requireArtist()` 用于 getShareQRCode 的权限验证
- `miniprogram/pages/works/compare.js` — 全屏独立页面模式参考（onLoad 接收参数、加载逻辑）
- `miniprogram/utils/constants.js` — `ARTIST_OPENID` 常量用于客户端角色判断
- `miniprogram/pages/index/index.js` — 主页加载 artist_profile 的模式可参考

### Established Patterns
- 云函数 action-dispatcher + `switch (event.action)` — 新增 getShareQRCode action 遵循此模式
- 服务层 `callCloudFunction` 统一错误处理 — works.js 扩展方法遵循此模式
- 客户端角色判断：通过 `ARTIST_OPENID` 常量比较 openid
- 页面间传参：`options.id` 或 `options.workId`（onLoad 参数）
- CSS custom properties：`--accent`, `--bg-elevated`, `--text-primary` 等全局变量
- 按钮样式：`btn-primary`（accent 填充）、`btn-outline`（outline 变体）

### Integration Points
- `miniprogram/pages/works/detail.wxml:67-72` — `detail-action` 区域，新增"生成海报"按钮（与"预约"和"咨询"同级）
- `miniprogram/pages/works/detail.js` — 新增 `goToPoster()` 方法，navigateTo 到 poster 页面
- `cloudfunctions/works/index.js` — 新增 `getShareQRCode` case 分支
- `miniprogram/services/works.js` — 新增 `getShareQRCode(id)` 方法
- `miniprogram/app.json` — pages 数组新增 `pages/works/poster`

### Cloud Function wxacode API Pattern
```javascript
// 在云函数中调用（自动处理 access_token）
const result = await cloud.openapi.wxacode.getUnlimitedQRCode({
  scene: workId,           // 最多 32 个可见字符
  page: 'pages/works/detail',  // 扫码跳转页面
  width: 280,              // 二维码宽度，最小 280，最大 1280
  autoColor: false,
  lineColor: { r: 156, g: 122, b: 90 },  // #9C7A5A
  isHyaline: false         // 非透明背景
})
// result 是 Buffer 类型
// 上传到云存储
const upload = await cloud.uploadFile({
  cloudPath: `qrcodes/${workId}.png`,
  fileContent: result
})
return { fileID: upload.fileID }
```

### Canvas 2D Drawing Pattern (for poster)
```javascript
// 获取 canvas 实例
const query = wx.createSelectorQuery()
query.select('#posterCanvas')
  .fields({ node: true, size: true })
  .exec((res) => {
    const canvas = res[0].node
    const ctx = canvas.getContext('2d')
    const dpr = wx.getWindowInfo().pixelRatio
    canvas.width = 750 * dpr
    canvas.height = 1060 * dpr
    ctx.scale(dpr, dpr)

    // 绘制...
    const img = canvas.createImage()
    img.src = 'cloud://...'  // 云存储 fileID 直接可用
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 750, 750)
      // 继续绘制其他元素...
    }
  })

// 导出
wx.canvasToTempFilePath({
  canvas: canvas,  // Canvas 2D 使用 canvas 参数（不是 canvasId）
  success: (res) => {
    // res.tempFilePath 为临时文件路径
  }
})
```

</code_context>

<specifics>
## Specific Ideas

- 海报设计风格：简洁优雅，与小程序整体视觉风格一致（米白底色 + accent 色点缀）
- QR 码线条使用品牌色 #9C7A5A（而非默认黑色），增加品牌识别度
- 信息区域左侧放化妆师信息，右侧放 QR 码，形成左右对角的视觉平衡
- "长按扫码查看作品"文字使用小字号（18px）和浅色（rgba(0,0,0,0.32)），不抢主图视觉
- 生成过程中显示友好的 loading 状态："海报生成中..." + 进度指示
- 保存成功后的 Toast 文案："海报已保存到相册"

</specifics>

<deferred>
## Deferred Ideas

- 多模板海报选择（不同布局/风格）— 单模板足够 MVP，多模板增加大量 Canvas 绘制代码
- 海报分享到微信聊天/朋友圈（非保存到相册）— 需要使用 wx.shareFileMessage 或生成图片后转发，复杂度高
- 批量生成海报（从作品列表选择多个）— 低优先级，单个生成满足核心需求
- 海报添加自定义文案（化妆师输入推广文字）— 增加输入交互复杂度
- 客户端缓存已生成海报（避免重复生成）— QR 码云存储缓存已足够，客户端缓存增加存储管理复杂度

---

*Phase: 10-qr-code-poster-generation*
*Context gathered: 2026-04-23*
