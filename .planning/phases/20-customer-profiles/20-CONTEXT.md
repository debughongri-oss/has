# Phase 20: 客户档案 - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning

<domain>
## Phase Boundary

化妆师后台集中查看客户信息、历史预约和偏好备注，并在预约管理详情页联动展示客户备注——把「记得客户」从脑力负担变成系统记忆，支撑个性化服务和复购。

包含：
- **CUST-01**: 客户列表页——聚合 users + bookings 统计，展示昵称、头像、预约次数、最近预约时间、状态标签（新客/回头客/VIP）
- **CUST-02**: 客户详情页——客户基本信息 + 完整历史预约列表 + 该客户的评价记录
- **CUST-03**: 化妆师为客户添加/编辑备注（肤质、偏好、过敏史、自定义备注），存于 customer_notes 集合（按 user_openid 索引）
- **CUST-04**: 预约管理详情页展示客户备注——化妆师接单/确认前可查看客户偏好和注意事项

不包含：评价增强（Phase 21）、在线支付、会员/积分系统。

</domain>

<decisions>
## Implementation Decisions

### 客户标签规则 (CUST-01)

- **D-01:** 状态标签（新客/回头客/VIP）**只统计 `status === 'completed'` 的预约**——完成才代表真实成交。pending/accepted/rejected/cancelled/no_show 不计入客户分级。
- **D-02:** 阈值划分：
  - **新客** = 1 次完成预约
  - **回头客** = 2-4 次完成预约
  - **VIP** = 5 次及以上完成预约
- **D-03:** 客户列表顶部使用**标签筛选条**（全部/新客/回头客/VIP），样式复用 `admin/bookings/list.wxml` 的 `.segs` 模式（seg-count + seg-label）。不做搜索框——个人化妆师客户量有限，标签筛选足够。
- **D-04:** 列表项展示：头像 + 昵称 + 预约次数 + 最近预约时间 + 状态标签。按最近预约时间倒序排列。

### 备注数据模型 (CUST-03)

- **D-05:** `customer_notes` 集合存**化妆师画像为主**的客户备注，与 booking 里客户每次填的字段互补：
  - booking 文档字段（客户每次预约时填写，per-booking）：`skin_type` / `special_needs` / `occasion`
  - customer_notes 字段（化妆师事后总结的客户画像，per-customer）：`skin_type`（肤质）/ `preference`（偏好）/ `allergy`（过敏史）/ `custom_notes`（自定义备注）
  - 两者数据源不同（客户填 vs 化妆师记），各自独立存储，互不覆盖。
- **D-06:** `customer_notes` 集合结构：`_id`, `_openid`（化妆师 openid）, `user_openid`（客户 openid，唯一索引）, `skin_type`, `preference`, `allergy`, `custom_notes`, `updated_at`。每个客户**一条文档**，按 `user_openid` 唯一索引。
- **D-07:** 编辑备注采用**覆盖更新**（upsert by user_openid）——不保留历史记录。化妆师编辑时整体覆盖该客户文档。
- **D-08:** 备注编辑入口在**客户详情页内 inline 编辑**——点击「编辑」按钮变为可编辑状态，保存后恢复展示。不跳转独立编辑页，不用弹窗。

### 客户详情页交互 (CUST-02)

- **D-09:** 历史预约列表**默认显示最近 5 条 + 「查看全部」展开**——点击展开显示完整历史。按时间倒序排列。
- **D-10:** 历史预约项**可点击跳转**到 admin 预约详情页（`navigateTo` 到 `pages/admin/bookings/detail?id=xxx`）。
- **D-11:** 评价记录展示**完整列表**（评分 + 服务名 + 评价文字 + 时间），按时间倒序。数据来自 reviews 集合按 `user_openid` 查询，复用 reviews 云函数能力。

### 预约详情联动 (CUST-04)

- **D-12:** 在 admin 预约详情页（`admin/bookings/detail.wxml`）新增**独立的「客户档案」卡片**，与现有「客户需求」卡片（客户填的肤质/特殊需求/场合）并排。两者数据源不同，分开更清晰。
- **D-13:** 「客户档案」卡片展示：**客户标签（新客/VIP）+ 完成预约次数 + 偏好 + 过敏史 + 自定义备注**。不重复展示肤质（「客户需求」卡片已有客户填的肤质）。
- **D-14:** 客户暂无备注时，卡片显示**「暂无客户档案，点击查看客户详情」引导跳转**——引导化妆师去客户详情页补充备注，不隐藏卡片。

### Agent's Discretion

