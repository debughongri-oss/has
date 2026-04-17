# Domain Pitfalls

**Domain:** 微信小程序 — 化妆师作品展示与预约系统
**Researched:** 2026-04-17
**Overall Confidence:** HIGH (sourced from official WeChat documentation, Context7-verified framework docs)

---

## Critical Pitfalls

Mistakes that cause rewrites, review rejection, or major user-facing failures.

### Pitfall 1: 未经隐私协议授权就调用隐私接口（审核必拒）

**What goes wrong:** 从 2023年10月17日起，微信强制要求所有小程序在调用涉及用户个人信息的 API 前必须先获得用户隐私协议同意。本项目需要调用 `wx.chooseMedia`（上传作品图片）、`wx.getUserProfile`（获取用户信息）等隐私接口。如果在用户未同意隐私协议的情况下调用，接口会直接失败，且**审核会被拒绝**。

**Why it happens:** 开发者习惯性地在页面加载时直接调用 API，忽略了隐私协议同步流程。`wx.chooseImage` 已停止维护，必须使用 `wx.chooseMedia`，后者属于隐私接口。

**Consequences:**
- 审核直接被拒，无法发布
- 用户首次使用时功能崩溃（chooseMedia 静默失败）
- 被微信要求整改，延迟上线

**Prevention:**
1. 在 `app.json` 或全局入口通过 `wx.getPrivacySetting` 检查 `needAuthorization`
2. 使用 `<button open-type="agreePrivacyAuthorization">` 组件让用户同意
3. 只在 `bindagreeprivacyauthorization` 回调之后才调用隐私接口
4. 设计全局隐私弹窗组件，在 App.onLaunch 时统一处理

**Detection:** 首次打开小程序 → 触发任何需要选择图片/获取信息的操作 → 如果没有先弹出隐私协议 → 必然触发此问题

**Phase:** Phase 1（基础框架搭建）就必须实现隐私协议流程

**Sources:**
- 官方文档: https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html
- Confidence: HIGH

---

### Pitfall 2: 订阅消息设计为"无限推送"（架构根本性错误）

**What goes wrong:** 微信小程序的订阅消息是**一次性**的 — 用户每次订阅只能收到一条消息通知。`wx.requestSubscribeMessage` 每调用一次，用户授权后只能下发一条消息。不存在"订阅一次永久推送"的能力。如果将预约通知设计为"化妆师接受预约后自动通知用户"，而不考虑用户是否已订阅，消息将无法送达。

**Why it happens:** 开发者（尤其是从 Web/App 背景来的）假设微信消息 = Web push notification，可以随时推送。

**Consequences:**
- 预约状态变更后通知无法送达
- 化妆师看不到新预约提醒
- 用户对"没收到通知"投诉
- 需要重构通知机制

**Prevention:**
1. **在用户提交预约时**引导用户订阅（`wx.requestSubscribeMessage`），此时用户有明确动机同意
2. 每个预约流程的交互节点都要对应一次订阅：
   - 用户提交预约时 → 订阅"预约结果通知"模板
   - 化妆师接受预约时 → 让化妆师订阅"预约提醒"模板
3. 预先在微信公众平台后台申请消息模板（需审核通过）
4. 通过云函数/服务端调用 `subscribeMessage.send` 下发消息
5. 处理消息下发失败的情况（用户拒收、已取消订阅等）

**Detection:** 通知功能代码中如果出现"在非用户交互时调用 requestSubscribeMessage" → 必然失败

**Phase:** Phase 2（预约功能开发）时必须正确实现

**Sources:**
- 官方文档: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html
- Confidence: HIGH

---

### Pitfall 3: 图片未压缩就上传，导致超时/OOM/流量浪费

**What goes wrong:** 化妆作品通常是高分辨率照片（单张 5-10MB），直接上传会导致：
1. `wx.uploadFile` 超时（默认60秒，网络差时可能不够）
2. 用户消耗大量移动流量
3. 云存储成本飙升
4. 作品列表加载缓慢（缩略图也是原图）
5. 小程序并发网络请求限制为 **10 个**，大量图片同时上传会阻塞其他请求

