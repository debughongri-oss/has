# Milestones

## v2.2 预约体验增强 (Shipped: 2026-07-10)

**Phases completed:** 1 phase, 5 requirements
**Timeline:** 归集自 post-v2.1 持续交付（2026-07-09 → 2026-07-10）
**Git range:** c3356c9..1b6a531 — 5 feat/fix commits

**Key accomplishments:**

- 营收准确性：booking create 时快照 `service_price`，getDashboard 优先读快照——修掉营收恒为 0 的隐性 bug
- 新预约提醒：下单后给化妆师发订阅消息（复用现有模板），化妆师在个人中心授权开启
- No-show 追踪：bookings 新增 `no_show` 状态，admin 详情/列表/看板联动
- 客户自助改期：预约历史页发起改期（原生日期选择 + getAvailableSlots 时段网格），复用冲突检测并排除自身 _id，改期后重置为 pending 待再确认 + 「改期申请」通知
- 工作时间配置：化妆师配置每周固定休息日 + 每日工作时段窗口，getAvailableSlots 自动合并排除；notifyArtistNewBooking 重构为通用 notifyArtist(booking, phrase)

**Archived:** `.planning/milestones/v2.2-ROADMAP.md`, `.planning/milestones/v2.2-REQUIREMENTS.md`

---

## v2.1 经营工具 & 转化优化 (Shipped: 2026-07-02)

**Phases completed:** 3 phases, 7 requirements
**Timeline:** 1 day (2026-07-02)
**Git range:** 3324f72..608b317

**Key accomplishments:**

- 数据看板：bookings getDashboard（本月/上月预约数、按状态分布、热门服务 Top3、营收、评价均分+总数）+ admin 看板页
- 不可用时间管理：time_blocks 集合 + blockTime/unblockTime/getBlockedTimes + getAvailableSlots 合并屏蔽 + admin 日历管理页（含月份导航、提交守卫、空状态 CTA）
- 转化优化：服务卡片/预约页展示预计时长 + 预约标记完成时通知邀评
- 修复：db.RegExp API 适配、正则改范围查询、云函数超时提至 10s

**Archived:** 记录于 `.planning/ROADMAP.md` Phase 16-18（未单独归档文件）

---

## v2.0 评价互动 & 预约智能化 (Shipped: 2026-07-02)

**Phases completed:** 2 phases, 5 requirements
**Timeline:** 1 day (2026-07-02)
**Git range:** feat(14)..fix(14) — 6 commits, 19 files (+543 / -77)

**Key accomplishments:**

- Review reply system: reviews cloud function `reply` action (requireArtist + msgSecCheck), admin reply editor in reviews list, homepage artist reply display
- Variable duration conflict detection: bookings create + getAvailableSlots changed from exact-time-match to `[start, start+duration)` interval overlap detection
- parseTime/hasOverlap utility functions for time range calculations
- Booking documents now store `service_duration` for accurate conflict detection
- Profile page: added direct 评价管理 entry with dedicated icon

**Archived:** `.planning/milestones/v2.0-ROADMAP.md`, `.planning/milestones/v2.0-REQUIREMENTS.md`

---

## v1.2 上线前加固 (Shipped: 2026-07-02)

**Phases completed:** 3 phases, 5 plans, 16 requirements
**Timeline:** 2 days (2026-07-01 → 2026-07-02)
**Git range:** feat(11-01)..docs(phase-13) — 16 commits, 49 files (+2178 / -322)

**Key accomplishments:**

- Server-side artist identity: artist_profile._openid replaces 6 hardcoded ARTIST_OPENID constants — single authoritative source
- Client login readiness: ensureLogin() eliminates 13 cold-start race conditions across all admin pages
- User info unification: globalData double-write removed, authService._userInfo is sole cache, refreshUserInfo syncs after profile update
- Server-side user info authority: bookings/reviews reject client-supplied nickname/avatar, read from users collection by openid
- Release hygiene: private config untracked, demo-ui removed, sitemap disallows admin subpackage
- errCode contract: api.js isApiError single decision point, 29 redundant guards removed from 6 service files
- Error UX: api.js pure transport (no toast), pages own all error messaging — no more double toasts
- Design token consistency: booking status colors use CSS variables instead of hardcoded hex
- Upload performance: 3-way concurrent image upload replaces sequential loop
- Storage reliability: delete/compress failures logged with structured results instead of silent swallow
- Reviews aggregation: getStats uses database aggregate pipeline instead of fetching 1000 records to memory

**Decisions documented:** POL-01 (keep booking tabBar as create form), POL-03 (Phase 12 indirectly fixed cache guard), POL-07 (constant externalization not adopted — single deployment)

**Known gaps at close:** Runtime verification (cold-start login, profile cache refresh, concurrent upload, offline toast) requires manual testing in WeChat DevTools

**Archived:** `.planning/milestones/v1.2-ROADMAP.md`, `.planning/milestones/v1.2-REQUIREMENTS.md`

---

## v1.1 品牌升级 & 体验增强 (Shipped: 2026-04-24)

**Phases completed:** 5 phases, 11 plans, 15 tasks
**Timeline:** 3 days (2026-04-21 → 2026-04-23)
**Git range:** feat(06-01)..feat(10-02) — 20 feat commits

**Key accomplishments:**

- Server-side auth infrastructure (shared/auth.js) + field whitelist validation across all cloud functions
- Profile enhancement: experience years + style tags + service area — richer artist homepage
- Structured booking notes: skin type / special needs / occasion replacing plain textarea
- Before/after comparison slider with clip-path + touch events + fullscreen compare page
- Booking notification system: subscription messages + booking-reminder cron (daily 20:00)
- Admin calendar view with TDesign Calendar + busy day warning (threshold: 3)
- Customer review system: reviews cloud function + t-rate form + homepage review module + admin reviews list
- Poster generation: Canvas 2D off-screen rendering + wxacode QR code + cloud storage caching + save to album

**Known gaps at close:** 10 items deferred to v2 (see STATE.md Deferred Items)

**Archived:** `.planning/milestones/v1.1-ROADMAP.md`, `.planning/milestones/v1.1-REQUIREMENTS.md`

---

## v1.0 MVP (Shipped: 2026-04-19)

**Phases completed:** 5 phases, 8 plans, 13 tasks
**Timeline:** 2 days (2026-04-17 → 2026-04-18)

**Key accomplishments:**

- Project architecture with WeChat Cloud Development, silent login, privacy popup, 5-tab TabBar navigation
- Portfolio browsing with category filter grid, image carousel with long-press save, admin CRUD with multi-image upload
- Service catalog with card layout and full admin management (CRUD + category picker)
- Booking system with atomic conflict checking, step-by-step creation form, admin accept/reject/notes, user history
- WeChat sharing (chat + Moments) on all content pages, artist profile editor

**Known gaps:**

- PORT-07 (before/after comparison slider): Not implemented in Phase 2
- BOOK-06/BOOK-07 (subscription message notifications): Requires manual WeChat admin console template configuration
- MGMT-03 (QR code poster generation): Not implemented in Phase 5
- Write operation server-side auth verification deferred (client-side isArtist check only)

**Archived:** `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`

---
