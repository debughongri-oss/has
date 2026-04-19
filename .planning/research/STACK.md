# Technology Stack — v1.1 Milestone Additions

**Project:** 化妆师个人作品展示与预约微信小程序
**Milestone:** v1.1 品牌升级 & 体验增强
**Researched:** 2026-04-19
**Scope:** NEW stack additions only — existing validated stack (微信原生框架, CloudBase, TDesign 1.13.2, wx-server-sdk 3.0.4) is unchanged

## TL;DR: Zero New npm Dependencies

**All v1.1 features use already-installed libraries or built-in WeChat APIs.** No new packages to add. The existing stack covers everything:

| New Feature | Solution | New Dependency? |
|-------------|----------|-----------------|
| Before/After Slider | Custom component (`movable-area` + CSS clip) | ❌ None |
| Subscription Messages | Already implemented — just needs template config | ❌ None |
| QR + Poster Generation | Cloud function `wxacode.getUnlimited()` + Canvas 2D | ❌ None |
| Calendar View | TDesign `t-calendar` (already installed) | ❌ None |
| Time Conflict Detection | Already implemented in bookings cloud function | ❌ None |
| Enhanced Booking Notes | Form fields + TDesign `t-textarea` (installed) | ❌ None |
| Customer Reviews | New cloud function + TDesign `t-rate` (installed) | ❌ None |
| Enhanced Profile | New fields + TDesign `t-tag` (installed) | ❌ None |

---

## Feature-by-Feature Stack Analysis

### 1. Before/After Comparison Slider (PORT-07)

**Approach: Custom component using WeChat native APIs**

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `<movable-area>` + `<movable-view>` | 基础库 ≥ 2.0 | Draggable divider | WeChat 原生可移动组件，提供 `bindchange` 事件获取拖动位置，性能优于手动 touch 事件计算。`movable-view` 的 `x` 属性与 `damping` 参数实现平滑拖拽体验。 | **HIGH** |
| CSS `clip-path: inset()` | — | 裁剪 before/after 图层 | 通过 `clip-path: inset(0 Wpx 0 0)` 动态裁剪 before 图片，W 值随拖动位置变化。比 `overflow: hidden` + width 更精确，无闪烁。 | **HIGH** |

**Implementation pattern:**
```xml
<view class="compare-container" style="width:100%; height:900rpx;">
  <!-- After image (底图) -->
  <image class="compare-img" src="{{afterImage}}" mode="aspectFill" />
  <!-- Before image (裁剪层) -->
  <image class="compare-img compare-before"
    style="clip-path: inset(0 {{sliderX}}px 0 0)"
    src="{{beforeImage}}" mode="aspectFill" />
  <!-- 滑块 -->
  <movable-area class="compare-area">
    <movable-view class="compare-handle" direction="horizontal"
      x="{{initialX}}" bindchange="onSliderMove" damping="100">
      <view class="handle-line" />
    </movable-view>
  </movable-area>
</view>
```

**为什么不用第三方库：** 微信小程序没有成熟的 before/after slider 组件。用原生 `movable-view` + `clip-path` 实现只需约 80 行代码（WXML + WXSS + JS），比引入任何 npm 包更轻量、更好维护。

---

### 2. Subscription Message Notifications (BOOK-06/07)

**Status: Already implemented in v1.0 codebase**

The code already contains the full subscription message flow:

| Component | File | Status |
|-----------|------|--------|
| Client-side subscribe request | `booking/create.js:116` | ✅ `wx.requestSubscribeMessage` |
| Server-side send | `bookings/index.js:17-33` | ✅ `cloud.openapi.subscribeMessage.send()` |
| Template ID | `utils/constants.js:39` | ✅ `SUBSCRIBE_TEMPLATE_ID` configured |
| Trigger points | `bookings/index.js:162` | ✅ On accept/reject/complete |

**What still needs doing (not a stack issue):**
1. **Verify template ID matches the actual template on mp.weixin.qq.com** — the ID `-i6OevJwdS5fGFXCsB9Xux4zaaxUkXTR0xfLg5T48jM` may need to be updated to match the template configured in the WeChat admin console
2. **Consider adding a second template** for "review reminder" (预约完成后提醒评价) — requires creating a new template in WeChat admin and adding its ID to constants
3. **Handle subscribe failure gracefully** — current `complete` callback ignores reject, which is correct behavior

