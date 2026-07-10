---
phase: 20-customer-profiles
plan: 01
subsystem: api
tags: [wx-cloud-function, callCloudFunction, requireArtist, customer-profiles, upsert]

# Dependency graph
requires:
  - phase: 06-data-model-extensions-quick-wins
    provides: booking 结构化字段 (skin_type/special_needs/occasion) — customer_notes 与之互补
  - phase: 09-customer-review-system
    provides: reviews 集合 + user_openid 关联（detail action 复用）
provides:
  - customers 云函数（list/detail/getNote/saveNote 四个 action）
  - services/customers.js 客户端服务层（4 个 wrapper 函数）
  - admin 子包 customers/list 与 customers/detail 路由
affects: [20-customer-profiles (Wave 2 UI plans), 21-review-enhancements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "action-dispatcher 云函数（复用 bookings 模式）"
    - "customer_notes upsert by { _openid, user_openid } composite key"
    - "isCollectionMissing 优雅降级（reviews 集合/customer_notes 首次未创建）"
    - "tagForCompleted 阈值映射（5→vip, 2→returning, 0-1→new）"
    - "服务层 callCloudFunction wrapper（复用 api.js 单一错误判定）"

key-files:
  created:
    - cloudfunctions/customers/index.js
    - cloudfunctions/customers/package.json
    - cloudfunctions/customers/config.json
    - cloudfunctions/customers/shared/auth.js
    - miniprogram/services/customers.js
  modified:
    - miniprogram/app.json

key-decisions:
  - "shared/auth.js 副本不提交 git（gitignored 生成物，npm run sync 在部署前从 cloudfunctions/shared/auth.js 重新生成）——遵循项目既定约定，与 bookings/reviews 等一致"
  - "list action 在 JS 内按 user_openid 分组聚合（单化妆师客户量有限，无需云数据库 aggregate 管道）"
  - "saveNote 字段长度截断（skin_type 50 / preference 500 / allergy 500 / custom_notes 1000）防止超限"

patterns-established:
  - "customer_notes 集合结构：_id, _openid(化妆师), user_openid(客户), skin_type, preference, allergy, custom_notes, created_at, updated_at"
  - "客户标签分级：仅按 completed 预约数（D-01/D-02）"

requirements-completed: [CUST-01, CUST-02, CUST-03, CUST-04]

# Metrics
duration: 8min
completed: 2026-07-10
---

# Phase 20 Plan 01: Customer Backend Infrastructure Summary

**Independent `customers` cloud function (4 requireArtist-gated actions) + services/customers.js wrapper layer + admin subpackage routes — the API contract and data path for all Phase 20 UI work.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-10T09:26:28Z
- **Completed:** 2026-07-10T09:34:35Z
- **Tasks:** 2
- **Files modified:** 5 (4 created + 1 modified)

## Accomplishments
- New `customers` cloud function with 4 actions (list/detail/getNote/saveNote), each gated by `requireArtist` — T-20-01/03/04 mitigated
- `saveNote` upserts by `{ _openid, user_openid }` composite, with `_openid` taken from `wxContext.OPENID` (never `event`) — T-20-02 anti-tamper mitigated
- `customer_notes` / `reviews` collection-missing errors degrade gracefully (isCollectionMissing pattern), so first customer note write auto-creates the collection
- Client service layer (`services/customers.js`) exposes 4 thin wrappers via `callCloudFunction('customers', { action })`, consistent with `services/bookings.js`
- Admin subpackage now routes `customers/list` + `customers/detail`, ready for Wave 2 page implementation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create customers cloud function with 4 actions** — `ba1d64c` (feat)
2. **Task 2: Create services/customers.js + register routes in app.json** — `9ccfd18` (feat)

## Files Created/Modified
- `cloudfunctions/customers/index.js` — 4-action dispatcher (list/detail/getNote/saveNote), requireArtist on all actions, isCollectionMissing graceful degrade, tagForCompleted thresholds
- `cloudfunctions/customers/package.json` — wx-server-sdk ~3.0.4 dependency
- `cloudfunctions/customers/config.json` — empty openapi permissions, 10s timeout
- `cloudfunctions/customers/shared/auth.js` — verbatim copy of cloudfunctions/shared/auth.js (on-disk only, gitignored generated artifact)
- `miniprogram/services/customers.js` — 4 wrapper functions (getCustomerList/Detail/Note/saveCustomerNote)
- `miniprogram/app.json` — added `customers/list`, `customers/detail` to admin subpackage pages (+2 entries, nothing else changed)

## Decisions Made
- **shared/auth.js copy intentionally NOT committed to git.** It is a gitignored generated artifact per `.gitignore` (`cloudfunctions/*/shared/`) and `scripts/sync-shared.js` — source of truth is `cloudfunctions/shared/auth.js`, copies regenerate on `npm run sync` / `npm run deploy`. Matches the established convention for bookings/reviews/profile/services/works (none of their shared copies are tracked). The on-disk file exists and is a verbatim copy, satisfying deployment requirements.
- **No root `package.json` `deploy:customers` script added.** The `scripts/deploy-cloudfunction.js` auto-discovers cloud functions by scanning `cloudfunctions/*/index.js`, so `node scripts/deploy-cloudfunction.js customers` already works without a npm alias. Adding the alias would touch root `package.json` (out of this plan's `files_modified` scope) for marginal convenience. Logged to deferred-items.
- **`list` action aggregates in JS rather than via DB aggregate pipeline.** Per D-04 / Agent's Discretion in 20-CONTEXT.md, single-artist customer volume is small; JS grouping is simpler and equally correct.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's Task 1 verification script used literal indexOf with regex-intended patterns**
- **Found during:** Task 1 (running `<automated>` verify block)
- **Issue:** The plan's verify script called `c.indexOf('case .list.')` etc. — `indexOf` is literal, but `case .list.` is regex shorthand. These patterns can never match `case 'list':`, so the verification always fails regardless of correct code.
- **Fix:** Replaced with a corrected verification script that checks the actual acceptance criteria (literal `case 'list'` via regex, requireArtist call count ≥ 4, threshold values, _openid source, verbatim auth copy, package.json/config.json fields, syntax validity). All 16 criteria pass.
- **Files modified:** none (verification script only; the production code matched acceptance criteria as-is)
- **Verification:** 16 acceptance-criteria checks all PASS, `vm.createScript` syntax check passes
- **Committed in:** not committed (verification-only; production code committed in `ba1d64c`)

**2. [AGENTS.md precedence — Project Convention] shared/auth.js copy not force-added to git**
- **Found during:** Task 1 (git add)
- **Issue:** Plan's `files_modified` lists `cloudfunctions/customers/shared/auth.js`, but `.gitignore` excludes `cloudfunctions/*/shared/` as a generated artifact (regenerated by `npm run sync` before deploy).
- **Fix:** Per AGENTS.md enforcement rule (project conventions override plan), did NOT force-add the shared copy. Source of truth `cloudfunctions/shared/auth.js` is already committed and needs no changes for customers. The on-disk copy exists for local dev/deploy.
- **Files modified:** none (decision to follow gitignore convention)
- **Verification:** `git ls-files cloudfunctions/customers/` shows only index.js/package.json/config.json (3 tracked); on-disk shared/auth.js is a verbatim copy; `npm run sync` will regenerate it identically
- **Committed in:** N/A (convention-driven exclusion)

---

**Total deviations:** 2 (1 verification-script bug auto-fixed, 1 project-convention precedence decision)
**Impact on plan:** No scope creep. Production code matches all acceptance criteria exactly. The shared/auth.js exclusion follows the established project pattern and does not affect deployability (deploy script auto-syncs).

## Issues Encountered
None beyond the deviations above. All acceptance criteria from both tasks pass.

## User Setup Required
None — no external service configuration required. The `customers` cloud function uses the existing cloud database and the already-present `cloudfunctions/shared/auth.js` module. Deploy with `npm run sync && node scripts/deploy-cloudfunction.js customers`.

## Next Phase Readiness
- **Wave 2 UI plans (20-02 / 20-03 / 20-04) can proceed** — full API contract is in place:
  - Customer list page calls `getCustomerList(tag)` → `{ list: [{ user_openid, nickname, avatar_url, completed_count, last_booking_date, tag }], total }`
  - Customer detail page calls `getCustomerDetail(userOpenid)` → `{ user_openid, nickname, avatar_url, completed_count, tag, bookings[], reviews[] }`
  - Note editing calls `getCustomerNote(userOpenid)` + `saveCustomerNote(userOpenid, note)`
  - Booking detail CUST-04 linkage calls `getCustomerNote(booking.user_openid)` to render the 「客户档案」card
- **No blockers.** customer_notes collection auto-creates on first save (isCollectionMissing → add path).
- **Deferred:** add `deploy:customers` npm alias to root `package.json` for parity with other cloud functions (non-blocking; `node scripts/deploy-cloudfunction.js customers` works).

---
*Phase: 20-customer-profiles*
*Completed: 2026-07-10*

## Self-Check: PASSED

- All 5 created/modified files exist on disk (including gitignored shared/auth.js copy)
- Both task commits found in git log (ba1d64c, 9ccfd18)
- cloudfunctions/customers/shared/auth.js is byte-identical to cloudfunctions/shared/auth.js source
- All 20 acceptance-criteria verification checks PASS
