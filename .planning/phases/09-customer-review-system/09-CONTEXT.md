# Phase 9: Customer Review System - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

客户评价系统：预约完成后客户提交 1-5 星打分 + 文字评价（最多 200 字），评价公开展示于化妆师主页增强信任感，化妆师可在管理后台查看所有评价。包含内容安全审查（msgSecCheck）。

不包含：评价回复（REVW-07，v2）、预约通知（Phase 8）、海报生成（Phase 10）。

</domain>

<decisions>
## Implementation Decisions

### 评价数据模型

- **D-01:** 新建独立 `reviews` 集合（不嵌入 appointments 文档）。理由：(1) 评价是独立实体，有自己的生命周期和查询模式；(2) 按创建时间倒序分页查询是评价列表的主查询模式，独立集合更高效；(3) 云数据库文档无 JOIN，嵌入会增加 appointments 文档体积，影响列表查询性能；(4) 通过 `booking_id` 字段关联预约即可。
- **D-02:** `reviews` 集合字段：`_id`, `booking_id`, `user_openid`, `user_nickname`, `user_avatar`, `service_id`, `service_name`, `rating` (1-5), `content` (max 200 chars), `created_at`, `updated_at`。冗余存储 user_nickname、user_avatar、service_name 用于列表展示，避免额外查询。
- **D-03:** `booking_id` 字段建唯一索引，服务端在写入前查询该 booking_id 是否已有评价记录，双重防止重复评价。

### 评价提交流程

- **D-04:** "去评价"入口放在预约历史页面（`pages/profile/history`），已完成（completed）状态的预约卡片上显示"去评价"按钮。已评价的预约卡片显示"已评价 ⭐"标记。
- **D-05:** 点击"去评价"跳转到独立评价表单页 `pages/review/create?booking_id=xxx`。该页面加载时从 bookings 云函数获取预约详情验证状态（服务端也会验证）。
- **D-06:** 评价表单使用 TDesign `t-rate` 组件（已安装，1-5 星，整星不支持半星）+ 原生 textarea（最多 200 字，带字数统计）。不使用 TDesign `t-textarea`（引入不必要的包体积），直接用原生 textarea + wxss 样式，与项目现有风格一致。
- **D-07:** 评价提交后，页面 navigateBack 返回历史记录页，历史页 onShow 时刷新列表（已有的 onShow 逻辑不刷新，需要在 onShow 中增加刷新）。

### 内容安全审查

- **D-08:** 评价文字在服务端通过 `cloud.openapi.security.msgSecCheck()` 进行内容安全检查后才能写入数据库。这是微信小程序审核的硬性要求——用户生成文本必须经过内容安全审查。
- **D-09:** msgSecCheck 在 `reviews` 云函数的 `create` action 中调用，传入 `content` 和 `openid`（scene=2 表示评论场景，openid 为用户标识）。如果检查不通过，返回错误提示"评价内容包含不当信息，请修改后重新提交"。
- **D-10:** 空文字评价（纯评分无文字）跳过 msgSecCheck，直接写入。纯评分是合法的评价方式。

### 重复评价防护

- **D-11:** 服务端双重防护：(1) 查询 reviews 集合是否已存在该 booking_id 的评价；(2) 查询 booking 状态是否为 completed 且 user_openid 匹配。两层检查确保一个预约只能评价一次。
- **D-12:** 客户端防护：历史页面通过 `getByBooking` action 检查预约是否已有评价，已评价的卡片隐藏"去评价"按钮，显示"已评价"标记。

### 主页评价展示

- **D-13:** 化妆师主页（`pages/index/index`）在 hero 区域下方新增"客户评价"模块，展示：平均评分（星标 + 数字）+ 评价总数 + 最近 3 条评价摘要（评分 + 文字截断 + 客户昵称）。
- **D-14:** 平均评分展示格式："⭐ 4.9 (23条评价)"——使用 t-rate 组件只读模式展示星标 + 文字数字。
- **D-15:** 无评价时不展示整个评价模块（条件渲染 `wx:if="{{reviewStats.total > 0}}"`），避免空状态的尴尬。
- **D-16:** 评价统计数据通过 `reviews` 云函数的 `getStats` action 获取：返回 `{ average, total, recent: [{rating, content, user_nickname, created_at}] }`。一次请求返回统计数据 + 最近评价，减少网络请求次数。

### 评分统计策略

