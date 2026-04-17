# Project Research Summary

**Project:** 化妆师个人作品展示与预约小程序 (Makeup Artist Portfolio & Booking WeChat Mini Program)
**Domain:** WeChat Mini Program — Single-artist beauty service showcase & appointment booking
**Researched:** 2026-04-17
**Confidence:** HIGH

## Executive Summary

This is a **single-artist WeChat Mini Program** that replaces the chaotic WeChat-based workflow (朋友圈 for portfolio, 微信 chat for booking, Excel for scheduling) with a unified visual showcase and booking experience. The competitive gap is clear: 小红书 can showcase but can't book; 微信 chat can book but can't showcase. This product unifies both.

The recommended approach is **WeChat native framework (WXML/WXSS/JS) + Cloud Development (CloudBase) + TDesign MiniProgram UI**, deploying with zero monthly cost within free tier limits. This is a frontend-heavy app with a cloud backend — no traditional server, no domain filing (备案), no ops. The architecture splits cleanly into client-facing pages (browse + book) and artist admin pages (manage works/services/bookings), sharing reusable components. Role detection is simple: compare the user's OpenID against the stored artist OpenID.

**Key risks cluster around WeChat platform constraints** that are non-obvious to developers from web/mobile backgrounds: privacy authorization gating all media APIs (审核 rejection if missed), one-shot subscription messages (not push notifications), 2MB main package limit, and concurrent booking race conditions. All of these have well-documented mitigations. The highest-uncertainty item is the booking concurrency solution — cloud database transaction support needs verification during implementation.

## Key Findings

### Recommended Stack

The stack is decisively **WeChat-native** — no cross-platform frameworks (Taro, uni-app). The project targets a single platform (WeChat), and adding a compilation layer provides zero benefit while increasing complexity. All recommendations are HIGH confidence, sourced from official documentation and npm registry verification.

**Core technologies:**
- **WeChat Mini Program Native Framework** (基础库 ≥ 3.4) — UI layer. Zero abstraction overhead, smallest package size, best 审核通过率, deepest cloud SDK integration.
- **WeChat Cloud Development (CloudBase)** — Backend-as-a-Service. Zero ops, built-in database (MongoDB-like), cloud storage with CDN, cloud functions. Free tier covers the entire project.
- **TDesign MiniProgram 1.13.2** — UI component library. Tencent official, provides Upload, Calendar, Swiper, ImageViewer — every key component this project needs.
- **wx-server-sdk 3.0.4** — Cloud function SDK for server-side operations.
- **TypeScript** (via WeChat DevTools built-in support) — Recommended for type safety on data models; optional but valuable.

> **Note:** ARCHITECTURE.md code examples reference Taro/React syntax. The stack recommendation (STACK.md) is native framework — code examples should be adapted to WXML/WXSS/JS patterns. The architectural patterns (centralized API layer, role-based views, denormalized reads) remain valid regardless of syntax.

### Expected Features

**Must have (table stakes) — Phase 1:**
- 微信登录 — Foundation for all user identity; `wx.login()` silent flow
- 化妆师个人简介 — Landing page; name, avatar, bio, experience
- 作品管理(artist) + 作品列表展示 + 作品详情页 — Core value: "看到好看的作品"
- 服务项目管理(artist) + 服务项目列表 — Required before booking works
- 在线预约提交 — Core value: "我要预约"; service → date → time → submit
- 预约审核流程(artist) — Accept/reject/reschedule; status state machine

**Should have (competitive) — Phase 1 polish:**
- 预约通知提醒 — Subscription messages for booking status changes
- 作品分类浏览 — Tab-based filtering by makeup type
- 作品分享 — `onShareAppMessage` + `onShareTimeline`

**Defer (Phase 2+):**
- 前后对比展示 — Before/after slider; great differentiator but standard carousel works for v1
- 可用时间日历 — Show available slots upfront; blind booking + manual review works for v1
- 预约历史 — Users check status via booking list
- 小程序码海报 — Marketing tool, not core booking flow
- 作品关联服务 — Conversion optimization; nice-to-have link from portfolio to booking
- 客户留言 + 化妆师备注 — Quality of life improvements

**Explicitly excluded:** 在线支付, 多化妆师平台, 视频展示, 客户评价, CRM, AI试妆, 社交功能, 直播, 地图定位

### Architecture Approach

**Frontend-heavy Mini Program with cloud backend.** Two-layer runtime: View Layer (WXML/WXSS) and Logic Layer (JS), communicating via `setData()`. No DOM access from logic layer. All backend calls route through a centralized API layer (`services/` modules) to cloud functions, which operate on cloud database and cloud storage.

