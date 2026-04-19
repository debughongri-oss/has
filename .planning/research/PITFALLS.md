# Domain Pitfalls — v1.1 Milestone: Adding Features to Existing System

**Domain:** 微信小程序 — 化妆师作品展示与预约系统 (v1.1 feature additions)
**Researched:** 2026-04-19
**Overall Confidence:** HIGH (code-verified pitfalls from existing codebase + official WeChat documentation)

---

## Critical Pitfalls

Mistakes that cause rewrites, review rejection, or data corruption when adding these features to the existing system.

### Pitfall 1: 订阅消息模板 ID 硬编码在两处 — 新增模板时漏改

**What goes wrong:** 现有代码中 `SUBSCRIBE_TEMPLATE_ID` 同时存在于客户端 `utils/constants.js`（第39行）和云函数 `cloudfunctions/bookings/index.js`（第7行）。当添加新模板（如"评价邀请"模板、"预约提醒"模板）时，极易只改了一处而忘记另一处，导致客户端订阅成功但云函数下发失败（或反过来）。

**Why it happens:** 现有 `TEMPLATE_ID` 是一个硬编码字符串常量 `-i6OevJwdS5fGFXCsB9Xux4zaaxUkXTR0xfLg5T48jM`，客户端和云端各自维护一份。新增模板时没有集中管理机制。

**Consequences:**
- 新增的"评价邀请"通知完全无声 — 客户订阅了但永远收不到
- 新增的"预约提醒"发送到错误的模板 ID — 消息内容与模板不匹配
- 调试困难 — 云函数不报错（`sendNotify` 有 try-catch 吞掉错误，见 bookings/index.js 第31-33行）

**Prevention:**
1. 所有模板 ID 统一管理在一个地方（推荐：云函数端使用配置对象，客户端通过 `constants.js` 导出）
2. 建立 `TEMPLATE_IDS` 对象而非散落的单个常量：
   ```javascript
   // constants.js
   const TEMPLATE_IDS = {
     BOOKING_STATUS_CHANGE: 'xxx', // 现有
     REVIEW_INVITE: 'yyy',         // 新增 — 预约完成后邀请评价
     BOOKING_REMINDER: 'zzz'        // 新增 — 服务前提醒
   }
   ```
3. 云函数端同样使用结构化配置
4. `sendNotify` 函数当前的 `console.error` 被静默吞掉 — 必须改为记录到数据库日志集合或使用 `wx realtime log`

**Detection:** 在微信公众平台后台创建新模板后，搜代码中所有 `TEMPLATE` / `templateId` / `tmplIds` 关键字确认两处同步

**Phase:** Phase 1 — 订阅消息功能开发前

**Sources:**
- 代码审查: `miniprogram/utils/constants.js:39`, `cloudfunctions/bookings/index.js:7-8`
- 微信官方订阅消息文档: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html
- Confidence: HIGH

---

### Pitfall 2: 订阅消息 `requestSubscribeMessage` 的时机错误 — 不在用户点击事件中调用

**What goes wrong:** 现有代码（`pages/booking/create.js:116`）在预约提交成功后调用 `wx.requestSubscribeMessage`，这个位置是合法的（在 Promise 回调中，由用户点击"提交预约"触发）。但新增功能中，如果尝试在页面 `onLoad` 或 `onShow` 中自动弹出订阅弹窗（如评价邀请），会被微信拒绝 — **`requestSubscribeMessage` 必须由用户主动点击行为触发**，不能在页面自动加载时调用。

**Why it happens:** 开发者想在用户完成预约后自动弹出评价邀请订阅，但"预约完成"是一个 modal 弹窗（`wx.showModal`），modal 关闭后回调里调用 `requestSubscribeMessage` 不算用户点击事件。

**Consequences:**
- `requestSubscribeMessage` 调用失败，返回 `requestSubscribeMessage:fail can only be invoked by user TAP gesture`
- 功能完全不工作

