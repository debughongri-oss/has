---
phase: 20-customer-profiles
plan: 03
subsystem: admin/customers
tags: [customer-profile, ui, inline-edit, booking-history, reviews]
requires:
  - "20-01 (customers cloud function + service layer)"
  - "20-02 (customers/list page provides navigation to detail)"
provides:
  - "miniprogram/pages/admin/customers/detail.{js,wxml,wxss,json} — full customer profile page (CUST-02 + CUST-03)"
affects: []
tech-stack:
  added: []
  patterns:
    - "Inline edit toggle (display ↔ form) — reuse for other per-customer editable records"
    - "Chained promise load: getCustomerDetail → getCustomerNote for two-source aggregation"
    - "History preview (5 items) + '查看全部' expand toggle"
key-files:
  created:
    - "miniprogram/pages/admin/customers/detail.json"
    - "miniprogram/pages/admin/customers/detail.js"
    - "miniprogram/pages/admin/customers/detail.wxml"
    - "miniprogram/pages/admin/customers/detail.wxss"
  modified: []
decisions:
  - "Fixed require path bug (../../../services/ — 3 levels, not plan's 4) — same crash class fixed in 20-02"
metrics:
  duration: ~6min
  completed: 2026-07-10
  tasks: 2
  files: 4
---

# Phase 20 Plan 03: Customer Detail Page Summary

**One-liner:** Full customer profile page with auth-gated data aggregation (detail + note), inline note editing (toggle → form → save → display), expandable booking history (5 + 查看全部), and full review list — reusing bookings/reviews card and star patterns.

## What Was Built

**Page:** `miniprogram/pages/admin/customers/detail` (admin sub-package, route already wired in app.json by 20-01).

**Sections rendered (top → bottom):**
1. **Profile header card** — avatar (or inline SVG placeholder), nickname, tag badge (VIP gold / 新客 accent / 回头客 gray), completed-count subtitle.
2. **客户备注 card** — read-only `dfield` rows for skin_type / preference / allergy (red highlight) / custom_notes, with empty-state prompts; toggles to inline edit form (Task 2).
3. **历史预约 card** (when bookings exist) — first 5 by default, `查看全部 (N)` expand / `收起` collapse, each item tappable → `/pages/admin/bookings/detail?id=...` (D-10), service-name + status badge + date·time.
4. **评价记录 card** (when reviews exist) — full list, star rating overlay (rstars-bg/fg), service name, content, date label (D-11).
5. **Empty state** when neither bookings nor reviews.

**Inline note editing (D-08, CUST-03):** tapping 「编辑」 populates the form from the current note (or empty), exposes `<picker>` for skin_type + 3 `<textarea>` (preference / allergy with red-bg alert / custom_notes), with 保存 / 取消 actions. Save calls `saveCustomerNote` (upsert, D-07), shows 「备注已保存」 toast, reloads note, and returns to display mode.

**Auth gate (T-20-07):** `onLoad` runs `ensureLogin` → `isArtist`; non-artists see 「无权限访问」 and are navigated back. `onShow` refreshes on return from booking detail.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `144f764` | feat(20-03): build customer detail page structure (header + history + reviews) |
| 2 | `535a4ab` | feat(20-03): add inline note editing (D-08 edit toggle → form → save → display) |

## Requirements Delivered

- **CUST-02** (客户详情页) — basic info + full history list + reviews list ✓
- **CUST-03** (化妆师为客户添加/编辑备注) — inline edit, upsert via cloud function ✓

## Verification Results

- Task 1 automated check: `Detail page structure OK` (all required JS/WXML/WXSS tokens present).
- Task 2 automated check: `Inline note editing OK` (all handlers, form classes, and styles present).
- `node --check detail.js`: JS syntax OK.
- Line counts exceed plan minimums: js=199 (≥120), wxml=158 (≥80), wxss=124 (≥100).
- key_links satisfied: `customersService.{getCustomerDetail,getCustomerNote,saveCustomerNote}` + `admin/bookings/detail?id=`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed require path (4 → 3 levels)**
- **Found during:** Task 1 (file creation)
- **Issue:** Plan's `detail.js` source used `require('../../../../services/customers')` (4 levels up). The file lives at `miniprogram/pages/admin/customers/detail.js`, which is only 3 levels deep to reach `miniprogram/services/`. With 4 levels the path resolves outside `miniprogram/` and the WeChat runtime throws module-not-found at page load.
- **Fix:** Used `require('../../../services/customers')` and `require('../../../services/auth')` — matching the working pattern from `customers/list.js` (Plan 20-02).
- **Files modified:** `miniprogram/pages/admin/customers/detail.js`
- **Commit:** `144f764`
- **Note:** This is the exact same defect class recorded as a decision in STATE.md for Plan 20-02 ("Fixed customers/list.js require path (3 levels not 4) — plan had a bug that would crash with module-not-found at runtime").

No other deviations — the rest of the plan was executed exactly as written.

## Threat Model Compliance

| Threat | Mitigation | Status |
|--------|------------|--------|
| T-20-07 (Spoofing, onLoad) | Auth gate: `ensureLogin` + `isArtist`, redirect on fail | ✓ Implemented (onLoad + onShow) |
| T-20-08 (Tampering, user_openid) | `user_openid` from query → cloud function → `requireArtist` validates artist server-side | ✓ Relies on 20-01 cloud function enforcement |
| T-20-09 (Info Disclosure, allergy PII) | Data only rendered behind artist gate; no client-side persistence beyond page state | ✓ No local storage / cache |

No new threat surface introduced beyond what the plan's threat model anticipated.

## Known Stubs

None. All data flows are wired to real cloud-function responses via `customersService`; no hardcoded/mock values flow to the UI.

## Self-Check: PASSED

- Files exist: detail.json ✓, detail.js ✓, detail.wxml ✓, detail.wxss ✓
- Commits exist: 144f764 ✓, 535a4ab ✓
