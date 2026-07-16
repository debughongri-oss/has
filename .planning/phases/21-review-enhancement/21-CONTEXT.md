# Phase 21: 评价增强 - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

<domain>
## Phase Boundary

把评价从「文字+星级」升级为「标签+图片+可选匿名」的更有说服力的口碑载体；化妆师后台能高效筛选排序评价；前台评价统计读冗余字段性能更优；新评价化妆师即时知情——全面提升评价作为转化利器的价值。

包含：
- **REVW-10**: 评价标签快捷选择——预设 5 标签多选，存入 `review.tags[]`，首页展示高频标签聚合
- **REVW-11**: 评价支持带图——客户上传 1-3 张图片，云存储上传 + imgSecCheck 内容安全审查
- **REVW-12**: 匿名评价选项——客户端隐藏昵称头像显示「匿名用户」，化妆师后台仍可见真实身份
- **REVW-13**: 后台评价管理筛选（评分/时间/标签）+ 排序（最新/最高/最低），服务端过滤
- **REVW-14**: artist_profile 冗余 avg_rating + total_reviews，创建/删除评价时同步更新；本阶段新增删除评价 action
- **REVW-15**: 客户提交评价后推送通知化妆师（复用订阅消息，phrase5「新评价」）

不包含：评价回复（Phase 14 已交付）、客户档案（Phase 20 已交付）、在线支付、多化妆师平台。

</domain>

<decisions>
## Implementation Decisions

### 评价标签 (REVW-10)

- **D-01:** **固定预设 5 标签**，代码内常量定义（不做化妆师自定义管理）。标签清单：`手法专业` / `妆面自然` / `准时` / `态度好` / `性价比高`。建议放 `miniprogram/utils/constants.js`（与 SKIN_TYPE_OPTIONS / SERVICE_CATEGORIES 同位置），前后端共享（云函数通过 event 传入或读同一常量副本）。
- **D-02:** 客户评价表单中标签为**多选 chip**，**最多选 5 个（即全部可选，不限数量）**。选中态用 accent 色。复用 chips/自定义样式（首页 `.chips` scroll-view 或自制 tag chip），不引入新组件。
- **D-03:** 标签存入 `review.tags: string[]`（数组）。
- **D-04:** **首页评价模块展示高频标签聚合**——getStats 返回 top N 标签及计数（如「手法专业 ×18」），渲染为「大家这么说」标签云。直接服务口碑转化目标。后台评价管理页的标签筛选维度复用同一标签清单。

### 评价图片 (REVW-11)

- **D-05:** 上传组件用**原生 `wx.chooseMedia` + 自定义网格**，复用 `pages/admin/works/edit.js` 的 chooseImages/removeImage 模式与 `services/storage.js` 的 `uploadWorkImages`（压缩 + 有限并发）。与项目现有原生优先风格一致（Phase 9 D-06），不引入 TDesign t-upload。
- **D-06:** **最多 3 张图片**（需求给定 1-3）。上传流程：客户端 chooseMedia 选图 → 提交时先 `uploadWorkImages` 得 fileID[] → 连同评价数据提交云函数。
- **D-07:** **图片安全审查用 `cloud.openapi.security.imgSecCheck` 同步逐张**（纠正需求文档中的 msgSecCheck——msgSecCheck 是文本审查 API）。在 `reviews` 云函数 create action 中，对每张 fileID 先 `cloud.downloadFile` 取临时图再 imgSecCheck（或用 mediaId）。审查失败（errCode 违规）或 API 调用失败均**阻止提交**（与 Phase 9 D-24 文字审查一致的 fail-closed 策略）。压缩后图片 <1MB 适用同步 API。
- **D-08:** 图片存入 `review.images: string[]`（fileID 数组）。展示：**评价详情 + 后台评价列表显示缩略图，点击 `wx.previewImage` 全屏查看**；**首页评价摘要不显图**（保持首页简洁、加载轻）。
- **D-09:** 删除评价时同步 `services/storage.deleteCloudFile` 清理云存储图片（防孤立文件累积存储成本，Phase 9/POL-05 一致）。

