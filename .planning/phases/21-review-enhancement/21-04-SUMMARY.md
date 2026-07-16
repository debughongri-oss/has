---
phase: 21-review-enhancement
plan: 04
subsystem: ui
tags: [index, performance, tag-cloud, redundancy-read, anonymous-display]

requires:
  - phase: 21-01
    provides: getStats 返回 topTags + avg/total from artist_profile redundancy
  - phase: 21-02
    provides: 评价现在携带 tags/is_anonymous 字段（getStats recent 投影）
provides:
  - 首页评价统计读 artist_profile 冗余字段（零计算、与首页其它展示零漂移）
  - 「大家这样说」高频标签云（top 5，口碑转化）
  - 公开侧匿名化（is_anonymous → 匿名客户）
affects: []

tech-stack:
  added: []
  patterns:
    - "Read redundancy from already-loaded profile over re-fetching — avoids extra query + keeps numbers consistent across surfaces"
    - "Public-side anonymization via displayNickname map (defense-in-depth alongside server is_anonymous flag)"

key-files:
  created: []
  modified:
    - miniprogram/pages/index/index.js
    - miniprogram/pages/index/index.wxml
    - miniprogram/pages/index/index.wxss

key-decisions:
  - "Prefer this.data.artist.avg_rating over getStats().average — profile is already loaded for the hero section, so reusing it avoids drift between the two surfaces (D-20). Fallback to getStats values if profile not yet loaded (artist null)."
  - "getStats still called for recent + topTags — those need reviews collection queries (recent 3 + tag frequency). The redundancy optimization only applies to avg/total headline numbers."
  - "displayNickname computed in JS (not WXML) — keeps template logic-free and makes the anonymization rule explicit/testable. Falls back to '匿名客户' for missing nicknames too."
  - "Tag cloud uses --gold tint (matches rate stars + anon-tag) rather than --accent — reviews are trust content, gold reads as 'earned reputation' vs accent's 'action' semantics. Echoes create-form tag-chip pill shape (D-02 visual consistency)."
  - "No image rendering on index per D-08 — keeps the landing page light (recent objects retain images field but WXML ignores it). Review images surface on the admin list (Plan 21-03) and review form (Plan 21-02)."

patterns-established:
  - "Redundancy-read pattern: client-side prefer already-loaded redundancy fields over re-fetching from stats endpoints — single source of truth per page load"
  - "Public anonymization: displayNickname layer in JS maps is_anonymous → 匿名客户; WXML never renders raw user_nickname on public surfaces"

requirements-completed: [REVW-14, REVW-10]

duration: 8min
completed: 2026-07-16
---

# Phase 21 Plan 04: Index Review Module Summary

**首页评价模块读 artist_profile 冗余字段（零聚合计算）+ 「大家这样说」高频标签云（top 5，金色 pill 呼应评价表单 chip）+ 公开侧匿名化（is_anonymous → 匿名客户）——更轻、更具说服力的口碑入口**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-16T07:11:00Z
- **Completed:** 2026-07-16T07:19:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- **loadReviewStats 重构**：avg/total 优先读 `this.data.artist.avg_rating/total_reviews`（已加载的 profile 冗余字段，与首页 hero 区零漂移），profile 缺失时回退 getStats 值；getStats 仍调（拿 recent + topTags）
- **公开侧匿名化**：recent 数组 map 出 `displayNickname`——`is_anonymous` 评价展示「匿名客户」，非匿名评价缺昵称也兜底为「匿名客户」；WXML 用 `displayNickname` 而非原始 `user_nickname`
- **topTags 提取 top 5**：从 getStats 响应切出，传入 reviewStats 供 WXML 渲染
- **index.wxml**：review-quote 署名改用 `displayNickname`；review-card 后新增 `tag-cloud` block（「大家这样说」+ cloud-chip 列表，每 chip 显示 label + ×count）
- **index.wxss**：`.tag-cloud` 卡片 + `.cloud-chip` 金色 pill（`--gold-bg` 底 + 金色边框 + `--gold` 计数），pill 形状呼应评价表单的 `.tag-chip`（D-02 视觉一致）
- **D-08 约束遵守**：首页不渲染评价图片，recent 对象保留 images 字段但 WXML 不引用

## Task Commits

1. **Tasks 1+2: index.js + WXML/WXSS**（紧耦合 UI 改动合并提交）— `29c6a4c` (feat)

## Files Created/Modified

- `miniprogram/pages/index/index.js` — loadReviewStats 重构（冗余读取 + displayNickname map + topTags 提取）
- `miniprogram/pages/index/index.wxml` — 署名用 displayNickname + 新增 tag-cloud block
- `miniprogram/pages/index/index.wxss` — `.tag-cloud` / `.cloud-chip` / `.cloud-chip-label` / `.cloud-chip-count` 样式

## Decisions Made

见 frontmatter `key-decisions`。关键选择：

1. **avg/total 读 profile 而非 getStats**：profile 已为 hero 加载，复用避免与 hero 区数字漂移（D-20）
2. **displayNickname 在 JS 算**：保持 WXML 无逻辑、匿名规则可测；兜底缺昵称情况
3. **tag-cloud 用金色而非 accent**：评价是信任内容，金色读作「挣来的声誉」，accent 留给 CTA 动作；pill 形状呼应评价表单 chip
4. **首页不渲染评价图片（D-08）**：保持落地页轻量；图片在评价表单（Plan 21-02）和后台列表（Plan 21-03）查看

## Deviations from Plan

**[Plan structural — merged Tasks 1+2 into single commit]** JS 的 `displayNickname`/`topTags` 字段、WXML 的绑定、WXSS 的 `.tag-cloud`/`.cloud-chip` class 紧耦合——分开提交会产生中间状态（JS 提交后 WXML 还用旧字段；WXML 提交后 JS 还没算 displayNickname 会渲染 undefined）。合并为单提交保证每个 commit 可独立渲染。**Impact:** 无功能差异，仅提交粒度调整。

## Issues Encountered

None

## User Setup Required

None — 首页纯前端改动，复用既有 profile/reviews 服务，无新增配置。

## Next Phase Readiness

- Phase 21 全部 4 个 plan 已完成，进入 phase-level verification 阶段
- REVW-14 读写双侧闭合：写入（Plan 21-01 create/delete 同步）+ 读取（Plan 21-04 首页 + 后台 getStats）
- REVW-10 读写双侧闭合：客户端选择（Plan 21-02）+ 后台筛选展示（Plan 21-03）+ 首页标签云聚合（Plan 21-04）
- REVW-12 匿名三层处理：服务端存原始 + 返回 is_anonymous 标记（Plan 21-01）+ 公开侧匿名化（Plan 21-04）+ 后台仍见真实身份 + 标记（Plan 21-03）
- 已知一致性约束：`reviews/index.js` 的 `ALLOWED_TAG_KEYS` / `TAG_LABELS` 与 `miniprogram/utils/constants.js` 的 `REVIEW_TAGS` 是副本——改标签清单需两处同步

---
*Phase: 21-review-enhancement*
*Completed: 2026-07-16*

## Self-Check: PASSED

All 3 modified files exist on disk. Commit 29c6a4c found in git log. All index.js + wxml/wxss pattern checks passed. WXSS braces balanced (76).