**API reference (verified with official docs):**
- Client: `wx.requestSubscribeMessage({ tmplIds: [id], complete: callback })` — 基础库 ≥ 2.8.2
- Server: `cloud.openapi.subscribeMessage.send({ touser, templateId, page, data })` — built into wx-server-sdk
- Limits: 1kw/day (no payment capability), 3kw/day (with payment)
- User can subscribe once per template per session — must be triggered by user tap

---

### 3. QR Code + Poster Generation (MGMT-03)

**Approach: Server-side QR generation + Client-side Canvas 2D poster**

#### 3a. QR Code — Cloud Function (server-side)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `cloud.openapi.wxacode.getUnlimited()` | wx-server-sdk 3.0.4 | 生成小程序码 | **这是官方推荐方式。** 直接在云函数中调用，返回 Buffer，无需额外 npm 包。生成的小程序码是官方标准格式，支持微信扫一扫直接打开。 | **HIGH** |

**Cloud function action to add (in `profile` or new `share` cloud function):**
```javascript
case 'getQRCode': {
  try {
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: 'index',           // 首页场景值
      page: 'pages/index/index', // 跳转页面
      width: 430,                // 二维码宽度
      autoColor: false,
      lineColor: { r: 156, g: 122, b: 90 }, // 品牌色 #9C7A5A
      isHyaline: false
    })
    // result.buffer 是图片 Buffer，上传到云存储获取 URL
    const uploadRes = await cloud.uploadFile({
      cloudPath: `qrcodes/miniprogram-qr-${Date.now()}.png`,
      fileContent: result.buffer
    })
    return { errCode: 0, data: { fileID: uploadRes.fileID } }
  } catch (error) {
    console.error('生成小程序码失败:', error)
    return { errCode: -1, errMsg: '生成小程序码失败' }
  }
}
```

**为什么不用客户端 QR 库：** `weapp-qrcode-canvas-2d` v1.1.6 虽然活跃维护，但生成的是普通二维码（不是微信小程序码）。官方小程序码通过 `wxacode.getUnlimited` 在服务端生成，能被微信扫一扫识别并直接跳转，体验远优于普通二维码。且不需要额外 npm 依赖。

#### 3b. Poster — Canvas 2D (client-side)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Canvas 2D API (`type="2d"`) | 基础库 ≥ 2.9.0 | 海报绘制 | WeChat 新版 Canvas API，面向对象接口，支持 `getImageData`、`drawImage` 等。比旧版 `wx.createCanvasContext` 性能更好、API 更清晰。 | **HIGH** |
| `wx.canvasToTempFilePath()` | — | Canvas 导出为图片 | 将 Canvas 内容导出为临时文件路径，用于预览和保存 | **HIGH** |
| `wx.saveImageToPhotosAlbum()` | — | 保存到相册 | 用户将海报保存到手机相册 | **HIGH** |

**Poster layout (Canvas 2D):**
```
┌───────────────────────────┐
│  [头像]  化妆师姓名        │
│         擅长：新娘妆 日常妆 │
│                           │
│  ┌─────────────────────┐  │
│  │   作品展示图          │  │
│  │   (1张精选)          │  │
│  └─────────────────────┘  │
│                           │
│  ┌──────┐                │
│  │ QR码 │  长按识别小程序  │
│  └──────┘                │
│                           │
│  ▸ 预约化妆服务           │
└───────────────────────────┘
```

**Implementation note:** Canvas 2D 需要在 WXML 中声明 `<canvas type="2d" id="posterCanvas">`，通过 `wx.createSelectorQuery().select('#posterCanvas').fields({ node: true })` 获取 Canvas 节点。图片需要先通过 `Canvas.createImage()` 加载后才能绘制。

**为什么不用 `wxa-plugin-canvas` v1.1.12：** 虽然它是微信小程序海报组件，但它使用的是旧版 Canvas API 且是 JSON 配置式绘制，调试困难。直接用 Canvas 2D API 手写绘制更灵活、代码更可控、不需要额外依赖。

