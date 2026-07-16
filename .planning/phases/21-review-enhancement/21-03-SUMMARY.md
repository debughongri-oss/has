---
phase: 21-review-enhancement
plan: 03
subsystem: ui
tags: [admin, filter, sort, delete, subscribe-authorize, thumbnails, anonymous-mark]

requires:
  - phase: 21-01
    provides: getReviewsList extended with filters + deleteReview service
  - phase: 21-02
    provides: 评价现在携带 tags/images/is_anonymous 字段（此页展示）
  - phase: 14-review-reply
    provides: 后台评价列表基础 + 回复编辑器（保留）
  - phase: 20-customer-profiles
    provides: 客户详情页评价记录列表（D-12 一致性同步）
provides:
  - 后台评价管理 .segs 筛选条（rating + tag）+ 排序（latest/highest/lowest）
  - 评价删除 UI（二次确认 + deleteReview + 本地列表移除）
  - 评价卡片展示标签 chips + 图片缩略图（wx.previewImage 全屏）+ 匿名标记
  - 化妆师端 wx.requestSubscribeMessage 授权（新评价通知）
  - 客户详情页匿名评价标记（D-12 一致性）
affects: [21-04, 评价展示一致性]

tech-stack:
  added: []
  patterns:
    - ".segs scroll-x filter bar reused from admin/bookings/list (D-13) — page-scoped styles copied since not in app.wxss"
    - "subscribe authorization on page entry (non-blocking, re-requested each entry to accumulate send quota per WeChat's one-authorization-one-send rule)"
    - "delete with wx.showModal confirm + local list splice (avoids full reload for responsiveness)"

key-files:
  created: []
  modified:
    - miniprogram/pages/admin/reviews/list.js
    - miniprogram/pages/admin/reviews/list.wxml
    - miniprogram/pages/admin/reviews/list.wxss
    - miniprogram/pages/admin/customers/detail.wxml
    - miniprogram/pages/admin/customers/detail.wxss

key-decisions:
  - "requestSubscribeMessage called on every onLoad entry — WeChat's one-authorization-one-send rule means each grant yields one future send; re-requesting on page entry accumulates quota. Non-blocking (artist may decline). (D-23)"
  - "mapTagLabels handles both key-array and {key,label}-object-array server returns — defensive against server return shape changes; maps keys back to labels via REVIEW_TAGS constant. The list endpoint returns full docs (no .field projection), so tags come as stored (key strings)."
  - "Delete uses wx.showModal confirm + local list splice (not full reload) — responsive UX; server syncArtistRating (Plan 21-01) handles avg_rating/total_reviews consistency. If splice count is wrong, pull-down refresh re-syncs."
  - ".segs styles copied into reviews/list.wxss (page-scoped, not global) — bookings/list.wxss owns the original. Preferred over promoting to app.wxss to avoid touching global styles in a feature plan."
  - "anon-mark color uses --gold (matching rate stars) rather than accent (red/pink) — anonymous is a neutral status, not destructive. Consistent with the gold anon-tag in customers/detail."
  - "customer detail query (customers cloud fn) returns full review docs (no .field projection) → is_anonymous already included → no JS/cloud-fn change needed for Task 3, only WXML mark + WXSS style."

patterns-established:
  - "Subscribe authorization trigger point: admin/reviews/list onLoad — chosen over profile page (alternative candidate) because reviews list is the artist's primary 'I want to know about new reviews' surface"
  - "Filter change always resets page=1 and reloads from scratch — pagination state never carries across filter changes"
  - "Card-actions row: reply (left, accent) + delete (right, destructive red) — consistent action layout pattern"

requirements-completed: [REVW-13, REVW-14, REVW-12, REVW-15]

duration: 14min
completed: 2026-07-16
---

# Phase 21 Plan 03: Admin Review Management Summary

**后台评价管理升级为可运营控制台：服务端筛选（评分/标签）+ 排序（最新/最高/最低）+ 删除（二次确认 + 图片清理）+ 标签/缩略图/匿名标记展示 + 化妆师端订阅授权——客户详情页同步匿名标记保持 D-12 一致性**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-07-16T06:56:00Z
- **Completed:** 2026-07-16T07:10:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- **list.js** 新增 `ratingSegs`/`tagSegs`/`currentRating`/`currentTag`/`sortBy`/`sortOptions`/`deletingId` 状态；`onLoad` 调 `requestSubscribeAuthorization()` 非阻塞请求订阅授权；`loadReviews` 构造 `{ratingFilter, tagFilter, sortBy}` filters 传给扩展后的 `getReviewsList`，map 函数加 `tagLabels`/`thumb`/`imageCount`/`isAnonymous`
- **筛选/排序处理器** `onRatingSeg`/`onTagSeg`/`onSortChange` 每次都重置 page=1 + reload(reset=true)
- **图片预览** `onPreviewImage` 用 `wx.previewImage` 接受 cloud fileID 直接全屏查看；**删除** `onDeleteReview` 用 `wx.showModal` 二次确认 + 调 `deleteReview` + 本地列表 splice + toast
- **list.wxml** 顶部 `.filter-bar`（rating segs scroll-x + tag segs scroll-x + 排序行）；每张卡片加 `anon-mark`（后台仍显示真实昵称）、`rtags` 标签 chips、`rthumbs` 缩略图、`card-actions` 行（回复 + 删除）
- **list.wxss** 新增 `.segs`/`.seg--on`/`.sort-opt`/`.sort-opt--on`/`.anon-mark`/`.rtags`/`.rtag`/`.rthumbs`/`.rthumb`/`.delete-action` 样式，全部复用既有 CSS 变量
- **customers/detail.wxml + .wxss** 评价记录项加 `anon-tag`「匿名评价」标记（D-12 一致性，化妆师仍见真实客户上下文）