**Prevention:**
1. 评价邀请的订阅必须放在用户主动点击的按钮上（如"邀请评价"按钮的 `bindtap` 回调中）
2. 订阅时机设计：
   - ✅ 用户点击"提交预约"→ 成功后弹出订阅（现有方案，合法）
   - ✅ 用户点击"查看预约详情"→ 页面内有"接收通知"按钮
   - ❌ 页面 onLoad 时自动弹出订阅
   - ❌ wx.showModal 的 success 回调中弹出订阅
3. 对于"评价邀请"，更好的方案是：在预约状态变为"已完成"时，由云函数下发一条带"评价"链接的订阅消息，用户点击消息卡片进入评价页面 — 而不是在小程序内弹出订阅

**Detection:** 如果 `requestSubscribeMessage` 不在 `bindtap` 回调链中 → 必然失败

**Phase:** Phase 1 — 订阅消息增强

**Sources:**
- 微信官方文档明确要求用户 TAP gesture 触发
- 现有正确实现: `miniprogram/pages/booking/create.js:94-129`
- Confidence: HIGH

---

### Pitfall 3: Canvas 海报生成用旧版 API — `wx.createCanvasContext` 已废弃

**What goes wrong:** 海报生成需要在小程序端使用 Canvas 绘制图片+文字+小程序码，然后 `canvasToTempFilePath` 导出图片。如果使用旧版 Canvas API (`wx.createCanvasContext`)，在新版微信客户端上可能出现渲染异常、文字截断、图片不显示等问题。微信已推荐使用 **新版 Canvas 2D API**（通过 `<canvas type="2d">` 标签）。

**Why it happens:** 搜索到的教程和博客大部分仍在使用旧版 API，开发者照抄会踩坑。

**Consequences:**
- 海报在部分设备上渲染为空白
- 文字溢出或乱码
- `canvasToTempFilePath` 返回空白图片
- 未来微信版本可能完全移除旧版 API

**Prevention:**
1. 使用新版 Canvas 2D API：
   ```xml
   <canvas type="2d" id="posterCanvas" style="width: 600px; height: 800px;"></canvas>
   ```
   ```javascript
   const query = wx.createSelectorQuery()
   query.select('#posterCanvas').fields({ node: true, size: true }).exec((res) => {
     const canvas = res[0].node
     const ctx = canvas.getContext('2d')
     // 使用标准 Canvas 2D API 绑定
   })
   ```
2. 注意 `type="2d"` 的 canvas 不能用 `wx.createCanvasContext`
3. Canvas 内绘制网络图片需要先 `wx.getImageInfo` 或 `wx.downloadFile` 获取本地路径（云存储 fileID 需要先转 tempFileURL）
4. 海报中嵌入小程序码：使用 `wxacode.getUnlimited` 接口（服务端 API，需在云函数中调用），返回的 buffer 转为图片后绘制到 Canvas

**Detection:** 代码中出现 `wx.createCanvasContext` → 旧版 API，需替换

**Phase:** Phase 2 — 海报生成功能

**Sources:**
- 微信官方 Canvas 介绍: https://developers.weixin.qq.com/miniprogram/dev/framework/ability/canvas.html
- 微信官方旧版迁移指南: https://developers.weixin.qq.com/miniprogram/dev/framework/ability/canvas-legacy-migration.html
- Confidence: HIGH

---

### Pitfall 4: 小程序码接口 `getUnlimited` 只能在已发布版本使用

**What goes wrong:** `wxacode.getUnlimited`（接口B，无数量限制，推荐使用）是**服务端 API**，且**只能为已发布的小程序生成小程序码**。开发阶段调用会返回错误。如果海报功能在开发/体验版测试时始终失败，开发者可能浪费时间排查"代码问题"而忽略这只是环境限制。

**Why it happens:** 文档中这个限制容易被忽略，且错误信息不直观。

**Consequences:**
- 开发阶段海报功能完全无法测试
- 误以为是代码 bug 导致无限调试
- 如果用了接口A (`getQRCode`)，有 10万次总量限制，测试时浪费配额

