# Architecture Patterns — v1.1 Feature Integration

**Domain:** WeChat Mini Program — Individual Makeup Artist Portfolio + Booking (v1.1 milestone)
**Researched:** 2026-04-19
**Focus:** How new features integrate with existing architecture; what's new vs modified

## Executive Summary

The v1.0 codebase uses a clean **cloud function action-dispatcher pattern** — each cloud function (`bookings`, `works`, `services`, `profile`, `login`) receives an `event.action` string and routes to a handler. The client has a parallel **service module pattern** (`services/bookings.js`, `services/works.js`, etc.) that wraps `callCloudFunction()` calls. This is well-structured for incremental feature additions: most v1.1 features map to **new actions in existing cloud functions** or **new fields in existing collections**, not entirely new infrastructure.

The only genuinely new infrastructure is:
1. A **`reviews`** collection + `reviews` cloud function (customer review system)
2. A **`qrcode`** cloud function (poster QR code generation)
3. A **`components/before-after-slider/`** custom component

Everything else extends existing code in-place.

## Current Architecture Recap

```
miniprogram/
├── app.js / app.json / app.wxss          ← Global config, theming (CSS custom properties)
├── pages/
│   ├── index/                             ← Home: artist intro + featured works
│   ├── works/ (list, detail)              ← Portfolio browsing
│   ├── services/ (list)                   ← Service catalog
│   ├── booking/ (create)                  ← Booking form (TabBar page)
│   ├── profile/ (index, history)          ← User profile + booking history
│   └── admin/                             ← Sub-package (artist management)
│       ├── works/ (list, edit)
│       ├── services/ (list, edit)
│       ├── bookings/ (list, detail)
│       └── profile/ (edit)
├── services/                              ← API layer (centralized)
│   ├── api.js                             ← callCloudFunction wrapper
│   ├── auth.js                            ← WeChat login + role detection
│   ├── bookings.js                        ← Booking operations
│   ├── works.js                           ← Work operations
│   ├── services.js                        ← Service operations
│   ├── profile.js                         ← Artist profile
│   └── storage.js                         ← Cloud storage upload helpers
├── components/
│   └── privacy/                           ← Privacy popup
└── utils/
    └── constants.js                       ← CLOUD_ENV, ARTIST_OPENID, statuses, etc.

cloudfunctions/
├── login/                                 ← User auth, role assignment
├── profile/                               ← Artist profile CRUD
├── works/                                 ← Works CRUD
├── services/                              ← Services CRUD
└── bookings/                              ← Booking lifecycle + notification
```

### Existing Data Model

| Collection | Key Fields | Notes |
|------------|-----------|-------|
| `users` | `_openid`, `role`, `nickname`, `avatar_url` | Single-doc-per-user |
| `artist_profile` | `name`, `avatar`, `bio`, `experience`, `specialties[]`, `contact_info` | Single document |
| `works` | `title`, `category`, `images[]`, `description`, `is_featured`, `sort_order` | — |
| `services` | `name`, `price`, `duration`, `category`, `is_active`, `sort_order` | — |
| `bookings` | `user_openid`, `user_info`, `service_id`, `service_name`, `booking_date`, `booking_time`, `notes`, `status`, `artist_notes`, `reject_reason` | Status: pending/accepted/rejected/completed/cancelled |
| `categories` | `name`, `icon`, `sort` | Lookup |

### Existing Patterns to Follow

1. **Action-dispatcher in cloud functions:** `switch (event.action) { case 'list': ... }`
2. **Service module wrappers:** Each domain has `services/X.js` that calls `callCloudFunction('X', { action: '...' })`
3. **Centralized error handling:** `services/api.js` shows toast on error, rejects promise
4. **Role detection:** `authService.isArtist()` checks openid against `ARTIST_OPENID` constant
5. **CSS custom properties theming:** All colors/spacing/radius/font sizes defined in `app.wxss`
6. **Sub-package for admin:** All admin pages under `pages/admin/` sub-package
7. **Denormalized reads:** `service_name` stored directly in bookings, not joined
8. **Profile caching:** `profile.js` caches `_artistProfile` in memory

---

