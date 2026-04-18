---
phase: 01-foundation-profile
plan: 01
subsystem: project-skeleton, auth, privacy
tags: [greenfield, wechat-miniprogram, cloud-development, silent-login, privacy]
dependency_graph:
  requires: []
  provides: [project-structure, cloud-init, auth-service, privacy-component, api-layer, global-styles, tabbar-navigation]
  affects: []
tech_stack:
  added:
    - "WeChat Mini Program native framework (WXML/WXSS/JS)"
    - "WeChat Cloud Development (CloudBase)"
    - "TDesign MiniProgram ~1.13.2"
    - "wx-server-sdk ~3.0.4"
  patterns:
    - "Centralized API layer (services/api.js)"
    - "Role detection via OpenID comparison"
    - "Privacy authorization popup (Pitfall P1)"
    - "Sub-package pre-configuration (Pitfall P4)"
    - "CSS custom properties for theming"
key_files:
  created:
    - path: project.config.json
      purpose: WeChat project config with cloud development settings
    - path: miniprogram/app.js
      purpose: App entry with cloud init + silent login trigger
    - path: miniprogram/app.json
      purpose: Pages, tabBar (5 tabs), subPackages, global components
    - path: miniprogram/app.wxss
      purpose: Global styles with CSS custom properties (brand colors, spacing)
    - path: miniprogram/sitemap.json
      purpose: Sitemap config for WeChat search
    - path: miniprogram/utils/constants.js
      purpose: App constants (CLOUD_ENV, ARTIST_OPENID, booking statuses, categories)
    - path: miniprogram/services/api.js
      purpose: Centralized cloud function caller with error handling
    - path: miniprogram/services/auth.js
      purpose: Silent login, role detection, auth state management
    - path: miniprogram/components/privacy/privacy.wxml
      purpose: Privacy authorization popup template
    - path: miniprogram/components/privacy/privacy.js
      purpose: Privacy component logic (getPrivacySetting, agree/disagree)
    - path: miniprogram/components/privacy/privacy.wxss
      purpose: Privacy popup styles
    - path: miniprogram/components/privacy/privacy.json
      purpose: Privacy component config
    - path: cloudfunctions/login/index.js
      purpose: Cloud function for login (openid via getWXContext, user CRUD)
    - path: cloudfunctions/login/package.json
      purpose: Cloud function dependencies (wx-server-sdk)
    - path: cloudfunctions/login/config.json
      purpose: Cloud function permissions config
    - path: miniprogram/images/tab-*.png (10 files)
      purpose: Placeholder TabBar icons (1x1 pixel, user should replace)
  modified: []
decisions:
  - "Used wx.cloud.init in onLaunch (not lazy init) — ensures cloud ready before any API call"
  - "Privacy component registered globally in app.json usingComponents — available on any page"
  - "Admin sub-package pre-configured with empty pages array — prevents P4 package size issues"
  - "OpenID obtained server-side via cloud.getWXContext() — never trusts client-sent identity (T-01-01)"
  - "Role detection client-side for UI purposes only — future admin cloud functions must re-verify server-side (T-01-03)"
  - "ARTIST_OPENID stored as constant — first deployment requires manual update after obtaining openid"
metrics:
  duration: 5m
  tasks_completed: 2
  files_created: 25
  completed_date: 2026-04-17
---

# Phase 1 Plan 01: Project Architecture & Auth System Summary

Centralized API layer, WeChat silent login via wx.login→cloud function→openid, privacy authorization popup (审核必拒项), 5-tab TabBar navigation, admin sub-package pre-configuration, and global CSS custom properties theming — all using WeChat native framework (WXML/WXSS/JS) with Cloud Development.

## What Was Done

