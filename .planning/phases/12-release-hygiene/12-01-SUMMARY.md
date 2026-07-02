---
phase: 12-release-hygiene
plan: 01
subsystem: infra
tags: [gitignore, sitemap, release-hygiene, wechat-miniprogram]

requires:
  - phase: 11-auth-security
    provides: Phase 11 完成的安全基线
provides:
  - "project.private.config.json 移出版本控制，.gitignore 永久排除"
  - "demo-ui 开发调试页从生产包移除"
  - "sitemap.json disallow pages/admin/* 收敛管理后台信息暴露面"
affects: [13-consistency-polish]

tech-stack:
  added: []
  patterns:
    - "sitemap 先 disallow 后 allow 顺序匹配——admin 子包不被微信收录"

key-files:
  created: []
  modified:
    - ".gitignore — 排除 project.private.config.json 与 project.config.json"
    - "miniprogram/app.json — 移除 demo-ui 页面注册"
    - "miniprogram/sitemap.json — 新增 disallow pages/admin/* 规则"
  deleted:
    - "miniprogram/pages/demo-ui/demo-ui.js"
    - "miniprogram/pages/demo-ui/demo-ui.wxml"

key-decisions:
  - "project.config.json 一并加入 .gitignore（防未来入库，当前未跟踪也无妨）"
  - "sitemap admin disallow 是纵深防御，真正鉴权仍由 requireArtist 保证"

patterns-established:
  - "发布卫生模式：本地工具配置不入库 + 开发页不进生产包 + 管理页不被索引"

requirements-completed: [HYG-01, HYG-02, HYG-03]

duration: ~10min
completed: 2026-07-02
---

# Phase 12 Plan 01: 发布包卫生 Summary

**本地私有配置出库、开发调试页移除、管理后台 sitemap 屏蔽——发布包达到可上线卫生标准。**

## Performance

- **Tasks:** 2/2
- **Files modified:** 3 | **Files deleted:** 2
- **Commits:** 2

## Task Commits

1. **Task 1: HYG-01 private config 出库** - `393885c` (feat)
2. **Task 2: HYG-02/03 demo-ui 移除 + sitemap admin disallow** - `ee4d3f6` (feat)

## Verification

| 检查项 | 结果 |
|--------|------|
| `git check-ignore project.private.config.json` | ✅ 命中 |
| `git ls-files project.private.config.json` | ✅ 空（已出库） |
| `test -f project.private.config.json` | ✅ 本地保留 |
| `grep -c demo-ui miniprogram/app.json` | ✅ 0 |
| `miniprogram/pages/demo-ui/` 不存在 | ✅ |
| app.json / sitemap.json JSON 合法 | ✅ |
| sitemap 含 disallow pages/admin/* | ✅ |
| sitemap 保留 allow * | ✅ |
