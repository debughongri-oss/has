---
phase: 11-auth-security
plan: 02
subsystem: auth
tags: [wx-miniprogram, ensureLogin, refreshUserInfo, cold-start-race, cache-unification]

requires:
  - phase: 11-auth-security/01
    provides: "服务端 requireArtist async + artist_profile._openid 权威源；login 云函数返回 is_artist 字段的基础"
provides:
  - "authService.ensureLogin() 幂等登录态 Promise，消除冷启动竞态"
  - "authService.refreshUserInfo() 强制刷新缓存，profile 更新后下游读到最新值"
  - "login 云函数返回 is_artist 字段（查 artist_profile 权威判定）"
  - "13 处页面 isArtist 守卫全部前置 await ensureLogin"
  - "globalData.userInfo 双写移除，_userInfo 单一权威缓存"
  - "constants.js ARTIST_OPENID 移除（SEC-04 客户端侧闭环）"
affects: [12-release-hygiene, 13-consistency-polish]

tech-stack:
  added: []
  patterns:
    - "ensureLogin 守卫模式：async onLoad → await ensureLogin → isArtist 判定"
    - "单一缓存源：services/auth.js _userInfo 是客户端唯一权威，globalData 仅保留 isOpen 标志"
    - "缓存刷新钩子：profile 更新成功后链式调用 refreshUserInfo（catch 吞错不阻塞保存）"

key-files:
  created: []
  modified:
    - "miniprogram/services/auth.js — ensureLogin/refreshUserInfo/isArtist 改读 is_artist"
    - "cloudfunctions/login/index.js — login/getUser action 返回 is_artist（checkIsArtist 查 artist_profile）"
    - "miniprogram/app.js — 移除 globalData.userInfo 双写"
    - "miniprogram/pages/admin/profile/edit.js — ensureLogin 守卫 + saveProfile refreshUserInfo"
    - "miniprogram/pages/admin/works/list.js — ensureLogin 守卫（onLoad+onShow）"
    - "miniprogram/pages/admin/works/edit.js — ensureLogin 守卫"
    - "miniprogram/pages/admin/services/list.js — ensureLogin 守卫（onLoad+onShow）"
    - "miniprogram/pages/admin/services/edit.js — ensureLogin 守卫"
    - "miniprogram/pages/admin/bookings/list.js — ensureLogin 守卫（onLoad+onShow）"
    - "miniprogram/pages/admin/bookings/detail.js — ensureLogin 守卫"
    - "miniprogram/pages/admin/bookings/calendar.js — ensureLogin 守卫"
    - "miniprogram/pages/admin/reviews/list.js — ensureLogin 守卫"
    - "miniprogram/pages/works/poster.js — ensureLogin 守卫"
    - "miniprogram/pages/works/detail.js — ensureLogin 前置 setData isArtist"
    - "miniprogram/pages/profile/index.js — onShow ensureLogin 前置 refreshUserState"
    - "miniprogram/pages/review/create.js — authService 替代 globalData，移除 userInfo 传参"
    - "miniprogram/services/reviews.js — createReview 移除 userInfo 参数与 user_nickname/user_avatar"
    - "miniprogram/utils/constants.js — 移除 ARTIST_OPENID 定义与导出"

key-decisions:
  - "isArtist 判据改为 login 云函数返回的 is_artist 布尔（查 artist_profile._openid），完全摆脱客户端 magic constant"
  - "ensureLogin 保持幂等：_loginPromise 复用 + finally 清理，失败可重试，成功后 _userInfo 缓存"
  - "isArtist/getUserInfo 保持同步签名（避免大面积 async 重构），语义变为'ensureLogin 后调用才有意义'"
  - "refreshUserInfo 错误在 saveProfile 链中被吞掉（仅 log），不阻塞保存成功流程"

patterns-established:
  - "admin 守卫模板：async onLoad → try await ensureLogin catch(redirect) → if !isArtist redirect → load"
  - "setData 模板：async onLoad → try await ensureLogin catch({}) → setData({ isArtist })"
  - "缓存刷新链：.then(updateProfile).then(refreshUserInfo.catch).then(showSuccess)"

requirements-completed: [SEC-03, SEC-06]

duration: ~40min
completed: 2026-07-01
---

# Phase 11 Plan 02: 客户端登录态就绪 + 缓存统一 Summary

**ensureLogin 机制消除 13 处冷启动竞态，globalData 双写收敛为 authService 单一缓存，ARTIST_OPENID 从客户端彻底移除。**

## Performance

- **Tasks:** 7/7
- **Files modified:** 18 (1 云函数 + 17 客户端)
- **Commits:** 4

## Accomplishments
- SEC-03 闭环：13 处同步 isArtist() 调用前全部有 await ensureLogin()，冷启动不再误判跳转
- SEC-06 闭环：globalData.userInfo 移除，profile 更新后 refreshUserInfo 刷新下游缓存
- SEC-04 客户端侧闭环：constants.js ARTIST_OPENID 移除，isArtist 改读 login 返回的 is_artist
- SEC-05 客户端侧闭环：services/reviews.js 不再传 user_nickname/user_avatar（服务端已权威读取）

## Task Commits

1. **Task 1-2: authService + login is_artist + app.js** - `6fc44fb` (feat)
2. **Task 3: profile edit ensureLogin + refreshUserInfo** - `7a49f62` (feat)
3. **Task 4: 13 page guards** - `64f71d7` (feat)
4. **Task 5-7: review/create + reviews.js + constants.js** - `05a96e1` (feat)

## Verification (DoD 静态检查)

| 检查项 | 结果 |
|--------|------|
| `grep -rn "ARTIST_OPENID" miniprogram/` | ✅ 仅 1 处注释（services/auth.js SEC-04 说明） |
| `grep -rn "globalData.userInfo" miniprogram/` | ✅ 0 匹配 |
| `grep -rn "user_nickname\|user_avatar" miniprogram/services/` | ✅ 0 匹配 |
| 所有 isArtist() 调用点所在函数有 ensureLogin | ✅ 15/15 调用点（12 文件） |
| Node.js --check 语法 | ✅ 24/24 文件通过 |

## Notes

- 运行时验证（冷启动真机测试、profile 更新缓存刷新）需在微信开发者工具中手动测试——本里程碑无自动化测试设施
- 历史 bookings.user_info / reviews.user_nickname 已存的客户端伪造数据不清理（标注为 v2 数据清洗）
