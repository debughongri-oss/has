# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

化妆师个人作品展示与预约小程序 — a WeChat Mini Program for an independent makeup artist to showcase a portfolio, list services, and take client bookings. Native WeChat framework (WXML/WXSS/JS) + WeChat CloudBase serverless backend (cloud functions, cloud database, cloud storage). UI built with `tdesign-miniprogram`.

There is no Node CLI build/test/lint. Everything is built, previewed, and deployed through **WeChat Developer Tools** (IDE). AppID and CloudBase env are already wired into config.

## Build / Run / Deploy

All actions happen inside WeChat Developer Tools:

- **Frontend deps:** `npm install` in `miniprogram/`, then IDE menu **Tools → Build NPM** to compile `tdesign-miniprogram` into `miniprogram/miniprogram_npm/`. Re-run Build NPM whenever deps change.
- **Cloud functions:** right-click a folder under `cloudfunctions/` → **Upload and Deploy: Cloud Install Dependencies (云端安装依赖)**. Each function has its own `package.json`.
- **Run / debug:** the IDE **Simulator**; inspect data in the **Cloud Development (云开发) console**.
- **Tests:** none exist. Verify changes in the Simulator and on a real device.

## Architecture

### Three-layer call flow (always use it)

Every backend interaction flows: **Page → `miniprogram/services/<domain>.js` → `miniprogram/services/api.js` → `cloudfunctions/<domain>/index.js`**.

- `services/api.js` exposes the single primitive `callCloudFunction(name, data)`. It is the only place that calls `wx.cloud.callFunction`, and it centralizes error handling (shows a toast and rejects on failure). Do not call `wx.cloud.callFunction` directly from pages.
- Domain service modules (`services/auth.js`, `bookings.js`, `works.js`, `services.js`, `profile.js`, `reviews.js`, `storage.js`) wrap `callCloudFunction` per use case, pass an `action`, and `throw` when `result.errCode !== 0`.
- **Response contract:** cloud functions return `{ errCode, errMsg, data }`. `errCode: 0` means success; any other value is an error. Keep this shape for every action.

### Action-based cloud functions

Each `cloudfunctions/<domain>/index.js` is one function with `exports.main = async (event) => { switch (event.action) { ... } }`. Add a new operation by adding a `case`, not a new function. `config.json` declares any required `openapi` permissions (e.g. `works` needs `wxacode.getUnlimitedQRCode`).

### Single-artist role model

There is no `role` field in the database. "Is this the artist?" is decided by comparing the caller's WeChat OPENID against a hardcoded `ARTIST_OPENID`:

- **Client side:** `services/auth.js` → `isArtist()` (silent login via `wx.login` → `login` cloud function → cached `_userInfo`).
- **Server side:** `cloudfunctions/shared/auth.js` → `requireArtist(wxContext)` and `sanitizeProfileUpdate(data)` (field whitelist). Mutating/admin cloud function actions must gate on `requireArtist` — never trust a client-sent role.

### Admin subpackage

Artist-only management screens live in the `pages/admin/` **subPackage** (works/services/bookings/profile/reviews editors) to keep the main package small. User-facing pages live at `pages/<domain>/`.

## Conventions & gotchas

- **Constants are centralized in `miniprogram/utils/constants.js`** — `CLOUD_ENV`, `ARTIST_OPENID`, `BOOKING_STATUS` enum, service categories, style tags, image limits, `SUBSCRIBE_TEMPLATE_ID`. Import from here; do not hardcode these elsewhere in `miniprogram/`.
- **Duplicated values that must be kept in sync manually:**
  - `ARTIST_OPENID` is hardcoded in **both** `miniprogram/utils/constants.js` **and** `cloudfunctions/shared/auth.js`.
  - The subscribe-message template id lives in `constants.js` (`SUBSCRIBE_TEMPLATE_ID`), `cloudfunctions/bookings/index.js`, and `cloudfunctions/booking-reminder/index.js`.
  - Changing the artist account or template requires editing every copy.
- **`cloudfunctions/shared/` is NOT a deployable cloud function** — it is a shared module imported by sibling functions (`bookings`, `works`, `services`, `profile`) via `require('../shared/auth')`. It must be present alongside those functions when they run.
- **Booking notifications** use WeChat subscribe messages; `booking-reminder` is a scheduled function. The artist must have granted the subscribe-message template.
- **Database collections:** `artist_profile`, `services`, `works`, `bookings`, `reviews`, `users`.
- **Booking time slots** are a fixed list defined server-side in `cloudfunctions/bookings/index.js` (`TIME_SLOTS`); availability is computed by excluding slots already in `pending`/`accepted` state.

## Other agent docs

`AGENTS.md` and `GEMINI.md` cover the same project for other tools; `.planning/` holds the GSD planning history (phases/plans/summaries). Prefer this file, but those have additional background. `AGENTS.md` also describes an optional GSD workflow (`/gsd-*`) — not required for normal edits here.
