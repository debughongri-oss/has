---
phase: 10-qr-code-poster-generation
plan: 01
subsystem: backend-infra
tags: [cloud-function, qrcode, wxacode, service-layer, detail-page]
dependency_graph:
  requires: [works-cloud-function, shared-auth, services-works, services-auth]
  provides: [getShareQRCode-action, poster-route, detail-poster-entry]
  affects: [cloudfunctions/works, miniprogram/services/works, miniprogram/pages/works/detail]
tech_stack:
  added: [cloud.openapi.wxacode.getUnlimitedQRCode, cloud.downloadFile, cloud.uploadFile]
  patterns: [QR code caching to cloud storage, requireArtist permission]
key_files:
  created: []
  modified:
    - cloudfunctions/works/index.js
    - cloudfunctions/works/config.json
    - miniprogram/services/works.js
    - miniprogram/pages/works/detail.js
    - miniprogram/pages/works/detail.wxml
    - miniprogram/pages/works/detail.wxss
    - miniprogram/app.json
decisions:
  - D-04: getShareQRCode in works cloud function (not standalone)
  - D-05: cloud.openapi.wxacode.getUnlimitedQRCode for QR generation
  - D-06: QR params — scene=workId, page=detail, brand color lines
  - D-07: QR cached to cloud storage qrcodes/{workId}.png
  - D-26: requireArtist server-side verification on getShareQRCode
  - D-27: getShareQRCode(id) in works.js service module
  - D-28: poster page in main package (not admin subpackage)
metrics:
  duration: 4m
  completed: "2026-04-23"
---

# Phase 10 Plan 01: Backend QR Code Infrastructure + Detail Page Entry Summary

QR code generation via cloud function with cloud storage caching + artist-only "生成海报" button in works detail page.

## What Was Done

### Task 1: getShareQRCode Cloud Function + Service Layer

**Modified `cloudfunctions/works/config.json`:**
- Added `wxacode.getUnlimitedQRCode` to openapi permissions array

**Modified `cloudfunctions/works/index.js`:**
- New `getShareQRCode` action with `requireArtist` permission check
- Cloud storage cache: tries `downloadFile(qrcodes/{id}.png)` first, falls through to generation on cache miss
- QR generation: `cloud.openapi.wxacode.getUnlimitedQRCode()` with scene=workId, page=pages/works/detail, brand color (#9C7A5A) lines
- Upload result buffer to cloud storage for future cache hits

**Modified `miniprogram/services/works.js`:**
- New `getShareQRCode(id)` method calling works cloud function
- Exported in module.exports

### Task 2: Detail Page "生成海报" Button + Poster Route

**Modified `miniprogram/pages/works/detail.js`:**
- Imported `authService` for client-side isArtist check
- Added `isArtist: false` to page data
- `onLoad`: sets `isArtist` via `authService.isArtist()`
- New `goToPoster()` method: navigates to `/pages/works/poster?id={workId}`

**Modified `miniprogram/pages/works/detail.wxml`:**
- Added "生成海报" button with `wx:if="{{isArtist}}"` and `btn-outline` class
- Button placed above "预约此妆容" in detail-action area

**Modified `miniprogram/pages/works/detail.wxss`:**
- Added `.action-poster` style: full width, 16rpx bottom margin

**Modified `miniprogram/app.json`:**
- Registered `pages/works/poster` route (after `pages/works/compare`)

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Commit | Message |
|--------|---------|
| 414738f | feat(10-01): QR code cloud function + detail page poster entry |

## Verification

- [x] works 云函数 getShareQRCode action 含 requireArtist + getUnlimitedQRCode + cloud storage caching
- [x] config.json 含 wxacode.getUnlimitedQRCode openapi 权限
- [x] works.js 导出 getShareQRCode 方法
- [x] detail.js 含 authService 引用 + isArtist data + goToPoster 方法
- [x] detail.wxml detail-action 含 "生成海报" 按钮 (wx:if=isArtist)
- [x] detail.wxss 含 action-poster 样式
- [x] app.json pages 含 pages/works/poster

## Self-Check: PASSED
