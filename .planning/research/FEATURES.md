# Feature Landscape — v1.1 Milestone

**Domain:** 化妆师个人作品展示与预约微信小程序 — v1.1 品牌升级 & 体验增强
**Researched:** 2026-04-19
**Scope:** NEW features only (v1.0 已发布，此处仅覆盖增量功能)

---

## Existing Baseline (v1.0 — Already Shipped)

These are already built and working. Listed for dependency context only.

| Feature | Status | Key Code |
|---------|--------|----------|
| 微信静默登录 | ✅ Shipped | `services/auth.js`, `cloudfunctions/login` |
| 化妆师个人简介展示 | ✅ Shipped | `pages/index/index`, `cloudfunctions/profile` (get) |
| 作品 CRUD + 分类筛选 + 图片轮播 | ✅ Shipped | `pages/works/*`, `cloudfunctions/works` |
| 服务目录 CRUD | ✅ Shipped | `pages/services/list`, `admin/services/*` |
| 预约提交 + 服务端冲突检查 | ✅ Shipped | `pages/booking/create`, `cloudfunctions/bookings` (atomic check) |
| 预约审核 (accept/reject/notes) | ✅ Shipped | `admin/bookings/*` |
| 预约历史 | ✅ Shipped | `pages/profile/history` |
| 管理后台 (admin sub-package) | ✅ Shipped | `pages/admin/*` |
| 微信分享 (chat + Moments) | ✅ Shipped | `onShareAppMessage`, `onShareTimeline` on works detail |
| 订阅消息 (部分) | ⚠️ Partial | `sendNotify()` in bookings cloud function exists; `wx.requestSubscribeMessage` called on client after booking. Single template only. |

---

## Table Stakes (v1.1)

Features that close the quality gap with a real production booking app. Missing any = app feels incomplete.

### 1. 前后对比滑块 (PORT-07) — Before/After Comparison Slider

| Aspect | Detail |
|--------|--------|
| **Why expected** | Before/after comparison is THE signature visual of makeup artistry. Every makeup artist's portfolio (小红书, Instagram, WeChat) uses before/after to demonstrate skill. Without it, the portfolio is just a photo gallery. |
| **User behavior** | User views a work detail → sees before/after tab or section → drags a slider left/right to compare → taps to expand to full screen. The "before" image is on the left, "after" on the right, with a draggable divider line. |
| **Complexity** | **Medium** — Custom component using WXML `movable-area` + `movable-view` or touch events + CSS `clip-path`. No native WeChat component exists, but the pattern is well-documented in the mini program community. |
| **Data model change** | `works` collection adds `before_image` (string, optional) — a single "before" image fileID. If present, detail page shows the slider; if absent, shows existing image carousel. |
| **Dependencies on existing** | Works detail page (`pages/works/detail`), works edit page (`admin/works/edit`), works cloud function (add `before_image` field). |
| **Confidence** | **HIGH** — Custom slider component is a well-known pattern. `movable-area`/`movable-view` is a standard WeChat component. |

**Expected UX flow:**
1. Artist uploads work → new optional field "妆前照片" (before photo)
2. Client views work detail → if `before_image` exists, show "前后对比" tab alongside existing image carousel
3. Slider view: left half = before image, right half = after image, draggable divider
4. Single finger drag moves the divider; release snaps to nearest edge or stays
5. Full-screen mode via tap (reuse `wx.previewImage` or custom overlay)

### 2. 预约状态变更通知 (BOOK-06/07) — WeChat Subscription Messages

