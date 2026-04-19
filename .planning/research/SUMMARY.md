# Research Summary — v1.1 品牌升级 & 体验增强

**Project:** 化妆师个人作品展示与预约微信小程序
**Synthesized:** 2026-04-19
**Scope:** v1.1 milestone features added to existing v1.0 codebase
**Confidence:** HIGH

---

## Executive Summary

This is a **v1.1 feature expansion** on a shipped v1.0 WeChat Mini Program. The v1.0 already provides a working portfolio display, booking system with conflict detection, and admin management panel. The v1.1 milestone adds 8 features across two tiers: 5 table-stakes features that close the quality gap (before/after comparison slider, subscription message notifications, calendar booking view, enhanced booking notes, enhanced artist profile) and 3 differentiators that elevate the product (QR code + poster generation, customer review system, enhanced time conflict detection).

The research yields an unusually clear picture: **zero new npm dependencies are needed**. Every feature is achievable with the existing stack (WeChat native framework, CloudBase, TDesign 1.13.2, wx-server-sdk 3.0.4) plus built-in WeChat APIs. The only genuinely new infrastructure is a `reviews` collection + cloud function and a `qrcode` cloud function. This makes the v1.1 milestone low-risk from a technology standpoint — the risks are almost entirely in WeChat platform constraints (subscription message timing rules, Canvas API gotchas, package size limits, review审核 requirements).

The recommended approach is a **data-first, low-to-high complexity build order**: extend data models first, then standalone UI components, then features requiring WeChat admin configuration, and finally the most technically complex feature (Canvas poster generation). All four research files converge on the same build sequence with minor ordering variations, giving high confidence in the roadmap structure.

---

## Key Findings

### From STACK.md

- **Zero new npm packages** — every v1.1 feature uses existing TDesign components or native WeChat APIs
- **Before/After Slider**: Custom component via `movable-area` + `movable-view` + CSS `clip-path` (~80 lines, no third-party library)
- **QR Code**: Server-side `cloud.openapi.wxacode.getUnlimited()` — official WeChat API, returns Buffer, upload to cloud storage
- **Poster**: Client-side Canvas 2D API (`type="2d"`) — NOT the deprecated `wx.createCanvasContext`
- **Calendar**: TDesign `t-calendar` already installed, supports `format` function for custom day rendering
- **Reviews**: New `reviews` collection + new cloud function; TDesign `t-rate`, `t-tag`, `t-textarea` all already installed
- **Total additional monthly cost: ¥0** — everything fits within CloudBase free tier

### From FEATURES.md

**Table Stakes (must-have):**
1. Before/After Comparison Slider — THE signature visual of makeup artistry
2. Subscription Message Notifications — already 80% built, needs template verification
3. Calendar View for Booking Management — standard for scheduling apps
4. Enhanced Booking Notes — structured fields (skin type, special needs, occasion)
5. Enhanced Artist Profile — service area, years of experience, style tags

**Differentiators (competitive advantage):**
6. QR Code + Poster Generation — offline marketing material generator
7. Customer Review System — social proof drives conversions
8. Enhanced Time Conflict Detection — duration-aware overlap checking (logic upgrade, no new stack)

**Anti-Features (explicitly NOT building):** Real-time IM, review replies, multi-template messages, photo editing, paid promotion, multi-language

### From ARCHITECTURE.md

- **Existing pattern**: Action-dispatcher in cloud functions (`switch (event.action)`), parallel service module pattern on client
- **3 new infrastructure pieces only**: `reviews` collection/cloud function, `qrcode` cloud function, `before-after-slider` custom component
- **Everything else extends existing code in-place** — new actions in existing cloud functions, new fields in existing collections
- **Key pattern**: Cloud functions use `...data` spread to pass fields through, so new fields are automatically persisted without cloud function code changes in most cases
- **Profile caching** (`services/profile.js` caches `_artistProfile`) — must invalidate when new fields added
- **Complete file-level change map produced** — every new and modified file identified for each feature

### From PITFALLS.md

**Top 5 Critical Pitfalls:**

| # | Pitfall | Prevention |
|---|---------|------------|
| P1 | Template ID hardcoded in 2 places (client + cloud function), easy to desync | Centralize into `TEMPLATE_IDS` object, audit all references |
| P2 | `requestSubscribeMessage` must be triggered by user TAP — calling in modal callback or onLoad fails | Only call in `bindtap` handler chain |
| P3 | Using deprecated `wx.createCanvasContext` for poster — renders blank on newer WeChat | Use Canvas 2D API (`type="2d"` + SelectorQuery) |
| P4 | `wxacode.getUnlimited` only works on published mini programs — dev/test always fails | Use TDesign `t-qrcode` in dev, switch to `getUnlimited` in production |
| P5 | `works` collection lacks before/after fields — adding slider needs data migration strategy | Add independent `before_image` field; if absent, skip slider (backward compatible) |
| P6 | Package size creep — TDesign Calendar is large, admin sub-package may exceed 2MB | Calendar in admin sub-package only; check size after each feature |
| P10 | Review system without moderation = spam/abuse publicly visible + WeChat audit rejection | Default `status: 'pending'`, artist approves; use `security.msgSecCheck` |

