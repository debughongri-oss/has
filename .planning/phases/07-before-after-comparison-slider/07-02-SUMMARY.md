---
phase: 07-before-after-comparison-slider
plan: 02
subsystem: full-integration
tags: [admin-upload, conditional-rendering, fullscreen, compare-page, before-image]
dependency_graph:
  requires: [07-01-slider-component]
  provides: [before-image-upload, comparison-detail-view, fullscreen-compare]
  affects: [edit-page, detail-page, compare-page, app-routes]
tech_stack:
  added: [wx.chooseMedia-single-image, conditional-wx-if-else, custom-navigation-bar]
  patterns: [optional-field-auto-pass-through, zero-backend-change]
key_files:
  created:
    - miniprogram/pages/works/compare.js
    - miniprogram/pages/works/compare.wxml
    - miniprogram/pages/works/compare.wxss
    - miniprogram/pages/works/compare.json
  modified:
    - miniprogram/pages/admin/works/edit.js
    - miniprogram/pages/admin/works/edit.wxml
    - miniprogram/pages/admin/works/edit.wxss
    - miniprogram/pages/works/detail.js
    - miniprogram/pages/works/detail.wxml
    - miniprogram/pages/works/detail.json
    - miniprogram/app.json
decisions:
  - "before_image field auto-passes through ...data spread — zero cloud function changes"
  - "Single-card upload style (240rpx, dashed border) visually distinct from 9-grid main images"
  - "compare.js uses .bind(this) for promise callbacks (no arrow functions) for mini program compat"
metrics:
  duration: 6m
  completed: 2026-04-21
  tasks: 3
  files: 11 (4 new + 7 modified)
---

# Phase 07 Plan 02: Full Integration Summary

**One-liner:** Admin before-image upload + detail page conditional slider rendering + fullscreen black-background compare page — zero backend changes.

## What was built

### Task 1: Admin before-image upload (PORT-07)
- Added `beforeImage` data field to edit page with chooseBeforeImage/removeBeforeImage methods
- Upload reuses `storageService.uploadWorkImages()` — single image via `count: 1` in `wx.chooseMedia`
- Before image processing in `saveWork`: only uploads if not already a cloud:// fileID
- Independent form-block with single-card dashed-border upload area (240rpx height)
- Loads existing `before_image` on edit via `loadWork()`

### Task 2: Detail page conditional rendering (PORT-08)
- Registered `before-after-slider` component in `detail.json`
- `wx:if="{{work.before_image}}"` → shows slider component, `wx:else` → existing swiper
- Gallery counter hidden in compare mode (inside `wx:else` block)
- Share button remains visible in both modes
- `onSliderFullscreen` navigates to `/pages/works/compare?id=` 

### Task 3: Fullscreen compare page (PORT-09)
- New page at `pages/works/compare` with `navigationStyle: custom` and black background
- Custom navbar with back button (white chevron-left) and centered title
- Loads work data by ID via `worksService.getWorkDetail()`
- Slider renders in flex:1 area filling remaining viewport
- Bottom hint: "左右拖动滑块对比效果"
- Loading spinner and error state for missing/invalid data
- `statusBarHeight` from `wx.getSystemInfoSync()` for proper navbar spacing

## Backend verification

Confirmed zero changes needed:
- `cloudfunctions/works/index.js`: create action uses `...data` spread (line 66) — `before_image` auto-passes
- `cloudfunctions/works/index.js`: update action uses `...data` spread (line 84) — same
- `miniprogram/services/works.js`: `createWork(data)` and `updateWork(id, data)` pass data as-is
- Write operations already protected by `requireArtist()` from Phase 6 (Plan 06-01)

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| b7de3e2 | feat(07-02): add before-image upload to admin edit page | edit.js, edit.wxml, edit.wxss |
| 760b679 | feat(07-02): detail page conditional rendering — slider vs swiper | detail.json, detail.js, detail.wxml |
| e711edd | feat(07-02): create fullscreen compare page with custom navbar | compare.*, app.json |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are fully wired.

## Threat Flags

None — all write operations protected by existing `requireArtist()` auth guard. Compare page is read-only public content.

## Self-Check: PASSED

All 10 files (4 component + 4 compare page + 2 summaries) found. All 5 commit hashes verified in git log.
