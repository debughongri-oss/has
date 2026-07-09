---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: 经营工具 & 转化优化
status: Milestone complete
stopped_at: v2.1 milestone complete — 3 phases (16/17/18) all delivered; no active milestone
last_updated: "2026-07-09T00:00:00.000Z"
last_activity: 2026-07-09
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 3
  completed_plans: 3
  percent: 100
---

# Project State

**Current focus:** 无活跃里程碑。v2.1 经营工具 & 转化优化 已全部交付。下一步：定义 v2.2 或直接进入收尾 / 第一梯队功能。

Progress: [##########] 100% (v2.1)

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-02)

**Core value:** 客户看到作品后能直接预约化妆服务——从"看到好看的作品"到"我要预约"的路径最短

## Current Position

Phase: 18 of 18 (conversion) — complete
Milestone: v2.1 经营工具 & 转化优化 ✅
Last activity: 2026-07-09

## v2.1 Phase Summary

| Phase | Goal | Reqs |
|-------|------|------|
| 16. 数据看板 | bookings getDashboard + 管理后台看板页（营收/MoM/状态分布/热门服务） | DASH-01/02 |
| 17. 不可用时间管理 | time_blocks 集合 + block/unblock/getBlockedTimes + getAvailableSlots 合并屏蔽 + 后台日历屏蔽 UI | AVAIL-01/02/03 |
| 18. 转化优化 | 服务时长卡片/预约页可见 + 完成后自动邀请评价 | CONV-01/02 |

## Recently delivered (post-v2.1，未入正式里程碑)

- 服务价快照 / 营收修复（功能 B）：create 时快照 `service_price`，`getDashboard` 优先读快照——修掉营收恒为 0 的隐性 bug。`c3356c9`
- 新预约提醒推送化妆师（功能 A）：下单后给化妆师发订阅消息（复用现有模板），化妆师在个人中心授权开启；受微信一次性订阅限制，每次授权收 1 条。`005e676`

## Deferred (未排期，候选 v2.2)

- PROF-05/06：化妆师自定义首页主题色 + 首页模块排序
- 评价体系增强：标签快捷选择、评价带图、匿名评价、后台筛选/排序、artist_profile 冗余 avg_rating、评价提交推送

## Session Continuity

Last session: 2026-07-09
Stopped at: 收尾 + 第一梯队功能 A/B 已实现并提交（B `c3356c9`、A `005e676`）；待微信开发者工具部署 bookings 云函数并真机验证
Next step: 部署 + 验证 A/B；或继续第二梯队功能（客户改期 / 工作时间配置 / 客户档案 / no-show），或 `/gsd-new-milestone` 定义 v2.2
