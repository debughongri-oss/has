---
phase: 02-portfolio-system
plan: 02
subsystem: admin-works
tags: [admin, crud, portfolio, featured-works, image-upload]
dependency_graph:
  requires: [02-01]
  provides: [admin-works-list, admin-works-edit, featured-works-preview]
  affects: [index, profile]
tech-stack:
  added:
    - wx.chooseMedia for image selection
    - cloud storage upload with compression
  patterns:
    - artist identity verification via authService.isArtist()
    - cloud:// prefix check for distinguishing new vs existing images
key-files:
  created:
    - miniprogram/pages/admin/works/list.js
    - miniprogram/pages/admin/works/list.json
    - miniprogram/pages/admin/works/list.wxml
    - miniprogram/pages/admin/works/list.wxss
    - miniprogram/pages/admin/works/edit.js
    - miniprogram/pages/admin/works/edit.json
    - miniprogram/pages/admin/works/edit.wxml
    - miniprogram/pages/admin/works/edit.wxss
  modified:
    - miniprogram/pages/index/index.js
    - miniprogram/pages/index/index.wxml
    - miniprogram/pages/index/index.wxss
    - miniprogram/app.json
    - miniprogram/pages/profile/index.js
decisions:
  - Admin pages in sub-package (pages/admin) to keep main package under 2MB limit
  - Featured works limited to 3 items on home page for performance
  - Image upload uses wx.chooseMedia (not deprecated wx.chooseImage) per Pitfall P8
  - Artist identity verified client-side via authService.isArtist() on admin page load per Pitfall P12
metrics:
  duration: ~5 minutes
  completed_date: 2026-04-17
  tasks_completed: 2
  files_created: 8
  files_modified: 5
---

# Phase 2 Plan 02: Admin Works Management & Featured Works Summary

Artist admin panel for portfolio CRUD management plus featured works preview on the home page — connecting "seeing work" to "booking" intent.

## What Was Done

### Task 1: Admin Works Management Pages
Created complete admin CRUD interface for the artist to manage portfolio items:

- **List page** (`pages/admin/works/list`): Displays all works with cover image, title, category, and image count. Edit and delete actions per item. Delete shows confirmation dialog before removing DB record + cloud storage files. Artist identity verified on page load via `authService.isArtist()`.
- **Edit page** (`pages/admin/works/edit`): Supports both create and edit modes (edit loads existing data by id). Multi-image upload via `wx.chooseMedia` (max 9 images). Category picker from `SERVICE_CATEGORIES`. Description textarea, featured toggle switch. Images processed intelligently — existing cloud:// paths preserved, only new local images uploaded with compression via `storageService.uploadWorkImages`.
- **App config**: Updated `app.json` subPackages to register admin works pages.
- **Profile navigation**: Updated `goToAdminWorks` from placeholder toast to actual `wx.navigateTo` to admin works list.

### Task 2: Home Page Featured Works Preview
Enhanced the home page with a "精选作品" horizontal scroll section:

- Loads top 3 works from `worksService.getWorksList` after profile loads successfully
- Horizontal scroll view showing cover image + title for each featured work
- "查看全部 →" link switches to works tab via `wx.switchTab`
- Tapping a featured work navigates to work detail page
- Section only visible when there are works to display
- Styled consistently with app design system using CSS variables

## Files Created (8)

| File | Purpose |
|------|---------|
| `miniprogram/pages/admin/works/list.js` | Admin works list page logic (CRUD, artist check, delete confirmation) |
| `miniprogram/pages/admin/works/list.json` | TDesign components: loading, empty, dialog |
| `miniprogram/pages/admin/works/list.wxml` | Works list template with add/edit/delete actions |
| `miniprogram/pages/admin/works/list.wxss` | Admin list styles |
| `miniprogram/pages/admin/works/edit.js` | Work create/edit form with image upload |
| `miniprogram/pages/admin/works/edit.json` | TDesign components: loading, toast |
| `miniprogram/pages/admin/works/edit.wxml` | Edit form template (title, category, images, description, featured) |
| `miniprogram/pages/admin/works/edit.wxss` | Edit form styles with fixed save button |

## Files Modified (5)

| File | Change |
|------|--------|
| `miniprogram/app.json` | Added `works/list` and `works/edit` to admin subPackages |
| `miniprogram/pages/profile/index.js` | `goToAdminWorks` navigates to `/pages/admin/works/list` |
| `miniprogram/pages/index/index.js` | Added `worksService` import, `featuredWorks` data, `loadFeaturedWorks`, `goToWorks`, `goToWorkDetail` |
| `miniprogram/pages/index/index.wxml` | Added featured works section with horizontal scroll |
| `miniprogram/pages/index/index.wxss` | Added featured section, scroll, item, cover, and title styles |

## Verification Results

- **Task 1**: PASS — Admin works pages exist with required patterns (`chooseMedia`, `deleteWork`, `isArtist`)
- **Task 2**: PASS — Home page has featured works section (`featuredWorks`, `loadFeaturedWorks`, `featured-section`)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Compliance

| Threat | Disposition | Implementation |
|--------|-------------|----------------|
| T-02-04 (Elevation of Privilege) | mitigate | Client-side `isArtist()` check on both admin pages (`list.js` onLoad, `edit.js` onLoad) — redirects non-artists back |
| T-02-05 (Tampering - images) | accept | Portfolio images are public content |
| T-02-06 (DoS - bulk upload) | accept | 9-image limit enforced in edit page UI |

## Pitfall Compliance

| Pitfall | Status |
|---------|--------|
| P3: Image compression before upload | Handled by `storageService.uploadWorkImages` |
| P8: wx.chooseMedia instead of wx.chooseImage | Used in `edit.js` |
| P12: Admin page artist identity verification | Checked on both list and edit page load |