**Prevention:**
1. 开发阶段使用 TDesign 的 `<t-qrcode>` 组件生成普通二维码替代（项目已安装 TDesign，`miniprogram_npm/tdesign-miniprogram/qrcode` 已存在）
2. 生产环境切换为 `wxacode.getUnlimited`（云函数调用）
3. 使用条件编译或环境变量区分：
   ```javascript
   // 开发阶段 — 用 TDesign QR Code 组件显示
   // 生产环境 — 云函数调用 getUnlimited 获取真实小程序码图片
   ```
4. `getUnlimited` 的 `scene` 参数最大 **32 字节** — 不能传长字符串。本项目传作品 ID 即可
5. `page` 参数必须是已发布页面路径，不能带查询参数（参数通过 `scene` 传递）

**Detection:** 海报功能开发时，云函数调用 `openapi.wxacode.getUnlimited` 报错 → 检查小程序是否已发布

**Phase:** Phase 2 — 海报生成功能

**Sources:**
- 微信官方小程序码文档: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/qr-code.html
- 注意事项: "接口只能生成已发布的小程序的二维码" + "接口B调用分钟频率受限(5000次/分钟)"
- Confidence: HIGH

---

### Pitfall 5: 作品数据模型缺少 before/after 字段 — 新增滑块需要数据迁移

**What goes wrong:** 现有 `works` 集合的 `images` 字段是一个简单数组（`images: string[]`），不区分"妆前"和"妆后"图片。如果要实现 before/after 滑块，需要知道哪些图片是"妆前"、哪些是"妆后"。如果直接在现有 images 数组上做约定（如"第一张是before，第二张是after"），会导致：
1. 已有作品全部需要重新编辑才能使用滑块
2. 没有before/after的作品显示异常
3. 约定容易被人遗忘

**Why it happens:** v1.0 数据模型设计中 images 是平铺数组，没有分类能力。

**Consequences:**
- 滑块组件收到不确定的数据结构而崩溃
- 已有作品在 detail 页显示错乱
- 化妆师需要重新编辑所有作品

**Prevention:**
1. **扩展数据模型而非替换**：
   ```javascript
   // works 集合新增字段（向后兼容）
   {
     images: string[],              // 保留 — 用于普通轮播（不破坏现有逻辑）
     before_image: string,          // 新增 — 妆前图片 fileID（可选）
     after_image: string,           // 新增 — 妆后图片 fileID（可选）
     has_comparison: boolean        // 新增 — 是否有前后对比
   }
   ```
2. **不修改现有 `images` 字段** — 它仍然用于轮播展示（现有 swiper 逻辑不变）
3. `has_comparison` 为 false 或不存在时，detail 页不显示滑块区域（向后兼容所有已有作品）
4. 新增作品时，化妆师可选填 before/after 图片（不是必须的）
5. 云函数 `works` 的 `detail` action 不需要修改 — 返回整个文档，客户端自行判断

**Detection:** 新增 `before_image` / `after_image` 字段后，测试已有作品详情页是否正常显示

**Phase:** Phase 1 — 前后对比滑块

**Sources:**
- 代码审查: `cloudfunctions/works/index.js` 的 create/update action 直接透传 data，不校验字段
- 代码审查: `miniprogram/pages/works/detail.js` 只使用 `work.images` 数组
- Confidence: HIGH

---

### Pitfall 6: 日历视图组件包体积风险 — TDesign Calendar 是大组件

**What goes wrong:** 当前 `miniprogram_npm/` 目录已达 **4.6MB**（全量 TDesign 组件）。虽然微信构建时会 tree-shake 未引用的组件，但 TDesign 的 Calendar 组件依赖较多子组件（Popup、Button 等），加上新增的 QRCode 组件、自定义滑块组件，可能导致 admin 分包超 2MB 或主包超 2MB。

**Why it happens:** TDesign 组件库按需引入依赖 `lazyCodeLoading: "requiredComponents"`（已在 app.json 配置），但 Calendar 本身体积较大，且 admin 分包已有 7 个页面。

**Consequences:**
- 无法上传代码到微信后台
- 被迫做紧急分包拆分
- 启动速度变慢

