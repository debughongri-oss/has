# Feature Landscape

**Domain:** 化妆师个人作品展示与预约微信小程序 (Makeup Artist Portfolio & Booking WeChat Mini Program)
**Researched:** 2026-04-17

## Table Stakes

Features users expect. Missing any of these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **微信登录** | Every WeChat Mini Program uses wx.login for identity. Users expect zero-friction entry. | Low | Use `wx.login()` → server `code2Session` → OpenID. No profile permission needed initially. Source: [WeChat Login Docs](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html) (HIGH confidence) |
| **化妆师个人简介** | First thing visitors see. Name, avatar, bio, years of experience, specialties. This IS the landing page. | Low | Static content managed by artist. Simple text + image layout. |
| **作品列表展示** | Core value prop — "看到好看的作品". Users scroll through a gallery grid. Must support image-heavy, visually-driven layout. | Med | Use cloud storage for images. Grid layout with lazy loading. `image` component with `mode="aspectFill"`. Pagination needed for performance. |
| **作品分类浏览** | Makeup types are fundamentally different (bridal vs daily). Users come looking for specific styles. Tab-based filtering is standard. | Low-Med | Categories: 新娘妆, 伴娘妆, 订婚妆, 日常妆, 创意妆. Artist-defined custom tags. |
| **作品详情页** | Users need to see quality up close. Multiple angles, before/after, detail shots. Long-press to save is expected WeChat behavior. | Med | Multi-image swiper/carousel. Support `show-menu-by-longpress` for native save behavior. Before/after layout is important for this domain. |
| **服务项目列表** | Users need to know what's offered and at what price before booking. Standard for any service booking app. | Low | Card-style list: service name, duration estimate, price range, brief description. Artist-managed. |
| **在线预约提交** | The entire point of the app — "从看到好看的作品到我要预约的路径最短". Select service → pick date/time → submit. | Med-High | Calendar date picker + time slot selection. Must show only available slots. Form with contact info. Requires availability logic. |
| **预约审核流程** | Artist must manually accept/reject/reschedule. No auto-confirm — artist needs to check calendar conflicts. | Med | Status flow: 待确认 → 已确认 / 已拒绝 / 已改期. Artist gets notification, acts on it. Simple but needs careful state management. |
| **预约通知提醒** | Both parties need to know status changes. WeChat 订阅消息 is the standard mechanism — users expect service notifications via WeChat. | Med | Use `wx.requestSubscribeMessage` for one-time subscription messages. Templates: 预约确认通知, 预约提醒, 预约状态变更. Source: [Subscribe Message Docs](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html) (HIGH confidence) |
| **作品分享** | WeChat ecosystem norm — users share interesting finds with friends. Organic growth channel for the artist. | Low | `onShareAppMessage` + `onShareTimeline`. Share portfolio item as card in WeChat chat. Default screenshot works for image-heavy pages. |
| **化妆师后台管理** | Artist needs to upload works, manage services, process bookings. In-app management per PROJECT.md decision — no separate admin panel. | High | Multiple management views: 作品管理(CRUD), 服务项目管理(CRUD), 预约管理(审核/状态变更). This is the heaviest feature set. |

## Differentiators

Features that set this product apart from a basic listing. Not expected by all users, but highly valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **前后对比展示** | Before/after is the killer visual for makeup artistry. A swipe/slider comparison dramatically demonstrates skill. Most competitors just show static images. | Med | Custom slider component. Two images overlaid with a draggable divider. High visual impact, moderate effort. TDesign `slider` component as base. |
| **可用时间日历** | Instead of blind booking and waiting for approval, show the artist's available slots upfront. Reduces back-and-forth, higher conversion. | Med | Artist sets available dates/times. Calendar view shows green (available) / gray (booked). Requires availability management UI for artist. TDesign `calendar` component supports date descriptions. |
| **作品关联服务** | When viewing a bridal makeup portfolio item, show "This look uses: 新娘妆服务 ¥xxx → 立即预约". Direct path from inspiration to action. | Low-Med | Link portfolio items to service types. "立即预约" button on portfolio detail. This is the "最短路径" from PROJECT.md core value. |
| **预约历史** | Users want to check their booking status without asking the artist. Self-service reduces communication burden. | Low | List of user's bookings with status badges. Filter by status. Simple query by OpenID. |
| **化妆师预约备注** | Artist can add internal notes to bookings (e.g., "客户过敏史", "需要提前准备xx"). Improves service quality on repeat visits. | Low | Text field on booking detail. Only visible to artist (admin view). |
| **客户留言** | Allow user to include a note when booking (e.g., "我的婚礼主题是森系"). Avoids the need for separate WeChat chat. | Low | Text field in booking form. Included in booking notification to artist. |
| **小程序码海报** | Artist can generate a shareable poster image with their QR code + a portfolio photo. For offline marketing (business cards, social media). | Med | Canvas API to compose image. `wx.getQRCode` or `wxacode.getUnlimited` for mini program code. Artist shares on 朋友圈, 小红书, etc. Source: [QR Code API](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/qr-code.html) (HIGH confidence) |

