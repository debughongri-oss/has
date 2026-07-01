# Phase 11 Research: Auth & Security 修复

**Researched:** 2026-07-01
**Phase goal:** 消除 v1.0/v1.1 遗留的认证相关缺陷——登录竞态、客户端伪造展示身份、身份源硬编码重复、缓存漂移

## 缺陷定位（含文件:行号）

### SEC-04: ARTIST_OPENID magic constant — 6 份副本

| # | 文件 | 行号 | 内容 |
|---|------|------|------|
| 1 | `miniprogram/utils/constants.js` | 10 | `const ARTIST_OPENID = 'oDmtI48gecuF3n9OkEBJN91BJliI'` |
| 2 | `cloudfunctions/shared/auth.js` | 10 | 同上（根 shared，未被 require，留作模板） |
| 3 | `cloudfunctions/profile/shared/auth.js` | 10 | 同上（profile 实际使用） |
| 4 | `cloudfunctions/bookings/shared/auth.js` | 10 | 同上（bookings 实际使用） |
| 5 | `cloudfunctions/services/shared/auth.js` | 10 | 同上（services 实际使用） |
| 6 | `cloudfunctions/works/shared/auth.js` | 10 | 同上（works 实际使用） |

**已验证**：5 份云函数副本内容完全一致（diff 全相等）。每个云函数独立部署，必须各自保留 `shared/auth.js` 副本（云函数 require 不能跨函数目录）。

### SEC-03: 冷启动竞态 — 13 处同步 isArtist() + 1 处 globalData 直读

`app.js:21-26` onLaunch 异步触发 `silentLogin()` 但**不 await**。登录完成前，任何页面 onLoad/onShow 调用 `authService.isArtist()`（同步读 `_userInfo`，未就绪时返回 false）会误判为"非化妆师"。

**受影响的同步身份读取点**：

| 文件 | 行号 | 场景 | 风险 |
|------|------|------|------|
| `pages/admin/works/list.js` | 19, 28 | 作品管理列表守卫 | 高（功能不可用） |
| `pages/admin/works/edit.js` | 21 | 作品编辑守卫 | 高 |
| `pages/admin/services/list.js` | 27, 36 | 服务管理列表守卫 | 高 |
| `pages/admin/services/edit.js` | 20 | 服务编辑守卫 | 高 |
| `pages/admin/bookings/list.js` | 31, 40 | 预约管理列表守卫 | 高 |
| `pages/admin/bookings/detail.js` | 38 | 预约详情守卫 | 高 |
| `pages/admin/bookings/calendar.js` | 37 | 日历管理守卫 | 高 |
| `pages/admin/profile/edit.js` | 24 | 资料编辑守卫 | 高 |
| `pages/admin/reviews/list.js` | 13 | 评价管理守卫 | 高 |
| `pages/works/poster.js` | 26 | 海报页守卫 | 高 |
| `pages/works/detail.js` | 17 | 作品详情 isArtist 状态 | 中（按钮不显示） |
| `pages/profile/index.js` | 20 | "我的"页 isArtist 状态 | 中（入口不显示） |
| `pages/review/create.js` | 90-91 | 评价页直读 globalData.userInfo | 中（昵称缺失） |

### SEC-05: 服务端信任客户端传入的用户信息

| 云函数 | 行号 | 客户端字段 | 处理 |
|--------|------|-----------|------|
| `cloudfunctions/bookings/index.js` | 62 | `event.user_info` | :91 直接存入 `booking.user_info` |
| `cloudfunctions/reviews/index.js` | 27 | `event.user_nickname`, `event.user_avatar` | :95-96 直接存入 review |

**客户端源头**：
- `miniprogram/services/reviews.js:17-18` 主动传 `user_nickname`/`user_avatar`
- bookings 客户端当前未传 `user_info`（grep 无匹配），但服务端接收口子仍在（未来风险）

**权威源已存在**：`cloudfunctions/login/index.js` 的 users 集合已有 `nickname`/`avatar_url` 字段，云函数可直接按 `wxContext.OPENID` 查询取权威值。

### SEC-06: 客户端双写缓存

| 缓存位置 | 写入点 | 读取点 |
|----------|--------|--------|
| `app.js:22` `globalData.userInfo` | silentLogin 成功后 | `pages/review/create.js:90-91` |
| `services/auth.js:12,43` `_userInfo`（模块级） | silentLogin 成功后 | 13 处 isArtist/isLoggedIn/getUserInfo |

