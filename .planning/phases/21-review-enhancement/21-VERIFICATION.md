---
phase: 21-review-enhancement
status: passed
score: 4/4
verified: 2026-07-16
method: inline-verification
requires_human_testing: true
human_verification_items:
  - "微信开发者工具真机预览：客户评价表单标签多选/图片上传/匿名开关端到端提交流程"
  - "微信开发者工具真机预览：化妆师后台筛选/排序/删除交互 + 评价图片 wx.previewImage 全屏"
  - "微信开发者工具真机预览：化妆师端订阅消息授权弹窗 + 客户提交后实际收到推送"
  - "imgSecCheck 真实违规图片被阻止提交（fail-closed 验证）"
---

# Phase 21: 评价增强 — Verification

**Phase goal:** 评价从「文字+星级」升级为「标签+图片+可选匿名」的更有说服力的口碑载体；化妆师后台能高效筛选排序评价；前台评价统计性能更优；新评价化妆师即时知情。

**Result:** ✅ PASSED — 全部 4 条 success criteria 通过代码验证，6 项 STRIDE 威胁缓解措施全部落地。4 项需要微信开发者工具真机预览的交互流程标记为 human verification。

## Success Criteria Verification

### ✅ Criterion 1: 客户评价表单（标签 + 图片 + 匿名）

> 客户在评价表单中可选择预设标签（多选）、上传 1-3 张图片、勾选「匿名评价」；提交后前台评价模块正确展示（匿名显示「匿名用户」、图片可查看、标签可见）

**Code evidence:**
- `miniprogram/pages/review/create.js` — `selectedTagKeys`/`images`/`maxImages: 3`/`isAnonymous` 状态 + `onToggleTag`（5 标签上限 + 超限 toast）/`onChooseImage`（chooseMedia sizeType compressed）/`onRemoveImage`/`onToggleAnonymous` 处理器（14 处证据）
- `onSubmit` 上传-再-创建流程：先 `storageService.uploadWorkImages(this.data.images)` 得 fileID[]，失败 toast + 重置状态；再 `createReview(bookingId, rating, content, { tags: selectedTags, imageFileIDs, isAnonymous })`（5 处证据）
- `miniprogram/pages/review/create.wxml` — tag-chip 行 + img-grid（200rpx cell + 移除 × + 虚线添加 cell）+ 匿名 switch 带提示（5 处证据）
- 公开展示匿名化：`miniprogram/pages/index/index.js` 的 `displayNickname` 把 `is_anonymous` 映射为「匿名客户」（2 处证据）；后台仍显示真实昵称 + 「匿名」徽标（D-12）

**Verdict:** PASSED — 表单完整支持三项增强字段；公开侧匿名化；后台特权展示

### ✅ Criterion 2: 后台评价管理筛选 + 排序

> 化妆师在后台评价管理页可按评分/时间/标签筛选评价、按最新/最高/最低排序，列表正确响应筛选和排序条件

**Code evidence:**
- `miniprogram/pages/admin/reviews/list.js` — `ratingSegs`（全部/5星…1星）/`tagSegs`（全部标签 + REVIEW_TAGS）/`sortOptions`（最新/最高/最低）+ `onRatingSeg`/`onTagSeg`/`onSortChange` 处理器（每次重置 page=1 + reload）（19 处证据）
- `loadReviews` 构造 `{ ratingFilter, tagFilter, sortBy }` filters 传给扩展后的 `getReviewsList`（6 处证据）
- `cloudfunctions/reviews/index.js` list action 服务端筛选：`rating_filter` 数值 1-5 校验 + `tag_filter` 白名单 + `db.command.in([tag_filter])` 数组包含查询 + `sort_by` 枚举校验（latest/highest/lowest）+ 稳定二次排序 `created_at desc`（9 处证据）
- 删除：`case 'delete'` + `requireArtist` 鉴权 + `cloud.deleteFile` 图片清理 + `syncArtistRating` + 客户端 `onDeleteReview`（wx.showModal 二次确认 + 本地 splice）（4 处证据）

**Verdict:** PASSED — 服务端筛选排序正确响应；删除带鉴权 + 图片清理 + 冗余同步

### ✅ Criterion 3: avg_rating/total_reviews 冗余 + 同步

> 首页评价统计（均分、总数）直接读取 artist_profile 冗余字段；新建/删除评价时冗余字段自动同步更新（无需重新跑聚合）

