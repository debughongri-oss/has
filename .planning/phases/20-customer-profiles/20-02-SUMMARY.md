---
phase: 20-customer-profiles
plan: 02
subsystem: ui
tags: [miniprogram, admin-page, customer-list, tag-filter, wxml, wxss, css-custom-properties]

# Dependency graph
requires:
  - phase: 20-customer-profiles
    plan: 01
    provides: services/customers.js (getCustomerList wrapper) + admin subpackage routes (customers/list, customers/detail)
  - phase: 08-booking-notifications-calendar
    provides: admin bookings/list .entries quick-access pattern + .segs filter pattern
provides:
  - customers/list page (四件套) consuming services/customers.getCustomerList — CUST-01
  - 客户管理 entry in admin bookings list → navigation to customers/list
affects: [20-customer-profiles (Wave 2 plan 20-03 detail page), 20-customer-profiles (Wave 2 plan 20-04 booking detail linkage)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "admin page auth gate (ensureLogin + isArtist) — replicated from bookings/list.js"
    - ".segs sticky filter bar (seg-count + seg-label + seg--on) — replicated from bookings/list for tag filter"
    - "tag badge color mapping via CSS custom properties: VIP=--gold, 新客=--accent, 回头客=--text-secondary"
    - "best-effort tag count refresh (second unfiltered getCustomerList call) — single-artist volume"
    - ".entries quick-access row (entry-ic SVG data-uri + entry-label) — extended with third entry"

key-files:
  created:
    - miniprogram/pages/admin/customers/list.js
    - miniprogram/pages/admin/customers/list.wxml
    - miniprogram/pages/admin/customers/list.wxss
    - miniprogram/pages/admin/customers/list.json
  modified:
    - miniprogram/pages/admin/bookings/list.wxml
    - miniprogram/pages/admin/bookings/list.js
    - miniprogram/pages/admin/bookings/list.wxss

key-decisions:
  - "Fixed require path from plan's 4-level (../../../../services) to 3-level (../../../services) — customers/ is at same depth as bookings/, matches established pattern. Plan had a bug that would crash with module-not-found at runtime."
  - "Tag count update uses a second unfiltered getCustomerList call (best-effort) per plan's documented strategy — single-artist customer volume keeps this cheap."

patterns-established:
  - "customers/list page card: .ccard (avatar + ctop[name+tag] + cmeta[count+last]) — customer-specific card distinct from bookings .bcard"
  - ".ctag--{vip,new,returning} badge color convention per CONTEXT specifics"

requirements-completed: [CUST-01]

# Metrics
duration: 3min
completed: 2026-07-10
---

# Phase 20 Plan 02: Customer List Page & Bookings Entry Summary

**Customers/list admin page (tag filter + customer cards with VIP/新客/回头客 color-coded badges) + 客户管理 entry button on the bookings list — the full CUST-01 entry path from bookings → customer overview.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-07-10T09:39:48Z
- **Completed:** 2026-07-10T09:42:50Z
- **Tasks:** 2
- **Files:** 7 (4 created + 3 modified)

## Accomplishments
- Built the complete customers/list page (js/wxml/wxss/json) consuming `services/customers.getCustomerList` — auth-gated, tag-filtered, card-based
- Tag filter bar (全部/新客/回头客/VIP) reuses the bookings `.segs` sticky pattern with live per-tag counts
- Customer cards show avatar (with placeholder), nickname, completed-count, last-booking date, and color-coded tag badge (VIP=gold / 新客=accent / 回头客=text-secondary) per CONTEXT specifics
- Tapping a card navigates to `customers/detail?user_openid=xxx` (ready for Plan 20-03)
- Empty state ("暂无客户") renders when no customers match the active filter
- Added 「客户管理」 entry to the admin bookings list `.entries` row (3rd entry beside 日历视图 / 评价管理) with a people-icon SVG, navigating to the new customers/list page

## Task Commits

Each task was committed atomically:

1. **Task 1: Build customer list page (wxml/wxss/js/json)** — `f5adb3c` (feat)
2. **Task 2: Add customer management entry to bookings list page** — `d550804` (feat)

## Files Created/Modified
- `miniprogram/pages/admin/customers/list.json` — navigationBarTitleText: 客户管理
- `miniprogram/pages/admin/customers/list.wxml` — loading state + sticky tag filter bar + customer card list + empty state
- `miniprogram/pages/admin/customers/list.js` — auth gate (ensureLogin + isArtist), loadCustomers, updateTagCounts, onTagChange, goToDetail; TAG_LABELS + formatDateShort helpers
- `miniprogram/pages/admin/customers/list.wxss` — .segs filter (copied from bookings), .ccard/.cavatar/.cmain/.ctop/.cname/.ctag--{vip,new,returning}/.cmeta/.ccount/.clast, empty-container
- `miniprogram/pages/admin/bookings/list.wxml` — added third `.entry` block (goToCustomers + entry-ic--cust + 客户管理)
- `miniprogram/pages/admin/bookings/list.js` — added `goToCustomers` method navigating to `/pages/admin/customers/list`
- `miniprogram/pages/admin/bookings/list.wxss` — added `.entry-ic--cust` people-silhouette SVG icon (pink #FF6F8B stroke, matching existing icons)

## Decisions Made
- **Require path correction (Rule 1 bug fix).** The plan specified `require('../../../../services/customers')` (4 levels up) and the same for auth. The file lives at `miniprogram/pages/admin/customers/list.js` — identical depth to `bookings/list.js` which correctly uses `../../../services/...` (3 levels). The 4-level path would resolve to project-root `services/` (nonexistent) and throw module-not-found at runtime. Corrected to 3 levels. Verified against the established bookings/list.js pattern.
- **Tag-count refresh strategy kept as planned.** `loadCustomers` performs the filtered fetch, then `updateTagCounts` issues a second unfiltered fetch to compute per-tag totals. This is 2 cloud calls per load, but matches the plan's explicit documented strategy and is cheap at single-artist customer volume (D-04 / Agent's Discretion in 20-CONTEXT.md).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Incorrect require path in plan's list.js**
- **Found during:** Task 1 (writing list.js)
- **Issue:** Plan specified `require('../../../../services/customers')` and `require('../../../../services/auth')` (4 levels up). The page is at `miniprogram/pages/admin/customers/list.js` — 3 levels under `miniprogram/`, same as `bookings/list.js`. A 4-level path resolves to the project root's `services/` directory, which does not exist. This would crash with `module not found` on first page load.
- **Fix:** Used `require('../../../services/customers')` and `require('../../../services/auth')` (3 levels), matching the established `bookings/list.js` pattern at the same directory depth.
- **Files modified:** `miniprogram/pages/admin/customers/list.js` (written with corrected path from the start)
- **Verification:** verification script confirms 3-level path present and 4-level path absent; matches bookings/list.js convention
- **Commit:** `f5adb3c`

---

**Total deviations:** 1 (require-path bug auto-fixed inline)
**Impact on plan:** No scope change. All acceptance criteria from both tasks pass. The fix makes the page actually runnable.

## Issues Encountered
None beyond the deviation above.

## Threat Model

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-20-05 (Spoofing — list.js onLoad) | mitigate | ✓ Mitigated — auth gate (ensureLogin + isArtist) replicates the bookings/list.js pattern; non-artist users get toast + navigateBack |
| T-20-06 (Tampering — tag filter param) | accept | ✓ Accepted — tag is a simple enum forwarded to the cloud function; backend requireArtist is the real gate (Plan 01) |

## User Setup Required
None. The page consumes the existing `customers` cloud function (deployed in Plan 01) and reuses global CSS variables. No new env vars or services.

## Next Phase Readiness
- **Plan 20-03 (customer detail page) can proceed** — `goToDetail` already navigates to `customers/detail?user_openid=xxx`; the detail page will receive the openid and call `getCustomerDetail` + `getCustomerNote`.
- **Plan 20-04 (booking detail CUST-04 linkage)** is independent and can also proceed.
- **No blockers.**

## Known Stubs
None. All data flows from the live `getCustomerList` cloud function (Plan 01). No hardcoded/mock values, no placeholder text beyond the intentional empty-state copy ("暂无客户").

## Threat Flags
None — no new network endpoints, auth paths, or trust-boundary surface introduced beyond what Plan 01 already gated. The page reuses the existing requireArtist-protected `customers` cloud function.

---
*Phase: 20-customer-profiles*
*Completed: 2026-07-10*

## Self-Check: PASSED

- All 7 created/modified files exist on disk (4 customers/list files + 3 bookings/list files)
- Both task commits found in git log (f5adb3c, d550804)
- goToCustomers navigation wired in bookings/list.js (1 reference)
- All Task 1 verification checks (23) PASS, all Task 2 verification checks PASS
