---
phase: 02-portfolio-system
plan: 01
subsystem: portfolio-browsing
tags: [cloud-function, works, grid, pagination, category-filter, detail, swiper, share]
dependency_graph:
  requires: [api.js, constants.js, auth.js]
  provides: [works-cloud-function, works-service, storage-service, works-list-page, works-detail-page]
  affects: [app.json]
tech_stack:
  added: [wx-server-sdk@3.0.4]
  patterns: [cloud-function-crud, client-service-layer, paginated-list, image-swiper, lazy-loading]
key_files:
  created:
    - cloudfunctions/works/index.js
    - cloudfunctions/works/package.json
    - cloudfunctions/works/config.json
    - miniprogram/services/works.js
    - miniprogram/services/storage.js
    - miniprogram/pages/works/detail.js
    - miniprogram/pages/works/detail.json
    - miniprogram/pages/works/detail.wxml
    - miniprogram/pages/works/detail.wxss
  modified:
    - miniprogram/app.json
    - miniprogram/pages/works/list.js
    - miniprogram/pages/works/list.json
    - miniprogram/pages/works/list.wxml
    - miniprogram/pages/works/list.wxss
decisions:
  - Custom scroll-view tabs instead of TDesign t-tabs for lighter weight and full styling control
  - Cloud function handles all CRUD with unified action-based routing pattern
  - storage.js compresses images before upload to address Pitfall P3
metrics:
  duration: ~5m
  completed: 2026-04-17
---

# Phase 02 Plan 01: Portfolio Browsing Experience Summary

Works cloud function with full CRUD + pagination, client-side works/storage services, works list page with category filter grid, and works detail page with image swiper carousel.

## What Was Built

### Task 1: Works Cloud Function & Client Services

**Cloud Function (`cloudfunctions/works/`)**
- `index.js`: Full CRUD cloud function handling 5 actions: `list`, `detail`, `create`, `update`, `delete`
- `list` action supports category filtering and pagination (`page`, `pageSize`, `hasMore`)
- Results sorted by `sort_order` ascending, then `created_at` descending
- `package.json`: wx-server-sdk ~3.0.4 dependency
- `config.json`: Empty permissions config (no OpenAPI needed for CRUD)

**Client Services**
- `miniprogram/services/works.js`: Exports `getWorksList`, `getWorkDetail`, `createWork`, `updateWork`, `deleteWork`, `getCategories` — all route through centralized `callCloudFunction`
- `miniprogram/services/storage.js`: Exports `compressImage`, `uploadImage`, `uploadWorkImages`, `deleteCloudFile`, `getTempFileURLs` — image compression before upload addresses Pitfall P3

**App Config Update**
- Added `pages/works/detail` to `app.json` pages array

### Task 2: Works List Page & Detail Page

**Works List Page** (`miniprogram/pages/works/`)
- Category tabs: horizontal scroll-view with "全部" + 5 category options (新娘妆/伴娘妆/订婚妆/日常妆/创意妆)
- 2-column grid layout with lazy-loading images (`mode="aspectFill"`, `lazy-load`)
- Pagination via `onReachBottom` (addresses Pitfall P9: cloud DB 20-record default limit)
- Pull-down refresh support (`enablePullDownRefresh: true`)
- Loading state, empty state, load-more indicator, end-of-list indicator

**Works Detail Page** (`miniprogram/pages/works/`)
- Image swiper carousel with indicator dots for multi-image works
- `show-menu-by-longpress` on images for long-press-to-save (Pitfall P8)
- `wx.previewImage` for full-screen image gallery viewing
- Image position indicator ("X / Y" format)
- Work info display: title, category badge, date, description
- `onShareAppMessage` for WeChat sharing with custom title and cover image
- Fixed bottom share button bar
- Loading state and error/missing state

## Verification Results

- **Task 1**: PASS — Works cloud function and services exist with all required exports
- **Task 2**: PASS — Works list and detail pages exist with all required patterns
- **Full acceptance criteria**: 17/17 PASS

## Requirements Satisfied

- **PORT-04**: User can browse portfolio items in a paginated image grid with lazy loading ✅
- **PORT-05**: User can view portfolio item detail with multi-image carousel (long-press to save) ✅
- **PORT-06**: User can filter portfolio items by category ✅

## Pitfalls Addressed

| Pitfall | How Addressed |
|---------|---------------|
| P3: Image compression | `storage.js` compresses before upload via `wx.compressImage` |
| P7: setData performance | Paginated loading, only URLs passed (no base64) |
| P8: Deprecated APIs | Uses `show-menu-by-longpress` (not deprecated API), `wx.chooseMedia` planned for Plan 02 |
| P9: 20-record limit | Cloud function implements `limit()`/`skip()` pagination |
| P11: Loading/error states | Both pages have loading, empty, and error states |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `cloudfunctions/works/index.js` | `create`/`update`/`delete` actions lack artist identity verification | Per threat model T-02-02: "Plan 02 admin UI controls access. Cloud function should verify openid for write operations (tracked for Plan 02)." |

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: missing-auth | `cloudfunctions/works/index.js` | Write operations (create/update/delete) do not verify caller openid matches ARTIST_OPENID — tracked as T-02-02 for Plan 02 admin implementation |

## Self-Check: PASSED

All 14 created/modified files verified present on disk. App.json detail route confirmed.
