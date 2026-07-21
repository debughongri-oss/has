---
phase: 20-customer-profiles
plan: 04
subsystem: admin/bookings
tags: [customer-profile, booking-detail, ui, linkage, CUST-04]
requires:
  - "20-01 (customers service: getCustomerNote + getCustomerDetail)"
provides:
  - "Booking detail page '客户档案' card linking appointment context to customer profile (CUST-04)"
  - "Cross-page navigation: booking detail → customer detail (empty-state + 'view full details' link)"
affects: []
tech-stack:
  added: []
  patterns:
    - "Best-effort parallel data load: getCustomerNote (required) + getCustomerDetail (tag, catch-swallowed) after booking arrives"
    - "Reuse of customer-list tag color scheme (VIP=gold / 新客=accent / 回头客=secondary) outside the list page"
    - "Independent profile card sibling to the client-authored '客户需求' card (D-12 separation)"
key-files:
  created: []
  modified:
    - "miniprogram/pages/admin/bookings/detail.js"
    - "miniprogram/pages/admin/bookings/detail.wxml"
    - "miniprogram/pages/admin/bookings/detail.wxss"
decisions:
  - "Added `wx:if=\"{{booking.user_openid}}\"` guard on the card root — plan's literal WXML omitted it but verification step #7 requires the card to NOT render when a booking has no openid; guard satisfies that edge case without extra state."
metrics:
  duration: ~5min
  completed: 2026-07-10
  tasks: 1
  files: 3
requirements-completed: [CUST-04]
---

# Phase 20 Plan 04: Booking Detail Customer Profile Card Summary

**One-liner:** Booking detail page gains an independent「客户档案」card surfacing the artist's customer profile (tag / preference / allergy / custom_notes) inline during appointment handling, with empty-state + "查看完整客户详情 →" navigation to the customer detail page — closing the appointment↔profile loop.

## What Was Built

**Integration target:** `miniprogram/pages/admin/bookings/detail` (existing admin booking detail page; reuses `.card` / `.card-title` / `.dfield` styles).

**New「客户档案」card** (positioned AFTER the client-authored「客户需求」card, BEFORE「拒绝原因」card):
1. **Card root** — guarded by `wx:if="{{booking.user_openid}}"` (edge case: bookings without openid don't render it).
2. **Empty state (D-14)** — when `customerNote` is null, shows 「暂无客户档案，点击查看客户详情」 (tappable → `goToCustomerDetail`).
3. **Profile content (D-13)** — when note exists, renders:
   - 客户标签 badge (VIP=gold / 新客=accent / 回头客=secondary — reuses list color scheme)
   - 偏好 (`preference`)
   - 过敏史 (`allergy`, red `.cust-allergy` highlight)
   - 备注 (`custom_notes`)
   - 「查看完整客户详情 →」 link → `goToCustomerDetail`
   - Deliberately **does NOT** duplicate `skin_type` (already shown in the「客户需求」card).

**Data load:** `loadDetail` sets booking data, then fires two best-effort calls keyed on `booking.user_openid`:
- `customersService.getCustomerNote` → `customerNote` (failures logged, not surfaced).
- `customersService.getCustomerDetail` → `customerTag` (failures swallowed — tag is best-effort).

**Navigation:** `goToCustomerDetail` → `wx.navigateTo` to `/pages/admin/customers/detail?user_openid=${openid}` (page built in Plan 20-03).

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `ec54b74` | feat(20-04): add customer profile card to booking detail page |

## Requirements Delivered

- **CUST-04** (预约详情页关联客户档案) — artist sees customer profile (preference/allergy/notes) inline while handling the appointment, no context switch ✓

## Verification Results

- Task 1 automated check: `Booking detail customer card OK` — all required tokens present in JS (`customersService`, `getCustomerNote`, `getCustomerDetail`, `goToCustomerDetail`, `customerNote`, `customerTag`), WXML (`客户档案`, `cust-empty`, `cust-tag`, `goToCustomerDetail`), WXSS (`cust-tag--vip`, `cust-tag--new`, `cust-tag--returning`, `cust-allergy`, `cust-empty`).
- `key_links` satisfied: `customersService.getCustomerNote` + `customersService.getCustomerDetail` in JS; `/pages/admin/customers/detail?user_openid=` navigation target matches Plan 20-03 route.
- Diff stat: 3 files, +113 / −2.
- Card placement verified (lines 75–106 of `detail.wxml`) — sits between「客户需求」and「拒绝原因」as D-12 specifies.

## Deviations from Plan

### Auto-fixed Issue

**1. [Verification edge case] Added `user_openid` guard on card root**
- **Found during:** Task 1 (WXML authoring)
- **Issue:** Plan's literal WXML opened the card with a bare `<view class="card">`, but verification step #7 ("Verify the card does NOT appear when booking has no user_openid") would fail without a render guard. The empty-state inside already checks `customerNote`, but the whole card (title「客户档案」+ empty-state text) would still flash for bookings lacking an openid.
- **Fix:** Root view uses `wx:if="{{booking.user_openid}}"`. No extra data fields needed — `booking.user_openid` is already present from `getBookingDetail`.
- **Files modified:** `miniprogram/pages/admin/bookings/detail.wxml`
- **Committed in:** `ec54b74`

No other deviations — the rest of the plan (JS data fields, loadDetail note/tag loads, goToCustomerDetail, empty-state copy, WXSS classes) was executed exactly as written.

## Threat Model Compliance

| Threat | Mitigation | Status |
|--------|------------|--------|
| T-20-10 (Info Disclosure, customer note in booking detail) | Page behind artist auth gate (`ensureLogin` + `isArtist`); `getNote` cloud function also `requireArtist`-gated (double protection) | ✓ Relies on existing 20-01 enforcement |
| T-20-11 (Tampering, user_openid) | `user_openid` sourced from the authenticated `getBookingDetail` response, not client input | ✓ No new attack surface |

No new threat surface introduced.

## Known Stubs

None. `getCustomerNote` / `getCustomerDetail` are real cloud-function-backed service calls (built in Plan 20-01); no mock values flow to the UI.

## Self-Check: PASSED

- Files modified exist: detail.js ✓, detail.wxml ✓, detail.wxss ✓
- Commit exists: `ec54b74` ✓
- Automated verification: `Booking detail customer card OK` ✓