**Code evidence:**
- `cloudfunctions/reviews/index.js` `syncArtistRating()` 重算聚合 helper（recompute 策略，并发安全）—— 定义 + create 调用 + delete 调用 + isCollectionMissing 容错（4 处证据，预期 ≥3 ✓）
- `cloudfunctions/profile/index.js` `getDefaultProfile()` 加 `avg_rating: 0, total_reviews: 0` 默认字段（2 处证据）
- `cloudfunctions/reviews/index.js` getStats 优先读 `profile.avg_rating`/`profile.total_reviews`，缺失时回退聚合（4 处证据）
- `miniprogram/pages/index/index.js` loadReviewStats 优先读 `this.data.artist.avg_rating/total_reviews`（已加载 profile，与首页其它展示零漂移），profile 缺失回退 getStats（4 处证据）

**Verdict:** PASSED — 读写双侧闭合：写入（create/delete 同步）+ 读取（首页 + getStats）；recompute 策略自愈

### ✅ Criterion 4: 新评价订阅消息推送

> 客户提交新评价后化妆师收到订阅消息推送（phrase「新评价」），化妆师无需主动刷新即可感知

**Code evidence:**
- `cloudfunctions/reviews/index.js` create action 调用 `notifyArtistNewReview(serviceName, rating)`：查 `artist_profile._openid` 作为 `touser` → `cloud.openapi.subscribeMessage.send({ templateId: SUBSCRIBE_TEMPLATE_ID, page: 'pages/admin/reviews/list', data: { thing1, date2, date3, thing4, phrase5: { value: '新评价' } } })`（6 处证据）
- 推送完全包在 try/catch，失败 `console.error('新评价推送失败（已忽略）')` 静默吞掉，绝不阻塞评价创建（D-23）
- 客户端授权半圈：`miniprogram/pages/admin/reviews/list.js` onLoad 调 `requestSubscribeAuthorization()` → `wx.requestSubscribeMessage({ tmplIds: [SUBSCRIBE_TEMPLATE_ID] })` 非阻塞（化妆师可拒绝）（5 处证据）
- `cloudfunctions/reviews/config.json` 声明 `subscribeMessage.send` openapi 权限

**Verdict:** PASSED — 服务端推送 + 客户端授权 + 失败静默 + 权限声明四要素齐备

## Requirements Traceability

| Requirement | Description | Plan | Status |
|-------------|-------------|------|--------|
| REVW-10 | 评价标签快捷选择（5 预设，多选，存 review.tags[]） | 21-01/02/03/04 | ✅ Complete |
| REVW-11 | 评价带图（1-3 张，云存储 + imgSecCheck） | 21-01/02/03 | ✅ Complete |
| REVW-12 | 匿名评价（客户端隐藏，后台仍可见真实身份） | 21-01/02/03/04 | ✅ Complete |
| REVW-13 | 后台筛选（评分/标签）+ 排序（最新/最高/最低）服务端 | 21-01/03 | ✅ Complete |
| REVW-14 | artist_profile 冗余 avg_rating/total_reviews + 同步 + delete | 21-01/03/04 | ✅ Complete |
| REVW-15 | 新评价订阅消息推送（phrase「新评价」） | 21-01/03 | ✅ Complete |

**6/6 requirements verified.**

## Threat Model Mitigation Audit

| Threat ID | Category | Mitigation | Status |
|-----------|----------|------------|--------|
| T-21-01 | Spoofing (tags) | `ALLOWED_TAG_KEYS` 白名单服务端过滤 | ✅ Present |
| T-21-02 | Tampering (sort/filter) | `sort_by` 枚举校验 + `rating_filter` 数值范围 + 参数化 where | ✅ Present |
| T-21-03 | Info Disclosure (anon nickname) | 服务端返回 `is_anonymous` 标记 + 公开侧 `displayNickname` 匿名化 | ✅ Present |
| T-21-04 | Elevation (delete) | `requireArtist` 鉴权门 + UI confirm modal | ✅ Present |
| T-21-06 | DoS / Content abuse (images) | 客户端硬上限 3 + 服务端 imgSecCheck fail-closed | ✅ Present |
| T-21-13 | Info Disclosure (public index nickname) | JS 算 `displayNickname` → 「匿名客户」 | ✅ Present |
| T-21-07/11/14 | Accept-class (push payload, artist identity, aggregated stats) | 按设计接受（intended content） | ✅ N/A |