## Anti-Features

Features to explicitly NOT build. These are listed in PROJECT.md or determined by research to be poor fits.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **在线支付** | PROJECT.md explicitly excludes. Offline settlement is the norm for independent makeup artists — deposits via WeChat transfer, cash on service day. No payment integration complexity. | Show price info. Let user and artist settle payment offline. Booking = time reservation, not transaction. |
| **多化妆师平台** | PROJECT.md explicitly excludes. Platform mode requires search/discovery, reviews, matching algorithms, dispute resolution — an order of magnitude more complex. | Single artist personal brand. The entire UX is tailored to one person's style and services. |
| **视频展示** | PROJECT.md defers to post-v1. Video adds significant complexity: large storage, bandwidth costs, player component, upload UX. For v1, high-quality photos are sufficient to showcase skill. | Image-only portfolio. Focus on image quality and before/after comparisons. |
| **客户评价系统** | PROJECT.md excludes for v1. Reviews need moderation, spam prevention, and critical mass to be useful. For a single artist, personal reputation > anonymous reviews. | Word of mouth. Artist can screenshot WeChat compliments and add to portfolio as social proof. |
| **客户管理/CRM** | Out of v1 scope. CRM needs customer history, preferences, spend tracking, automated follow-up. Overkill for a single artist managing <200 clients. | Simple booking history. Artist can recognize repeat customers by WeChat avatar/name. |
| **AI试妆** | Tempting but premature. Requires face detection, AR rendering, model training. High uncertainty, massive complexity. Users don't expect this from an individual artist's app. | Focus on real portfolio photos. AI features can be explored post-v1 if validated. |
| **社交/社区功能** | Comments, likes, feeds — these belong in platforms (小红书, 抖音), not personal booking tools. Adds moderation burden. | Share to external social platforms. The mini program's job is showcase + booking, not community. |
| **直播功能** | Overkill for v1. Requires live streaming infrastructure, real-time interaction. Not what users expect from a booking tool. | Not applicable. |
| **地图/定位** | Makeup artists typically serve a known local area or travel to the client's location. GPS features add complexity without proportional value for a single-artist app. | Show service area in text (e.g., "上海市区，可上门"). Provide address as text. |

## Feature Dependencies

```
微信登录 (foundation) ──────────────────────────────────────────┐
  │                                                               │
  ├── 化妆师个人简介 (standalone)                                 │
  │                                                               │
  ├── 作品管理 (artist admin)                                     │
  │     ├── 作品列表展示 (reads managed data)                     │
  │     │     ├── 作品分类浏览 (depends on categories)            │
  │     │     └── 作品详情页 (drill-down from list)               │
  │     │           ├── 前后对比展示 (enhancement on detail)       │
  │     │           └── 作品关联服务 → 服务项目列表               │
  │     │                                                     │   │
  ├── 服务项目管理 (artist admin) ──────────────────────────┘   │
  │     └── 服务项目列表 (reads managed data)                     │
  │                                                               │
  ├── 在线预约 ───────────────────────────────────────────────────┤
  │     ├── depends on: 服务项目列表 (user selects service)       │
  │     ├── depends on: 可用时间日历 (shows available slots)      │
  │     ├── 客户留言 (part of booking form)                       │
  │     └── 预约历史 (reads booking data)                         │
  │                                                               │
  ├── 预约审核流程 (artist admin) ← processes bookings            │
  │     ├── depends on: 在线预约 (must exist first)               │
  │     ├── 化妆师预约备注 (artist-only field)                    │
  │     └── 预约通知提醒 (triggered by status changes)            │
  │                                                               │
  ├── 作品分享 (standalone, uses portfolio data)                  │
  └── 小程序码海报 (standalone, uses QR code API)                 │
```