---

### 4. Calendar View for Booking Management

**Solution: TDesign `t-calendar` (already installed)**

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `t-calendar` | TDesign 1.13.2 | 日历选择与预约展示 | 已安装在 `miniprogram_npm/tdesign-miniprogram/calendar/`。支持日期范围限制、自定义日期格式、日期标记。通过 `format` 属性可以在有预约的日期上显示圆点标记。 | **HIGH** |

**Usage pattern for admin booking calendar:**
```xml
<t-calendar
  value="{{selectedDate}}"
  minDate="{{minDate}}"
  maxDate="{{maxDate}}"
  format="{{calendarFormat}}"
  bind:select="onDateSelect"
/>
```

**Custom format to mark dates with bookings:**
```javascript
calendarFormat: function(day) {
  const dateStr = `${day.date.getMonth()+1}-${day.date.getDate()}`
  if (bookedDates.includes(dateStr)) {
    day.suffix = { text: '有预约' }
  }
  return day
}
```

**Why this is the right choice:** The admin booking management page needs a calendar to visualize which dates have bookings. TDesign's calendar is already in the project, fully styled to match the design system, and supports date markers — exactly what we need. No reason to look elsewhere.

---

### 5. Time Conflict Detection Enhancement

**Status: Already implemented atomically in v1.0**

The bookings cloud function already performs atomic conflict checking:
```javascript
// bookings/index.js — 'create' action (line 62-71)
const existing = await db.collection('bookings')
  .where({
    booking_date,
    booking_time,
    status: _.in(['pending', 'accepted'])
  })
  .get()
if (existing.data.length > 0) {
  return { errCode: -1, errMsg: '该时段已被预约，请选择其他时间' }
}
```

**Enhancement needed (no new stack):** Currently checks exact time slot match. For variable-duration services, enhance to check time overlap:
```javascript
// Enhanced: check if any booking's time range overlaps with the new one
const newStart = parseTime(booking_time)
const newEnd = newStart + service_duration
const existing = await db.collection('bookings')
  .where({
    booking_date,
    status: _.in(['pending', 'accepted'])
  })
  .get()
// Filter for overlapping bookings in JS
const hasConflict = existing.data.some(b => {
  const existStart = parseTime(b.booking_time)
  const existEnd = existStart + (b.service_duration || 90)
  return newStart < existEnd && newEnd > existStart
})
```

This is a logic change, not a stack change.

---

### 6. Enhanced Booking Notes

**Solution: Form fields + TDesign `t-textarea` (already installed)**

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `t-textarea` | TDesign 1.13.2 | 多行文本输入 | 已安装。支持 `maxlength`、`indicator`（字数统计）、`placeholder`。用于特殊需求、过敏信息等长文本输入。 | **HIGH** |
| `t-picker` | TDesign 1.13.2 | 皮肤类型选择器 | 已安装。用于皮肤类型（干性/油性/混合性/敏感性）的选择。 | **HIGH** |

**New booking fields to add:**
```javascript
// In booking creation data
{
  // ...existing fields
  skin_type: 'normal',      // normal/oily/dry/combination/sensitive
  special_needs: '',         // textarea, max 200 chars
  allergy_info: '',          // textarea, max 200 chars
  reference_images: []       // optional, up to 3 images
}
```

---

### 7. Customer Review System

**Solution: New cloud function + TDesign `t-rate` (already installed)**

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `t-rate` | TDesign 1.13.2 | 星级评分组件 | 已安装在 `miniprogram_npm/tdesign-miniprogram/rate/`。支持半选、自定义图标数量、颜色、辅助文字。完全满足评分需求。 | **HIGH** |
| `t-textarea` | TDesign 1.13.2 | 评价文本输入 | 已安装。用于评价文字内容输入。 | **HIGH** |
| `t-tag` | TDesign 1.13.2 | 评价标签展示 | 已安装在 `miniprogram_npm/tdesign-miniprogram/tag/`。用于展示评价摘要标签（如 "服务好"、"准时"）。 | **HIGH** |