**All mitigate-disposition threats have their planned controls in code.**

## Cross-Phase Integration Check

- **Phase 20 客户档案**：`customers/detail.wxml` 评价记录项加 `anon-tag` 匿名标记（D-12 一致性），与 Phase 21 后台标记风格统一（金色 pill）
- **Phase 14 评价回复**：reply action + 回复编辑器保留并完整集成进新 list.js（onToggleReply/onReplyInput/onSubmitReply 未变）
- **Phase 09 评价系统**：msgSecCheck D-24 fail-closed 模式被 imgSecCheck 完全复用；reviews 集合结构扩展而非替换（tags/images/is_anonymous 新增字段，旧评价无这些字段时 getStats/list 容错）
- **Phase 19 booking-reminder**：`cloud.openapi.subscribeMessage.send` 服务端发送 + 失败静默吞掉（D-10）模式被 REVW-15 notifyArtistNewReview 复用

## Inline Code Review Notes (advisory, non-blocking)

> `gsd:code-review` skill 不在当前 runtime 可用工具列表中。以下为人工代码评审要点（advisory only，不阻塞流程）：

**Strengths:**
- 一致性：标签/匿名/图片三项增强字段贯穿 4 个 plan 端到端，无断点
- 安全：威胁模型 7 项 disposition 全部落地，fail-closed 策略与既有 msgSecCheck 一致
- 性能：recompute 聚合 + getStats 冗余读取 + 首页复用已加载 profile——零冗余请求
- 防御性：mapTagLabels 兼容两种服务端返回形态；getStats 容忍缺失冗余字段（无需迁移脚本）

**Minor observations (non-blocking, no fix required):**
1. `ALLOWED_TAG_KEYS` / `TAG_LABELS` / `SUBSCRIBE_TEMPLATE_ID` 在 `cloudfunctions/reviews/index.js` 是 `miniprogram/utils/constants.js` 的副本——云函数无法 import miniprogram 模块（既有约束）。未来调整标签清单或模板 ID 需两处同步。已在 4 个 SUMMARY 的 Next Phase Readiness 标注。
2. `notifyArtistNewReview` 的 thing1 字段用 `service_name` 截断到 20 字符——若服务名含 emoji/特殊字符可能超出字节限制，但实际服务名（新娘妆/日常妆等）远小于 20 字符，风险可忽略。
3. 评价图片 imgSecCheck 用 `cloud.downloadFile` + 同步审查——大图（>1MB）可能超时。但 Plan 21-02 客户端 chooseMedia 用 `sizeType: ['compressed']` 压缩，Plan 01 D-07 也明确「压缩后图片 <1MB 适用同步 API」，约束已闭环。

**No blocking issues identified.**

## Human Verification Items

以下 4 项需微信开发者工具真机/模拟器交互验证（自动代码检查无法覆盖运行时行为）：

1. **客户评价表单端到端**：进入已完成预约的评价页 → 选 5 标签 + 拍/选 3 图 + 勾匿名 → 提交 → 数据库 reviews 文档含 tags/images/is_anonymous 字段；首页评价模块与后台列表正确展示
2. **后台筛选/排序/删除**：化妆师进入评价管理 → 切评分 seg（如「5星」）→ 切标签 seg（如「手法专业」）→ 切排序（最高/最低）→ 列表响应；点缩略图全屏预览；点删除二次确认后评价 + 图片从云端消失 + avg_rating 重算
3. **订阅消息授权 + 推送**：化妆师首次进入评价管理 → 弹订阅授权 → 同意；客户提交新评价 → 化妆师收到「新评价」推送 → 点击推送跳转 `pages/admin/reviews/list`
4. **imgSecCheck fail-closed**：提交包含违规图片的评价 → 被阻止提交 + toast「评价图片包含不当内容」；断网或 API 异常 → toast「图片安全检查失败」且评价未写入

## Gaps Found

**None.** 全部 must_haves 在代码中验证存在且正确实现，所有 requirements 勾选完成，威胁缓解全部落地。

---
*Verification method: inline (no gsd-verifier subagent — Task() tool unavailable in this runtime)*
*Verified: 2026-07-16T07:25:00Z*