### Task 1: Project Structure and Configuration
- Created `project.config.json` with `miniprogramRoot` and `cloudfunctionRoot` pointing to correct directories
- Created `miniprogram/app.js` with `wx.cloud.init` and `authService.silentLogin` on launch
- Created `miniprogram/app.json` with 5 tabBar pages, admin sub-package, `lazyCodeLoading: "requiredComponents"`, and global privacy-popup component registration
- Created `miniprogram/app.wxss` with CSS custom properties for brand colors (#C2185B rose), spacing, typography, and utility classes
- Created `miniprogram/sitemap.json` allowing all pages
- Created `miniprogram/utils/constants.js` with CLOUD_ENV, ARTIST_OPENID, BOOKING_STATUS, SERVICE_CATEGORIES, IMAGE_CONFIG
- Created `miniprogram/services/api.js` with centralized `callCloudFunction` wrapper (error handling, toast notifications)
- Created 10 placeholder TabBar icon PNGs in `miniprogram/images/`
- Installed `tdesign-miniprogram ~1.13.2` via npm

### Task 2: Auth System and Privacy Component
- Created `cloudfunctions/login/index.js` — cloud function handling 'login' (user creation/update via `cloud.getWXContext().OPENID`) and 'getUser' actions
- Created `cloudfunctions/login/package.json` with `wx-server-sdk ~3.0.4`
- Created `cloudfunctions/login/config.json` with permissions config
- Created `miniprogram/services/auth.js` — exports `silentLogin`, `getUserInfo`, `isArtist`, `isLoggedIn`, `clearUserInfo`
- Created privacy popup component (4 files: .js/.json/.wxml/.wxss) with `wx.getPrivacySetting` check and `open-type="agreePrivacyAuthorization"` button

## Verification Results

Both automated verify commands passed:
- ✅ Task 1: All project files exist
- ✅ Task 2: Auth system files exist and contain required patterns (agreePrivacyAuthorization, silentLogin)
- ✅ All 31 acceptance criteria checks passed

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Compliance

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-01-01 | mitigate | ✅ `cloud.getWXContext().OPENID` used — never trusts client-sent openid |
| T-01-02 | accept | ✅ User records contain only openid + role, no PII in Phase 1 |
| T-01-03 | mitigate | ✅ Client-side role detection for UI only; comment documents server-side verification requirement |
| T-01-04 | accept | ✅ Privacy popup is UX compliance; server enforcement is WeChat's responsibility |

## Known Stubs / Placeholders

| Item | File | Reason | Resolution |
|------|------|--------|------------|
| AppID placeholder | `project.config.json` (`"your-appid-here"`) | User must obtain from WeChat admin console | User action: replace with real AppID |
| Cloud env ID placeholder | `miniprogram/utils/constants.js` (`"your-cloud-env-id"`) | User must create cloud environment first | User action: replace with real env ID |
| Artist OpenID empty | `miniprogram/utils/constants.js` (`ARTIST_OPENID = ''`) | Obtained after first deployment | User action: get openid from cloud function logs |
| TabBar icons (1×1 pixels) | `miniprogram/images/tab-*.png` | Placeholder icons, not suitable for production | User action: replace with proper 81×81 icons |
| Page files missing | TabBar pages (index, works/list, etc.) | Created by Plan 02 | Plan 01-02 will create these |

## Next Steps

1. **User setup required:** Replace `your-appid-here` with real AppID, create cloud environment, update `CLOUD_ENV`
2. **Plan 01-02:** Create makeup artist profile display page and TabBar empty state pages
3. **After cloud environment setup:** Deploy login cloud function, get artist OpenID, update `ARTIST_OPENID`

## Files Created (25 total)

**Root:** project.config.json
**miniprogram/:** app.js, app.json, app.wxss, sitemap.json, package.json, package-lock.json
**miniprogram/services/:** api.js, auth.js
**miniprogram/utils/:** constants.js
**miniprogram/components/privacy/:** privacy.js, privacy.json, privacy.wxml, privacy.wxss
**miniprogram/images/:** tab-home.png, tab-home-active.png, tab-works.png, tab-works-active.png, tab-services.png, tab-services-active.png, tab-booking.png, tab-booking-active.png, tab-profile.png, tab-profile-active.png
**cloudfunctions/login/:** index.js, package.json, config.json