- 客户列表入口的具体位置（建议在 `admin/bookings/list.wxml` 的 `.entries` 区域新增「客户管理」入口，与日历视图/评价管理并列）
- 客户数据的云函数组织方式（新建独立 `customers` 云函数 vs 在 `bookings` 云函数新增 action）——researcher/planner 可评估
- customer_notes 的 skin_type 是否从 booking.skin_type 预填引导（辅助化妆师，非强制同步）
- 客户列表/详情页的卡片样式细节（间距、字体、颜色）
- 历史预约项在客户详情页的展示样式（复用 bookings list 的 bcard 样式或精简版）
- 数据聚合性能策略（云数据库 aggregate vs 多次查询拼装）——单化妆师客户量级有限
- 客户列表分页策略（客户量小时可一次加载，量大时分页）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` §客户档案 — CUST-01/02/03/04 需求详情
- `.planning/ROADMAP.md` §Phase 20 客户档案 — 目标与成功标准

### 现有代码（必须读取以理解当前实现）
- `cloudfunctions/bookings/index.js` — 预约云函数（list/detail/create 等动作，理解 user_openid 关联、attachServiceCover 批量注入模式、聚合查询 $.sum 模式）
- `cloudfunctions/reviews/index.js` — 评价云函数（含 user_openid 字段，CUST-02 客户评价列表复用其查询）
- `cloudfunctions/shared/auth.js` — 服务端 requireArtist 验证模块
- `miniprogram/services/bookings.js` — 客户端预约服务（callCloudFunction wrapper 模式）
- `miniprogram/services/reviews.js` — 客户端评价服务（评价查询复用）
- `miniprogram/services/api.js` — callCloudFunction 统一封装
- `miniprogram/pages/admin/bookings/list.wxml` — 管理端预约列表（`.entries` 快捷入口区，seg 筛选条样式参考）
- `miniprogram/pages/admin/bookings/list.js` — 管理端预约列表逻辑
- `miniprogram/pages/admin/bookings/list.wxss` — 管理端预约列表样式（seg/card/badge 样式参考）
- `miniprogram/pages/admin/bookings/detail.wxml` — 预约详情模板（现有「客户需求」卡片位置，CUST-04 新增「客户档案」卡片参考）
- `miniprogram/pages/admin/bookings/detail.js` — 预约详情逻辑（loadDetail 加载模式，normalizeBookingMeta 模式）
- `miniprogram/pages/admin/reviews/list.wxml` — 评价管理列表（评价卡片样式参考，CUST-02 评价列表可复用）
- `miniprogram/utils/constants.js` — 常量定义（SKIN_TYPE_OPTIONS 肤质标签列表）
- `miniprogram/app.json` — 页面路由和子包配置（需新增 customers 页面路由到 admin subPackages）
- `miniprogram/app.wxss` — 全局样式变量（--accent/--gold/--text-secondary/--bg-elevated 等）

### 先前阶段决策参考
- `.planning/phases/06-data-model-extensions-quick-wins/06-CONTEXT.md` — 预约备注结构化字段（skin_type/special_needs/occasion），理解 booking 与 customer_notes 的数据分工
- `.planning/phases/09-customer-review-system/09-CONTEXT.md` — reviews 集合结构与 user_openid 关联
- `.planning/phases/08-booking-notifications-calendar/08-CONTEXT.md` — admin entries 快捷入口模式

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `miniprogram/services/api.js` — `callCloudFunction` 统一封装，新建 customers 服务可直接复用
- `cloudfunctions/shared/auth.js` — `requireArtist()` 用于客户列表/详情/备注编辑的权限验证（化妆师操作）
- `miniprogram/pages/admin/bookings/list.wxml:23-33` — `.entries` 快捷入口区（entry-ic + entry-label），新增「客户管理」入口可直接复用此结构
- `miniprogram/pages/admin/bookings/list.wxml:8-21` — `.segs` 标签筛选条（seg-count + seg-label + seg--on），客户列表的标签筛选可复用
- `miniprogram/pages/admin/bookings/list.wxss` — card/badge/seg 样式，客户列表卡片可复用
- `miniprogram/pages/admin/reviews/list.wxml` — 评价卡片样式，CUST-02 客户评价列表可复用
- `cloudfunctions/bookings/index.js:43-50` — `attachServiceCover` 批量注入服务封面模式，客户历史预约列表可参考

### Established Patterns
- 云函数 action-dispatcher + `switch (event.action)` 模式
- 服务层 `callCloudFunction` 统一错误处理
- 子包页面路由：`subPackages[{ root: "pages/admin", pages: [...] }]`
- 权限验证：写操作 `requireArtist(wxContext, db)`，读操作（客户列表/详情）同样需要 isArtist 验证（化妆师后台数据）
- 预约状态流：`pending → accepted → completed`，CUST-01 标签只计 completed
- 数据冗余：booking 文档冗余 user_info（nickname/avatar_url）用于列表展示，避免额外查 users 集合
- CSS custom properties：`--accent`, `--gold`, `--text-secondary`, `--bg-elevated` 等
- upsert 模式：云数据库 `db.collection().where().update()` 或先查后 add/update

### Integration Points
- `miniprogram/pages/admin/bookings/list.wxml:23-33` — `.entries` 区新增「客户管理」入口（goToCustomers）
- `miniprogram/pages/admin/bookings/detail.wxml` — 在「客户需求」卡片后新增「客户档案」卡片（CUST-04）
- `miniprogram/pages/admin/bookings/detail.js` — `loadDetail` 中按 booking.user_openid 查询 customer_notes 注入
- `miniprogram/app.json` — admin subPackages.pages 新增 `customers/list`、`customers/detail`
- **新建** 客户数据云函数（`customers` 或在 `bookings` 新增 action）——客户列表聚合、客户详情、备注读写

</code_context>

<specifics>
## Specific Ideas

- 客户列表卡片可参考 bookings list 的 bcard 样式（头像 + 昵称 + 次数 + 标签），保持后台视觉一致
- VIP 标签使用 gold 色（`--gold`），新客用 accent 色，回头客用 text-secondary，视觉上区分优先级
- 客户详情页顶部展示客户基本信息（头像 + 昵称 + 标签 + 完成次数），下方依次是备注编辑区、历史预约、评价记录
- 「客户档案」卡片在预约详情页位于「客户需求」卡片之后，标题用「客户档案」与「客户需求」区分

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-customer-profiles*
*Context gathered: 2026-07-10*