- **D-17:** 当前阶段使用实时聚合计算平均评分（`getStats` 中全量读取 reviews 计算平均值）。单化妆师个人项目评价数量远低于 1000 条，实时计算性能完全足够。
- **D-18:** 未来如果评价超过 500 条，可改为在 `artist_profile` 文档中缓存 `avg_rating` 和 `review_count`，每次新增评价时更新。当前阶段不做此优化。

### 管理后台评价查看

- **D-19:** 新建管理端评价列表页 `pages/admin/reviews/list`（admin 子包），展示所有评价按时间倒序排列，每条评价卡片显示：客户昵称、服务名称、评分（t-rate 只读）、评价文字、评价时间。
- **D-20:** 管理端评价列表页不需要筛选/搜索功能——单化妆师项目评价量有限，按时间倒序列表足够。
- **D-21:** 管理端入口：在管理端预约列表页（`admin/bookings/list`）或主页管理入口添加"评价管理"入口。考虑到 admin 子包的导航结构，在管理端预约列表页顶部 filter-bar 下方添加"评价管理"入口按钮（与"日历视图"入口同级的样式）。

### 云函数架构

- **D-22:** 新建独立 `reviews` 云函数（不在 bookings 中添加 action），职责清晰。Actions: `create`, `list`, `getStats`, `getByBooking`。
- **D-23:** `reviews` 云函数的 `create` action 使用 `cloud.openapi.security.msgSecCheck()` 做内容安全审查。云函数调用 `cloud.openapi` 需要 wx-server-sdk，已安装（3.0.4）。
- **D-24:** `create` action 中 msgSecCheck 的错误处理：try-catch 包裹，如果 msgSecCheck API 调用本身失败（网络错误等），为安全起见**阻止提交**（返回"内容安全检查失败，请稍后重试"），不跳过检查。

### 客户端服务层

- **D-25:** 新建 `miniprogram/services/reviews.js`，封装 reviews 云函数调用：`createReview(bookingId, rating, content)`, `getReviewStats()`, `getByBooking(bookingId)`, `getReviewsList(page, pageSize)`。遵循现有 service module 模式（callCloudFunction wrapper）。

### 路由配置

- **D-26:** `pages/review/create` 添加到 `app.json` 主包 pages 数组（客户页面，非 admin 子包）。
- **D-27:** `pages/admin/reviews/list` 添加到 `app.json` admin subPackages.pages 数组。

### Agent's Discretion