| Aspect | Detail |
|--------|--------|
| **Why expected** | Users who submit a booking NEED to know when the artist accepts/rejects. Without push notification, users must manually check the history page — terrible UX for a time-sensitive action like booking. Every booking app (美团, 大众点评) sends notifications. |
| **User behavior** | User submits booking → sees subscribe message popup → taps "允许" → later receives WeChat service notification when artist accepts/rejects/completes booking. |
| **Complexity** | **Medium** — The plumbing (`sendNotify`, `wx.requestSubscribeMessage`) is already partially built. What's missing: (1) configuring the correct template in WeChat admin panel, (2) adding a second template for "预约提醒" (day-before reminder), (3) handling edge cases (user didn't subscribe, message failed). |
| **Data model change** | None — uses existing bookings collection + user openid. |
| **Dependencies on existing** | `cloudfunctions/bookings/index.js` (already has `sendNotify`), `pages/booking/create.js` (already calls `wx.requestSubscribeMessage`), `miniprogram/utils/constants.js` (already has `SUBSCRIBE_TEMPLATE_ID`). |
| **Confidence** | **HIGH** — Official docs verified. `cloud.openapi.subscribeMessage.send` is the standard API. The existing code already calls it correctly for status changes. |

**What's already done vs. what's needed:**

| Already Done | Still Needed |
|-------------|--------------|
| `sendNotify()` function in bookings cloud function | Verify template is approved in WeChat admin (mp.weixin.qq.com) |
| `wx.requestSubscribeMessage` called after booking submit | Add a "预约提醒" template (day-before reminder) |
| Status change triggers `sendNotify` for accepted/rejected/completed | Handle user rejection of subscription gracefully (UI hint) |
| Single template ID configured | Potentially need multiple template IDs for different notification types |

**Templates needed (must apply in WeChat admin):**
1. **预约状态变更通知** — triggers on accept/reject/complete (already coded, template needs verification)
2. **预约提醒** — triggers 1 day before appointment (NEW: needs scheduling mechanism)

**Critical pitfall:** WeChat subscription messages are ONE-TIME — user must agree per message. The current code already handles this (calls `requestSubscribeMessage` at booking time). For the day-before reminder, user must subscribe again at a natural interaction point.

### 3. 日历视图 — Calendar View for Booking Management

| Aspect | Detail |
|--------|--------|
| **Why expected** | The current admin booking list is a flat list with status filters. For an artist managing time slots across multiple days, a calendar view is the standard mental model. Every scheduling app (Calendly, 美团商家, 飞书日历) shows bookings on a calendar. The flat list makes it hard to spot gaps and conflicts. |
| **User behavior** | Artist opens admin bookings → sees calendar month view → dates with bookings show dots/badges → taps a date → sees that day's bookings in chronological order → taps a booking to open detail. |
| **Complexity** | **Medium** — TDesign `t-calendar` component supports `custom-text` (badge/description per date), `switch-mode="month"` for navigation, and `use-popup="{{false}}"` for inline display. Needs data aggregation (count bookings per date) and a daily list view. |
| **Data model change** | None — queries existing `bookings` collection, aggregated by `booking_date`. |
| **Dependencies on existing** | `pages/admin/bookings/list` (will add calendar mode alongside existing list), `cloudfunctions/bookings` (may add `getCalendarData` action for date-range aggregation). |
| **Confidence** | **HIGH** — TDesign Calendar component verified via Context7. Supports `format` function for custom day rendering and `custom-text` for per-date labels. |

**Expected UX flow:**
1. Admin bookings page → toggle between "列表" and "日历" view
2. Calendar shows current month, dots on dates that have bookings
3. Different colored dots: orange = pending, green = accepted, gray = completed
4. Tap a date → bottom sheet or inline list shows that day's bookings chronologically
5. Tap a booking → navigate to booking detail (existing page)

**TDesign Calendar API (verified):**
```xml
<t-calendar
  use-popup="{{false}}"
  type="single"
  switch-mode="month"
  value="{{selectedDate}}"
  format="{{formatDay}}"
  bind:change="onDateSelect"
/>
```
- `format` function: receives day object, can add `className`, `prefix`, `suffix` for custom rendering
- `custom-text`: map of date → `{ text, subText }` for badges

### 4. 预约备注增强 — Enhanced Booking Notes