**Additional pitfalls worth noting:**
- P8: Calendar view must reuse existing `services/bookings.js` — don't duplicate booking logic in a new page
- P9: Add new structured fields independently, don't overload the existing `notes` string
- P11: Cloud function `profile` update needs field whitelist (`ALLOWED_FIELDS`) to prevent arbitrary writes
- P12: Booking conflict check has a race condition — consider database transactions for check-and-write atomicity

---

## Implications for Roadmap

### Recommended Phase Structure

Based on the convergence of dependency analysis (FEATURES.md), build order (ARCHITECTURE.md), and risk sequencing (PITFALLS.md):

---

#### Phase 1: Data Model Extensions & Quick Wins
**Rationale:** Simplest changes, no new infrastructure, immediate visible improvement. Other phases depend on these data models being stable.
**Delivers:** Enhanced profile display (service area, experience years, style tags), structured booking notes (skin type, special needs, occasion)
**Features:** Enhanced Profile (#5), Enhanced Booking Notes (#4)
**Pitfalls to avoid:** P11 (profile update field whitelist — add `ALLOWED_FIELDS`), P9 (add independent fields, don't modify existing `notes`), P16 (style tag picker UX — use tag selection, not comma-separated input)
**New files:** None (all modifications to existing files)
**New collections:** None (extend `artist_profile` and `bookings` with optional fields)

---

#### Phase 2: Before/After Comparison Slider
**Rationale:** Standalone custom component, zero coupling to other features. High visual impact. Can be built and tested independently.
**Delivers:** Makeup before/after comparison on work detail pages
**Features:** Before/After Slider (#1)
**Pitfalls to avoid:** P5 (add `before_image` field independently, backward compatible with existing works), P13 (use `catchtouchmove` to prevent swiper touch conflict), P6 (check package size after adding component)
**New files:** `components/before-after-slider/` (4 files, ~80 lines total)
**New collections:** None (extend `works` with optional `before_image`)

---

#### Phase 3: Subscription Messages & Booking UX
**Rationale:** Notification system is 80% built — needs template config and edge cases. Calendar view is medium complexity using existing TDesign component. Time conflict enhancement is a logic upgrade. These three features are all booking-system related and share testing.
**Delivers:** Push notifications for booking status changes, calendar-based booking management, duration-aware conflict detection
**Features:** Subscription Messages (#2), Calendar View (#3), Enhanced Time Conflict (#8)
**Pitfalls to avoid:** P1 (centralize `TEMPLATE_IDS`), P2 (subscribe only in tap handlers), P6 (calendar in admin sub-package), P8 (reuse `services/bookings.js`, add date-range query), P12 (consider database transactions for conflict check)
**New files:** `pages/admin/bookings/calendar/` (4 files), `services/bookings.js` extended
**New collections:** None
**Research flag:** ⚠️ WeChat admin console work required — subscription message template registration (1-3 day approval timeline). Start early.

---

#### Phase 4: Customer Review System
**Rationale:** Only genuinely new infrastructure (new collection + cloud function + new pages). Depends on booking completion flow being stable, so must come after Phase 3.
**Delivers:** Star ratings + text reviews on completed bookings, public review display, average rating on homepage
**Features:** Customer Reviews (#7)
**Pitfalls to avoid:** P10 (implement review moderation — `status: 'pending'` + `msgSecCheck`), P7 (show "去评价" button in booking history, don't rely solely on notifications)
**New files:** `cloudfunctions/reviews/` (3 files), `pages/review/create/` (4 files), `services/reviews.js`
**New collections:** `reviews` (booking_id unique, user_openid, rating, content, status, created_at)
**Research flag:** ⚠️ WeChat审核 requires content moderation for user-generated text — must integrate `security.msgSecCheck`

---

#### Phase 5: QR Code + Poster Generation
**Rationale:** Most technically complex feature (Canvas 2D + cloud function + image compositing + async orchestration). Lowest urgency — it's a marketing feature, not core booking flow. Save for last.
**Delivers:** One-tap poster generation with mini program QR code for offline marketing
**Features:** QR + Poster (#6)
**Pitfalls to avoid:** P3 (Canvas 2D API only — never `createCanvasContext`), P4 (dev environment QR code workaround needed), P14 (DPR adaptation for canvas rendering)
**New files:** `cloudfunctions/qrcode/` (3 files), `pages/admin/poster/` (4 files), `services/qrcode.js`
**New collections:** None (QR code cached in cloud storage)
**Research flag:** ✅ Canvas 2D cross-device rendering requires real-device testing on iOS (DPR=3) and Android (DPR=2)

---

### Phase Ordering Rationale

- **Phase 1 first** — Data model extensions are prerequisites. Profile fields must exist before homepage can display them; booking note fields must exist before form can submit them. Doing this first prevents other phases from working against stale schemas.
- **Phase 2 second** — The slider is completely standalone (no cloud function changes, no new collections). It's a pure UI win that can ship independently while more complex features are being planned.
- **Phase 3 groups 3 booking-related features** — They share the booking infrastructure and can be tested together. Subscription messages should start early because WeChat template approval takes 1-3 days.
- **Phase 4 after Phase 3** — Reviews depend on the booking completion flow being stable. The review trigger is "completed booking → review button appears." If booking status management isn't solid, reviews will break.
- **Phase 5 last** — Poster generation is the highest technical risk and lowest business urgency. It's a marketing tool, not a booking tool. Ship core features first.

### Research Flags

| Phase | Research Needed? | Why |
|-------|-----------------|-----|
| Phase 1 | ❌ No | Simple field additions to existing forms and displays |
| Phase 2 | ❌ No | Custom component with clear implementation path, `movable-view` well-documented |
| Phase 3 | ⚠️ Partial | WeChat admin template config (external manual step); verify `t-calendar` `format` API; verify cloud DB transaction support |
| Phase 4 | ⚠️ Partial | WeChat `security.msgSecCheck` integration; verify current review审核 requirements |
| Phase 5 | ✅ Yes | Canvas 2D cross-device rendering; `wxacode.getUnlimited` production behavior; poster layout iteration |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | **HIGH** | Zero new dependencies; all APIs verified against official WeChat docs and existing codebase. Version numbers confirmed via npm registry. |
| **Features** | **HIGH** | Each feature mapped to specific existing files, data fields, and WeChat APIs. Feature dependencies and complexity matrix validated across all four research files. Build order consistent across FEATURES.md, ARCHITECTURE.md, and PITFALLS.md. |
| **Architecture** | **HIGH** | Existing codebase patterns (action-dispatcher, service modules, denormalized reads) are clean and well-suited for incremental additions. Complete file-level change map produced for every feature. |
| **Pitfalls** | **HIGH** | 16 pitfalls identified, all code-verified against actual source files. WeChat platform constraints documented from official sources. Phase-specific warnings mapped. Medium confidence only on cloud DB transaction support (P12). |

**Overall confidence: HIGH**

### Gaps to Address

1. **Cloud database transaction API** — PITFALLS.md flags P12 (race condition in booking conflict check) as MEDIUM confidence. Need to verify current CloudBase transaction support during Phase 3 implementation. If unavailable, fallback to application-level locking or unique constraint approach.
2. **TDesign `t-calendar` exact API** — The `format` function for custom day rendering needs verification against the installed version (1.13.2) during Phase 3. Context7 documentation was consulted but runtime validation is recommended.
3. **WeChat审核 requirements for user-generated content** — The review system MUST pass `security.msgSecCheck` or implement moderation. Need to verify current audit standards during Phase 4. This is a hard requirement — missing it means审核 rejection.
4. **Canvas 2D poster rendering on real devices** — Must test on iOS (DPR=3) and Android (DPR=2) during Phase 5. Canvas rendering behavior varies across devices and cannot be fully predicted from documentation alone.
5. **Subscription message template approval timeline** — WeChat admin template review can take 1-3 days. Should submit templates at the start of Phase 3 to avoid blocking development.

---

## Sources

### Primary (HIGH confidence)
- **WeChat Official Docs** — Mini Program framework, CloudBase, Canvas 2D API, subscription messages, `wxacode.getUnlimited`, content security API, privacy authorization
- **TDesign MiniProgram v1.13.2** — Component library (Calendar, Rate, Tag, Textarea, Picker, QRCode components verified)
- **npm registry** — Version verification: tdesign-miniprogram 1.13.2, wx-server-sdk 3.0.4
- **Context7** — TDesign component API verification (`/tencent/tdesign-miniprogram`), WeChat cloud development documentation

### Codebase Analysis (HIGH confidence)
- All cloud functions reviewed: `bookings/index.js`, `works/index.js`, `services/index.js`, `profile/index.js`, `login/index.js`
- All client pages reviewed: works detail, booking create, admin bookings list/detail, admin profile edit, profile history
- Service layer reviewed: `services/bookings.js`, `services/works.js`, `services/profile.js`, `services/api.js`
- Utilities reviewed: `utils/constants.js`

---

*Research synthesized: 2026-04-19*
*Ready for roadmap: yes*