**Major components:**
1. **Client Pages** (Home, Portfolio, Services, Booking, Profile) — Display-only for customers; browse works, view services, create bookings
2. **Artist Admin Pages** (WorkMgr, SvcMgr, BookingMgr, Profile) — CRUD for works/services/bookings; role-gated by OpenID comparison
3. **Shared Components** (WorkCard, ServiceCard, BookingCard, ImageGallery, DatePicker, TimeSlots, EmptyState, UploadImage) — Reusable across client and admin
4. **API Layer** (services/api, auth, works, services, bookings, storage, notification) — Centralized request handling, auth, error management
5. **Cloud Backend** (Cloud Functions + Cloud Database + Cloud Storage) — All business logic, data persistence, file storage

**Key architecture decisions:**
- Role detection via OpenID comparison (not separate login) — artist's OpenID stored as config
- Denormalized reads (service_name in booking records) — cloud DB has no joins; optimize for reads
- Images via cloud storage (fileID references in DB) — never base64 in database
- Notifications via WeChat subscription messages — no custom push service needed
- Sub-package structure from day one — admin pages in separate sub-package to stay under 2MB

### Critical Pitfalls

1. **Privacy authorization required before media APIs** (审核必拒) — `wx.getPrivacySetting` + `<button open-type="agreePrivacyAuthorization">` must be implemented before any `wx.chooseMedia` call. No exceptions.
2. **Subscription messages are one-shot** — Each `requestSubscribeMessage` grants one notification. Must prompt at each booking interaction point. Not push notifications.
3. **Image compression before upload** — Raw camera photos are 5-10MB. Must `wx.compressImage()` before upload. Generate thumbnails for list views. Queue uploads to stay under 10 concurrent request limit.
4. **2MB main package limit** — Plan sub-packages from day one. Admin pages in separate sub-package. No static images in package — all via cloud storage.
5. **Booking concurrency race condition** — Two clients can book the same slot. Use cloud function + database transaction for check-and-write atomicity.
6. **Admin pages need OpenID-based auth** — Not just UI hiding. Cloud functions must verify identity server-side. Non-artist users hitting admin URLs → redirect to home.

## Implications for Roadmap

Based on combined research, the recommended phase structure follows the feature dependency chain identified in FEATURES.md, with pitfall mitigations integrated into the earliest possible phases:

### Phase 1: Foundation & Shell
**Rationale:** Everything depends on user identity, cloud backend, and project structure. Must establish patterns (API layer, privacy flow, sub-packages) before building features.
**Delivers:** Runnable app shell with login, privacy authorization, cloud environment, tabBar navigation, empty states.
**Addresses:** 微信登录, 化妆师个人简介
**Avoids:** Privacy authorization rejection (P1), package size blowout (P4), domain config issues (P6), deprecated APIs (P8), page stack overflow (P16)
**Key tasks:** Cloud environment setup, privacy popup component, auth service with role detection, sub-package configuration, shared styles and constants.

### Phase 2: Portfolio System
**Rationale:** Portfolio is the core value prop — "看到好看的作品". This is what makes the app worth opening. Must work before booking makes sense (portfolio-to-booking is the conversion path).
**Delivers:** Full portfolio display (list + detail + categories) and artist work management (upload/edit/delete with image handling).
**Addresses:** 作品列表展示, 作品分类浏览, 作品详情页, 作品管理(artist)
**Avoids:** Image compression failure (P3), setData performance disaster (P7), 20-record query limit (P9), image loading white screen (P11), cache staleness (P15)
**Key tasks:** Work CRUD cloud functions, image upload pipeline (compress → upload → store fileID), paginated work list with lazy loading, image gallery component, category filter, skeleton screens and error states.

### Phase 3: Service & Booking System
**Rationale:** Booking is the monetization path — "我要预约". Depends on services existing (user selects a service to book). This is the most complex phase with concurrency and notification challenges.
**Delivers:** Service catalog management, booking creation flow (select service → pick date → pick time → submit), booking status management, subscription message notifications.
**Addresses:** 服务项目管理(artist), 服务项目列表, 在线预约提交, 预约审核流程(artist), 预约通知提醒
**Avoids:** Subscription message misunderstanding (P2), booking concurrency (P5), time slot design issues (P10), admin auth bypass (P12)
**Key tasks:** Service CRUD cloud functions, booking creation with transaction-based conflict prevention, booking status state machine (pending → accepted/rejected/rescheduled → completed/cancelled), subscription message template setup and trigger logic, artist booking management page with status actions.