## Feature-by-Feature Architecture

### Feature 1: Before/After Comparison Slider (PORT-07)

**Type:** Frontend-only component + minor backend extension

**What it does:** On works detail page, if a work has a `before_image`, show a draggable slider overlay comparing before/after.

#### New Files

| File | Purpose |
|------|---------|
| `components/before-after-slider/slider.js` | Custom component: two images layered, movable divider via touch |
| `components/before-after-slider/slider.wxml` | Template: `<image>` before, `<image>` after, `<view>` divider line + handle |
| `components/before-after-slider/slider.wxss` | Styles: absolute positioning, clip/overflow logic |
| `components/before-after-slider/slider.json` | Component declaration |

#### Modified Files

| File | Change |
|------|--------|
| `pages/works/detail.wxml` | Replace swiper with conditional: if `work.before_image`, show `<before-after-slider>`; else show existing swiper |
| `pages/works/detail.js` | No logic change needed — `work.before_image` presence drives template |
| `pages/works/detail.wxss` | Add `.ba-container` styles |
| `pages/works/detail.json` | Register `before-after-slider` component |
| `pages/admin/works/edit.js` | Add "上传对比照" button; upload to cloud storage, save `before_image` field |
| `pages/admin/works/edit.wxml` | Add before image upload section |
| `cloudfunctions/works/index.js` | No change needed — `create`/`update` actions already spread `...data`, so `before_image` passes through automatically |
| `services/works.js` | No change needed |

#### Database Changes

| Collection | Change |
|------------|--------|
| `works` | Add optional field `before_image: string` (cloud storage fileID) |

#### Component Design

```
┌──────────────────────────────────┐
│  Before Image (full width)       │
│  ┌──────────┬───────────┐       │
│  │  BEFORE  ║  AFTER    │       │
│  │          ║           │       │
│  │          ║◀  handle  │       │
│  │          ║           │       │
│  └──────────┴───────────┘       │
└──────────────────────────────────┘

Implementation:
- Container: position relative, overflow hidden
- Before image: full width, position absolute
- After image: full width, position absolute, clipped via width style based on divider position
- Divider: position absolute, left driven by touchmove X coordinate
- Touch: bindtouchstart, bindtouchmove on container → update divider position via setData
```

**Key implementation detail:** Use `clip` or dynamically set the `width` of the after image's container based on touch X position. The divider position (`sliderLeft`) is stored in component data and updated on `touchmove`.

#### Dependencies
None — standalone component, no cloud function calls.

---

### Feature 2: Subscription Message Notifications (BOOK-06/07)

**Type:** Backend enhancement to existing cloud function

**Current state:** `bookings/index.js` already has `sendNotify()` that sends subscription messages when status changes to `accepted`, `rejected`, or `completed`. Client already calls `wx.requestSubscribeMessage()` in `booking/create.js`.

**What's missing:**
1. **Notify the artist when a NEW booking is created** — this is the primary gap
2. A second template ID for artist-side notifications (current template is client-facing)
3. Better UX for subscription permission timing

#### Modified Files

| File | Change |
|------|--------|
| `cloudfunctions/bookings/index.js` | In `create` action: after creating booking, call `sendArtistNotify()` with booking details |
| `utils/constants.js` | Add `ARTIST_SUBSCRIBE_TEMPLATE_ID` for artist notification template |

#### Database Changes
None.

#### New Template Required

A **second subscription message template** must be registered in the WeChat admin console for **artist notifications**:

```
Template: 新预约通知
Fields:
- thing1: 服务项目 (e.g., "新娘妆")
- date2: 预约时间 (e.g., "2026-04-25 09:00")
- name3: 客户昵称
- thing4: 客户备注
```

**Important constraint:** Subscription messages require the user to have explicitly opted in via `wx.requestSubscribeMessage()`. The artist must trigger this opt-in somewhere — recommend adding it to the admin bookings list page when they first visit.

#### Flow

```
Client submits booking
  → bookings cloud function: create booking record
  → bookings cloud function: sendNotify() to CLIENT (confirmation)
  → bookings cloud function: sendArtistNotify() to ARTIST (new booking alert)
    ⚠️ This only works if artist previously agreed to receive this template

Artist accepts/rejects booking
  → bookings cloud function: updateStatus
  → bookings cloud function: sendNotify() to CLIENT (status change)
```