| Aspect | Detail |
|--------|--------|
| **Why expected** | Makeup services are highly personal — skin type, allergies, preferred style, occasion details all affect the service. Currently there's only a generic "留言" textarea. A structured form helps the artist prepare and shows professionalism. Standard in beauty booking apps. |
| **User behavior** | User fills booking form → instead of one generic textarea, sees structured fields: skin type (dropdown), special needs (textarea), occasion description (textarea). |
| **Complexity** | **Low** — Purely a UI enhancement. Add structured fields to the booking form, update the data model to store them, display them in the admin booking detail. No new APIs needed. |
| **Data model change** | `bookings` collection: replace flat `notes` string with structured object: `{ notes: string, skin_type: string, special_needs: string, occasion: string }`. Or keep `notes` and add new fields alongside. |
| **Dependencies on existing** | `pages/booking/create` (add form fields), `pages/admin/bookings/detail` (display structured notes), `cloudfunctions/bookings` (no change needed — already stores `notes` as arbitrary data). |
| **Confidence** | **HIGH** — Simple form enhancement, no new APIs or components. |

**Structured fields:**
- **肤质** (skin_type): Selector — 干性 / 油性 / 混合性 / 敏感性 / 不确定
- **特殊需求** (special_needs): Textarea — 过敏史、皮肤问题等 (max 200 chars)
- **场合说明** (occasion): Textarea — 婚礼主题、配色偏好等 (max 200 chars)
- **留言** (notes): Textarea — 其他想说的 (keep existing, max 200 chars)

### 5. 简介增强 — Enhanced Artist Profile

| Aspect | Detail |
|--------|--------|
| **Why expected** | A professional makeup artist's profile needs more than name + bio. Clients want to know: where does the artist serve? How many years of experience? What styles does the artist specialize in? Currently the profile has `experience` as free text and `specialties` as a comma-separated list. Structured fields with visual tags look more professional. |
| **User behavior** | Client sees homepage → profile section shows: name, avatar, bio, years of experience badge, service area tag, style tags as pills/badges. Artist edits profile → sees structured fields with better UX. |
| **Complexity** | **Low** — Add fields to `artist_profile` collection, update edit page form, update display pages. Mostly UI work. |
| **Data model change** | `artist_profile` collection adds: `service_area` (string, e.g., "上海市区，可上门"), `experience_years` (number, e.g., 5), `style_tags` (string[], e.g., ["韩系", "森系", "复古"]). Keep existing `specialties` for backward compatibility (it maps to service categories). |
| **Dependencies on existing** | `pages/admin/profile/edit` (add form fields), `pages/index/index` (display new fields), `cloudfunctions/profile` (already handles arbitrary fields via `event.data`). |
| **Confidence** | **HIGH** — Simple data model extension, profile cloud function already accepts any fields. |

**New profile fields:**
| Field | Type | UI Component | Display |
|-------|------|-------------|---------|
| `service_area` | string | Text input | "📍 服务区域: 上海市区，可上门" |
| `experience_years` | number | Number input / Picker | "⭐ 5年经验" badge |
| `style_tags` | string[] | Tag input (comma-separated or chips) | Pill badges: `韩系` `森系` `复古` |

---

## Differentiators (v1.1)

Features that elevate the product above basic booking tools. Not strictly expected, but create significant competitive advantage.

### 6. 小程序码海报生成 (MGMT-03) — QR Code + Poster Generation

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Artists need offline marketing material — a poster with their best work + QR code that leads directly to the mini program. Currently artists screenshot their work and manually add QR codes. A one-tap poster generator is a unique feature that saves time and looks professional. |
| **User behavior** | Artist taps "生成海报" on a portfolio detail or profile page → Canvas renders a poster with: portfolio image, artist name, service info, mini program QR code → artist saves to album or shares directly. |
| **Complexity** | **High** — Requires: (1) Server-side QR code generation via `wxacode.getUnlimited` cloud API, (2) Client-side Canvas 2D rendering to compose poster image, (3) `wx.saveImageToPhotosAlbum` to save result. Multiple async steps with error handling. |
| **Data model change** | None — generates on-the-fly from existing data. Optionally cache generated QR code fileID in `artist_profile`. |
| **Dependencies on existing** | `cloudfunctions/works` or new cloud function for QR generation, `pages/works/detail` or new poster page, Canvas 2D API. |
| **Confidence** | **HIGH** — `wxacode.getUnlimited` is verified in official docs (unlimited codes, 5000/min rate limit). Canvas 2D API is standard in mini programs. |