**Why it happens:** `wx.chooseMedia` 返回的是临时文件路径，开发者直接拿去上传，没有压缩步骤。

**Consequences:**
- 上传失败率高，用户体验差
- 云存储/CDN 费用远超预期
- 作品列表加载慢，用户流失

**Prevention:**
1. 上传前必须调用 `wx.compressImage({ src, quality: 80 })` 压缩
2. 作品列表使用缩略图（上传时生成缩略图版本，如 `wx.compressImage({ quality: 30 })` 作为列表用）
3. 作品详情页使用中等质量版本
4. 云存储使用 `fileID` 而非原始 URL
5. 图片上传使用队列控制，避免超过并发限制
6. 展示上传进度（`uploadTask.onProgressUpdate`）

**Detection:** 如果 `wx.chooseMedia` → `wx.uploadFile` 之间没有 `wx.compressImage` → 必然触发

**Phase:** Phase 1（作品上传功能）就必须实现

**Sources:**
- Taro 官方文档: https://context7.com/nervjs/taro-docs/apis/media/image/compressImage.md
- uni-app 官方文档: https://context7.com/websites/uniapp_dcloud_net_cn/api/media/video.html
- Confidence: HIGH

---

### Pitfall 4: 包体积超限（主包 > 2MB 导致无法发布）

**What goes wrong:** 微信小程序**主包不能超过 2MB**，每个分包不超过 2MB，总计不超过 **20MB**。如果将所有页面、组件、静态资源都放在主包，很容易超限。本项目包含大量页面（作品列表、作品详情、服务管理、预约流程、化妆师后台管理），如果还有 UI 组件库（如 Vant Weapp、TDesign），包体积会迅速膨胀。

**Why it happens:** 初始开发时不考虑包体积，后期才发现超限，被迫重构分包结构。

**Consequences:**
- 无法上传代码到微信后台
- 被迫大规模重构分包
- 启动速度慢（主包越大启动越慢）

**Prevention:**
1. **项目初期就规划分包结构**，例如：
   - 主包：首页、TabBar 页面、公共组件
   - 分包A：作品展示模块（列表+详情）
   - 分包B：预约模块（选择服务+选择时间+提交）
   - 分包C：化妆师管理后台（上传作品+管理服务+处理预约）
2. 图片等静态资源**不要打包到小程序内**，全部使用云存储/CDN
3. 使用按需注入（`"lazyCodeLoading": "requiredComponents"`）
4. UI 组件库按需引入，不要全量引入
5. 定期用微信开发者工具的"代码依赖分析"检查包体积

**Detection:** 每次编译后检查微信开发者工具中的包体积提示 → 主包 > 1.5MB 就要警惕

**Phase:** Phase 1（项目初始化和架构设计）就必须规划

**Sources:**
- uni-app 文档: 微信小程序每个分包 2MB，总限制 20MB
- Taro 文档: `optimizeMainPackage` 优化选项
- Confidence: HIGH

---

### Pitfall 5: 预约并发冲突 — 两人同时预约同一时段

**What goes wrong:** 如果不处理并发，两个客户可能同时预约化妆师的同一时间段。在数据写入前只检查"该时段是否已被预约"是不够的 — 存在竞态条件：A 检查通过 → B 也检查通过 → A 写入 → B 写入 → 同一时段被预约两次。

**Why it happens:** 使用客户端直接查询+写入的方式，没有数据库级别的并发控制。

**Consequences:**
- 化妆师同一天同一时间被预约两次
- 客户到店后发现冲突
- 严重损害化妆师信誉

**Prevention:**
1. **使用云函数处理预约逻辑**（而非客户端直接写数据库）
2. 在云函数中使用数据库事务：
   ```javascript
   const db = cloud.database()
   const _ = db.command
   const transaction = await db.startTransaction()
   try {
     // 检查时段是否可用（在事务内）
     const existing = await transaction.collection('appointments')
       .where({ date: targetDate, timeSlot: targetSlot, status: _.neq('cancelled') })
       .get()
     if (existing.data.length > 0) {
       await transaction.rollback()
       return { success: false, message: '该时段已被预约' }
     }
     // 创建预约
     await transaction.collection('appointments').add({ ... })
     await transaction.commit()
   } catch (e) {
     await transaction.rollback()
   }
   ```