**Prevention:**
1. **每个新功能开发后立即检查包体积**（微信开发者工具 → 详情 → 本地设置 → 勾选"上传代码时自动压缩" → 编译后查看包大小）
2. 日历视图放到 **admin 分包**（化妆师专用），不放主包 — 客户端预约页面保留现有的横向日期列表（`generateDateList`）
3. 海报生成功能使用独立页面（可考虑放到 admin 分包）
4. 如果 admin 分包超限，考虑拆分为两个分包：
   - `admin-main`: 作品管理、服务管理
   - `admin-calendar`: 日历视图、预约管理
5. 自定义 before/after 滑块组件不需要引入额外库（用原生 touch 事件 + WXSS clip-path 实现），不增加包体积

**Detection:** 每次添加新 TDesign 组件引用后编译查看包体积

**Phase:** 贯穿所有 phase — 每个 feature 完成后检查

**Sources:**
- 现有 miniprogram_npm 大小: 4.6MB（但实际构建后会 tree-shake）
- admin 分包: `miniprogram/pages/admin/` = 116KB（源码，不含 npm）
- app.json 已配置 `"lazyCodeLoading": "requiredComponents"`
- Confidence: HIGH

---

## Moderate Pitfalls

### Pitfall 7: 评价系统的状态耦合陷阱 — "已完成"是双入口操作

**What goes wrong:** 预约需要先变为"已完成"状态才能触发评价。但"已完成"状态有两个触发入口：(1) 化妆师在 admin 后台手动标记（`onComplete` in `admin/bookings/detail.js`）；(2) 未来可能需要自动标记（服务时间过后自动完成）。如果评价邀请只在手动标记时发送，那自动完成的预约将永远没有评价入口。

**Why it happens:** 现有系统的 booking 状态变更集中在 `updateStatus` action（cloudfunctions/bookings/index.js:154-170），且已经有 `sendNotify` 调用。但评价邀请是新的通知类型，需要新的订阅模板，不能复用现有模板。

**Prevention:**
1. 评价邀请不走订阅消息（避免新增模板的复杂性），改为：在客户端"我的预约"列表中，已完成的预约显示"去评价"按钮
2. 如果确实需要通知，在 `updateStatus` 的 `completed` 分支中添加评价邀请通知（使用新模板 ID）
3. 评价页面通过 URL 参数接收 booking ID，创建评价时校验该 booking 状态确实是 `completed`

**Detection:** 画出 booking 状态机图，确认每个 `completed` 转换路径都有评价入口

**Phase:** Phase 3 — 评价系统

**Sources:**
- 现有状态转换: `cloudfunctions/bookings/index.js:162` — `['accepted', 'rejected', 'completed']` 触发通知
- Confidence: HIGH

---

### Pitfall 8: 日历视图与现有预约列表的重复逻辑 — admin 预约管理出现两套代码

**What goes wrong:** 现有 `pages/admin/bookings/list.js` 已经有完整的预约列表加载、状态筛选功能。新增日历视图后，如果日历页面重新实现了一套加载预约数据的逻辑，会导致：
1. 两处代码维护成本翻倍
2. 一个改了另一个没改 → 数据显示不一致
3. `loadBookings` 和 `getBookingsList` 的参数/过滤条件不同步

**Why it happens:** 日历视图是一个新页面，开发者倾向于复制粘贴列表页逻辑。

**Prevention:**
1. **复用现有 service 层** — `services/bookings.js` 的 `getBookingsList` 已实现分页、状态筛选
2. 日历页面调用同一个 service 方法，只是数据展示方式不同（日历视图按日期分组 vs 列表视图按时间排序）
3. 新增一个 `getBookingsByDateRange(startDate, endDate)` 方法（云函数端），日历视图按月查询数据，避免加载全量预约
4. 考虑日历视图和列表视图使用**同一个页面，通过 tab 切换**（减少页面数量和代码重复）

**Detection:** 如果出现两个页面都调用 `getBookingsList` 且各自处理数据 → 代码重复

**Phase:** Phase 1 — 日历视图

**Sources:**
- 代码审查: `miniprogram/pages/admin/bookings/list.js:33-53` 和 `miniprogram/services/bookings.js:15-19`
- Confidence: HIGH

---