**QR Code API (verified from official docs):**
- Use **接口 B: `wxacode.getUnlimited`** — unlimited codes, suitable for portfolio items
- Called from cloud function via `cloud.openapi.wxacode.getUnlimited({ scene: 'workId', page: 'pages/works/detail' })`
- Returns image Buffer → upload to cloud storage → get fileID → draw on Canvas

**Poster layout:**
```
┌────────────────────────┐
│  ┌──────────────────┐  │
│  │                  │  │
│  │   Portfolio      │  │
│  │   Image          │  │
│  │   (70% height)   │  │
│  │                  │  │
│  └──────────────────┘  │
│                         │
│  🧑 化妆师: 小美       │
│  ⭐ 5年经验 · 新娘妆   │
│                         │
│  ┌─────┐  长按识别     │
│  │ QR  │  查看更多作品  │
│  │Code │  & 在线预约    │
│  └─────┘               │
└────────────────────────┘
```

### 7. 客户评价系统 — Public Customer Review System

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Social proof is the strongest conversion driver for service bookings. A client who sees "⭐ 4.9 (23条评价)" is far more likely to book than one who sees nothing. Reviews create a virtuous cycle: completed booking → review → new clients see reviews → more bookings. |
| **User behavior** | Client completes a booking → receives prompt to rate → gives 1-5 star rating + optional text → review appears publicly on the artist's profile/service pages. New clients browse reviews before booking. Artist can see all reviews in admin. |
| **Complexity** | **Medium-High** — Requires: (1) New `reviews` collection, (2) Review submission flow (trigger after completed booking), (3) Review display on public pages, (4) Average rating calculation, (5) Content moderation consideration. |
| **Data model change** | New `reviews` collection: `{ _id, booking_id, user_openid, user_nickname, user_avatar, rating (1-5), content (text), service_id, service_name, created_at }`. Update `artist_profile` to include `avg_rating` and `review_count` (denormalized). |
| **Dependencies on existing** | `cloudfunctions/bookings` (detect completion → trigger review), new review cloud function, profile display pages, service list page. |
| **Confidence** | **HIGH** — Standard CRUD pattern with existing cloud infrastructure. |

**Review flow:**
1. Booking status → `completed` (artist marks as done)
2. Client opens booking history → sees "已完成" booking with "评价" button
3. Client taps "评价" → review form: star rating (required) + text (optional, max 200 chars)
4. Submit → save to `reviews` collection, update `artist_profile.review_count` and `avg_rating`
5. Public display: homepage shows overall rating, service pages show per-service reviews

**Anti-spam considerations:**
- One review per booking (enforced by `booking_id` unique constraint)
- Only completed bookings can be reviewed
- No anonymous reviews (WeChat identity tied)
- No editing/deleting reviews (simplicity for v1.1)
- Content length limit (200 chars) reduces abuse surface

### 8. 时间冲突检测增强 — Enhanced Time Conflict Detection

| Aspect | Detail |
|--------|--------|
| **Value proposition** | The current conflict detection already works at the server level (atomic check in `bookings` cloud function). However, the UX can be improved: (1) Show real-time availability on the date picker (already done), (2) Add visual conflict indicators on the calendar view, (3) Warn about adjacent bookings that may be tight (e.g., two 90-min slots back-to-back). |
| **Complexity** | **Low** — The core conflict detection is already built. Enhancement is primarily UX: better visual feedback in the calendar view, and showing "tight schedule" warnings for the artist. |
| **Dependencies on existing** | `cloudfunctions/bookings` (already checks conflicts), `pages/booking/create` (already shows available/unavailable slots). |
| **Confidence** | **HIGH** — Enhancement of existing working feature. |

**What's already done:**
- ✅ Server-side atomic conflict check (`getAvailableSlots` + `create` with duplicate check)
- ✅ Client-side visual distinction (available vs unavailable time slots)
- ✅ Error message on conflict ("该时段已被预约")

