---
phase: 06-data-model-extensions-quick-wins
plan: "02"
subsystem: profile
tags: [profile, experience-years, style-tags, edit-page, homepage]
dependency_graph:
  requires: [06-01]
  provides: [experience_years field, style_tags field, STYLE_TAGS constant]
  affects: [profile cloud function, edit page, homepage]
tech_stack:
  added:
    - STYLE_TAGS constant in constants.js
    - experience_years numeric field
    - style_tags array field
  patterns:
    - Tag button group multi-select (same as SERVICE_CATEGORIES pattern)
key_files:
  created: []
  modified:
    - miniprogram/utils/constants.js
    - cloudfunctions/profile/index.js
    - miniprogram/pages/admin/profile/edit.js
    - miniprogram/pages/admin/profile/edit.wxml
    - miniprogram/pages/admin/profile/edit.wxss
    - miniprogram/pages/index/index.wxml
    - miniprogram/pages/index/index.wxss
decisions:
  - D-01: Style tags use preset multi-select (constants.js pattern)
  - D-02: New experience_years numeric field, keep experience text
  - D-04: Homepage hero layout kept, only added experience_years priority display
metrics:
  duration: 2m
  completed: 2026-04-21
---

# Phase 6 Plan 02: Profile Enhancements Summary

Added experience_years numeric field and style_tags multi-select to artist profile, with edit page form and homepage hero display.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add STYLE_TAGS + update cloud function + update edit page | 2e4e92b | constants.js, profile/index.js, edit.js/wxml/wxss |
| 2 | Update homepage display for years and tags | 055f588 | index.wxml, index.wxss |

## Implementation Details

### Constants
- `STYLE_TAGS`: 8 preset style tags (韩系, 自然, 甜美, 气质, 复古, 创意, 清新, 华丽)

### Cloud Function
- `getDefaultProfile()` now includes `experience_years: 0` and `style_tags: []`
- Fields are within the Plan 01 whitelist, so they pass `sanitizeProfileUpdate`

### Edit Page
- New number input for 从业年数 (experienceYears)
- Tag button group for 擅长风格 (8 selectable tags)
- Save sends `experience_years` (parsed as int) and `style_tags` (array of labels)

### Homepage Hero
- `experience_years` shown as "N年经验" with priority over `experience` text field
- `style_tags` shown as accent-colored tags alongside specialties

## Deviations from Plan

None — plan executed exactly as written.