### Phase 4: Polish & Growth
**Rationale:** Core functionality complete. Now optimize for growth (sharing) and user experience refinements.
**Delivers:** Share functionality, before/after comparison, available time calendar, booking history, QR code poster, version update handling.
**Addresses:** 作品分享, 前后对比展示, 可用时间日历, 预约历史, 小程序码海报, 客户留言, 化妆师备注, 作品关联服务
**Avoids:** Unconfigured sharing (P13), version update gaps (P14)
**Key tasks:** onShareAppMessage/onShareTimeline configuration, before/after slider component, availability calendar with artist-set slots, user booking history page, Canvas-based poster generation, update manager.

### Phase Ordering Rationale

- **Foundation → Portfolio → Booking** follows the critical dependency chain: identity → content → transaction. You can't book without services; you can't show content without storage.
- **Admin pages built alongside their client counterparts** (works management with portfolio display, booking management with booking submission) ensures end-to-end testing at each phase.
- **Notifications in Phase 3, not Phase 4** — subscription messages are integral to the booking UX, not a nice-to-have. The one-shot nature means the subscription prompt must be designed into the booking flow from the start.
- **Package size monitoring starts in Phase 1** — sub-package structure is set up during foundation, not retrofitted later.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Booking):** Cloud database transaction API — needs verification of current support and syntax; subscription message template IDs need WeChat backend configuration (manual step).
- **Phase 4 (Growth):** Canvas poster generation — WeChat Canvas 2D API has platform-specific behaviors; QR code API (`wxacode.getUnlimited`) requires server-side invocation.

Phases with well-documented patterns (skip research-phase):
- **Phase 1 (Foundation):** WeChat login, cloud setup, privacy authorization — extensively documented in official docs.
- **Phase 2 (Portfolio):** Image upload, cloud storage, paginated list — standard patterns, TDesign provides ready-made components.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified against official docs and npm registry. Native framework + Cloud Development is the consensus recommendation for single-platform WeChat projects. |
| Features | HIGH | Feature list directly validated against WeChat platform capabilities. Dependency chain is clear. Anti-features well-defined by PROJECT.md constraints. |
| Architecture | HIGH | Component boundaries and data flow follow standard WeChat Mini Program patterns. Page map aligns with TabBar + navigateTo conventions. Data model is straightforward for a single-artist app. |
| Pitfalls | HIGH | 16 pitfalls sourced from official WeChat documentation with specific prevention strategies. Audit checklist derived from published rejection reasons. Medium confidence only on booking transaction solution (cloud DB transaction API needs runtime verification). |

**Overall confidence:** HIGH

### Gaps to Address

- **Cloud database transaction API:** The booking concurrency solution assumes transaction support in cloud database. Needs verification during Phase 3 planning — if transactions aren't available, fallback to unique constraint (date+timeSlot composite) or application-level locking via cloud function.
- **Subscription message template IDs:** These must be configured in the WeChat admin console and approved before code can reference them. This is a manual step that should happen during Phase 3 planning, not coding.
- **Mini Program category registration:** The app must be registered under the correct service category ("生活服务 > 美容美发") during setup. Wrong category may cause 审核 rejection.
- **TDesign component compatibility:** While TDesign provides all needed components, specific component behavior on the target base library version (≥ 3.4) should be verified during Phase 1 implementation.

## Sources

### Primary (HIGH confidence)
- WeChat Mini Program Official Docs — Framework, APIs, cloud development, privacy, subscription messages, network constraints
- TDesign MiniProgram (GitHub/Tencent) — Component library, v1.13.2
- npm registry — Version verification (wx-server-sdk 3.0.4, tdesign-miniprogram 1.13.2)
- Context7 `/nervjs/taro-docs` — Cloud database, image compression, subscription message API references
- Context7 `/tencent/tdesign-miniprogram` — Component documentation

### Secondary (MEDIUM confidence)
- Context7 `/dcloudio/uni-app` — Sub-package configuration, deprecated API documentation (used for comparison)
- Domain knowledge — Beauty services mini program ecosystem, independent makeup artist workflow
- Context7 `/weixincloud/wxcloud` — Cloud development CLI and setup

### Tertiary (needs validation)
- Cloud database transaction API — Inferred from documentation; needs runtime verification
- Before/after slider implementation — TDesign `slider` as base; custom implementation may be needed

---
*Research completed: 2026-04-17*
*Ready for roadmap: yes*
