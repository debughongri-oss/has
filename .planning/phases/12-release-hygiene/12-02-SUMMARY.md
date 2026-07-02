---
phase: 12-release-hygiene
plan: 02
subsystem: api
tags: [errCode-contract, error-handling, toast-dedup, api-layer]

requires:
  - phase: 11-auth-security
    provides: Phase 11 完成的 authService 基线（silentLogin/refreshUserInfo 的 errCode 检查在本 plan 清理）
provides:
  - "api.js isApiError(result) — errCode 契约唯一判定点（显式 !== 0）"
  - "api.js 纯传输层（无 wx.showToast），错误以 reject Error 上抛"
  - "6 个 service 文件移除冗余 errCode 守卫（~29 处死代码清理）"
  - "页面层是唯一 toast 归属层，每次失败至多一条 toast"
affects: [13-consistency-polish]

tech-stack:
  added: []
  patterns:
    - "单一判定点模式：isApiError 是 errCode 成功/失败的唯一判定，所有 service 信任此契约"
    - "纯传输层模式：api.js 不负责用户可见提示，页面 catch 负责 toast"
    - "reject Error 携带上下文：err.errCode + err.errMsg + err.message 三字段供调用方按需读取"

key-files:
  created: []
  modified:
    - "miniprogram/services/api.js — isApiError 导出 + 无 toast + reject Error 携带 errCode/errMsg"
    - "miniprogram/services/bookings.js — 移除 8 处冗余守卫"
    - "miniprogram/services/works.js — 移除 6 处冗余守卫"
    - "miniprogram/services/services.js — 移除 6 处冗余守卫"
    - "miniprogram/services/reviews.js — 移除 4 处冗余守卫"
    - "miniprogram/services/profile.js — 移除 2 处冗余守卫"
    - "miniprogram/services/auth.js — silentLogin/refreshUserInfo 移除 errCode 守卫"

key-decisions:
  - "isApiError 用显式 !== 0 而非旧代码的 truthy if(errCode)——对 undefined 一致判错，消除契约分歧"
  - "api.js catch 区分已处理业务错误（有 errCode 字段，直接上抛）与未处理异常（包装为网络错误）"
  - "页面 catch+toast 审计确认无需补全——6 个用户主动操作页面均已有自己的错误提示"

patterns-established:
  - "service 方法精简模式：await callCloudFunction → return result.data（无中间守卫）"
  - "页面错误归属模式：.catch(err => wx.showToast({ title: err.message || '操作失败' }))"

requirements-completed: [HYG-04, HYG-05]

duration: ~15min
completed: 2026-07-02
---

# Phase 12 Plan 02: errCode 契约统一 + toast 去重 Summary

**api.js 成为 errCode 唯一判定点（isApiError），6 个 service 文件瘦身 29 处死代码守卫，错误提示归属页面层消除重复 toast。**

## Performance

- **Tasks:** 2/2
- **Files modified:** 7
- **Net LOC change:** +14 / -53（净减 39 行死代码）
- **Commits:** 2

## Task Commits

1. **Task 1: HYG-04/05 api.js 重构** - `0563aef` (feat) — isApiError 单一判定点 + 纯传输层
2. **Task 2: HYG-04 service 守卫清理** - `a27deb6` (feat) — 6 文件 29 处冗余守卫移除

## Verification

| 检查项 | 结果 |
|--------|------|
| `grep -rn "errCode !== 0" miniprogram/services/*.js` | ✅ 仅 api.js（3 匹配：2 注释 + 1 isApiError 实现） |
| `grep -c "wx.showToast" miniprogram/services/api.js` | ✅ 0 |
| isApiError({errCode:-1}) = true | ✅ |
| isApiError(undefined) = true | ✅ |
| isApiError({errCode:0}) = false | ✅ |
| 7 个 JS 文件 node --check | ✅ 全通过 |
| 页面 catch+toast 审计（6 个用户操作页） | ✅ 均有 .catch + showToast |

## Notes

- 运行时验证（断网触发失败调用，确认仅一条 toast）需在微信开发者工具中手动测试
- auth.js silentLogin 的 errCode 守卫移除后，登录失败由 api.js reject → silentLogin catch → ensureLogin catch 链传播到页面
