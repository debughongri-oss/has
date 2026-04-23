---
phase: 09-customer-review-system
plan: 02
subsystem: reviews
tags: [homepage-display, admin-reviews, review-stats]
dependency_graph:
  requires: [reviews-cloud-function, reviews-service, t-rate-component]
  provides: [homepage-review-module, admin-reviews-list-page]
  affects: [index-page, admin-bookings-list, app.json]
tech_stack:
  added: [t-rate-read-only]
  patterns: [parallel-data-loading, admin-page-pattern, isArtist-guard]
key_files:
  created:
    - miniprogram/pages/admin/reviews/list.js
    - miniprogram/pages/admin/reviews/list.wxml
    - miniprogram/pages/admin/reviews/list.wxss
    - miniprogram/pages/admin/reviews/list.json
  modified:
    - miniprogram/pages/index/index.js
    - miniprogram/pages/index/index.wxml
    - miniprogram/pages/index/index.wxss
    - miniprogram/pages/index/index.json
    - miniprogram/pages/admin/bookings/list.wxml
    - miniprogram/pages/admin/bookings/list.js
    - miniprogram/app.json
decisions:
  - 主页评价模块在 hero 和 portfolio 之间插入（per D-13）
  - loadReviewStats 与 loadFeaturedWorks 并行执行（per D-16）
  - 无评价时整个模块不显示（wx:if per D-15）
  - 管理端评价列表复用 calendar-entry 样式做入口（per D-21）
  - 管理端评价列表 isArtist 权限校验（per T-09-07）
metrics:
  duration: ~3m
  tasks: 2
  files: 11
  completed: 2026-04-23
---

# Phase 09 Plan 02: Homepage Review Display + Admin Review List Summary

化妆师主页评价展示模块（平均评分 + 评价总数 + 最近3条评价）+ 管理端评价列表页 + 评价管理入口按钮。

## What Was Done

### Task 1: Homepage Review Display Module
- index.json: registered t-rate component
- index.js: added reviewsService reference + loadReviewStats method, called in parallel with loadFeaturedWorks
- index.wxml: review module inserted between hero-tags and portfolio sections
- Review module includes: t-rate read-only average display + numeric average + total count + recent 3 review cards
- Conditional rendering: `wx:if="{{reviewStats && reviewStats.total > 0}}"` (per D-15)
- Each review card: t-rate stars + customer nickname + content (single-line ellipsis)
- index.wxss: complete review module styles using CSS variables

### Task 2: Admin Reviews List Page + Review Management Entry
- Created admin/reviews/list page (4 files): js/wxml/wxss/json
- list.js: isArtist permission check, paginated loading, time formatting
- list.wxml: review cards showing customer name, service name (pill badge), t-rate stars, content, date
- list.wxss: admin page styles matching existing admin page patterns
- Modified admin/bookings/list.wxml: added "评价管理" entry button with ⭐ icon
- Modified admin/bookings/list.js: added goToReviews navigation method
- Updated app.json: added `reviews/list` to admin subPackages

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Commit | Message |
|--------|---------|
| a3b08d7 | feat(09-02): homepage review display module |
| e01ebff | feat(09-02): admin reviews list page + review management entry |
