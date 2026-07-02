---
phase: 13-consistency-polish
plan: 01
subsystem: polish
tags: [design-tokens, concurrency, aggregation, release-polish]

requires:
  - phase: 12-release-hygiene
    provides: Phase 12 完成的 errCode 契约统一（POL-03 由此间接修复）
provides:
  - "预约状态色引用 app.wxss CSS 变量 token，无硬编码色值 (POL-02)"
  - "作品图片 3 路并发上传，9 图耗时降至 ~3x (POL-04)"
  - "存储删除/压缩失败有 console.warn + 结构化返回，不再静默 (POL-05)"
  - "reviews getStats 服务端聚合管道，不再全量拉取 (POL-06)"
  - "POL-01/03/07 决策文档——保留 tabBar 设计、Phase 12 已修复缓存守卫、常量外部化不采纳"
affects: []

tech-stack:
  added: []
  patterns:
    - "CSS 变量 token 在 JS 层的使用：getStatusColor 返回 var(--xxx) 字符串供 WXML inline style 消费"
    - "有限并发池模式：N 个 worker 从共享队列消费，保持结果顺序"
    - "微信云数据库聚合管道：aggregate().group($.sum/$avg) 服务端计算"

key-files:
  created:
    - ".planning/phases/13-consistency-polish/DECISIONS.md — POL-01/03/07 决策记录"
  modified:
    - "miniprogram/services/bookings.js — getStatusColor CSS 变量 token"
    - "miniprogram/services/storage.js — 并发上传 + 错误上报"
    - "cloudfunctions/reviews/index.js — getStats 聚合管道"

key-decisions:
  - "POL-01: 保留预约 tabBar 指向 create（核心价值 = 最短预约路径）"
  - "POL-03: Phase 12 已修复（api.js reject-on-failure 使缓存赋值不可达）"
  - "POL-07: 常量外部化不采纳（单一部署，外部化是过度工程）"

requirements-completed: [POL-01, POL-02, POL-03, POL-04, POL-05, POL-06, POL-07]

duration: ~20min
completed: 2026-07-02
---

# Phase 13: 一致性 & 打磨 Summary

**7 项 POL 全部闭环：3 项代码改进（设计 token / 并发上传 / 聚合管道 + 错误上报），3 项决策记录（tabBar UX / 缓存守卫 / 常量外部化），1 项由 Phase 12 间接修复。**

## Task Commits

1. **POL-02** - `59acf7f` (feat) — getStatusColor 硬编码 hex → CSS 变量 token
2. **POL-04/05** - `e8ed5c3` (feat) — 3 路并发上传 + 存储错误上报
3. **POL-06** - `e7f1135` (feat) — getStats 聚合管道替代 1000 条内存计算

## Decision Items (no code change)

- **POL-01**: 保留预约 tabBar 指向 create 表单（核心价值 = 最短预约路径）
- **POL-03**: Phase 12 api.js reject-on-failure 已使 initArtistProfile 缓存赋值不可达
- **POL-07**: 常量外部化不采纳（单一部署，零收益）

## Verification

| 检查项 | 结果 |
|--------|------|
| bookings.js getStatusColor 无硬编码 hex | ✅ 全部 var(--xxx) |
| storage.js uploadWorkImages 并发池 | ✅ 3 worker pool，保持顺序 |
| storage.js deleteCloudFile 返回结构化结果 | ✅ {success, deleted, failed} |
| reviews getStats 使用 aggregate | ✅ $.sum(1)+$.avg('$rating') |
| 3 文件 node --check | ✅ 全通过 |