## Task Commits

1. **Tasks 1+2+3: admin reviews list JS/WXML/WXSS + customers detail anonymous mark**（紧耦合 UI 改动合并提交）— `ac67e2e` (feat)

_注：3 个 task 合并为单提交——JS 的 state 字段、WXML 绑定、WXSS class 名、customers/detail 的 anon-tag 紧耦合，分开提交会产生中间渲染异常状态。_

## Files Created/Modified

- `miniprogram/pages/admin/reviews/list.js` — 筛选/排序/删除/订阅授权/图片预览逻辑
- `miniprogram/pages/admin/reviews/list.wxml` — filter-bar + 卡片增强（标签/缩略图/匿名标记/删除）
- `miniprogram/pages/admin/reviews/list.wxss` — segs/sort/anon-mark/rtag/rthumb/delete-action 样式
- `miniprogram/pages/admin/customers/detail.wxml` — 评价记录项加匿名标记
- `miniprogram/pages/admin/customers/detail.wxss` — `.anon-tag` + `.rdate-wrap` 样式

## Decisions Made

见 frontmatter `key-decisions`。关键选择：

1. **每次进入页面都请求订阅授权**：微信「一次授权 = 一次发送」规则下，每次 onLoad 请求可累积发送配额；非阻塞，化妆师拒绝不影响页面（D-23）
2. **mapTagLabels 兼容两种服务端返回形态**：key 数组或 `{key,label}` 对象数组都正确映射回中文 label（防御性，list 端点返回完整 doc，tags 实际存的是 key 字符串）
3. **删除用本地 splice 而非全量 reload**：响应更快；服务端 syncArtistRating 保证 avg_rating 一致；下拉刷新可校正
4. **anon-mark 用 --gold 而非 --accent**：匿名是中性状态，非破坏性；与客户详情页 anon-tag 视觉一致
5. **.segs 样式复制到本页 wxss**：原样式在 bookings/list.wxss（page-scoped），未提升到 app.wxss 以避免在功能 plan 中触碰全局样式

## Deviations from Plan

**[Plan structural — merged Tasks 1+2+3 into single commit]** 计划分三个提交（list.js / list.wxml+wxss / customers/detail.wxml）。实际 JS 的 state 字段、WXML 绑定、WXSS class、customers/detail anon-tag 紧耦合——分开提交会产生中间状态（JS 提交后 WXML 没引用新字段；WXML 提交后 JS 没 handler 会报错）。合并为单提交保证每个 commit 可独立渲染。**Impact:** 无功能差异，仅提交粒度调整。

**[Rule 2 — added customers/detail.wxss to files_modified]** 计划 files_modified 只列了 customers/detail.wxml，但 Task 3 action 明确说「Add `.anon-tag` style to the existing `customers/detail.wxss` ONLY if a matching rule is absent」——检查发现 absent，所以加了样式。这是计划 action 明确允许的，但 frontmatter files_modified 没列。属于规范的「files_modified 清单滞后于 task action」情况，按 action 执行。

## Issues Encountered

None

## User Setup Required

None — 订阅消息授权在客户端运行时通过 `wx.requestSubscribeMessage` 弹窗完成，无需 dashboard 配置。`SUBSCRIBE_TEMPLATE_ID` 复用项目既有单模板 ID。

## Next Phase Readiness

- 后台评价管理完整：筛选/排序/删除/缩略图/匿名标记/订阅授权全部就绪
- **21-04（首页评价模块）** 可独立开工——读 `getReviewStats()` 的 `average`/`total`（来自 artist_profile 冗余字段）+ `topTags` 标签云 + `recent[]` 匿名化展示
- REVW-15 客户端授权半圈已闭合：化妆师进入评价管理页即弹订阅授权，多次进入累积配额；服务端 push 在 Plan 21-01 create action 已实现

---
*Phase: 21-review-enhancement*
*Completed: 2026-07-16*

## Self-Check: PASSED

All 5 modified files exist on disk. Commit ac67e2e found in git log. All list.js + list.wxml/wxss + customers/detail anonymous-mark pattern checks passed. WXSS braces balanced in both files.