### Critical Dependency Chain (Build Order)

1. **微信登录** → Must work first, everything depends on user identity
2. **化妆师个人简介** → Landing page, can build standalone
3. **作品管理 + 作品展示** → Core value, needs cloud storage
4. **服务项目管理 + 服务项目列表** → Needed before booking works
5. **在线预约** → Depends on services + availability
6. **预约审核 + 通知** → Depends on bookings existing
7. **分享 + 海报** → Enhancement, build last

## MVP Recommendation

### Must Ship (Phase 1)
1. **微信登录** — Foundation for everything
2. **化妆师个人简介** — Landing experience
3. **作品管理(artist) + 作品列表展示 + 作品详情页** — Core value: "看到好看的作品"
4. **服务项目管理(artist) + 服务项目列表** — Required for booking
5. **在线预约提交** — Core value: "我要预约"
6. **预约审核流程(artist)** — Artist must be able to process bookings

### Should Ship (Phase 1 polish)
7. **预约通知提醒** — Critical for UX, but can launch with manual refresh first
8. **作品分类浏览** — Nice to have, can start without categories
9. **作品分享** — Easy to implement, good growth lever

### Defer to Phase 2
10. **前后对比展示** — Great differentiator, but can ship v1 with standard image carousel
11. **可用时间日历** — Valuable, but blind booking + manual review works for v1
12. **预约历史** — Users can check status in booking list
13. **作品关联服务** — Nice conversion optimization
14. **客户留言 + 化妆师备注** — Quality of life improvements
15. **小程序码海报** — Marketing tool, not core booking flow

## WeChat Platform Capabilities Used

| Capability | API/Feature | Usage | Confidence |
|-----------|-------------|-------|------------|
| User Identity | `wx.login()`, `code2Session` | Silent login, OpenID for user tracking | HIGH — Official docs verified |
| Subscription Messages | `wx.requestSubscribeMessage`, `subscribeMessage.send` | Booking confirmations, reminders, status updates | HIGH — Official docs verified |
| Cloud Storage | `wx.cloud.uploadFile`, `cloud://` URLs | Portfolio image storage and delivery | HIGH — Official docs verified |
| Cloud Database | `db.collection().add/get/update/remove` | All data: portfolio, services, bookings, artist profile | HIGH — Official docs verified |
| Cloud Functions | `wx.cloud.callFunction` | Server-side logic: booking conflict detection, notification sending | HIGH — Official docs verified |
| Share | `onShareAppMessage`, `onShareTimeline` | Portfolio sharing to chat and 朋友圈 | HIGH — Official docs verified |
| Image Component | `<image>` with lazy loading | Portfolio grid, detail pages | HIGH — Official docs verified |
| QR Code | `wxacode.getUnlimited` | Generate mini program QR for posters | HIGH — Official docs verified |
| Canvas | `Canvas 2D API` | Generate share poster images | HIGH — Official docs verified |

## Competitive Landscape Notes

**What similar apps do (美业预约类小程序):**

Based on the beauty services mini program ecosystem in China:

- **美团/大众点评美业** — Platform model, multi-artist, heavy on reviews and pricing. NOT our competitor (we're personal brand).
- **有赞美业** — SaaS for beauty businesses. Overkill for individual artists. Costs money.
- **独立化妆师常见做法** — Most individual makeup artists currently use:
  - WeChat 朋友圈 for portfolio (no organization, hard to find)
  - 小红书 for wider reach (but can't book directly)
  - WeChat chat for booking (no calendar, easy to lose track)
  - Excel/纸质 for scheduling (error-prone)

**Our positioning:** A mini program that replaces the chaotic WeChat-based workflow with a clean, visual, bookable experience. The gap we fill is: **小红书 can showcase but can't book; 微信 chat can book but can't showcase**. We unify both.

**Confidence: MEDIUM** — Based on ecosystem knowledge and PROJECT.md context, not direct competitor teardown (single-artist makeup booking mini programs are niche, few public examples).

## Sources

- WeChat Login official docs: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html
- Subscribe Message official docs: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html
- Cloud Development (云开发) docs: https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/basis/getting-started
- TDesign MiniProgram components: https://github.com/tencent/tdesign-miniprogram
- QR Code API: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/qr-code.html
- Share/Forward docs: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/share.html
- PROJECT.md context and constraints