3. 或者更简单的方式：使用**唯一约束**（日期+时段组合唯一），写入失败即表示冲突

**Detection:** 测试时模拟两个客户端同时提交同一时段的预约

**Phase:** Phase 2（预约功能）时实现

**Sources:**
- 微信云开发数据库事务能力
- Confidence: MEDIUM（需验证云开发事务API当前支持情况）

---

### Pitfall 6: 服务器域名未配置/配置错误（生产环境网络请求全部失败）

**What goes wrong:** 微信小程序**只允许与预先配置的域名通信**。所有 `wx.request`、`wx.uploadFile`、`wx.downloadFile` 都必须指向在「小程序后台 → 开发 → 开发设置 → 服务器域名」中配置过的域名。开发时可以跳过校验，但发布后**所有未配置的域名请求都会失败**。

**Why it happens:** 开发阶段勾选了"不校验域名"，一切正常。上线前忘记配置域名，或者域名变更后没有更新配置。

**Consequences:**
- 上线后所有网络请求失败（作品无法加载、预约无法提交）
- 用户看到空白页面或错误提示
- 需要紧急更新域名配置（每次修改需要重新审核）

**Key constraints:**
- 必须使用 **HTTPS** 协议
- 域名必须经过 **ICP 备案**
- 不能使用 IP 地址或 localhost
- 不能配置 `api.weixin.qq.com`
- `wx.request` 并发上限 **10 个**
- `wx.uploadFile` 并发上限 **10 个**
- 小程序进入后台 **5 秒**后未完成的网络请求会中断

**Prevention:**
1. 开发阶段就配置好域名，**不要长期依赖"跳过域名校验"**
2. 将所有需要配置的域名列一个清单（API服务器、图片CDN、云存储域名）
3. 每次发布前检查域名配置是否完整
4. 使用微信云开发/云托管可免去域名配置

**Detection:** 关闭开发者工具的"跳过域名校验"选项后测试 → 如果有请求失败 → 需要补充域名

**Phase:** Phase 1（开发环境搭建）时就必须配置

**Sources:**
- 官方文档: https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html
- Confidence: HIGH

---

## Moderate Pitfalls

### Pitfall 7: setData 性能灾难 — 传递大量图片数据

**What goes wrong:** 微信小程序的 `setData` 会将数据从逻辑层（JS线程）序列化后传递到渲染层（WebView），这是**跨线程通信**。如果把作品列表的所有图片 URL（甚至 base64）一次性通过 setData 传递，会导致严重的性能问题。

**Prevention:**
1. setData 只传必要的数据，不要传 base64 图片
2. 分页加载作品列表，每次 setData 只传当前页数据
3. 图片使用 `<image src="{{url}}">` 组件，由渲染层自行加载
4. 避免频繁调用 setData，合并更新

**Phase:** Phase 1（作品列表页开发）

**Sources:** 微信官方性能优化文档 — Confidence: HIGH

---

### Pitfall 8: 使用已废弃的 API（wx.chooseImage / wx.getUserInfo）

**What goes wrong:** `wx.chooseImage` 已停止维护，应使用 `wx.chooseMedia`。`wx.getUserInfo` 在微信小程序中可能返回匿名数据，应使用 `wx.getUserProfile` 或头像昵称填写组件。使用废弃 API 会在未来版本中完全失效。

**Prevention:**
1. 使用 `wx.chooseMedia` 替代 `wx.chooseImage`
2. 用户信息使用"头像昵称填写组件"或 `wx.getUserProfile`
3. 定期查看微信小程序 API 更新日志

**Phase:** 贯穿所有开发阶段

**Sources:** uni-app 文档明确标注 — Confidence: HIGH

---

### Pitfall 9: 云开发数据库查询默认只返回 20 条记录

**What goes wrong:** 微信云开发数据库在**客户端**调用 `.get()` 默认只返回 **20 条**记录，在**云函数**中默认返回 **100 条**。如果作品超过 20 个，不使用分页查询的话只能看到最新的 20 个作品。

