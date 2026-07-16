---
phase: 21-review-enhancement
plan: 02
subsystem: ui
tags: [client-form, tag-chips, image-upload, anonymous, chooseMedia]

requires:
  - phase: 21-01
    provides: createReview extended signature + REVIEW_TAGS constant
  - phase: 09-customer-review-system
    provides: 评价表单基础结构（rating/content/submitting）
  - phase: 06-data-model-extensions-quick-wins
    provides: works/edit chooseMedia + storage.uploadWorkImages 模式
provides:
  - 客户评价表单支持标签多选（≤5）+ 图片上传（≤3）+ 匿名开关
  - 上传-再-创建提交流程（先 uploadWorkImages 得 fileID 再 createReview）
  - 标签 chip / 图片网格 / 匿名 switch 样式（延续自定义组件风格）
affects: [21-03, 21-04, 评价展示层]

tech-stack:
  added: []
  patterns:
    - "upload-then-create: client uploads images to cloud storage first, passes fileIDs to cloud fn (avoids cloud fn handling large multipart uploads)"
    - "native switch with color attr for accent theming (no TDesign t-switch)"
    - "tag-chip pill with --on selected state using --accent + transparent border"

key-files:
  created: []
  modified:
    - miniprogram/pages/review/create.js
    - miniprogram/pages/review/create.wxml
    - miniprogram/pages/review/create.wxss

key-decisions:
  - "Pass full {key,label} tag objects to createReview — server (Plan 21-01 Task 2) already filters by key against ALLOWED_TAG_KEYS whitelist, so client holds richer data without server trust concern. (T-21-09 accept)"
  - "Image upload failure aborts submit and resets submitting/uploading flags — form never left in stuck state. Cloud fn imgSecCheck (Plan 21-01) is a second fail-closed layer if local file slips through. (D-07, T-21-08 mitigate)"
  - "Native <switch color=\"#C9A96E\"> uses --gold hex inline (switch color attr needs literal hex, not CSS var) — visually matches the gold accent used by rate stars. (D-10)"
  - "Submit button text reflects uploading state ('上传图片中...' / '提交中...' / '提交评价') so user knows why submit is slow during image upload."

patterns-established:
  - "Upload-then-create flow: client uploads media to cloud storage, then calls cloud fn with fileIDs — keeps cloud fn stateless and avoids large event payloads"
  - "Tag chip pattern: flex-wrap row + pill chips with --on accent state, reusable for future multi-select UIs"

requirements-completed: [REVW-10, REVW-11, REVW-12]

duration: 9min
completed: 2026-07-16
---

# Phase 21 Plan 02: Customer Review Form Summary

**评价表单从「文字+星级」升级为「标签 chip 多选 + 1-3 图片上传 + 匿名开关」——延续项目自定义组件风格（rate-star/textarea），上传-再-创建两阶段提交流程，标签/图片/匿名三项增强字段透传 Plan 01 后端**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-07-16T06:46:00Z
- **Completed:** 2026-07-16T06:55:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- **create.js** 新增 `tags`/`selectedTagKeys`/`images`/`maxImages`/`isAnonymous`/`uploading` 状态；新增 `onToggleTag`（最多 5 标签，超限 toast）、`onChooseImage`（复用 works/edit chooseMedia + sizeType compressed）、`onRemoveImage`、`onToggleAnonymous` 处理器
- **onSubmit 重写为上传-再-创建**：先 `storageService.uploadWorkImages` 得 fileID[]（失败 toast + 重置状态），再把 selectedTagKeys 映射回完整 `{key,label}` 对象，调用 `createReview(bookingId, rating, content, { tags, imageFileIDs, isAnonymous })`
- **create.wxml** 三个新 block：服务标签 chip 行（含已选数计数）、图片网格（200rpx cell + 移除 × + 虚线添加 cell）、匿名评价 switch（带提示文案）
- **create.wxss** 标签 chip pill 样式（选中态 accent + 阴影）、图片网格 cell + 移除徽章 + 虚线添加 cell、匿名行 flex 布局——全部复用既有 CSS 变量（--accent/--gold/--text-tertiary/--accent-soft/--accent-medium），无新调色板

## Task Commits

1. **Task 1+2: form JS + WXML/WXSS**（UI 整体一气呵成）— `02229ed` (feat)

_注：原计划两个 task 在同一提交内完成，因为 JS handler 和 WXML/WXSS markup 紧耦合——JS 的 setData 字段与 WXML 的绑定、WXSS 的 class 名相互依赖，拆开提交会在中间状态渲染异常。_

## Files Created/Modified

- `miniprogram/pages/review/create.js` — 新增 tag/image/anonymous 状态与处理器；onSubmit 重写为上传-再-创建
- `miniprogram/pages/review/create.wxml` — 标签 chip 行 + 图片网格 + 匿名 switch block
- `miniprogram/pages/review/create.wxss` — tag-chip / img-grid / anon-row 样式

## Decisions Made

见 frontmatter `key-decisions`。关键选择：

1. **传完整 `{key,label}` 标签对象给 createReview**：服务端已对 key 做白名单过滤（Plan 21-01 Task 2），客户端持有更丰富数据无安全顾虑（T-21-09 accept）
2. **图片上传失败即中止提交**：重置 submitting/uploading 标志，表单不卡死；服务端 imgSecCheck 是第二道 fail-closed 防线
3. **switch color 用字面 hex `#C9A96E`**：原生 switch 的 color 属性不接受 CSS 变量，需内联字面色值，视觉对齐 --gold
4. **提交按钮文字反映 uploading 状态**：上传中显示「上传图片中...」，避免用户以为提交卡住

## Deviations from Plan

**[Plan structural — merged Task 1 + Task 2 into single commit]** 计划把 create.js（Task 1）和 create.wxml/wxss（Task 2）分两提交，但 JS 的 setData 字段（selectedTagKeys/images/isAnonymous/uploading）与 WXML 绑定、WXSS class 名强耦合——分开提交会产生中间状态：单独提交 JS 时 WXML 还没引用新字段（无害但无意义），单独提交 WXML 时 JS 还没 handler（点击报错）。合并为单提交保证每个 commit 都可独立渲染运行。**Impact:** 无功能差异，仅提交粒度调整。

## Issues Encountered

None

## User Setup Required

None — 表单复用既有 `storage.uploadWorkImages`（云存储已开通）和 `chooseMedia`（微信原生 API），无新增外部配置。

## Next Phase Readiness

- 客户评价输入侧就绪：tags + images + is_anonymous 三项增强字段透传到 Plan 01 后端
- **21-03（后台评价管理）** 可调用 `getReviewsList(page, pageSize, {ratingFilter, tagFilter, sortBy})` 展示带图/带标签/带匿名标记的评价列表，并实现 deleteReview UI
- **21-04（首页评价模块）** 可读 `getReviewStats().recent[]` 的 tags/images/is_anonymous 字段做匿名化展示与标签云

---
*Phase: 21-review-enhancement*
*Completed: 2026-07-16*

## Self-Check: PASSED

All 3 modified files exist on disk. Commit 02229ed found in git log. All create.js + wxml/wxss pattern checks passed.
