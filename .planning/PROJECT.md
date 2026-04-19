# 化妆师个人作品展示与预约小程序

## What This Is

一款微信小程序，帮助独立化妆师展示个人作品、管理服务项目和接受客户预约。已实现完整的作品展示与管理、服务目录、在线预约流程和微信分享功能。化妆师可在小程序内通过管理后台管理作品、服务项目和预约订单，客户可以浏览作品后直接预约化妆服务。

## Core Value

客户看到作品后能直接预约化妆服务——从"看到好看的作品"到"我要预约"的路径最短。

## Current State

**Shipped:** v1.0 MVP (2026-04-19)
**Tech stack:** 微信原生框架 (WXML/WXSS/JS) + 微信云开发 (CloudBase) + TDesign MiniProgram
**Cloud functions:** login, profile, works, services, bookings (5 functions)
**Pages:** 5 TabBar pages + works detail + admin sub-package (works/services/bookings/profile management) + booking history

## Requirements

### Validated

- ✓ 微信静默登录 (AUTH-01) — v1.0
- ✓ 化妆师个人简介展示 (AUTH-02) — v1.0
- ✓ 作品创建 (PORT-01) — v1.0
- ✓ 作品编辑 (PORT-02) — v1.0
- ✓ 作品删除 (PORT-03) — v1.0
- ✓ 作品列表浏览 (PORT-04) — v1.0
- ✓ 作品详情图片轮播 (PORT-05) — v1.0
- ✓ 作品分类筛选 (PORT-06) — v1.0
- ✓ 服务项目 CRUD (SERV-01/02/03) — v1.0
- ✓ 服务列表卡片浏览 (SERV-04) — v1.0
- ✓ 在线预约提交 (BOOK-01/02/03) — v1.0
- ✓ 预约审核管理 (BOOK-04/05) — v1.0
- ✓ 预约历史 (BOOK-08) — v1.0
- ✓ 管理后台 (MGMT-01) — v1.0
- ✓ 微信分享 (MGMT-02) — v1.0

### Active

- [ ] 前后对比滑块 (PORT-07) — deferred from v1.0
- [ ] 预约状态变更通知 (BOOK-06/07) — requires WeChat admin template config
- [ ] 小程序码海报生成 (MGMT-03) — deferred from v1.0

### Out of Scope

- 在线支付 — 线下结算，小程序不涉及支付功能
- 多化妆师平台 — 仅支持单个化妆师，不做平台模式
- 视频展示 — v1 以图片为主，视频功能延后
- 客户评价系统 — v1 不包含用户评价功能
- 客户管理/会员系统 — 超出 v1 范围
- AI试妆 — 技术不确定性高，复杂度远超范围
- 社交/社区功能 — 评论/点赞/动态属于平台功能，不是个人预约工具
- 直播功能 — 需要流媒体基础设施，不是预约工具的核心
- 地图/定位 — 化妆师服务范围固定，文字描述已足够

## Context

- 微信小程序生态，使用微信开发者工具开发
- 目标用户为独立化妆师及其潜在客户
- 服务类型以日常化妆和婚庆相关化妆为主（新娘妆、伴娘妆、订婚妆）
- 化妆师通过小程序内管理后台操作，不需要额外后台
- 预约不涉及支付，核心是时间管理和沟通
- 已知技术债：写操作仅客户端验证身份，服务端验证待加强；部分占位符（AppID、云环境ID、TabBar图标）需用户替换

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
| 客户端身份验证 | 简化 v1 实现 | ⚠️ Revisit — 服务端验证需加强 |
| 固定时间槽 | 90分钟间隔，简化预约逻辑 | ✓ Good — 适合化妆服务场景 |
| CSS custom properties | 全局主题色/间距统一 | ✓ Good |
| admin sub-package | 主包控制在 2MB 内 | ✓ Good |

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
*Last updated: 2026-04-19 after v1.0 milestone*