#### Dependencies
- WeChat admin console: register second template
- Artist must trigger `requestSubscribeMessage` at least once

---

### Feature 3: QR Code + Poster Generation (MGMT-03)

**Type:** New cloud function + new admin page + Canvas 2D

**What it does:** Generate a shareable poster image containing: artist avatar, name, QR code (mini program code), tagline. Saved to album or shared.

#### New Files

| File | Purpose |
|------|---------|
| `cloudfunctions/qrcode/index.js` | Generate unlimited mini program code via `cloud.openapi.wxacode.getUnlimited` |
| `cloudfunctions/qrcode/package.json` | Dependencies (wx-server-sdk) |
| `cloudfunctions/qrcode/config.json` | Cloud function config |
| `pages/admin/poster/index.js` | Poster generation page logic |
| `pages/admin/poster/index.wxml` | Canvas element + preview |
| `pages/admin/poster/index.wxss` | Poster styles |
| `pages/admin/poster/index.json` | Page config |
| `services/qrcode.js` | Client-side wrapper for qrcode cloud function |

#### Modified Files

| File | Change |
|------|--------|
| `app.json` | Add `poster/index` to admin sub-package pages |
| `pages/profile/index.js` | Add "生成分享海报" menu item for artist |
| `pages/profile/index.wxml` | Add menu entry |

#### Database Changes
None.

#### Cloud Function Design

```javascript
// cloudfunctions/qrcode/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  switch (event.action) {
    case 'getWxaCode': {
      // Generate unlimited mini program code
      const result = await cloud.openapi.wxacode.getUnlimited({
        scene: 'from_poster',  // Max 32 chars
        page: 'pages/index/index',
        width: 280,
        auto_color: false,
        line_color: { r: 156, g: 122, b: 90 },  // Match --accent color
        is_hyaline: true  // Transparent background for poster compositing
      })
      // Upload to cloud storage for caching
      const uploadResult = await cloud.uploadFile({
        cloudPath: `qrcode/wxacode_${Date.now()}.png`,
        fileContent: result.buffer
      })
      return { errCode: 0, data: { fileID: uploadResult.fileID } }
    }
  }
}
```

#### Poster Canvas Design

```
┌──────────────────────────────────┐
│                                   │
│        ┌──────────┐              │
│        │  Avatar   │              │
│        └──────────┘              │
│         Artist Name               │
│       "专注打造你的美"             │
│                                   │
│    ┌────────────────────┐        │
│    │                    │        │
│    │    QR Code         │        │
│    │   (小程序码)        │        │
│    │                    │        │
│    └────────────────────┘        │
│                                   │
│     长按识别 · 预约化妆服务        │
│                                   │
└──────────────────────────────────┘

Implementation using Canvas 2D:
1. onReady: get canvas context via SelectorQuery
2. Draw background (white/gradient)
3. Load and draw avatar (circular clip)
4. Draw artist name + tagline text
5. Load QR code image from cloud storage → drawImage
6. Draw footer text
7. wx.canvasToTempFilePath() → save to album via wx.saveImageToPhotosAlbum()
```

**Key implementation details:**
- Canvas 2D API (not legacy): use `SelectorQuery.select().fields({ node: true })`
- Handle DPR: `canvas.width = logicalWidth * dpr`
- Cloud storage fileIDs need `wx.cloud.getTempFileURL()` before Canvas can draw them
- `wx.saveImageToPhotosAlbum()` requires `scope.writePhotosAlbum` authorization

#### Dependencies
- `cloud.openapi.wxacode.getUnlimited` (server-side only)
- Canvas 2D component
- `wx.saveImageToPhotosAlbum` API

---

### Feature 4: Calendar View for Booking Management

**Type:** New admin page using TDesign Calendar

**What it does:** Artist sees bookings in a calendar layout instead of just a list. Tap a date to see bookings for that day.

#### New Files