- 评价卡片的样式细节（间距、字体、颜色）
- "去评价"按钮的具体样式（颜色、大小）
- 主页评价模块的精确布局
- 管理端评价列表页的卡片样式
- getStats 中 recent 评价的截断字数
- msgSecCheck 的 scene 参数值（默认用 2=评论场景）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` §Review — REVW-01/02/03/04/05/06 评价系统需求

### 现有代码（必须读取以理解当前实现）
- `miniprogram/pages/profile/history.js` — 预约历史页面（"去评价"入口位置）
- `miniprogram/pages/profile/history.wxml` — 预约历史模板（需添加评价按钮/标记）
- `miniprogram/pages/profile/history.wxss` — 预约历史样式
- `miniprogram/pages/profile/history.json` — 页面配置（需注册 t-rate）
- `miniprogram/pages/index/index.js` — 主页（需加载评价统计数据）
- `miniprogram/pages/index/index.wxml` — 主页模板（需添加评价展示模块）
- `miniprogram/pages/index/index.wxss` — 主页样式
- `miniprogram/pages/index/index.json` — 主页配置（需注册 t-rate）
- `miniprogram/services/bookings.js` — 客户端预约服务接口
- `miniprogram/services/api.js` — callCloudFunction 统一封装
- `miniprogram/utils/constants.js` — 常量定义
- `miniprogram/app.json` — 页面路由和子包配置（需新增页面路由）
- `miniprogram/app.wxss` — 全局样式变量
- `cloudfunctions/bookings/index.js` — 预约云函数（理解 booking 数据结构和状态）
- `cloudfunctions/shared/auth.js` — 服务端 isArtist 验证模块
- `miniprogram/pages/admin/bookings/list.wxml` — 管理端预约列表（评价管理入口参考样式）
- `miniprogram/pages/admin/bookings/list.js` — 管理端预约列表逻辑

### TDesign 组件类型定义
- `miniprogram/miniprogram_npm/tdesign-miniprogram/rate/type.d.ts` — t-rate 组件 props（value, count, disabled, size, color, variant, allowHalf, showText, texts, gap）

### 参考文档
- `.planning/research/ARCHITECTURE.md` — Feature 7: Customer Review System 架构设计
- `.planning/research/STACK.md` — §7. Customer Review System 技术栈
- [微信 msgSecCheck API](https://developers.weixin.qq.com/miniprogram/dev/server/API/sec-center/sec-check/api_msgseccheck.html) — 文本内容安全识别

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `miniprogram/services/api.js` — `callCloudFunction` 统一封装，reviews service 可直接复用
- `miniprogram/pages/profile/history.js` — 已有 `loadBookings()` 和 `cancelBooking()` 方法，新增"去评价"逻辑可复用 card 数据结构
- `cloudfunctions/shared/auth.js` — `requireArtist()` 用于管理端评价列表的权限验证
- `miniprogram/pages/admin/bookings/list.wxml` — "日历视图"入口按钮样式（`.calendar-entry`）可复用为"评价管理"入口

### Established Patterns
- 云函数 action-dispatcher + `switch (event.action)` — reviews 云函数遵循此模式
- 服务层 `callCloudFunction` 统一错误处理 — reviews.js 遵循此模式
- 子包页面路由：`subPackages[{ root: "pages/admin", pages: [...] }]` — admin/reviews/list 加入
- 预约状态流：`pending → accepted → completed` — 只有 completed 状态可评价
- CSS custom properties：`--accent`, `--gold`, `--text-secondary`, `--bg-elevated` 等

### Integration Points
- `miniprogram/pages/profile/history.wxml:17-19` — 在 `card-action` 区域，已完成预约显示"去评价"按钮（与现有 `cancelBooking` 按钮同级结构）
- `miniprogram/pages/index/index.wxml:39` — 在 hero-tags 下方、portfolio 上方插入评价模块
- `miniprogram/pages/index/index.js` — `loadProfile()` 完成后调用 `loadReviewStats()`（与 `loadFeaturedWorks()` 并行）
- `miniprogram/app.json` — pages 数组新增 `pages/review/create`，admin subPackages 新增 `reviews/list`
- `miniprogram/pages/admin/bookings/list.wxml` — 新增"评价管理"入口（与 calendar-entry 同级）

### TDesign Rate Component API (verified from type.d.ts)
```typescript
// Key props
value: number            // 评分值 (1-5)
count: number            // 星星数量 (默认 5)
disabled: boolean        // 只读模式（展示用）
size: string             // 星星大小 (e.g., '40rpx')
color: string | string[] // 颜色（激活/未激活）
variant: 'outline' | 'filled'  // 样式变体
allowHalf: boolean       // 允许半星（我们不用，默认 false）
showText: boolean        // 显示辅助文字
texts: string[]          // 辅助文字数组
gap: string | number     // 星星间距

// Events
bind:change — 评分变化事件（用于表单输入）
```

### msgSecCheck API Pattern
```javascript
// 在云函数中调用
try {
  const result = await cloud.openapi.security.msgSecCheck({
    content: textContent,    // 要检查的文本
    openid: userOpenid,      // 用户 openid
    scene: 2,                // 场景值：1=资料，2=评论，3=论坛，4=社交日志
    version: 2,              // API 版本
  })
  // result.errCode === 0 表示通过
  // result.errCode === 87014 表示内容违规
} catch (err) {
  // API 调用失败
}
```

</code_context>

<specifics>
## Specific Ideas

- 评价表单页面顶部显示预约摘要信息（服务名 + 日期时间），让用户确认正在评价的是哪个预约
- 主页评价模块展示最近 3 条评价，每条评价文字截断到一行（text-ellipsis）
- "去评价"按钮使用 accent 色（`--accent`），与页面整体设计一致
- "已评价"标记使用灰色（`--text-tertiary`），不可点击
- 管理端评价列表页导航栏标题"客户评价"

</specifics>

<deferred>
## Deferred Ideas

- 评价回复（REVW-07）— 推迟到 v2，单化妆师可通过微信私下沟通
- 评价标签快捷选择（如"服务好""准时""技术好"）— 增加表单复杂度，当前纯文字足够
- 在 artist_profile 中缓存 avg_rating 和 review_count — 当前评价量远不到需要优化的程度
- 评价筛选/排序（按评分/时间/服务）— 单化妆师项目不需要
- 评价带图（客户上传图片）— 增加复杂度和审核负担，纯文字足够
- 匿名评价选项 — 个人化妆师场景不需要匿名，公开展示昵称增强真实性
- 评价通知（化妆师收到新评价推送）— 低优先级，化妆师可在管理端自行查看

---

*Phase: 09-customer-review-system*
*Context gathered: 2026-04-22*
