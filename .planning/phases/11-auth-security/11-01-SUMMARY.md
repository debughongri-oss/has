---
phase: 11-auth-security
plan: 01
subsystem: auth
tags: [wx-cloud, cloud-function, artist_profile, openid, server-side-auth]

requires:
  - phase: 10-qr-code-poster-generation
    provides: v1.1 完整功能基线（works/services/bookings/reviews 云函数已就绪）
provides:
  - "async requireArtist(wxContext, db) 查 artist_profile._openid 作为化妆师身份单一权威源"
  - "profile init bootstrap（不鉴权但幂等，解除 requireArtist 与 artist_profile 创建的循环依赖）"
  - "bookings/reviews create 服务端按 openid 查 users 集合权威取昵称/头像，拒绝客户端传入"
affects: [11-02, 12-release-hygiene]

tech-stack:
  added: []
  patterns:
    - "服务端身份权威源：artist_profile._openid 取代 magic constant"
    - "bootstrap 模式：init action 不鉴权但幂等（首次创建锁定 _openid）"

key-files:
  created: []
  modified:
    - "cloudfunctions/shared/auth.js — requireArtist 改 async，查 artist_profile"
    - "cloudfunctions/profile/index.js — init bootstrap + update await requireArtist"
    - "cloudfunctions/bookings/index.js — create 服务端取用户信息 + await requireArtist"
    - "cloudfunctions/reviews/index.js — create 服务端取用户信息"
    - "cloudfunctions/services/index.js — await requireArtist (3 处)"
    - "cloudfunctions/works/index.js — await requireArtist (4 处)"

key-decisions:
  - "方案 A（artist_profile._openid）优于 config 集合/users.role/环境变量——零新集合，_openid 由云开发自动注入，支持热更新"
  - "init bootstrap 接受抢占风险（artist_profile 误删后任何人可重建）——极端情况，数据库有备份"

patterns-established:
  - "requireArtist(wxContext, db) async 签名——调用方传入已初始化 db 实例"
  - "服务端权威读取模式：云函数按 wxContext.OPENID 查 users 取展示字段，忽略 event 同名字段"

requirements-completed: [SEC-04, SEC-05]

duration: ~25min
completed: 2026-07-01
---

# Phase 11 Plan 01: 服务端身份权威源 Summary

**artist_profile._openid 取代 6 份 ARTIST_OPENID magic constant，评价/预约用户信息由服务端权威读取，关闭客户端伪造攻击面。**

## Performance

- **Tasks:** 5/5
- **Files modified:** 6 (云函数)
- **Commits:** 1 (整体 Wave 1 checkpoint)

## Accomplishments
- SEC-04 服务端侧闭环：`grep ARTIST_OPENID cloudfunctions/` 仅剩注释，无实际硬编码/比对
- SEC-05 服务端侧闭环：bookings/reviews create 不再信任 event.user_info/user_nickname/user_avatar，改查 users 集合
- profile init 解除鸡生蛋循环依赖：artist_profile 不存在时允许首次创建，存在则拒绝

## Task Commits

1. **Wave 1 整体** - `cac38b8` (feat) — 5 tasks 合并为单次 checkpoint commit（前一会话遗留的未提交工作，经核实完整后提交）

## Verification (DoD 静态检查)

| 检查项 | 结果 |
|--------|------|
| `grep -rn "ARTIST_OPENID" cloudfunctions/` 实际用法 | ✅ 0 匹配（仅注释） |
| `requireArtist(wxContext)` 无 await | ✅ 0 匹配（10 处调用全部 await） |
| `event.user_info/user_nickname/user_avatar` 实际读取 | ✅ 0 匹配（仅注释） |
| Node.js --check 语法 | ✅ 6/6 文件通过 |

## Notes

- 5 份 cloudfunctions/*/shared/auth.js 副本由 `npm run sync` 从根模板生成，gitignored，不需手动同步
- 客户端侧清理（constants.js ARTIST_OPENID 移除）在 Plan 11-02 Task 7 完成
