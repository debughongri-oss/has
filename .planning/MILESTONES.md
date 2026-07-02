# Milestones

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