### Pitfall 9: 预约备注增强的字段冲突 — 现有 `notes` 字段语义不清

**What goes wrong:** 现有 `bookings` 集合的 `notes` 字段（`cloudfunctions/bookings/index.js:81`）是一个自由文本字符串，用于"客户留言"。增强后需要新增"皮肤类型"、"特殊需求"等结构化字段。如果直接在 `notes` 上叠加，会导致：
1. 旧数据的 `notes` 是纯文本，新代码尝试解析为 JSON → 报错
2. 或者新增字段名和现有字段冲突

**Why it happens:** v1.0 的 notes 设计为简单字符串，没有结构化。

**Prevention:**
1. **新增独立字段，不修改现有 `notes`**：
   ```javascript
   // bookings 文档扩展
   {
     notes: string,                    // 保留 — 客户自由留言（向后兼容）
     skin_type: string,                // 新增 — 皮肤类型（干性/油性/混合/敏感）
     special_needs: string,            // 新增 — 特殊需求（过敏史等）
     reference_images: string[]        // 新增 — 参考图片（可选）
   }
   ```
2. 客户端预约表单新增这些字段（`pages/booking/create.js` 的 `submitBooking` 需要传递新字段）
3. 云函数 `bookings` 的 `create` action 的白名单式字段提取需要扩展（当前直接透传 `event`，需要确保新字段被正确保存）
4. 管理后台的预约详情页需要展示新字段

**Detection:** 提交预约时检查云数据库中新字段是否正确写入

**Phase:** Phase 1 — 预约备注增强

**Sources:**
- 代码审查: `cloudfunctions/bookings/index.js:74-88` — create action 直接透传字段
- 代码审查: `miniprogram/pages/booking/create.js:104-113` — submitBooking 传递的字段
- Confidence: HIGH

---

### Pitfall 10: 评价系统缺少审核机制 — 恶意/垃圾评价公开显示

**What goes wrong:** 公开评价系统如果没有审核机制，任何用户都可以提交任何内容（广告、辱骂、虚假评价）。对于个人化妆师的品牌形象，一条恶意评价可能造成严重影响。

**Why it happens:** 先做功能后做审核是常见顺序错误。

**Consequences:**
- 化妆师品牌受损
- 微信审核可能以"缺少内容管理机制"拒绝
- 需要紧急添加审核功能或下线评价

**Prevention:**
1. **默认设计为"审核后显示"** — 评价创建时 `status: 'pending'`，只有化妆师审核通过后（`status: 'approved'`）才在作品/服务页面公开展示
2. 评价数据模型：
   ```javascript
   // reviews 集合
   {
     booking_id: string,       // 关联预约
     user_openid: string,      // 评价人
     rating: number,           // 1-5 星
     content: string,          // 评价文字
     status: 'pending' | 'approved' | 'rejected',
     artist_reply: string,     // 化妆师回复（可选）
     created_at: date
   }
   ```
3. 化妆师在 admin 后台管理评价（审核/回复/隐藏）
4. 限制每个预约只能评价一次（通过 `booking_id` + `user_openid` 唯一性校验）
5. 只有 `status: 'completed'` 的预约才能评价（云函数校验）
6. 考虑使用微信内容安全 API (`security.msgSecCheck`) 检测评价文字是否违规 — **这是审核要求**

**Detection:** 评价功能代码中如果没有 `status` 字段和审核流程 → 必定触发此问题

**Phase:** Phase 3 — 评价系统

**Sources:**
- 微信小程序审核常见拒绝原因: 缺少内容安全审查
- 微信内容安全 API: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/sec-center/sec-check/msgSecCheck.html
- Confidence: HIGH

---

### Pitfall 11: 化妆师简介增强的数据迁移 — `artist_profile` 单文档直接覆盖风险

**What goes wrong:** `artist_profile` 是单文档集合（`cloudfunctions/profile/index.js:25`）。增强简介需要新增字段（`service_area`, `experience_years`, `style_tags`）。现有 `update` action（profile/index.js:56-57）直接 `Object.assign` 传入的 data 到文档更新，这意味着：
1. 如果新版本客户端发送的新字段名有误，会写入错误数据
2. 如果老版本客户端（用户还没更新小程序）编辑简介时，不会发送新字段 → 新字段被覆盖丢失
3. `update` action 没有字段白名单 — 任何字段都可以被写入

