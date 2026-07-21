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

## Milestone: v1.2 — 上线前加固

**Shipped:** 2026-07-02
**Phases:** 3 | **Plans:** 11 (auth-security, release-hygiene, consistency-polish)

### What Was Built
- Server-side bootstrap artist authentication (`shared/auth.js requireArtist`) — first registered openid becomes the artist
- Field whitelist validation across all cloud functions
- `api.js` isApiError single decision point — pure transport layer
- Reviews getStats aggregation pipeline (POL-06)
- Limited concurrency image upload + storage error reporting
- CSS variable design tokens for status colors

### What Worked
- Security audit → dedicated hardening milestone caught 3 Critical issues before launch
- Single decision-point pattern (`isApiError`) eliminated scattered errCode checks
- Polish phase (POL-*) paid down visual/UX debt accumulated during rapid v1.0/v1.1 build

### Patterns Established
- `requireArtist` middleware re-used by every subsequent admin cloud function (customers, dashboard, availability)
- Aggregation pipelines for stats (reviews getStats → dashboard getDashboard)
- Design tokens via CSS variables — became foundation for v2.3 polish pass (gold/green/red tiers)

---

## Milestone: v2.0 — 评价互动 & 预约智能化

**Shipped:** 2026-07-02
**Phases:** 2 | **Plans:** 14-review-reply, 15-duration-conflict

### What Was Built
- 化妆师回复评价 (REVW-07/08/09): reply action + admin UI + client-side display
- 可变时长冲突检测 (BOOK-17/18): duration-based overlap detection in `getAvailableSlots`

### What Worked
- Conflict detection moved from fixed-slot to duration-based — supports the full range of makeup services (30min touch-up vs 4hr bridal)
- Review reply established the artist voice pattern, later refined in v2.3 with reply-area divider

---

## Milestone: v2.1 — 经营工具 & 转化优化

**Shipped:** 2026-07-02
**Phases:** 3 | **Plans:** 16-dashboard, 17-availability, 18-conversion

### What Was Built
- 数据看板 (DASH-01/02): `getDashboard` cloud function + admin stats page
- 不可用时间管理 (AVAIL-01/02/03): blockTime + admin UI + merge into getAvailableSlots
- 自动邀评 (CONV-02): completed-booking notification with review link

### What Worked
- Availability blocks integrated into the same `getAvailableSlots` pipeline as bookings — single source of truth for "is this slot open"
- Auto-review-ask closed the loop: booking complete → notification → review submission (which v2.3 then enhanced with tags/images)

---

## Milestone: v2.2 — 预约体验增强

**Shipped:** 2026-07-10
**Phases:** 1 | **Plans:** 19 (booking-reminder + bookings enhancements)

### What Was Built
- 营收快照修复: snapshot service price at booking time for accurate dashboard revenue
- 新预约提醒: subscribe message to artist on new booking
- No-show 状态追踪: client absence tracking
- 客户自助改期: client-initiated reschedule with artist re-confirmation
- 工作时间配置: weekly off-days + daily working-hours window

### What Worked
- Price snapshot prevents retroactive revenue drift when services reprice
- Self-reschedule reduced artist operational load — clients handle minor time changes themselves
- Working-hours window gave the artist control without per-day blocking

---

## Milestone: v2.3 — 客户经营 & 口碑增强

**Shipped:** 2026-07-16 (polish pass 2026-07-21)
**Phases:** 2 | **Plans:** 8 (Phase 20: 4 customer-profile, Phase 21: 4 review-enhancement) | **Polish commits:** 6

### What Was Built

**Phase 20 — 客户档案 (CUST-01~04):**
- `customers` cloud function with 4 actions (list/get/getNote/saveNote)
- Customer service layer + admin routes registration
- Customer list page with tag filter (新客/回头客/VIP) + entry from bookings list
- Customer detail page (basic info + booking history + reviews + inline note editing D-08)
- Booking detail page customer profile card (CUST-04 linkage) with `wx:if user_openid` guard

**Phase 21 — 评价增强 (REVW-10~15):**
- Reviews cloud function extended: tag/image/anonymous on create + imgSecCheck + avg_rating redundancy sync + new-review subscribe push + delete
- Client review form (tag chips + image grid + anonymous switch)
- Admin review management (filter by rating/tag, sort by latest/highest/lowest, delete, anonymous marking, subscribe authorization)
- Index review stats: read from `artist_profile` redundant fields + 「大家这样说」tag cloud (topTags aggregation)

**Post-milestone polish (2026-07-21):**
- Review create form redesign: hero rate card, reordered fields (tags→images→text), brand toggle, fixed bottom submit bar
- Admin reviews list: overview stats bar, grouped filters with sticky header, rating-tier color bars (good/mid/low), 待回复 badges
- Index tag cloud: heat-tiered chips (hot/warm/normal) + decorative quote mark
- Booking create/reschedule: dropped redundant contact field labels (icon-only)