| File | Purpose |
|------|---------|
| `pages/admin/bookings/calendar.js` | Calendar page: TDesign Calendar + booking dots |
| `pages/admin/bookings/calendar.wxml` | Calendar template |
| `pages/admin/bookings/calendar.wxss` | Calendar styles |
| `pages/admin/bookings/calendar.json` | Page config, register `t-calendar` |

#### Modified Files

| File | Change |
|------|--------|
| `app.json` | Add `bookings/calendar` to admin sub-package pages |
| `cloudfunctions/bookings/index.js` | Add `getCalendarData` action — query bookings for a date range (month) |
| `services/bookings.js` | Add `getCalendarData()` function |
| `pages/admin/bookings/list.js` | Add "日历视图" toggle button |
| `pages/admin/bookings/list.wxml` | Add toggle button UI |

#### Database Changes
None.

#### TDesign Calendar Integration

TDesign's `t-calendar` is already installed in the project (`miniprogram_npm/tdesign-miniprogram/calendar/`). It supports:

- `switch-mode="month"` — Month-by-month navigation
- `format` function — Custom day rendering (add dots/badges for dates with bookings)
- `bind:change` — Date selection event
- `min-date` / `max-date` — Limit selectable range

**Calendar data flow:**

```
Page loads → getCalendarData(currentMonth)
  → Cloud function: query bookings where booking_date is in current month
  → Return: { '2026-04-25': [booking1, booking2], '2026-04-28': [booking3] }
  → format function: add dot indicator on dates with bookings
  → User taps date → show booking list for that date below calendar
```

**New cloud function action:**

```javascript
case 'getCalendarData': {
  const { year, month } = event  // e.g., year=2026, month=4
  const startDate = `${year}-${String(month).padStart(2,'0')}-01`
  const endDate = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2,'0')}-01`

  const bookings = await db.collection('bookings')
    .where({
      booking_date: _.gte(startDate).and(_.lt(endDate)),
      status: _.in(['pending', 'accepted', 'completed'])
    })
    .orderBy('booking_date', 'asc')
    .orderBy('booking_time', 'asc')
    .limit(100)
    .get()

  // Group by date
  const grouped = {}
  bookings.data.forEach(b => {
    if (!grouped[b.booking_date]) grouped[b.booking_date] = []
    grouped[b.booking_date].push(b)
  })

  return { errCode: 0, data: grouped }
}
```

#### Dependencies
- TDesign `t-calendar` component (already installed)

---

### Feature 5: Time Conflict Detection Enhancement

**Type:** Minor backend enhancement

**Current state:** `bookings/index.js` `create` action already checks for exact time slot conflicts:

```javascript
const existing = await db.collection('bookings')
  .where({
    booking_date,
    booking_time,
    status: _.in(['pending', 'accepted'])
  })
  .get()
```

**What's missing:** Services have a `duration` field (minutes). If a service takes 120 minutes and occupies two 90-minute slots, the current check won't catch overlaps with adjacent bookings.

#### Modified Files

| File | Change |
|------|--------|
| `cloudfunctions/bookings/index.js` | In `create` action: fetch service duration, calculate time range, check for ANY overlap (not just exact slot match) |
| `cloudfunctions/bookings/index.js` | In `getAvailableSlots` action: same duration-aware logic |

#### Database Changes
None — `services.duration` already exists.

#### Enhanced Conflict Logic

```javascript
// Convert time slot to minutes since midnight
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

// In create action:
const service = await db.collection('services').doc(service_id).get()
const duration = service.data.duration || 90
const bookingStart = timeToMinutes(booking_time)
const bookingEnd = bookingStart + duration

const existingBookings = await db.collection('bookings')
  .where({
    booking_date,
    status: _.in(['pending', 'accepted'])
  })
  .get()