**Enhancement needed:**
- Calendar view shows booked slots visually (integrated with Feature #3 日历视图)
- Artist sees "紧凑日程" warning when 3+ bookings on same day
- Client booking form shows "仅剩X个时段" urgency indicator

---

## Anti-Features (v1.1)

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| **实时聊天/IM** | Overkill — WeChat already provides `open-type="contact"` for customer service messages. Building custom chat is a project unto itself. | Use existing `<button open-type="contact">` (already on works detail page). Artist communicates with clients via WeChat directly. |
| **评价回复** | Review reply system adds moderation complexity and is unnecessary for a single artist. The artist can address concerns via WeChat. | Show reviews as-is. Artist can contact the reviewer privately. |
| **多模板消息** | Supporting 5+ different subscription message templates creates UX fatigue (user sees popup for each). | Stick to 2 templates max: "预约状态变更" + "预约提醒". Subscribe once at booking time. |
| **照片滤镜/编辑** | Photo editing belongs in dedicated apps (美图, Snapseed). Not the job of a booking tool. | Upload pre-edited photos. Focus on display quality. |
| **付费推广/广告位** | This is a personal brand tool, not a marketplace. | Organic growth via sharing and poster generation (Feature #6). |
| **多语言支持** | Target audience is Chinese makeup artists and their clients. | Chinese-only is correct for this market. |

---

## Feature Dependencies (v1.1)

```
Existing v1.0 Foundation
├── Portfolio System (works collection, image storage)
│     ├── PORT-07: 前后对比滑块 ← modifies works detail page + edit page
│     │     └── Data: adds before_image field to works
│     │
│     └── MGMT-03: 海报生成 ← reads works data + generates QR code
│           └── Data: reads work image + artist profile
│           └── API: wxacode.getUnlimited (cloud function)
│           └── API: Canvas 2D (client-side rendering)
│
├── Booking System (bookings collection, time slots)
│     ├── BOOK-06/07: 订阅消息通知 ← triggers on booking status changes
│     │     └── Data: reads user openid from booking
│     │     └── API: subscribeMessage.send (already coded)
│     │     └── Config: WeChat admin template setup
│     │
│     ├── 日历视图 ← aggregates bookings by date for calendar display
│     │     └── Data: queries bookings collection by date range
│     │     └── UI: TDesign t-calendar component
│     │
│     ├── 时间冲突检测增强 ← improves existing conflict check UX
│     │     └── Data: reads same bookings collection
│     │     └── Depends on: 日历视图 (visual conflict indicators)
│     │
│     └── 预约备注增强 ← adds structured fields to booking form
│           └── Data: extends booking notes to structured object
│
├── Profile System (artist_profile collection)
│     └── 简介增强 ← adds service_area, experience_years, style_tags
│           └── Data: extends artist_profile fields
│           └── Display: homepage + profile edit
│
└── Review System (NEW: reviews collection)
      └── 客户评价系统 ← new collection, triggered by completed bookings
            └── Data: new reviews collection + profile avg_rating
            └── Depends on: booking completion flow
            └── Display: homepage, service pages
```

### Build Order Recommendation

| Order | Feature | Rationale |
|-------|---------|-----------|
| **1** | 简介增强 (Enhanced Profile) | Simplest change — add fields to existing form + display. No new collections or APIs. Quick win that improves first impression. |
| **2** | 预约备注增强 (Enhanced Booking Notes) | Low complexity — extend existing form fields. No new cloud functions needed. Can ship with profile enhancement in same phase. |
| **3** | 预约状态变更通知 (Subscription Messages) | Already 80% built — just needs template verification and edge case handling. Unblock the notification UX that's been deferred from v1.0. |
| **4** | 日历视图 (Calendar View) | Medium complexity — new UI mode in admin bookings. TDesign component handles most of the rendering. Needs date-range aggregation query. |
| **5** | 前后对比滑块 (Before/After Slider) | Medium complexity — new custom component + data model change to works. Independent of other features. High visual impact. |
| **6** | 客户评价系统 (Review System) | Medium-High complexity — new collection, new flows, new display pages. Depends on booking completion flow being solid. |
| **7** | 小程序码海报生成 (Poster/QR) | Highest complexity — Canvas rendering + QR code API + async orchestration. Best saved for last as it's a marketing feature, not core booking flow. |

---

## Feature Complexity Matrix

| Feature | New Collections | New Cloud Functions | New Pages | UI Components | Data Model Changes | Risk |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| 简介增强 | 0 | 0 | 0 | 0 | Minor (3 fields in artist_profile) | 🟢 Low |
| 预约备注增强 | 0 | 0 | 0 | 0 | Minor (extend booking notes) | 🟢 Low |
| 订阅消息通知 | 0 | 0 | 0 | 0 | None | 🟢 Low |
| 日历视图 | 0 | 0 (extend existing) | 0 | 1 (t-calendar) | None | 🟡 Med |
| 前后对比滑块 | 0 | 0 (extend existing) | 0 | 1 (custom slider) | Minor (1 field in works) | 🟡 Med |
| 客户评价系统 | 1 (reviews) | 1 (new) | 2 (review form + list) | 1 (star rating) | New collection + profile aggregation | 🟠 Med-High |
| 小程序码海报 | 0 | 1 (new for QR) | 1 (poster canvas) | 1 (canvas poster) | None (optional QR cache) | 🟠 Med-High |

---

## API & Platform Requirements Summary

| Feature | WeChat APIs Needed | Admin Panel Config | TDesign Components |
|---------|-------------------|-------------------|-------------------|
| 简介增强 | None | None | None |
| 预约备注增强 | None | None | None |
| 订阅消息通知 | `cloud.openapi.subscribeMessage.send` (already used) | ✅ Verify template approval in mp.weixin.qq.com | None |
| 日历视图 | None | None | `t-calendar` |
| 前后对比滑块 | `movable-area` + `movable-view` (built-in) | None | None (custom) |
| 客户评价系统 | None | None | Custom star rating (or use `t-rate`) |
| 小程序码海报 | `cloud.openapi.wxacode.getUnlimited`, `wx.saveImageToPhotosAlbum`, Canvas 2D | None | None (Canvas) |

---

## New Data Collections Required

### `reviews` Collection (for Feature #7)

```
reviews
├── _id: auto
├── _openid: string (auto from cloud — reviewer's openid)
├── booking_id: string (ref bookings._id, unique constraint)
├── user_nickname: string
├── user_avatar: string (cloud storage fileID or empty)
├── rating: number (1-5, required)
├── content: string (max 200 chars, optional)
├── service_id: string (ref services._id)
├── service_name: string (denormalized)
├── created_at: date (server date)
└── is_visible: boolean (default true — for moderation toggle)
```

### Modifications to Existing Collections

| Collection | Change |
|-----------|--------|
| `artist_profile` | Add: `service_area` (string), `experience_years` (number), `style_tags` (string[]), `avg_rating` (number, default 0), `review_count` (number, default 0) |
| `works` | Add: `before_image` (string, optional — cloud storage fileID) |
| `bookings` | Change: `notes` remains as generic text; add `skin_type` (string), `special_needs` (string), `occasion` (string) |

---

## Sources

- WeChat QR Code API: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/qr-code.html (HIGH confidence — official docs)
- WeChat Subscription Messages: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html (HIGH confidence — official docs)
- WeChat Cloud subscribeMessage.send: Context7 `/websites/developers_weixin_qq_miniprogram_dev_wxcloudservice_wxcloud` (HIGH confidence)
- TDesign Calendar component: Context7 `/tencent/tdesign-miniprogram` (HIGH confidence — verified API)
- WeChat Canvas 2D: https://developers.weixin.qq.com/miniprogram/dev/framework/ability/canvas.html (HIGH confidence)
- Existing codebase analysis: `cloudfunctions/bookings/index.js`, `pages/works/detail.js`, `pages/booking/create.js`, etc. (HIGH confidence — direct code review)
