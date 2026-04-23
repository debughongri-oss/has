# Phase 10: QR Code & Poster Generation - Discussion Log

**Date:** 2026-04-23
**Phase:** 10 - QR Code & Poster Generation
**Status:** Context gathered, ready for planning

## Discussion Trace

### 1. Poster Trigger Point: Where and Who

**Question:** Where should the "generate poster" button be placed, and who can use it?

**Analysis:**
- The ROADMAP specifies "化妆师在作品详情页可生成" — both location and user are defined
- Current detail page has a `detail-action` area with "预约此妆容" and "咨询" buttons
- Artist-only visibility requires client-side role check (established pattern: ARTIST_OPENID comparison)
- Two UI options: (a) new button in existing action area, (b) separate entry above/below

**Options considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| Add to detail-action | Same row as "预约" and "咨询" buttons | Consistent layout, familiar position | May crowd the action area |
| Separate section above action | Standalone "推广工具" section | More space for explanation | Adds vertical height to page |
| Floating action button | FAB overlay on detail page | Doesn't affect page layout | Non-standard for this app |

**Decision (D-01, D-02, D-03):** Add to existing detail-action area. Artist-only via ARTIST_OPENID check. Navigate to dedicated poster page.

### 2. QR Code Generation: API and Architecture

**Question:** How to generate the mini program QR code that links to a specific work?

**Analysis:**
- Three WeChat APIs for QR codes: `getQRCode` (limited to 100k), `getUnlimitedQRCode` (unlimited), `createQRCode` (deprecated)
- Cloud functions can call server APIs via `cloud.openapi` without manual access_token management
- QR code needs to encode the work ID so scanning goes to the right detail page
- The `scene` parameter in getUnlimitedQRCode has a 32-char limit

**Options considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| `getUnlimitedQRCode` via cloud function | Unlimited QR codes, cloud handles auth | No token management, unlimited supply | Requires cloud function |
| `getQRCode` via cloud function | Standard QR codes | Simpler API | 100k limit, not needed |
| Client-side QR library | Generate QR code image on client | No server round-trip | Can't encode mini program path, custom QR not scan-target |

**Decision (D-04, D-05, D-06, D-07):** Use `cloud.openapi.wxacode.getUnlimitedQRCode()` in works cloud function. Upload buffer to cloud storage for caching. Return fileID.

### 3. Canvas Rendering Approach

**Question:** How to render the poster image — visible canvas, offscreen canvas, or server-side?

**Analysis:**
- WeChat Mini Program supports Canvas 2D API (`type="2d"`) which is the current standard
- Server-side rendering is not available in cloud functions (no headless browser)
- Offscreen canvas (`wx.createOffscreenCanvas`) has limited compatibility
- The main technical risk (noted in STATE.md): Canvas 2D needs real-device testing for DPR handling

**Options considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| Canvas 2D (type="2d") | New standard, Image object support | Modern API, better performance | DPR handling needs testing |
| Legacy CanvasContext | Old API, widely documented | More examples available | Deprecated, limited features |
| OffscreenCanvas | wx.createOffscreenCanvas | No visible canvas element | Compatibility issues |

**Decision (D-08, D-09, D-10, D-22):** Canvas 2D with off-screen rendering (canvas hidden via CSS). Export to image for display. DPR handled via `ctx.scale(dpr, dpr)`.

### 4. Poster Layout Design

**Question:** What should the poster look like?

**Analysis:**
- Poster needs: work image (visual appeal), artist info (branding), QR code (action)
- Must be visually appealing for WeChat Moments sharing
- Must match app's visual language (warm tones, clean design)
- Standard poster ratio: roughly 3:4 or 9:16

**Layout decision (D-11):**
```
┌──────────────────────────────┐
│                              │
│     Work Image               │  750 × 750
│     (aspectFill crop)        │
│                              │
├──────────────────────────────┤
│  ┌────┐                      │
│  │ Av │ Artist Name          │  Info area: 310px
│  │ at │ ⭐ Style tags        │  Background: #FDFCF9
│  └────┘                      │
│                   ┌────────┐ │
│  "扫码查看作品"   │ QR Code│ │
│                   │ 150×150│ │
│                   └────────┘ │
└──────────────────────────────┘
Total: 750 × 1060
```

**Rationale:**
- Large work image (70% of poster) maximizes visual impact
- Clean info section with brand colors maintains visual consistency
- QR code bottom-right follows convention (easy to scan)
- Overall ratio 750:1060 ≈ 1:1.41 is standard for shareable images

### 5. Save to Album Flow

**Question:** How should the save-to-album experience work?

**Analysis:**
- `wx.saveImageToPhotosAlbum()` requires `scope.writePhotosAlbum` permission
- Permission flow must handle: first-time grant, previous denial, settings redirect
- Canvas export via `wx.canvasToTempFilePath()` converts canvas to temp image file
- The export must use canvas dimensions × DPR for high-quality output

**Decision (D-17, D-18, D-19, D-20):**
- Canvas → temp file via `wx.canvasToTempFilePath()` (canvas parameter, not canvasId)
- Permission flow: check → request → guide to settings if denied
- Success feedback: Toast "海报已保存到相册"

### 6. Image Loading Strategy

**Question:** How to load multiple images into Canvas for the poster?