**Why it happens:** 现有 update 逻辑是直接透传 `event.data`，没有字段过滤。

**Prevention:**
1. **云函数 update action 添加字段白名单**：
   ```javascript
   const ALLOWED_FIELDS = [
     'name', 'avatar', 'bio', 'experience',
     'specialties', 'contact_info',
     // v1.1 新增
     'service_area', 'experience_years', 'style_tags'
   ]
   const updateData = {}
   ALLOWED_FIELDS.forEach(field => {
     if (event.data[field] !== undefined) {
       updateData[field] = event.data[field]
     }
   })
   ```
2. **使用 `$set` 而非替换整个文档** — 避免未传字段被删除（当前 `update` 行为是 merge，但最好显式）
3. **给新字段设置默认值** — 防止客户端读取时 undefined

**Detection:** 云函数 `profile/index.js` 的 update action 中如果有 `...event.data` 或类似直接透传 → 需要加白名单

**Phase:** Phase 1 — 简介增强（应最先做，因为涉及数据模型扩展）

**Sources:**
- 代码审查: `cloudfunctions/profile/index.js:56-77` — update action 直接使用 `event.data`
- 代码审查: `miniprogram/pages/admin/profile/edit.js:80-90` — saveProfile 构造的对象
- Confidence: HIGH

---

### Pitfall 12: 时间冲突检测的竞态条件未完全解决

**What goes wrong:** 现有的冲突检测（`cloudfunctions/bookings/index.js:62-71`）是"先查后写"模式，没有使用数据库事务。v1.0 注释中也标注了 "MEDIUM confidence — 需验证云开发事务API当前支持情况"。当添加日历视图（更多用户同时查看可用时段）+ 增强预约备注（更长的表单填写时间）后，竞态窗口更大。

**Why it happens:** 云开发的数据库事务 API 在较新版本才稳定，v1.0 选择简单方案。

**Consequences:**
- 两个客户同时预约同一时段成功
- 化妆师日历上出现重叠预约

**Prevention:**
1. 使用云数据库事务包裹"查询+写入"：
   ```javascript
   const transaction = await db.startTransaction()
   try {
     const existing = await transaction.collection('bookings')
       .where({ booking_date, booking_time, status: _.in(['pending', 'accepted']) })
       .get()
     if (existing.data.length > 0) {
       await transaction.rollback()
       return { errCode: -1, errMsg: '该时段已被预约' }
     }
     await transaction.collection('bookings').add({ data: bookingData })
     await transaction.commit()
   } catch (e) {
     await transaction.rollback()
     throw e
   }
   ```
2. 如果事务 API 不可用，退而求其次使用 `db.serverDate()` 做乐观锁

**Detection:** 压测时两个客户端同时提交同一时段预约

**Phase:** Phase 1 — 时间冲突检测增强

**Sources:**
- 现有代码: `cloudfunctions/bookings/index.js:59-93`
- 现有 pitfalls 文档: Pitfall 5 (v1.0) 标注为 MEDIUM confidence
- Confidence: MEDIUM（需验证当前云开发环境事务 API 支持情况）

---

## Minor Pitfalls

### Pitfall 13: Before/After 滑块的 touch 事件在 swiper 内冲突

**What goes wrong:** 作品详情页现有 swiper 组件（`pages/works/detail.wxml:8-15`）支持左右滑动切换图片。如果在 swiper 内嵌入 before/after 滑块组件（也需要水平拖拽），触摸事件会冲突 — 用户拖拽滑块时 swiper 也跟着滑动。

**Prevention:**
1. Before/after 滑块放在 swiper **外部**（作为独立的展示区域）
2. 或者滑块触发时调用 `e.stopPropagation()` + `catchtouchmove` 阻止事件冒泡
3. 推荐布局：顶部 before/after 对比区（固定高度）→ 下方 swiper 展示更多作品图片
4. 滑块区域使用 `catchtouchmove` 而非 `bindtouchmove` 来吞掉触摸事件