const hasConflict = existingBookings.data.some(b => {
  const existingStart = timeToMinutes(b.booking_time)
  const existingService = await db.collection('services').doc(b.service_id).get()
  const existingDuration = existingService.data.duration || 90
  const existingEnd = existingStart + existingDuration
  return bookingStart < existingEnd && bookingEnd > existingStart
})
```

**Optimization note:** For a single-artist app, there will rarely be more than 5-10 bookings per day. The in-memory overlap check is fine — no need for database-level range queries.

#### Dependencies
None.

---

### Feature 6: Enhanced Booking Notes

**Type:** Frontend form extension + minor backend change

**What it does:** Booking form gains structured fields: skin type (dropdown), special needs (textarea), preferred style reference (optional).

#### Modified Files

| File | Change |
|------|--------|
| `pages/booking/create.js` | Add `skin_type`, `special_needs` to data and submit payload |
| `pages/booking/create.wxml` | Add skin type picker + special needs textarea |
| `pages/booking/create.wxss` | Style new fields |
| `cloudfunctions/bookings/index.js` | In `create` action: accept new fields |
| `pages/admin/bookings/detail.js` | Display new fields |
| `pages/admin/bookings/detail.wxml` | Render skin type, special needs |
| `services/bookings.js` | No change — `createBooking` already spreads data |

#### Database Changes

| Collection | Change |
|------------|--------|
| `bookings` | Add optional fields: `skin_type: string` (e.g., "干性", "油性", "混合性", "敏感肌"), `special_needs: string` |

#### Skin Type Options

```javascript
const SKIN_TYPES = [
  { key: '', label: '请选择（可选）' },
  { key: 'dry', label: '干性肌肤' },
  { key: 'oily', label: '油性肌肤' },
  { key: 'combination', label: '混合性肌肤' },
  { key: 'sensitive', label: '敏感肌肤' },
  { key: 'normal', label: '中性肌肤' }
]
```

#### Dependencies
None.

---

### Feature 7: Customer Review System

**Type:** New collection + new cloud function + new pages

**What it does:** After a booking is completed, the client can leave a rating (1-5 stars) and text review. Reviews are public and displayed on the artist's homepage and service pages.

#### New Files

| File | Purpose |
|------|---------|
| `cloudfunctions/reviews/index.js` | Review CRUD: create, list, getStats |
| `cloudfunctions/reviews/package.json` | Dependencies |
| `cloudfunctions/reviews/config.json` | Config |
| `pages/review/create.js` | Review form page (rating + text) |
| `pages/review/create.wxml` | Review form template |
| `pages/review/create.wxss` | Review form styles |
| `pages/review/create.json` | Page config, register `t-rate` |
| `services/reviews.js` | Client-side review API wrapper |

#### Modified Files

| File | Change |
|------|--------|
| `app.json` | Add `pages/review/create` to main pages array (not admin sub-package) |
| `pages/profile/history.js` | Add "评价" button for completed bookings |
| `pages/profile/history.wxml` | Render review button + existing review indicator |
| `pages/profile/history.wxss` | Style review button |
| `pages/index/index.js` | Load review stats (average rating, count) |
| `pages/index/index.wxml` | Display rating stars + count on homepage |
| `pages/index/index.wxss` | Rating display styles |
| `cloudfunctions/bookings/index.js` | In `updateStatus` (completed): optionally trigger review reminder notification |

#### Database Changes

| Collection | Change |
|------------|--------|
| **`reviews`** (NEW) | See schema below |

**`reviews` collection schema:**

```
reviews
├── _id: auto
├── booking_id: string (ref bookings._id)
├── user_openid: string
├── user_nickname: string (denormalized from users)
├── user_avatar: string (denormalized)
├── service_id: string (ref services._id)
├── service_name: string (denormalized)
├── rating: number (1-5)
├── content: string (max 200 chars)
├── created_at: date
└── updated_at: date
```

**Indexes:** `booking_id` (unique — one review per booking), `user_openid`, `service_id`

#### Cloud Function Design

```javascript
// cloudfunctions/reviews/index.js
exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID

  switch (event.action) {
    case 'create': {
      // Validate: booking exists, belongs to user, status is 'completed', not already reviewed
      const booking = await db.collection('bookings').doc(event.booking_id).get()
      if (booking.data.user_openid !== openid) return { errCode: -1, errMsg: '无权操作' }
      if (booking.data.status !== 'completed') return { errCode: -1, errMsg: '只能评价已完成的预约' }

      // Check duplicate
      const existing = await db.collection('reviews')
        .where({ booking_id: event.booking_id })
        .limit(1).get()
      if (existing.data.length > 0) return { errCode: -1, errMsg: '已评价过' }

      const review = {
        booking_id: event.booking_id,
        user_openid: openid,
        user_nickname: event.user_nickname || '',
        user_avatar: event.user_avatar || '',
        service_id: booking.data.service_id,
        service_name: booking.data.service_name,
        rating: event.rating,
        content: (event.content || '').slice(0, 200),
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      }
      await db.collection('reviews').add({ data: review })
      return { errCode: 0, data: { success: true } }
    }

    case 'list': {
      // Public: list all reviews, ordered by newest first
      const { page = 1, pageSize = 10 } = event
      const total = (await db.collection('reviews').count()).total
      const data = await db.collection('reviews')
        .orderBy('created_at', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
      return { errCode: 0, data: { list: data.data, total, page, pageSize, hasMore: page * pageSize < total } }
    }

    case 'getStats': {
      // Aggregate: average rating + total count
      // Cloud database doesn't have avg() — use list + client calc, or store running stats
      const reviews = await db.collection('reviews')
        .limit(1000)
        .get()
      const total = reviews.data.length
      const avg = total > 0
        ? (reviews.data.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
        : '5.0'
      return { errCode: 0, data: { average: avg, total } }
    }

    case 'getByBooking': {
      // Check if user already reviewed a booking
      const review = await db.collection('reviews')
        .where({ booking_id: event.booking_id, user_openid: openid })
        .limit(1).get()
      return { errCode: 0, data: review.data[0] || null }
    }
  }
}
```

**Review stats optimization:** For a single-artist app with <1000 reviews, the in-memory `getStats` aggregation is fine. If it grows, store running `review_count` and `average_rating` in `artist_profile` and update on each new review.

#### Review Flow

```
Booking completed (status → 'completed')
  → Booking history page shows "评价" button
  → User taps → navigateTo /pages/review/create?booking_id=xxx
  → Review form: t-rate (1-5 stars) + textarea
  → Submit → reviews cloud function (validate + create)
  → Back to history, button changes to "已评价"
```

#### TDesign Components Used
- `t-rate` — Star rating (already installed in `miniprogram_npm/tdesign-miniprogram/rate/`)

#### Dependencies
- `t-rate` component (already available)
- Booking must be in `completed` status

---

### Feature 8: Enhanced Artist Profile

**Type:** Extend existing collection + update admin edit page + update homepage

**What it does:** Add service area, years of experience, and style tags to artist profile.

#### Modified Files

| File | Change |
|------|--------|
| `cloudfunctions/profile/index.js` | No change needed — `update` action already spreads `event.data`, new fields pass through |
| `cloudfunctions/profile/index.js` | Update `getDefaultProfile()` to include new fields with defaults |
| `pages/admin/profile/edit.js` | Add `service_area`, `experience_years`, `style_tags` fields to data and save logic |
| `pages/admin/profile/edit.wxml` | Add input fields for new profile attributes |
| `pages/admin/profile/edit.wxss` | Style new fields |
| `pages/index/index.js` | Load and pass new fields to template |
| `pages/index/index.wxml` | Display service area, experience years, style tags |
| `pages/index/index.wxss` | Style new profile sections |
| `services/profile.js` | No change needed |

#### Database Changes

| Collection | Change |
|------------|--------|
| `artist_profile` | Add optional fields: `service_area: string` (e.g., "上海市浦东新区"), `experience_years: number` (e.g., 5), `style_tags: string[]` (e.g., ["韩系", "自然", "轻奢"]) |

**Updated `getDefaultProfile()`:**

```javascript
function getDefaultProfile() {
  return {
    name: '化妆师',
    avatar: '',
    bio: '一位热爱美的化妆师，专注打造属于你的独特妆容。',
    experience: '5年从业经验',
    experience_years: 5,       // NEW
    service_area: '',           // NEW
    style_tags: [],             // NEW
    specialties: ['新娘妆', '日常妆', '订婚妆'],
    contact_info: { wechat: '', phone: '', location: '' },
    created_at: new Date(),
    updated_at: new Date()
  }
}
```

#### Homepage Display Design

```
┌──────────────────────────────────┐
│  [Avatar]  Artist Name            │
│            ⭐ 4.9 (23条评价)       │ ← From reviews.getStats
│            📍 上海市浦东新区        │ ← service_area
│            🕐 5年从业经验          │ ← experience_years
│                                     │
│  Style Tags:                       │
│  [韩系] [自然] [轻奢] [日常]       │ ← style_tags (TDesign t-tag)
│                                     │
│  "专注打造属于你的独特妆容"         │ ← bio
└──────────────────────────────────┘
```

#### Dependencies
None.

---

## Complete Change Map

### New Files Summary

```
cloudfunctions/
├── qrcode/                              ← NEW: QR code generation
│   ├── index.js
│   ├── package.json
│   └── config.json
└── reviews/                             ← NEW: Review system
    ├── index.js
    ├── package.json
    └── config.json

miniprogram/
├── components/
│   └── before-after-slider/             ← NEW: Comparison slider component
│       ├── slider.js
│       ├── slider.wxml
│       ├── slider.wxss
│       └── slider.json
├── services/
│   ├── qrcode.js                        ← NEW: QR code API wrapper
│   └── reviews.js                       ← NEW: Reviews API wrapper
└── pages/
    ├── review/
    │   └── create/                      ← NEW: Review form page
    │       ├── index.js
    │       ├── index.wxml
    │       ├── index.wxss
    │       └── index.json
    └── admin/
        ├── poster/
        │   └── index/                   ← NEW: Poster generation page
        │       ├── index.js
        │       ├── index.wxml
        │       ├── index.wxss
        │       └── index.json
        └── bookings/
            └── calendar/                ← NEW: Calendar view page
                ├── index.js
                ├── index.wxml
                ├── index.wxss
                └── index.json
```

### Modified Files Summary

| File | Features That Modify It |
|------|------------------------|
| `app.json` | Calendar view, poster page, review page (add to pages/subPackages) |
| `utils/constants.js` | Subscription messages (add artist template ID), skin types |
| `cloudfunctions/bookings/index.js` | Subscription messages (artist notify), time conflict enhancement, calendar data, enhanced notes |
| `cloudfunctions/profile/index.js` | Enhanced profile (update defaults) |
| `pages/works/detail.*` | Before/after slider |
| `pages/admin/works/edit.*` | Before image upload |
| `pages/booking/create.*` | Enhanced notes (skin type, special needs) |
| `pages/admin/bookings/detail.*` | Display enhanced notes |
| `pages/admin/bookings/list.*` | Calendar view toggle |
| `pages/profile/index.*` | Poster generation menu entry |
| `pages/profile/history.*` | Review button for completed bookings |
| `pages/index/index.*` | Enhanced profile display, review stats |

### Database Changes Summary

| Collection | Change Type | New Fields |
|------------|------------|------------|
| `works` | Extend | `before_image: string` |
| `bookings` | Extend | `skin_type: string`, `special_needs: string` |
| `artist_profile` | Extend | `service_area: string`, `experience_years: number`, `style_tags: string[]` |
| **`reviews`** | **NEW** | `_id`, `booking_id`, `user_openid`, `user_nickname`, `user_avatar`, `service_id`, `service_name`, `rating`, `content`, `created_at`, `updated_at` |

---

## Recommended Build Order

Dependencies between features determine the optimal build sequence:

```
Phase A: Enhanced Profile (no deps, simple, high visibility)
├── Extend artist_profile fields
├── Update admin profile edit
└── Update homepage display
     ↓
Phase B: Enhanced Booking Notes (no deps, simple)
├── Add skin_type, special_needs to booking form
├── Update cloud function
└── Update admin booking detail
     ↓
Phase C: Before/After Slider (no deps, standalone component)
├── Create custom component
├── Modify works detail page
└── Update admin works edit (before_image upload)
     ↓
Phase D: Subscription Messages (deps: WeChat admin template config)
├── Register artist notification template in WeChat admin
├── Add artist notify to bookings create action
└── Add requestSubscribeMessage trigger for artist
     ↓
Phase E: Calendar View (deps: existing bookings data)
├── Create admin calendar page
├── Add getCalendarData cloud function action
└── Add calendar toggle in bookings list
     ↓
Phase F: Review System (deps: booking completion flow)
├── Create reviews collection + cloud function
├── Create review form page
├── Update history page (review button)
├── Update homepage (rating display)
└── Update profile page (review stats)
     ↓
Phase G: QR Code + Poster (standalone but most complex)
├── Create qrcode cloud function
├── Create poster generation page (Canvas 2D)
└── Add poster menu entry
```

**Ordering rationale:**

1. **Profile + Notes first** — simplest changes, no new infrastructure, immediate value
2. **Slider next** — standalone component, zero coupling to other features
3. **Subscription messages** — requires external WeChat admin config (potential blocker), start early
4. **Calendar** — builds on existing bookings infrastructure, medium complexity
5. **Reviews** — new infrastructure (collection + cloud function), depends on booking flow being stable
6. **Poster last** — most technically complex (Canvas 2D + cloud function + image compositing), lowest urgency

---

## TDesign Components Already Available

These are already installed in `miniprogram_npm/tdesign-miniprogram/` and ready to use:

| Component | Usage in v1.1 |
|-----------|--------------|
| `t-calendar` | Calendar view for admin bookings |
| `t-rate` | Star rating for reviews |
| `t-tag` | Style tags on artist profile |
| `t-popup` | Before/after mode toggle, review form |
| `t-input` / `t-textarea` | Enhanced booking notes, review text |
| `t-picker` | Skin type selection in booking form |
| `t-image-viewer` | Already used, no change needed |
| `t-empty` | Already used, no change needed |
| `t-loading` | Already used, no change needed |
| `t-dialog` | Already used, no change needed |

---

## Scalability Considerations

| Concern | Current (v1.1) | At 500+ reviews | At 1000+ bookings |
|---------|----------------|-----------------|-------------------|
| Review stats aggregation | In-memory `getStats` (1000 limit) | Store running avg in `artist_profile` | Move to scheduled cloud function |
| Calendar query | Per-month query, <50 docs | Fine — indexed by `booking_date` | Fine |
| Poster QR code caching | Generate fresh each time | Cache fileID in cloud storage with TTL | Cache by scene param |
| Before/after images | +1 image per work | Cloud storage handles | Ensure compression before upload |

**This is still a single-artist app.** Performance ceiling is far away. Keep it simple.

---

## Risks & Open Questions

| Risk | Severity | Mitigation |
|------|----------|------------|
| Subscription message template rejection by WeChat review | Medium | Submit template early, follow WeChat's naming/content rules strictly |
| Canvas 2D poster rendering differs across devices | Medium | Test on iOS + Android; use fixed canvas dimensions, not responsive |
| `wx.saveImageToPhotosAlbum` permission denied | Low | Show helpful message, use `wx.openSetting()` to guide user |
| QR code cloud function `getUnlimited` called too frequently | Low | Cache QR code in cloud storage, regenerate only on artist profile change |
| Review spam/abuse | Low | One review per booking, verified by booking_id unique constraint |
| `getStats` aggregation over 1000 review limit | Low | Store running average in `artist_profile` doc |

---

## Sources

- WeChat `wxacode.getUnlimited` API: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode (HIGH confidence)
- WeChat Canvas 2D API: https://developers.weixin.qq.com/miniprogram/dev/framework/ability/canvas.html (HIGH confidence)
- WeChat `wx.canvasToTempFilePath`: https://developers.weixin.qq.com/miniprogram/dev/api/canvas/wx.canvasToTempFilePath.html (HIGH confidence)
- WeChat Subscription Message API: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-message-management/subscribe-message/sendMessage (HIGH confidence)
- TDesign Calendar component: https://github.com/Tencent/tdesign-miniprogram/blob/develop/packages/components/calendar/README.md (HIGH confidence)
- TDesign Rate component: Available in `miniprogram_npm/tdesign-miniprogram/rate/` (verified in project)
- Existing codebase analysis: All cloud functions, pages, services read directly (HIGH confidence)