**Prevention:**
1. 使用 `.limit()` 和 `.skip()` 实现分页
2. 作品列表用滚动加载（触底加载下一页）
3. 推荐通过云函数中转查询（限制更宽松）

**Phase:** Phase 1（作品列表功能）

**Sources:** Taro 云数据库文档 — Confidence: HIGH

---

### Pitfall 10: 预约时间管理设计不当 — 硬编码时段 vs 自定义时段

**What goes wrong:** 如果预约时段硬编码（如固定每小时一个时段），化妆师无法根据自己的实际情况调整。不同服务（日常妆 vs 新娘妆）所需时间不同，固定时段会导致时间浪费或预约冲突。

**Prevention:**
1. 服务项目包含"预计时长"字段（由化妆师设定）
2. 化妆师设定"可预约时间段"（如 9:00-18:00）和"休息时间"
3. 系统根据已有预约自动计算可用时段
4. 预约时显示"预计服务时长"，帮助客户选择合适时间

**Phase:** Phase 2（预约功能设计）时考虑

**Sources:** 领域知识 — Confidence: MEDIUM

---

### Pitfall 11: 作品图片加载白屏 — 无 loading 态和错误态处理

**What goes wrong:** 化妆作品图片较大，在弱网环境加载慢。如果没有 loading 占位图和加载失败提示，用户会看到长时间白屏或布局跳动。

**Prevention:**
1. `<image>` 组件使用 `bindload` 和 `binderror` 事件
2. 加载中显示骨架屏或低质量占位图（LQIP）
3. 加载失败显示默认图和重试按钮
4. 使用 `lazy-load` 属性实现懒加载
5. 图片使用渐进式 JPEG 格式

**Phase:** Phase 1（作品展示页面）

**Sources:** 通用前端经验 — Confidence: HIGH

---

### Pitfall 12: 化妆师管理入口未做身份验证

**What goes wrong:** 如果管理功能（上传作品、管理预约等）只是简单的页面跳转，没有身份验证，任何用户都可以通过直接输入页面路径访问管理页面。

**Prevention:**
1. 管理页面 onLoad 时检查当前用户的 openid 是否为化妆师
2. 云函数中对管理操作进行身份校验（不要信任客户端）
3. 使用云开发的权限系统限制数据访问
4. 非授权用户访问管理页面时重定向到首页

**Phase:** Phase 1（基础架构）时设计权限系统

**Sources:** 微信安全指引 — Confidence: HIGH

---

## Minor Pitfalls

### Pitfall 13: 小程序分享功能未配置 — 用户无法分享作品

**What goes wrong:** 默认分享行为只分享当前页面标题。化妆师希望客户能分享特定作品到微信聊天，但默认分享卡片不包含作品图片，没有吸引力。

**Prevention:**
1. 为作品详情页配置 `onShareAppMessage`，设置作品缩略图作为分享卡片图片
2. 分享标题包含化妆师名称和作品描述
3. 考虑配置 `onShareTimeline` 支持分享到朋友圈

**Phase:** Phase 3（优化阶段）

---

### Pitfall 14: 未处理小程序版本更新机制

**What goes wrong:** 微信小程序有缓存机制，用户可能长时间使用旧版本。如果发布了新版修复了预约 bug，部分用户仍然使用有 bug 的旧版。

**Prevention:**
1. 使用 `wx.getUpdateManager()` 检测版本更新
2. 检测到新版本时提示用户重启小程序
3. 关键业务逻辑尽量放在云函数端，更新无需用户操作

**Phase:** Phase 3（发布前）

---

### Pitfall 15: 本地缓存滥用 — 作品数据过期问题

**What goes wrong:** 为了加速加载把作品列表缓存到 `wx.setStorageSync`，但更新作品后用户看到的仍是旧数据。

**Prevention:**
1. 只缓存不常变化的数据（如服务项目列表）
2. 作品列表使用下拉刷新强制更新
3. 设置缓存过期时间，过期后重新请求

**Phase:** Phase 1

---

### Pitfall 16: 页面层级过深导致返回体验差

**What goes wrong:** 微信小程序页面栈最多 **10 层**。如果用户浏览路径为：首页 → 作品列表 → 作品详情 → 预约 → 选择服务 → 选择时间 → 确认预约 → 预约详情，可能超出限制。