**Detection:** 在作品详情页同时存在 swiper 和 before/after 滑块时，测试拖拽是否冲突

**Phase:** Phase 1 — 前后对比滑块

**Sources:**
- 现有 swiper: `miniprogram/pages/works/detail.wxml:8-15`
- 微信小程序事件冒泡机制
- Confidence: HIGH

---

### Pitfall 14: 海报 Canvas 在不同设备上尺寸不一致

**What goes wrong:** Canvas 绘制使用像素单位，但不同设备的 DPR（设备像素比）不同。如果不做 DPR 适配，海报在高清屏上会模糊，在低分屏上文字会溢出。

**Prevention:**
1. 使用 `wx.getSystemInfoSync().pixelRatio` 获取 DPR
2. Canvas 实际像素 = 显示尺寸 × DPR
3. 绘制时所有坐标和字号都乘以 DPR
4. 导出时使用 `canvas.toTempFilePath` 的 `destWidth` 和 `destHeight` 指定输出尺寸

**Detection:** 在 iPhone (DPR=3) 和 Android (DPR=2) 上分别生成海报对比清晰度

**Phase:** Phase 2 — 海报生成

---

### Pitfall 15: 评价星级的交互细节 — 评分组件的点击区域太小

**What goes wrong:** 微信小程序中星级评分组件如果星星太小，用户很难精准点击。这在手机上尤其明显。

**Prevention:**
1. 每颗星星的点击区域至少 80rpx × 80rpx（包含 padding）
2. 使用 TDesign 的 `t-rate` 组件（如果可用），或自定义大尺寸星星
3. 支持半星（0.5步进）时需要更大的点击区域

**Detection:** 在真机上测试评价流程，确认点星体验流畅

**Phase:** Phase 3 — 评价系统

---

### Pitfall 16: 风格标签的输入方式 — 用逗号分隔字符串不可靠

**What goes wrong:** 现有 profile edit 页面（`admin/profile/edit.js:78`）的 specialties 使用逗号分隔字符串输入：`specialtiesText.split(/[,，]/).filter(s => s.trim())`。新增的 `style_tags` 如果也用同样方式，用户体验差且容易出错。

**Prevention:**
1. 使用 TDesign 的 `t-tag` + "添加"按钮的交互方式（点击添加标签，点击标签删除）
2. 或者使用 `t-input` + 预设标签选择的混合方式
3. 提供预设标签列表（如："清新自然", "韩系", "欧美", "中式古典"）+ 自定义输入

**Detection:** 风格标签输入的 UX 测试

**Phase:** Phase 1 — 简介增强

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Priority |
|-------------|---------------|------------|----------|
| **前后对比滑块** | 数据模型缺少 before/after 字段 (P5) | 新增独立字段，不改 images 数组 | 🔴 Critical |
| **前后对比滑块** | swiper 与滑块 touch 事件冲突 (P13) | 滑块放 swiper 外，使用 catchtouchmove | 🟡 Moderate |
| **订阅消息增强** | 模板 ID 两处硬编码不同步 (P1) | 统一 TEMPLATE_IDS 对象管理 | 🔴 Critical |
| **订阅消息增强** | requestSubscribeMessage 不在 tap 中调用 (P2) | 只在用户点击回调中调用 | 🔴 Critical |
| **海报生成** | Canvas 旧版 API (P3) | 使用 Canvas 2D API (`type="2d"`) | 🔴 Critical |
| **海报生成** | getUnlimited 只能已发布版本 (P4) | 开发阶段用 TDesign QR Code 替代 | 🔴 Critical |
| **海报生成** | Canvas DPR 适配 (P14) | 获取 pixelRatio 缩放绘制 | 🟡 Moderate |
| **日历视图** | 包体积超限风险 (P6) | Calendar 放 admin 分包，完成后检查体积 | 🔴 Critical |
| **日历视图** | 与现有列表页逻辑重复 (P8) | 复用 service 层，新增日期范围查询 | 🟡 Moderate |
| **预约备注增强** | notes 字段语义不清 (P9) | 新增独立字段，不修改 notes | 🟡 Moderate |
| **时间冲突** | 竞态条件未解决 (P12) | 云函数中使用数据库事务 | 🟡 Moderate |
| **简介增强** | profile update 字段无白名单 (P11) | 云函数添加 ALLOWED_FIELDS 过滤 | 🟡 Moderate |
| **简介增强** | 风格标签输入方式 (P16) | 使用标签选择交互而非逗号分隔 | 🟢 Minor |
| **评价系统** | 缺少审核机制 (P10) | 默认 pending 状态 + 化妆师审核 | 🔴 Critical |
| **评价系统** | "已完成"状态双入口评价触发 (P7) | 客户端预约列表显示"去评价"按钮 | 🟡 Moderate |
| **评价系统** | 星级点击区域太小 (P15) | 星星点击区域 ≥ 80rpx | 🟢 Minor |
| **全局** | 包体积持续增长 (P6) | 每个功能完成后检查包体积 | 🔴 Critical |