**Analysis:**
- Canvas 2D supports `canvas.createImage()` for loading images
- Three images needed: work photo, artist avatar, QR code
- All can load in parallel, but must all complete before drawing
- Cloud storage fileIDs can be used directly as `img.src`

**Options considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| Promise.all parallel load | Load all 3 images simultaneously | Fastest | Error handling more complex |
| Sequential load | Load one by one | Simpler error handling | Slower |
| Pre-download + parallel | Download to temp files first | More reliable loading | Extra step, slower |

**Decision (D-13, D-14, D-15, D-16):** Parallel load via Promise.all with individual error fallbacks. Cloud storage fileIDs work directly as img.src.

### 7. Page Architecture

**Question:** New page, overlay component, or modal?

**Options considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| New page `/pages/works/poster` | Dedicated page with canvas | Clean separation, full space | Navigation overhead |
| Overlay component | Component rendered on detail page | No navigation | Canvas in component can be tricky |
| Half-screen modal | Pop-up from bottom | Modern feel | Limited space for poster preview |

**Decision (D-03, D-21, D-22, D-23, D-28):** New page following the compare page pattern. Canvas hidden off-screen, poster shown as exported image. Simpler and more reliable.

### 8. Additional Decisions

- **D-12:** Font: system default (no custom fonts for poster — too much complexity for no visible benefit)
- **D-24/D-25/D-26:** Cloud function: add to existing `works` function, QR cached at `qrcodes/{workId}.png`, requireArtist verified
- **D-27:** Client service: add `getShareQRCode(id)` to works.js
- **D-29/D-30/D-31:** Error handling: QR failure = toast + retry; image failure = placeholder; save failure = permission flow

## Summary of Locked Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D-01 | "生成海报" button in detail-action area | Consistent with existing button layout |
| D-02 | Artist-only visibility (ARTIST_OPENID check) | Poster is artist's marketing tool |
| D-03 | Navigate to dedicated poster page | Canvas needs own DOM space; follows compare page pattern |
| D-04 | Add getShareQRCode to works cloud function | QR code is works-domain logic |
| D-05 | Use getUnlimitedQRCode API | Unlimited generation, cloud handles auth |
| D-06 | QR code config: scene=workId, accent color | Brand consistency, correct deep link |
| D-07 | QR code cached in cloud storage | Avoid redundant API calls |
| D-08 | Canvas 2D API (type="2d") | Modern, performant, recommended standard |
| D-09 | Canvas 750×1060 logical, ×DPR actual | Standard width, good poster ratio |
| D-10 | DPR via ctx.scale(dpr, dpr) | Standard high-DPI rendering approach |
| D-11 | Layout: work image + artist info + QR code | Visual impact + branding + action |
| D-12 | System font, no custom fonts | Simplicity, reliability |
| D-13 | Parallel image loading with Promise.all | Fastest poster generation |
| D-14 | Work image from images[0] | Primary portfolio image |
| D-15 | Avatar from artist_profile, fallback to default | Graceful degradation |
| D-16 | QR from cloud function fileID | Cached, reliable |
| D-17 | canvasToTempFilePath with DPR dimensions | High-quality export |
| D-18 | saveImageToPhotosAlbum for saving | Standard save API |
| D-19 | Full permission handling flow | UX best practice |
| D-20 | Toast on save success | User feedback |
| D-21 | Poster page: dark overlay + centered image + save button | Clean preview experience |
| D-22 | Canvas hidden, show exported image | Avoid rendering inconsistencies |
| D-23 | Parallel data loading on page load | Fastest poster generation |
| D-24 | works cloud function new action | Minimal infrastructure change |
| D-25 | QR stored at qrcodes/{workId}.png | Deterministic path for cache |
| D-26 | requireArtist on getShareQRCode | Prevent API abuse |
| D-27 | getShareQRCode in works.js service | Follows service module pattern |
| D-28 | poster in main package pages | Avoids cross-package navigation |
| D-29 | Error: toast + retry for QR failure | User-friendly error handling |
| D-30 | Error: placeholder for image failure | Non-blocking poster generation |
| D-31 | Error: permission flow for save failure | Guided recovery |

## Estimated Files

**New Files (5):**
- `miniprogram/pages/works/poster.js` — Poster generation page logic
- `miniprogram/pages/works/poster.wxml` — Poster page template (canvas + preview)
- `miniprogram/pages/works/poster.wxss` — Poster page styles
- `miniprogram/pages/works/poster.json` — Page config

**Modified Files (5):**
- `miniprogram/pages/works/detail.js` — Add isArtist check + goToPoster method
- `miniprogram/pages/works/detail.wxml` — Add "生成海报" button (artist-only)
- `miniprogram/pages/works/detail.wxss` — Style poster button
- `cloudfunctions/works/index.js` — Add getShareQRCode action
- `miniprogram/services/works.js` — Add getShareQRCode method
- `miniprogram/app.json` — Add pages/works/poster to pages array

## Deferred Ideas

- Multi-template poster selection — single high-quality template sufficient for MVP
- Direct share to WeChat Moments (beyond save-to-album) — complex sharing API, save-to-album covers the use case
- Batch poster generation from works list — low priority, single generation meets core need
- Custom text overlay on poster — adds input UI complexity
- Client-side poster caching — cloud QR cache sufficient, avoid storage management