### What Worked
- **2-phase split rationale held up**: Phase 21 (REVW-14 avg_rating redundancy) genuinely crossed both client and admin sides, but the create/delete sync logic was centralized in the cloud function — the split into 2 phases by feature area (客户档案 vs 评价增强) was correct, not artificial.
- **Best-effort parallel data load pattern** (Plan 20-04): `getCustomerNote` (required) + `getCustomerDetail` (tag, catch-swallowed) loaded in parallel after booking arrives — keeps the critical path fast, optional enrichments non-blocking.
- **Post-milestone polish as a separate pass** worked well: feature phases stayed scope-disciplined (no drive-by UI changes), then a focused polish pass applied the gold-accent design system across the freshly-built pages.
- **Rating-tier color bars on admin reviews** turned out to be the single highest-impact polish — artists can scan a long review list and spot negative feedback instantly.

### What Was Inefficient
- **Plan 20-02 require-path bug**: plan literally specified `../../../services/` (3 levels) but the actual depth from `pages/admin/customers/list.js` requires 3 levels — caught during planning review, but the bug pattern (depth miscount) is a recurring risk for nested admin pages.
- **Plan 20-04 tracking lag**: code was committed (`ec54b74`) but SUMMARY.md was not written in the same session. Discovered weeks later during v2.3 closeout. Indicates SUMMARY writing needs to be a hard commit gate, not an aspiration.
- **Stray files accumulated across sessions**: 3 uncommitted changes (booking label removal + config flag) sat in the working tree across multiple sessions because no plan owned them. Resolved by bundling into the polish pass, but the pattern (ad-hoc edits without a plan) kept re-creating tracking noise.
- **STATE.md drift**: at v2.3 closeout, STATE.md still listed "Plan Phase 21" as a pending todo despite Phase 21 being fully shipped. The doc lag was caught only because the polish pass forced a tracking audit.

### Patterns Established
- **Tag chip multi-select pattern**: flex-wrap row + pill chips with `--on` accent state — reused immediately in polish pass for index tag cloud tiers
- **Best-effort parallel load**: required call + tag call (catch-swallowed) — reusable for any "core data + optional enrichment" page
- **Cloud function action routing + redundancy sync**: single create/delete hook syncs denormalized stats fields (avg_rating/total_reviews) — pattern applicable to any future counter field
- **Tier-based visual encoding** (good/mid/low color bars, hot/warm/normal chips): scannable at a glance, reuses existing gold/green/red tokens

### Key Lessons
1. **SUMMARY.md must be a commit gate** — if code ships without SUMMARY, the tracking lag propagates and resurfaces weeks later. Make SUMMARY-write a hard step in the execute workflow, not optional.
2. **Ad-hoc edits without a plan are tracking debt** — even one-line "while I'm here" fixes create stray files that block clean milestone closeout. Either refuse drive-by edits or log them immediately to a stray-items file.
3. **Polish is a phase, not a side effect** — feature phases that stay scope-disciplined + a dedicated polish pass produces cleaner results than drive-by UI improvements bundled into feature work.
4. **Redundant fields need centralized sync hooks** — `avg_rating` works because create and delete both go through the same cloud function action. Any future counter (e.g. booking_count, repeat_customer_count) should follow the same pattern, not be application-maintained.
5. **Tier-based visual encoding beats numeric display** — color bars and heat-tiered chips convey relative magnitude faster than reading numbers. Apply wherever ranking/scanning matters.

### Cost Observations
- Phase 20: ~25min across 4 plans
- Phase 21: ~30min across 4 plans
- Post-milestone polish: ~15min across 6 atomic commits
- Total v2.3: ~70min, fastest milestone per feature delivered

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Avg Time/Plan | Key Change |
|-----------|--------|-------|---------------|------------|
| v1.0 | 5 | 8 | ~5m | Initial architecture, 5-tab structure |
| v1.1 | 5 | 11 | ~5m | Feature additions to stable base, no rework |
| v1.2 | 3 | 11 | ~4m | Security-first hardening, single-decision-point pattern |
| v2.0 | 2 | 2 | ~6m | Interaction + intelligence, reply/conflict-detection |
| v2.1 | 3 | 3 | ~7m | Operations tooling (dashboard/availability/conversion) |
| v2.2 | 1 | 5 | ~5m | Booking UX depth, single phase delivering 5 features |
| v2.3 | 2 | 8 + 6 polish | ~5m | Customer memory + review depth, polish-as-pass |

### Top Lessons (Verified Across Milestones)

1. Plan file ownership matrix prevents merge conflicts — used successfully since v1.1
2. Cloud function action routing pattern scales well — single function handles multiple related operations (now 8 cloud functions serving ~40 actions)
3. Sequential wave execution is safer than parallel — zero integration issues across all milestones
4. **Polish as a separate pass (v2.3)** produces cleaner results than drive-by UI improvements
5. **Centralized redundancy sync hooks in cloud functions (v2.3)** — any denormalized counter must sync at the action boundary
6. **CSS variable design tokens (v1.2)** enabled the tier-based visual encoding pattern that paid off in v2.3