## Integration Order Risks

Based on the codebase analysis, recommended order and its rationale:

| Order | Feature | Risk if Done Earlier | Risk if Done Later |
|-------|---------|---------------------|-------------------|
| 1️⃣ | 简介增强 + 数据模型扩展 | N/A | 其他功能依赖 profile 数据结构，晚做会导致反复调整 |
| 2️⃣ | 预约备注增强 + 时间冲突检测 | 依赖 booking 数据模型 | 日历视图和通知需要稳定的预约数据结构 |
| 3️⃣ | 前后对比滑块 | 依赖 works 数据模型 | 纯 UI 增强，可后做但无依赖 |
| 4️⃣ | 日历视图 | 依赖稳定的 booking 数据 | 管理端功能，需要预约数据就绪 |
| 5️⃣ | 订阅消息增强 | 需要预约状态机稳定 | 通知是附加层，最后做风险最低 |
| 6️⃣ | 海报生成 | 独立功能，但需要 profile 和 works 数据 | 可随时做，但建议后做以避免包体积风险积累 |
| 7️⃣ | 评价系统 | 需要"已完成"状态稳定运行一段时间 | 最晚做 — 需要有已完成的预约数据才能测试 |

## Audit (审核) Checklist for v1.1

新增审核风险点：

| 拒绝原因 | 本项目涉及 | 预防措施 |
|----------|-----------|---------|
| 评价系统缺少内容安全审查 | ✅ 用户提交文字评价 | 接入 `security.msgSecCheck` 或使用审核机制 |
| 前后对比照涉及虚假宣传 | ⚠️ 化妆效果对比 | 确保作品真实，不使用过度修图 |
| 海报分享涉及诱导分享 | ⚠️ 分享海报可能被判定为诱导 | 海报不能包含"分享得优惠"等文字 |
| 订阅消息滥用 | ⚠️ 新增多个通知模板 | 每个模板都要在微信后台申请审核 |
| 隐私保护指引需更新 | ✅ 新增了评价和更多用户输入 | 更新隐私保护指引，申明收集评价内容 |

## Sources

- **代码审查** — 所有 pitfall 均基于对现有代码的直接分析（云函数、页面 JS、WXML、service 层）
- **微信官方订阅消息文档**: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html (HIGH confidence)
- **微信官方 Canvas 文档**: https://developers.weixin.qq.com/miniprogram/dev/framework/ability/canvas.html (HIGH confidence)
- **微信官方小程序码文档**: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/qr-code.html (HIGH confidence)
- **TDesign Calendar 组件**: Context7 `/tencent/tdesign-miniprogram` (HIGH confidence)
- **TDesign QRCode 组件**: Context7 `/tencent/tdesign-miniprogram` (HIGH confidence)
- **TDesign Slider 组件**: Context7 `/tencent/tdesign-miniprogram` — 确认需在 hidden/popup 容器中调用 `init()` (HIGH confidence)
- **微信内容安全 API**: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/sec-center/sec-check/msgSecCheck.html (HIGH confidence)
