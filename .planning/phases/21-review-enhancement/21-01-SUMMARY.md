---
phase: 21-review-enhancement
plan: 01
subsystem: api
tags: [cloud-function, wechat-cloud, content-security, subscribe-message, aggregate]

requires:
  - phase: 09-customer-review-system
    provides: reviews 云函数 + msgSecCheck fail-closed 策略
  - phase: 14-review-reply
    provides: reply action + requireArtist 鉴权模式
  - phase: 19-booking-experience
    provides: booking-reminder subscribeMessage.send 服务端发送模式
provides:
  - reviews create action 支持 tags/images/is_anonymous + imgSecCheck + avg_rating 冗余同步 + 新评价推送
  - reviews delete action（requireArtist 鉴权 + 云存储图片清理 + 冗余同步）
  - reviews list 服务端筛选排序（rating_filter/tag_filter/sort_by）
  - reviews getStats 读 artist_profile 冗余字段 + topTags 高频标签聚合
  - REVIEW_TAGS 共享常量（5 个预设标签）
  - services/reviews.js 扩展签名 + deleteReview
  - artist_profile 默认 avg_rating/total_reviews 字段
affects: [21-02, 21-03, 21-04, 评价展示, 评价管理, 首页评价模块]

tech-stack:
  added: []
  patterns:
    - "recompute aggregate for redundancy sync (concurrency-safe over incremental math in weak-tx cloud DB)"
    - "fail-closed imgSecCheck per image mirroring msgSecCheck D-24"
    - "subscribeMessage push wrapped in try/catch + swallow (booking-reminder D-10 pattern)"
    - "cloud function duplicates constants (REVIEW_TAGS / SUBSCRIBE_TEMPLATE_ID) since miniprogram imports are unreachable"

key-files:
  created: []
  modified:
    - cloudfunctions/reviews/index.js
    - cloudfunctions/reviews/config.json
    - miniprogram/utils/constants.js
    - miniprogram/services/reviews.js
    - cloudfunctions/profile/index.js

key-decisions:
  - "Recompute aggregate chosen for avg_rating sync over incremental math — WeChat cloud DB has weak transactions; incremental suffers FP drift + races under concurrent writes. Review volume per artist is tiny → recompute cost negligible. Self-healing on drift. (D-19)"
  - "imgSecCheck downloads each fileID via cloud.downloadFile then scans buffer — fail-closed on violation errCode (87014) AND on any API throw, mirroring msgSecCheck D-24 strategy. (D-07)"
  - "notifyArtistNewReview looks up artist_profile._openid as recipient (single-artist app), uses single shared SUBSCRIBE_TEMPLATE_ID with phrase5='新评价'. Push failures swallowed, never block creation. (D-22/D-23)"
  - "getStats reads avg/total from artist_profile redundancy first, falls back to live aggregate if profile missing or fields absent (tolerates pre-existing prod docs without migration). (D-20/D-21)"
  - "topTags computed in JS over full tags-field scan (review volume is small, WeChat aggregate $unwind support is limited) — top 5 by frequency. (D-04)"
  - "list tag_filter uses db.command.in([key]) for array-contains match on tags[]; sort_by enum-validated against latest/highest/lowest; rating_filter numeric 1-5 check. (D-15, T-21-02 mitigate)"

patterns-established:
  - "Cloud function duplicates miniprogram constants locally (ALLOWED_TAG_KEYS + TAG_LABELS + SUBSCRIBE_TEMPLATE_ID) — miniprogram/ is not importable from cloudfunctions/"
  - "syncArtistRating() helper centralizes redundancy updates — called from both create and delete, idempotent + self-healing"
  - "Server-side validation: tag whitelist + image count cap + sort_by enum + rating numeric range (defense-in-depth against untrusted event input)"

requirements-completed: [REVW-10, REVW-11, REVW-12, REVW-13, REVW-14, REVW-15]

duration: 18min
completed: 2026-07-16
---

# Phase 21 Plan 01: Backend Foundation Summary