**New database collection:**
```javascript
// Collection: reviews
{
  _id: String,
  booking_id: String,        // 关联预约 ID
  user_openid: String,       // 评价者
  rating: Number,            // 1-5 星
  content: String,           // 评价内容，max 300 chars
  tags: [String],            // 快捷标签 ['服务好', '准时', '技术好']
  created_at: Date,
  // Denormalized for quick display
  service_name: String,      // 冗余存储服务名
  user_nickname: String      // 冗余存储用户昵称
}
```

**New cloud function or add to existing:**
- Add `review` actions to a new `reviews` cloud function (cleaner separation)
- Actions: `create`, `list`, `detail`, `checkEligibility` (verify completed booking)

**Content moderation consideration:** Review text should go through `cloud.openapi.security.msgSecCheck` for content safety compliance. This API is built into wx-server-sdk — no new dependency.

---

### 8. Enhanced Artist Profile

**Solution: Extend existing `artist_profile` document + TDesign `t-tag`**

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `t-tag` | TDesign 1.13.2 | 风格标签展示 | 已安装。支持多种变体（light/outline/primary/dark），用于展示擅长风格标签。 | **HIGH** |
| `t-input` | TDesign 1.13.2 | 表单输入 | 已安装。用于编辑服务区域、从业年限等字段。 | **HIGH** |

**New profile fields to add to `artist_profile` collection:**
```javascript
{
  // ...existing fields (name, avatar, bio, experience, specialties, contact_info)
  service_area: String,      // 服务区域，如 "杭州市西湖区"
  experience_years: Number,  // 从业年限，如 5
  style_tags: [String],      // 风格标签，如 ['韩系', '自然', '甜美']
  avg_rating: Number,        // 平均评分（从 reviews 聚合计算）
  review_count: Number,      // 评价总数（从 reviews 聚合计算）
}
```

**`style_tags` predefined options for picker:**
```javascript
const STYLE_TAGS = [
  { key: 'korean', label: '韩系' },
  { key: 'natural', label: '自然' },
  { key: 'sweet', label: '甜美' },
  { key: 'elegant', label: '气质' },
  { key: 'retro', label: '复古' },
  { key: 'creative', label: '创意' },
  { key: 'fresh', label: '清新' },
  { key: 'glamorous', label: '华丽' }
]
```

---

## New Cloud Functions Required

| Cloud Function | New or Extend | Actions | Purpose |
|---------------|---------------|---------|---------|
| `reviews` | **New** | `create`, `list`, `detail`, `checkEligibility` | 客户评价 CRUD |
| `profile` | **Extend existing** | Add `getQRCode` action | 生成小程序码用于海报 |
| `bookings` | **Extend existing** | Enhance `create` with duration conflict check | 时间冲突增强 |

**Alternative for QR code:** Create a separate `share` cloud function if you prefer separation of concerns. But adding one action to `profile` keeps things simpler for this project scale.

---

## New Database Collections

| Collection | Fields | Indexes |
|-----------|--------|---------|
| `reviews` | booking_id, user_openid, rating, content, tags, created_at, service_name, user_nickname | `booking_id` (unique), `created_at` (desc) |

**No schema migration needed for existing collections** — just add new optional fields to documents as they're updated.

---

## TDesign Components to Register (Already Installed)

These components are already in `miniprogram_npm/` from the `tdesign-miniprogram@1.13.2` installation. They just need to be referenced in page JSON files:

| Component | File Reference | First Use |
|-----------|---------------|-----------|
| `t-calendar` | `tdesign-miniprogram/calendar/calendar` | Admin booking calendar |
| `t-rate` | `tdesign-miniprogram/rate/rate` | Review rating input + display |
| `t-textarea` | `tdesign-miniprogram/textarea/textarea` | Enhanced booking notes, review text |
| `t-tag` | `tdesign-miniprogram/tag/tag` | Style tags on profile, review tags |
| `t-picker` | `tdesign-miniprogram/picker/picker` | Skin type selector |

**Registration pattern (in page .json):**
```json
{
  "usingComponents": {
    "t-calendar": "tdesign-miniprogram/calendar/calendar",
    "t-rate": "tdesign-miniprogram/rate/rate",
    "t-textarea": "tdesign-miniprogram/textarea/textarea",
    "t-tag": "tdesign-miniprogram/tag/tag"
  }
}
```