**Prevention:**
1. 使用 `wx.redirectTo` 替代 `wx.navigateTo`（不需要返回的页面）
2. 合理设计页面流程，减少中间页面
3. 预约流程使用同一页面的步骤切换（非跳转新页面）

**Phase:** Phase 1（页面路由设计）

**Sources:** 微信官方文档 — Confidence: HIGH

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Priority |
|-------------|---------------|------------|----------|
| **项目初始化** | 包体积未规划分包 (P4) | 从第一天就设计分包结构 | 🔴 Critical |
| **项目初始化** | 域名未配置 (P6) | 开发阶段就配好域名 | 🔴 Critical |
| **隐私协议** | 未实现隐私授权流程 (P1) | 全局隐私弹窗组件 | 🔴 Critical |
| **作品展示** | 图片未压缩上传 (P3) | 上传前压缩 + 缩略图策略 | 🔴 Critical |
| **作品展示** | setData 传大量数据 (P7) | 分页 + 只传 URL | 🟡 Moderate |
| **作品展示** | 数据库查询只返回20条 (P9) | 实现分页加载 | 🟡 Moderate |
| **作品展示** | 图片无 loading/error 态 (P11) | 骨架屏 + 错误态处理 | 🟡 Moderate |
| **预约功能** | 订阅消息设计错误 (P2) | 每次交互节点引导订阅 | 🔴 Critical |
| **预约功能** | 并发预约冲突 (P5) | 云函数 + 数据库事务 | 🔴 Critical |
| **预约功能** | 时段管理设计不当 (P10) | 自定义服务时长 | 🟡 Moderate |
| **权限管理** | 管理页面未鉴权 (P12) | openid 校验 + 云函数权限 | 🟡 Moderate |
| **全局** | 使用废弃 API (P8) | 查阅最新文档 | 🟡 Moderate |
| **全局** | 页面层级超10层 (P16) | 使用 redirectTo / 步骤切换 | 🟡 Moderate |
| **优化** | 分享未配置 (P13) | onShareAppMessage 配置 | 🟢 Minor |
| **发布** | 未处理版本更新 (P14) | UpdateManager 检测 | 🟢 Minor |

## Audit (审核) Checklist

微信小程序审核常见拒绝原因（与本项目相关）：

| 拒绝原因 | 本项目涉及 | 预防措施 |
|----------|-----------|---------|
| 未填写隐私保护指引 | ✅ 涉及图片选择、用户信息 | 提交审核前在小程序后台填写完整 |
| 隐私协议未在调用前获得同意 | ✅ chooseMedia/getUserProfile | 实现隐私弹窗组件 |
| 内容涉及虚假宣传 | ⚠️ 化妆前后对比照 | 确保作品真实，标注说明 |
| 服务类目与实际不符 | ✅ 需选择正确类目 | 注册时选择"生活服务 > 美容美发" |
| 涉及虚拟支付但未接入 | ✅ 本项目明确不涉及支付 | 确保无支付入口，审核说明注明"线下结算" |
| 用户数据未加密传输 | ✅ 预约信息含手机号 | 使用 HTTPS + 云开发加密通道 |
| 缺少用户协议/服务条款 | ⚠️ 预约服务应提供 | 添加服务条款页面 |

## Sources

- **微信官方网络能力文档**: https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html (HIGH confidence)
- **微信隐私协议开发指南**: https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html (HIGH confidence)
- **微信订阅消息开发指南**: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html (HIGH confidence)
- **Taro 云数据库文档**: Context7 /nervjs/taro-docs (HIGH confidence)
- **Taro 图片压缩 API**: Context7 /nervjs/taro-docs/apis/media/image/compressImage.md (HIGH confidence)
- **uni-app 分包配置文档**: Context7 /websites/uniapp_dcloud_net_cn (HIGH confidence)
- **Taro 订阅消息 API**: Context7 /nervjs/taro-docs/apis/open-api/subscribe-message/requestSubscribeMessage.md (HIGH confidence)
- **并发预约事务处理**: 基于微信云开发能力推测 (MEDIUM confidence — 需验证当前事务 API)