**评价云函数全面扩展：标签白名单/图片 imgSecCheck/匿名标记/avg_rating 重算同步/新评价订阅推送/化妆师鉴权删除/服务端筛选排序/topTags 聚合——为 Wave 2 三个 UI 计划提供统一后端契约**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-07-16T06:27:05Z
- **Completed:** 2026-07-16T06:45:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- **create action** 现接受 tags（5 标签白名单过滤 + 去重 + 数量上限）、images（最多 3 张 fileID）、is_anonymous；对每张图执行 `cloud.downloadFile` + `cloud.openapi.security.imgSecCheck` 同步审查，违规或 API 失败均 fail-closed 阻止提交；写入后调用 `syncArtistRating()` 重算冗余、`notifyArtistNewReview()` 推送订阅消息（两者失败均不阻塞主流程）
- **delete action（新增）** 经 `requireArtist` 鉴权后清理评价图片（`cloud.deleteFile`）→ 删 reviews 文档 → `syncArtistRating()` 同步冗余；图片清理失败 best-effort 吞掉
- **list action** 服务端 `rating_filter`（数值 1-5）/`tag_filter`（白名单 + `db.command.in` 数组包含）/`sort_by`（latest/highest/lowest 枚举）筛选排序，参数化 where 无字符串拼接，highest/lowest 带 created_at desc 稳定二次排序
- **getStats action** 优先读 `artist_profile.avg_rating/total_reviews` 冗余字段（零计算），缺失时回退聚合；recent 投影新增 tags/images/is_anonymous/user_avatar；新增 **topTags** 高频标签 top-5 聚合（JS 频次统计）
- **共享层**：`REVIEW_TAGS` 5 标签常量、`createReview/getReviewsList` 扩展 options/filters 签名、新增 `deleteReview`、config.json 三项 openapi 权限（msgSecCheck + imgSecCheck + subscribeMessage.send）、`getDefaultProfile` 加 avg_rating/total_reviews 默认值

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared layer** — `acdfa6e` (feat)
2. **Task 2: create + delete actions** — `a4266a4` (feat)
3. **Task 3: list filter/sort + getStats refactor** — `343301b` (feat)

## Files Created/Modified

- `miniprogram/utils/constants.js` — 新增 `REVIEW_TAGS` 5 标签预设常量并 export
- `miniprogram/services/reviews.js` — `createReview` 加 options（tags/imageFileIDs/isAnonymous）、`getReviewsList` 加 filters（ratingFilter/tagFilter/sortBy）、新增 `deleteReview`
- `cloudfunctions/reviews/config.json` — openapi 权限扩展为 `security.msgSecCheck` + `security.imgSecCheck` + `subscribeMessage.send`
- `cloudfunctions/profile/index.js` — `getDefaultProfile` 加 `avg_rating: 0, total_reviews: 0` 默认字段（D-17）
- `cloudfunctions/reviews/index.js` — 三个 action 重构 + 新增 delete + 两个 helper（syncArtistRating / notifyArtistNewReview）+ 白名单常量副本

## Decisions Made

见 frontmatter `key-decisions`。核心选择：

1. **Recompute > Incremental**：avg_rating 同步选重算策略——微信云数据库事务能力弱，增量公式在并发写下沉受 FP 漂移 + race；单化妆师评价量小，重算成本可忽略且自愈（D-19）
2. **imgSecCheck fail-closed 全覆盖**：违规 errCode（87014 等）和 API 调用异常均阻止提交，与 msgSecCheck D-24 一致（D-07, T-21-06 mitigate）
3. **getStats 冗余优先 + 聚合兜底**：容忍生产中已存在的无冗余字段 artist_profile 文档（无需迁移脚本），缺失时自动回退聚合（D-20/D-21）

## Deviations from Plan

**None** — plan 执行完全按规约进行。所有 STRIDE 威胁（T-21-01 tag 注入、T-21-02 sort/filter tampering、T-21-04 delete 越权、T-21-06 图片滥用）均在实现中按 disposition `mitigate` 落地：tag 白名单、sort_by 枚举校验、rating 数值范围校验、requireArtist 鉴权、imgSecCheck fail-closed、图片数量硬上限 3。

## Issues Encountered

None

## User Setup Required

None — 无新增外部服务配置。imgSecCheck 与 subscribeMessage.send 均使用已开通的微信云开发 openapi 能力（config.json 已声明权限）。`SUBSCRIBE_TEMPLATE_ID` 复用项目既有单模板 ID，化妆师端订阅授权触发点在 Plan 21-03 实现。

## Next Phase Readiness

- 后端契约已就绪，Wave 2 三个并行 UI 计划可独立开工：
  - **21-02**（客户评价表单）：调用 `createReview(bookingId, rating, content, {tags, imageFileIDs, isAnonymous})` + `storage.uploadWorkImages` 上传图片
  - **21-03**（后台评价管理）：调用 `getReviewsList(page, pageSize, {ratingFilter, tagFilter, sortBy})` + `deleteReview(reviewId)`；客户端 `wx.requestSubscribeMessage` 化妆师端授权
  - **21-04**（首页评价模块）：读 `getReviewStats()` 返回的 `average`/`total`（已来自冗余字段）+ `topTags` 标签云；匿名评价根据 `recent[].is_anonymous` 展示「匿名用户」
- 已知约束：`reviews/index.js` 内 `ALLOWED_TAG_KEYS` / `TAG_LABELS` / `SUBSCRIBE_TEMPLATE_ID` 是 `miniprogram/utils/constants.js` 的副本——未来如调整标签清单或模板 ID，两处需同步更新（云函数无法 import miniprogram 模块）

---
*Phase: 21-review-enhancement*
*Completed: 2026-07-16*

## Self-Check: PASSED

All 5 modified files exist on disk. All 3 task commits (acdfa6e, a4266a4, 343301b) found in git log. All 14 plan-level verification checks passed.