### 匿名评价 (REVW-12)

- **D-10:** 评价表单含「匿名评价」开关，**默认关闭**（公开展示昵称增强真实性，与 Phase 9 deferred 判定一致）。存入 `review.is_anonymous: boolean`。
- **D-11:** **客户端公开展示**（首页评价摘要、评价详情）匿名评价显示「匿名用户」+ 隐藏头像。
- **D-12:** **化妆师后台（评价管理 + 客户详情页）仍显示客户真实昵称/头像**，但带「匿名」标记提示该评价对客户侧匿名。化妆师能关联客户档案（Phase 20）便于个性化跟进。

### 后台筛选排序 (REVW-13)

- **D-13:** 筛选控件用**顶部 `.segs` 条**（评分：全部/5星/4星/3星/2星/1星），复用 `admin/bookings/list.wxml` 的 `.segs` 模式（seg-count + seg-label + seg--on）。标签筛选可作为第二行 seg 或下拉。
- **D-14:** 排序用**切换控件**（最新/最高/最低），与 segs 条同区域。
- **D-15:** **服务端过滤**——`reviews` 云函数 list action 接收 `ratingFilter` / `tagFilter` / `sortBy` 参数，服务端 `where` + `orderBy` 返回已过滤分页结果。无限滚动分页必须服务端；标签筛选需展开 tags 数组查询，服务端更准确。
- **D-16:** 标签筛选维度复用 D-01 的固定 5 标签清单。

### avg_rating 冗余与删除 (REVW-14)

- **D-17:** `artist_profile` 文档新增 `avg_rating: number` + `total_reviews: number` 字段。
- **D-18:** **本阶段新增删除评价 action**（`reviews` 云函数 delete，`requireArtist` 鉴权）。删除时：删 reviews 文档 → 同步减 artist_profile.avg_rating/total_reviews → `deleteCloudFile` 清理评价图片。
- **D-19:** 创建/删除评价时**同步更新 artist_profile 冗余字段**：增量计算（新均分 = (旧均分×旧总数 ± 新评分) / 新总数）或重算聚合。researcher/planner 评估增量 vs 重算的可靠性（并发安全）。
- **D-20:** **首页评价统计（均分/总数）直接读 `artist_profile.avg_rating/total_reviews`**（profileService.getArtistProfile 已返回 artist_profile，零额外请求、零计算）。高频标签聚合仍走 reviews getStats（标签需展开统计）。
- **D-21:** getStats 重构：avg/total 读冗余字段；recent 评价 + 高频标签聚合仍查 reviews 集合（带新字段 tags/images 投影）。

### 评价推送 (REVW-15) — 授权时机为 Agent 自主决定

- **D-22:** 客户提交评价后，`reviews` 云函数 create action 中调用 `cloud.openapi.subscribeMessage.send` 推送给化妆师（收件人 = artist_profile._openid）。复用单模板 `SUBSCRIBE_TEMPLATE_ID`，phrase5 设为「新评价」，其他字段适配评价内容（服务名/评分/时间等）。
- **D-23:** **关键约束**：微信订阅消息「一次授权 = 一次发送」。化妆师需预先授权。授权时机（何时调 `wx.requestSubscribeMessage`）由 planner 决定——候选：化妆师打开评价管理页时、profile 页已有复授权点（`pages/profile/index.js:59`）可扩展触发。发送失败静默吞掉（与 booking-reminder D-10 一致），不阻塞评价创建。

### Agent's Discretion

