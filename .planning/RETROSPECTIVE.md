# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — 品牌升级 & 体验增强

**Shipped:** 2026-04-24
**Phases:** 5 | **Plans:** 11 | **Tasks:** 15

### What Was Built
- Server-side auth infrastructure (shared/auth.js) + field whitelist validation across all cloud functions
- Profile enhancement: experience years + style tags + service area display
- Structured booking notes: skin type / special needs / occasion replacing plain textarea
- Before/after comparison slider with clip-path + touch events + fullscreen compare page
- Booking notification system: subscription messages + booking-reminder cron (daily 20:00)
- Admin calendar view with TDesign Calendar + busy day warning
- Customer review system: reviews cloud function + t-rate form + homepage review module + admin reviews list
- Poster generation: Canvas 2D off-screen rendering + wxacode QR code + cloud storage caching + save to album

### What Worked
- Sequential wave-based execution: each wave built on prior wave's output with zero conflicts
- Phase ordering was correct: data model first → UI components → booking infra → reviews (depends on booking) → poster (standalone)
- Plan file ownership matrix: explicit file-per-plan assignments prevented merge conflicts
- Cloud function pattern: single function with action routing (create/list/getStats/getByBooking) keeps function count low
- CONTEXT.md with locked decisions: eliminated back-and-forth during execution

### What Was Inefficient
- Some CONTEXT.md decisions were overly granular (D-01 through D-31 for Phase 10) — could have been more concise
- SUMMARY.md one-liner extraction failed (field not consistently formatted) — MILESTONES.md required manual fix
- Phase 6 (3 plans) was the largest — could have been split differently to reduce plan complexity

### Patterns Established
- shared/auth.js pattern: `requireArtist` middleware for all admin cloud function actions
- Service layer pattern: `miniprogram/services/*.js` modules wrapping cloud function calls
- Admin sub-package: all admin pages under `pages/admin/` with isArtist guard
- Cloud storage caching: QR codes cached per-work at `qrcodes/{workId}.png`
- DPR-aware Canvas: off-screen rendering with `dpr = wx.getWindowInfo().pixelRatio`

### Key Lessons
1. Dependencies matter: reviews needed stable booking completion flow; poster was independent and could have run in parallel
2. Canvas 2D is the only viable approach for poster generation in WeChat Mini Programs — but requires real-device testing
3. msgSecCheck content security can only be tested after cloud deployment — local simulation is impossible
4. Wave-based plan execution with explicit file ownership matrix eliminates merge conflicts entirely
5. Decision locking in CONTEXT.md before planning dramatically speeds up execution — agents never need to ask questions

### Cost Observations
- Model: GLM-5 for all phases
- ~1.5 hours total execution time across 11 plans
- Average: ~5 minutes per plan, ~8 minutes per phase
- Notable: Planning + discussion phases were fast; execution was the bottleneck

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Avg Time/Plan | Key Change |
|-----------|--------|-------|---------------|------------|
| v1.0 | 5 | 8 | ~5m | Initial architecture, 5-tab structure |
| v1.1 | 5 | 11 | ~5m | Feature additions to stable base, no rework |

### Top Lessons (Verified Across Milestones)

1. Plan file ownership matrix prevents merge conflicts — used successfully in all v1.1 phases
2. Cloud function action routing pattern scales well — single function handles multiple related operations
3. Sequential wave execution is safer than parallel — zero integration issues across 11 plans