---

## New Custom Components

| Component | Location | Purpose | Est. Size |
|-----------|----------|---------|-----------|
| `before-after-slider` | `components/before-after-slider/` | 前后对比滑块 | ~80 lines (WXML+WXSS+JS) |
| `poster-canvas` | `components/poster-canvas/` | 海报 Canvas 绘制组件 | ~150 lines |
| `review-card` | `components/review-card/` | 评价卡片展示 | ~60 lines |

---

## WeChat APIs Used (All Built-in, No Install)

| API | Feature | Notes |
|-----|---------|-------|
| `cloud.openapi.wxacode.getUnlimited()` | QR code generation | Server-side only, wx-server-sdk built-in |
| `cloud.openapi.subscribeMessage.send()` | Push notifications | Already in use |
| `cloud.openapi.security.msgSecCheck()` | Content moderation | For review text safety |
| Canvas 2D (`type="2d"`) | Poster rendering | Client-side, 基础库 ≥ 2.9.0 |
| `wx.canvasToTempFilePath()` | Canvas → image export | 基础库 ≥ 1.0 |
| `wx.saveImageToPhotosAlbum()` | Save poster to album | Requires `scope.writePhotosAlbum` |
| `wx.requestSubscribeMessage()` | Subscribe to notifications | Already in use, 基础库 ≥ 2.8.2 |

---

## Alternatives Considered & Rejected

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| QR Code | Server-side `wxacode.getUnlimited` | `weapp-qrcode-canvas-2d` v1.1.6 | Client-side QR 库生成普通二维码，不是小程序码。官方小程序码通过云函数生成，微信原生识别，体验更好 |
| QR Code | Server-side | `weapp-qrcode` v1.0.0 | 2018 年停更，使用旧版 Canvas API，不适用 |
| Poster | Canvas 2D 手写绘制 | `wxa-plugin-canvas` v1.1.12 | JSON 配置式绘制，调试困难。Canvas 2D 手写更灵活、可控、无需额外依赖 |
| Before/After Slider | 原生 `movable-view` | npm slider 组件 | 微信小程序生态没有成熟的 before/after 组件。自建组件只需 80 行代码，更轻量 |
| Rating | TDesign `t-rate` | 自定义 star 图标 | `t-rate` 已安装，支持半选、自定义颜色、辅助文字。重新造轮子没有收益 |

---

## Package Version Verification

| Package | Installed | Latest (npm) | Action |
|---------|-----------|-------------|--------|
| `tdesign-miniprogram` | 1.13.2 | 1.13.2 | ✅ Current |
| `wx-server-sdk` | 3.0.4 | 3.0.4 | ✅ Current |

---

## Cost Impact of New Features

| Feature | Additional Cost | Notes |
|---------|----------------|-------|
| Subscription Messages | ¥0 | Free quota: 1kw/day |
| QR Code Generation | ¥0 | `wxacode.getUnlimited` is free, cloud storage for caching within free tier |
| Canvas Poster | ¥0 | Client-side rendering, no server cost |
| Reviews Collection | ¥0 | Small documents, well within 2GB free tier |
| Content Moderation | ¥0 | `msgSecCheck` is free |

**Total additional monthly cost: ¥0**

---

## Sources

- [WeChat Subscription Message Guide](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html) — official docs, verified 2026-04-19
- [WeChat Canvas 2D API](https://developers.weixin.qq.com/miniprogram/dev/api/canvas/Canvas.html) — Canvas node API reference
- [WeChat wxacode.getUnlimited](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode.html) — server-side QR code generation
- [TDesign MiniProgram Calendar](https://github.com/Tencent/tdesign-miniprogram/blob/develop/packages/components/calendar/README.md) — Context7 verified component API
- [TDesign MiniProgram Rate](https://github.com/Tencent/tdesign-miniprogram/blob/develop/packages/components/rate/README.md) — Context7 verified component API
- npm registry — version verification (tdesign-miniprogram 1.13.2, wx-server-sdk 3.0.4, weapp-qrcode-canvas-2d 1.1.6)
- Existing codebase analysis — bookings/index.js, profile/index.js, booking/create.js, utils/constants.js