- 标签 chip 的具体样式（间距、圆角、选中态颜色细节）
- 图片网格的缩略图尺寸与列数
- imgSecCheck 的具体调用方式（downloadFile 取图 vs 其他）
- avg_rating 增量更新 vs 重算聚合的实现选择（并发安全优先）
- 删除评价的 UI 交互（长按/滑动/按钮确认）
- REVW-15 订阅消息授权触发点的最终选择
- 高频标签聚合的 top N 数量与展示样式
- 匿名「标记」在后台的视觉呈现

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` §评价增强 — REVW-10/11/12/13/14/15 需求详情
- `.planning/ROADMAP.md` §Phase 21 评价增强 — 目标与成功标准（4 条 success criteria）

### 现有评价系统代码（必须读取以理解当前实现）
- `cloudfunctions/reviews/index.js` — 评价云函数（create/list/getStats/getByBooking/reply action，需扩展 create 加 tags/images/is_anonymous、list 加筛选排序、新增 delete、create/delete 同步 artist_profile、create 发推送）
- `miniprogram/pages/review/create.js` — 评价表单逻辑（onRateStar/onContentInput/onSubmit，需加标签选择/图片上传/匿名开关）
- `miniprogram/pages/review/create.wxml` — 评价表单模板（自定义 rate-star + 原生 textarea，需加标签 chip 区/图片网格/匿名开关）
- `miniprogram/services/reviews.js` — 客户端评价服务（createReview/getReviewStats/getReviewsList/replyReview，需加图片上传+新参数+deleteReview）
- `miniprogram/pages/admin/reviews/list.js` — 后台评价管理（loadReviews/onReply*，需加筛选排序+删除）
- `miniprogram/pages/admin/reviews/list.wxml` — 后台评价列表模板（需加 .segs 筛选条+排序+缩略图+删除）
- `miniprogram/pages/index/index.js:50-65` — 首页 loadReviewStats（均分/总数迁移到读 artist_profile 冗余字段）
- `miniprogram/pages/index/index.wxml:131-162` — 首页评价模块（需加高频标签聚合展示）

### 可复用资产代码
- `miniprogram/services/storage.js` — uploadImage/uploadWorkImages（压缩+有限并发）/deleteCloudFile/getTempFileURLs（评价图片上传+删除复用）
- `miniprogram/pages/admin/works/edit.js:79-115` — chooseMedia+自定义网格+removeImage 模式（评价图片上传参考）
- `miniprogram/utils/constants.js:57` — SUBSCRIBE_TEMPLATE_ID 单模板 ID（REVW-15 复用）；同文件 SKIN_TYPE_OPTIONS/SERVICE_CATEGORIES（标签常量放置参考）
- `miniprogram/pages/booking/create.js:433` — wx.requestSubscribeMessage 客户端授权模式
- `miniprogram/pages/profile/index.js:59-62` — profile 页订阅授权触发点（REVW-15 化妆师端授权候选位置）
- `cloudfunctions/booking-reminder/index.js` — cloud.openapi.subscribeMessage.send 服务端发送模式（REVW-15 复用）
- `miniprogram/pages/admin/bookings/list.wxml:8-33` — .segs 筛选条 + .entries 快捷入口模式（REVW-13 筛选 UI 复用）

### artist_profile 与权限
- `cloudfunctions/profile/index.js` — artist_profile 单文档集合（REVW-14 新增 avg_rating/total_reviews 字段位置；_openid 为化妆师标识，REVW-15 推送收件人）
- `cloudfunctions/shared/auth.js` — requireArtist 服务端鉴权（delete action + 后台筛选读取复用）

### 先前阶段决策参考
- `.planning/phases/09-customer-review-system/09-CONTEXT.md` — reviews 集合结构（D-02）、msgSecCheck 策略（D-08/09/24）、getStats 聚合（D-17）、曾 deferred 的标签/带图/匿名/筛选/通知（本阶段实现）
- `.planning/phases/14-review-reply/14-SUMMARY.md` — reply action + getStats 返回 artist_reply（评价展示扩展参考）
- `.planning/phases/20-customer-profiles/20-CONTEXT.md` — .segs 筛选条模式（D-03）、admin entries 模式、客户详情页评价列表（匿名标记需同步）

### 参考文档
- [微信 imgSecCheck API](https://developers.weixin.qq.com/miniprogram/dev/server/API/sec-center/sec-check/api_imgseccheck.html) — 图片内容安全识别（同步）
- [微信 msgSecCheck API](https://developers.weixin.qq.com/miniprogram/dev/server/API/sec-center/sec-check/api_msgseccheck.html) — 文本内容安全（已用于评价文字）
- [微信订阅消息](https://developers.weixin.qq.com/miniprogram/dev/framework/server-ability/message-push.html) — subscribeMessage.send 服务端推送

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `services/storage.js` — `uploadWorkImages`（压缩+有限并发批量上传）/ `deleteCloudFile` / `getTempFileURLs`，评价图片全流程可直接复用
- `services/api.js` — `callCloudFunction` 统一封装，reviews 服务扩展沿用
- `pages/admin/works/edit.js` — chooseMedia + 自定义图片网格 + removeImage，评价表单图片上传直接参考
- `pages/admin/bookings/list.wxml` — `.segs` 筛选条（seg-count + seg-label + seg--on）+ `.entries` 快捷入口，REVW-13 筛选 UI 复用
- `cloudfunctions/shared/auth.js` — `requireArtist()` 用于 delete action + 后台筛选鉴权
- `utils/constants.js` — SUBSCRIBE_TEMPLATE_ID（单模板复用）；标签常量放置位置（与 SKIN_TYPE_OPTIONS 并列）

### Established Patterns
- 云函数 action-dispatcher + `switch (event.action)` — reviews 扩展沿用
- 服务层 `callCloudFunction` 统一错误处理
- msgSecCheck 内容安全（scene=2，fail-closed 阻止提交）— imgSecCheck 沿用同一策略
- 评价表单原生/自定义组件风格（自定义 rate-star + 原生 textarea，非 TDesign 重组件）— 标签 chip/图片网格/匿名开关延续
- 服务端权威读取用户信息（SEC-05：按 openid 查 users 取昵称头像，不信任客户端传入）— is_anonymous 仍服务端处理展示逻辑
- 订阅消息单模板复用 + `cloud.openapi.subscribeMessage.send` 服务端发送 + 发送失败静默吞掉（booking-reminder D-10）
- CSS custom properties：`--accent`, `--gold`, `--text-secondary`, `--bg-elevated` 等
- 数据冗余：booking 文档冗余 user_info 用于列表展示；artist_profile 冗余 avg_rating/total_reviews 同模式

### Integration Points
- `cloudfunctions/reviews/index.js` create action — 扩展接收 tags/images/is_anonymous；加 imgSecCheck；成功后同步 artist_profile + 发推送
- `cloudfunctions/reviews/index.js` list action — 接收 ratingFilter/tagFilter/sortBy 参数，服务端 where+orderBy
- `cloudfunctions/reviews/index.js` 新增 delete action — requireArtist + 删文档 + 减冗余 + 删云图
- `cloudfunctions/reviews/index.js` getStats — avg/total 改读 artist_profile；recent + 高频标签查 reviews
- `cloudfunctions/profile/index.js` — artist_profile 文档加 avg_rating/total_reviews 字段
- `miniprogram/pages/review/create.{js,wxml}` — 加标签 chip 区、图片网格、匿名开关
- `miniprogram/pages/admin/reviews/list.{js,wxml}` — 加 .segs 筛选条 + 排序 + 缩略图 + 删除
- `miniprogram/pages/index/index.{js,wxml}` — 评价统计读 artist_profile 冗余字段；加高频标签聚合展示
- `miniprogram/services/reviews.js` — createReview 加参数；新增 deleteReview

</code_context>

<specifics>
## Specific Ideas

- 高频标签在首页评价模块呈现为「大家这么说」标签云（如「手法专业 ×18」），增强口碑说服力
- 后台匿名评价带「匿名」标记提示，但化妆师能看到真实昵称/头像——兼顾客户隐私与服务跟进
- 标签 chip 选中态用 accent 色，与首页 `.chips` 视觉呼应
- 评价图片复用作品上传的网格样式，保持上传体验一致

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

（注：REVW-15 授权时机为 Agent 自主决定，非 deferred——已锁定复用单模板 + 服务端发送模式，仅触发点交 planner 决定）

</deferred>

---

*Phase: 21-review-enhancement*
*Context gathered: 2026-07-16*