**漂移场景**：profile 更新昵称/头像后，两份缓存都不会自动刷新。`cloudfunctions/profile/index.js` update action 成功后客户端无 invalidate 信号。

## 数据流现状

### 登录流（当前）
```
app.onLaunch
  └─(异步,不 await)─> authService.silentLogin()
      └─> wx.login → callCloudFunction('login', {action:'login'})
          └─> login 云函数查/建 users 记录 → 返回 {openid, role, nickname, avatar_url}
      └─> _userInfo = result.data  (services/auth.js 模块缓存)
  └─> globalData.userInfo = userInfo  (app.js 缓存，与上面双写)

页面 onLoad (竞态窗口内)
  └─> authService.isArtist()  // _userInfo 可能仍为 null
      └─> return false  // 误判
```

### 身份判定（当前）
```
客户端 isArtist():
  _userInfo.openid === ARTIST_OPENID (constants.js 硬编码)

服务端 requireArtist(wxContext):
  wxContext.OPENID === ARTIST_OPENID (各自 shared/auth.js 硬编码)
```

## SEC-04 解决方案评估

| 方案 | 思路 | 优点 | 缺点 |
|------|------|------|------|
| **A. artist_profile._openid** | requireArtist 查 artist_profile 单文档，比对 _openid | 零新集合；_openid 由云开发自动注入；支持热更新；语义天然 | init 需特殊处理（bootstrap） |
| B. 新建 config 集合 | 存 artist_openid 单字段 | 语义清晰 | 过度设计；新集合维护成本 |
| C. users.role 字段 | artist 用户 role='artist' | 通用；支持多化妆师扩展 | 违背单化妆师约束；需 bootstrap 设置 |
| D. 云函数环境变量 | process.env.ARTIST_OPENID | 无 DB 查询 | 不能热更新；需 redeploy |

**决策：方案 A**。artist_profile 已存在，_openid 由云开发 add 时自动注入（profile/index.js:68），是化妆师身份的天然权威源。

**Bootstrap 处理**：profile init action 当前调用 requireArtist，会陷入鸡生蛋问题（artist_profile 不存在 → requireArtist 失败 → 无法 init）。解决方案：init action 改为**不鉴权但幂等**——若 artist_profile 已存在则拒绝，不存在则允许任何调用者创建（创建后 _openid 锁定为调用者 openid）。风险：artist_profile 误删后任何人可重新 init 抢占——可接受（极端情况，且数据库有备份）。

## users 集合 schema（推断）

```
{
  _id: string,
  _openid: string,      // 微信云开发自动注入
  role: 'client',       // login 云函数新建时硬编码（line 36）
  nickname: string,     // login updateProfile action 可更新
  avatar_url: string,   // 同上
  created_at: Date,
  updated_at: Date
}
```

注意：users.role 当前只有 'client'（artist 身份靠 magic constant 比对），不用于鉴权决策。

## 影响面汇总

| 改动类型 | 文件数 | 说明 |
|----------|--------|------|
| 云函数 shared/auth.js | 5 | requireArtist 改 async + 查 artist_profile |
| 云函数调用点加 await | 4 | profile/bookings/works/services 中 requireArtist 调用 |
| 云函数 bookings | 1 | create action 移除 user_info 信任，查 users 集合 |
| 云函数 reviews | 1 | create action 移除 user_nickname/avatar 信任，查 users 集合 |
| 客户端 auth service | 1 | 增加 ensureLogin/refreshUserInfo，isArtist 保持同步但前置 ensure |
| 客户端 app.js | 1 | 移除 globalData.userInfo 双写 |
| 客户端页面 | 13 | isArtist 调用前加 await ensureLogin() |
| 客户端 services/reviews.js | 1 | 移除 user_nickname/user_avatar 传参 |
| 客户端 constants.js | 1 | 移除 ARTIST_OPENID（或标记 deprecated） |
| **总计** | **~28 文件改动点** | |

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| requireArtist 改 async 后所有调用点必须 await | 编译期无法捕获遗漏，需逐个核对（grep `requireArtist` 全覆盖） |
| artist_profile 误删导致 bootstrap 抢占 | 文档警告；v1.2 后续可加备份脚本 |
| 缓存迁移：旧版本客户端 globalData.userInfo 与新版 authService 并存 | 微信小程序全量更新，无灰度；发布后强制重启 |
| 历史预约/评价的 user_info 字段已存伪造数据 | 本阶段不清理历史数据（标注为 v2 数据清洗任务） |
