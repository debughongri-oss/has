# Milestones

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
