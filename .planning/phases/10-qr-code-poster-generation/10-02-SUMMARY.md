---
phase: 10-qr-code-poster-generation
plan: 02
subsystem: poster-generation
tags: [canvas-2d, poster, qr-code, save-to-album, permission-handling]
dependency_graph:
  requires: [getShareQRCode-action, works-service, profile-service, auth-service]
  provides: [poster-page-canvas-rendering, save-to-album-flow]
  affects: [miniprogram/pages/works/poster]
tech_stack:
  added: [Canvas 2D API, wx.canvasToTempFilePath, wx.saveImageToPhotosAlbum, wx.getSetting, wx.authorize, wx.openSetting]
  patterns: [DPR-aware canvas rendering, parallel image loading with individual fallbacks, aspectFill manual crop, circular avatar clip]
key_files:
  created:
    - miniprogram/pages/works/poster.js
    - miniprogram/pages/works/poster.json
    - miniprogram/pages/works/poster.wxml
    - miniprogram/pages/works/poster.wxss
  modified: []
decisions:
  - D-08: Canvas 2D API (type="2d") instead of deprecated CanvasContext
  - D-09/D-10: 750×1060 logical size with DPR scaling
  - D-11: Poster layout — main image 750×750 + info area 310px
  - D-12: System fonts, 28px bold name, 20px tags, 18px hint
  - D-13: Parallel image loading via Promise.all
  - D-17: canvasToTempFilePath with DPR-sized export
  - D-18: saveImageToPhotosAlbum for album save
  - D-19: Full permission flow (getSetting → authorize → openSetting)
  - D-21/D-22: Dark overlay UI, offscreen canvas, image preview
  - D-29/D-30: Error handling — QR retry, image placeholders
metrics:
  duration: 3m
  completed: "2026-04-23"
---

# Phase 10 Plan 02: Poster Generation Page Summary

Canvas 2D poster rendering page with DPR-aware drawing, parallel image loading, album save with permission handling, and comprehensive error states.

## What Was Done

### Task 1: Poster Page Data Loading + Canvas Rendering Logic

**Created `miniprogram/pages/works/poster.json`:**
- Custom navigation bar (navigationStyle: custom)
- t-loading component registration
- Black background color

**Created `miniprogram/pages/works/poster.js` (~270 lines):**
- `onLoad`: isArtist permission check, DPR detection, workId extraction
- `loadAndGenerate`: parallel Promise.all loading (work detail + artist profile + QR code)
- `generatePoster`: Canvas 2D initialization with DPR scaling (canvas.width/height × DPR, ctx.scale)
- `loadImages`: parallel image loading via canvas.createImage(), individual catch per image (per D-30)
- `drawPoster`: complete poster layout:
  - Main image 750×750 with manual aspectFill crop calculation
  - Info area 310px with #FDFCF9 background
  - Circular avatar (80px) via ctx.arc + ctx.clip
  - Artist name (28px bold) + style tags (20px, truncated to 12 chars)
  - QR code 150×150 + "扫码查看作品" hint (18px)
  - Gray placeholders for failed image loads
- `exportPoster`: wx.canvasToTempFilePath with DPR-sized dimensions
- `onSavePoster`: full permission flow (getSetting → authorize → showModal → openSetting)
- `doSave`: wx.saveImageToPhotosAlbum with success/failure handling
- `onRetry`: reload on QR generation failure
- `onClose`: wx.navigateBack()

### Task 2: Poster Page UI Template and Styles

**Created `miniprogram/pages/works/poster.wxml`:**
- Custom navbar with close button (matches compare page pattern)
- Loading state with t-loading "海报生成中..."
- Error state with retry button (btn-outline)
- Offscreen canvas: `type="2d"`, `id="posterCanvas"`, CSS hidden
- Image preview: posterImage with widthFix mode + show-menu-by-longpress
- Save button: btn-primary with disabled state during saving

**Created `miniprogram/pages/works/poster.wxss`:**
- Dark overlay background (rgba(0,0,0,0.7))
- Canvas offscreen: position: fixed; left: -9999px
- Preview: 85% width, border-radius, box-shadow for depth
- Action bar: full-width save button with disabled opacity
- Global CSS variables used throughout (--page-pad, --radius-lg, --accent, etc.)

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Commit | Message |
|--------|---------|
| 810f2ef | feat(10-02): poster generation page with Canvas 2D rendering |

## Verification

- [x] poster.js: loadAndGenerate → generatePoster → loadImages → drawPoster → exportPoster flow
- [x] Canvas 2D: canvas.getContext('2d'), DPR × width/height, ctx.scale(dpr, dpr)
- [x] Parallel loading: Promise.all (work + profile + QR per D-23)
- [x] Image loading: canvas.createImage() + individual catch per D-30
- [x] Poster layout: 750×750 main image + 310px info area per D-11
- [x] Circular avatar: ctx.arc + ctx.clip
- [x] aspectFill crop: manual sx/sy/sw/sh calculation
- [x] Export: wx.canvasToTempFilePath with canvas parameter per D-17
- [x] Save: wx.saveImageToPhotosAlbum per D-18
- [x] Permissions: getSetting → authorize → openSetting per D-19
- [x] Errors: QR retry per D-29, image placeholders per D-30
- [x] poster.wxml: canvas type="2d" id="posterCanvas"
- [x] poster.wxss: offscreen canvas (position: fixed; left: -9999px)
- [x] poster.json: t-loading + custom navigation

## Self-Check: PASSED
