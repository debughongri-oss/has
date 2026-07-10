# 化妆师个人作品展示与预约小程序

## What This Is

一款微信小程序，帮助独立化妆师展示个人作品、管理服务项目和接受客户预约。已实现完整的作品展示与管理（含妆前妆后对比滑块）、服务目录、在线预约流程（含订阅消息通知、日历管理）、客户评价系统和海报生成功能。化妆师可在小程序内通过管理后台管理作品、服务项目、预约订单和评价，客户可以浏览作品后直接预约化妆服务并在完成后提交评价。

## Core Value

客户看到作品后能直接预约化妆服务——从"看到好看的作品"到"我要预约"的路径最短。

## Current State

**Shipped:** v1.0 MVP (2026-04-19), v1.1 品牌升级 & 体验增强 (2026-04-24), v1.2 上线前加固 (2026-07-02), v2.0 评价互动 & 预约智能化 (2026-07-02), v2.1 经营工具 & 转化优化 (2026-07-02), v2.2 预约体验增强 (2026-07-10)
**Status:** v2.3 客户经营 & 口碑增强 — defining requirements
**Tech stack:** 微信原生框架 (WXML/WXSS/JS) + 微信云开发 (CloudBase) + TDesign MiniProgram
**Cloud functions:** login, profile, works, services, bookings, booking-reminder, reviews (7 functions)
**Pages:** 5 TabBar pages + works detail/compare/poster + admin sub-package (works/services/bookings/profile/reviews/calendar management) + booking history + review create
**v1.2 outcome:** 16 项技术债全部闭环（安全/发布卫生/一致性）。代码具备上线条件。运行时验证（冷启动登录、缓存刷新、并发上传、断网 toast）需在微信开发者工具中手动确认。

## Current Milestone: v2.3 客户经营 & 口碑增强

**Goal:** 让化妆师记住每位客户、让评价更有说服力，提升复购和转化

**Target features:**
- 客户档案：客户基本信息 + 历史预约 + 化妆师备注（肤质/偏好/过敏）
- 评价增强：标签快捷选择 + 评价带图 + 匿名评价 + 后台筛选排序 + avg_rating 冗余 + 评价提交推送

## Requirements

### Active

**v2.3 客户经营 & 口碑增强**（详见 `.planning/REQUIREMENTS.md`）

需求定义中——客户档案 + 评价增强两大方向。

**Deferred to later:**
- PROF-05: 化妆师自定义主页主题色
- PROF-06: 化妆师调整主页模块顺序

### Out of Scope

| Feature | Reason |
|---------|--------|
| 在线支付 | 线下结算，小程序不涉及支付功能 |
| 多化妆师平台 | 仅支持单个化妆师，不做平台模式 |
| 视频展示 | v1 以图片为主，视频功能延后 |
| 客户管理/会员系统 | 超出当前范围 |
| AI试妆 | 技术不确定性高，复杂度远超范围 |
| 社交/社区功能 | 评论/点赞/动态属于平台功能，不是个人预约工具 |
| 直播功能 | 需要流媒体基础设施，不是预约工具的核心 |
| 地图/定位 | 化妆师服务范围固定，文字描述已足够 |
| 多模板消息（5+） | 订阅消息弹窗过多影响体验，限制在2个模板 |

## Context

- 微信小程序生态，使用微信开发者工具开发
- 目标用户为独立化妆师及其潜在客户
- 服务类型以日常化妆和婚庆相关化妆为主（新娘妆、伴娘妆、订婚妆）
- 化妆师通过小程序内管理后台操作，不需要额外后台
- 预约不涉及支付，核心是时间管理和沟通
- v1.1 新增 7 个云函数、多个页面和组件，代码量显著增长
- 2026-06-23 全项目 review 发现 16 项技术债（3 Critical 安全），v1.2 加固里程碑已立项
- 已知限制：Canvas 2D 海报渲染需真机测试（iOS DPR=3, Android DPR=2）

## Constraints

- **平台**: 微信小程序 — 必须符合微信小程序开发规范和审核要求
- **用户身份**: 微信登录 — 使用微信提供的用户身份能力

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 单化妆师模式 | 用户明确只需要个人品牌展示 | ✓ Good |
| 手动接单 | 化妆师需要审核预约时间是否冲突 | ✓ Good — 冲突检查已实现 |
| 不接入支付 | 线下结算，简化开发 | ✓ Good |
| 小程序内管理 | 化妆师操作习惯，不需要额外后台 | ✓ Good — admin sub-package 方案 |
| 客户端身份验证 | 简化 v1 实现 | ✓ Resolved — v1.1 Phase 6 已加服务端验证 |
| 固定时间槽 | 90分钟间隔，简化预约逻辑 | ✓ Good — 适合化妆服务场景 |
| CSS custom properties | 全局主题色/间距统一 | ✓ Good |
| admin sub-package | 主包控制在 2MB 内 | ✓ Good |
| 手动 touch + clip-path 对比滑块 | 不用 movable-view，更灵活控制 | ✓ Good — 流畅的滑块体验 |
| 订阅消息复用单模板 | 减少用户授权弹窗 | ✓ Good — 状态变更+提醒共用 |
| reviews 独立集合 + booking_id 唯一索引 | 防重复评价 | ✓ Good — 双重防重复 |
| Canvas 2D off-screen 海报 | DPR-aware，品牌色一致性 | ✓ Good — 需真机验证 |
| wxacode + cloud storage 缓存 | 每作品一次生成，后续复用 | ✓ Good |
| 评价标签快捷选择 | 简化输入 | — Deferred to v2 |
| artist_profile 缓存 avg_rating | 性能优化 | — Deferred to v2 |
| 评价筛选/排序 | 管理便利性 | — Deferred to v2 |
| 评价带图 | 增强可信度 | — Deferred to v2 |
| 匿名评价 | 隐私选项 | — Deferred to v2 |
| 评价通知推送 | 即时反馈 | — Deferred to v2 |
| 化妆师回复评价 | 互动功能 | — Deferred to v2 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-07-10 — v2.3 milestone started*
