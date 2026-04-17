# 化妆师个人作品展示与预约小程序

## What This Is

一款微信小程序，帮助独立化妆师展示个人作品、管理服务项目和接受客户预约。用户可以浏览化妆师的作品集，查看服务项目，并直接在线预约。化妆师可以在小程序内管理作品、服务项目和预约订单。

## Core Value

客户看到作品后能直接预约化妆服务——从"看到好看的作品"到"我要预约"的路径最短。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 化妆师个人简介展示（姓名、头像、简介文字、从业经验等）
- [ ] 作品列表展示（图片为主，支持分类浏览）
- [ ] 作品详情页（多图片展示，前后对比、多角度）
- [ ] 服务项目管理（日常妆、婚庆妆、订婚妆等，化妆师可自定义添加）
- [ ] 在线预约功能（用户选择服务+时间，提交预约）
- [ ] 预约审核流程（化妆师手动接单/拒绝/改期）
- [ ] 化妆师后台管理（上传作品、管理服务项目、处理预约）
- [ ] 预约通知提醒

### Out of Scope

- 在线支付 — 线下结算，小程序不涉及支付功能
- 多化妆师平台 — 仅支持单个化妆师，不做平台模式
- 视频展示 — v1 以图片为主，视频功能延后
- 客户评价系统 — v1 不包含用户评价功能
- 客户管理/会员系统 — 超出 v1 范围

## Context

- 微信小程序生态，需要使用微信开发者工具开发
- 目标用户为独立化妆师及其潜在客户
- 服务类型以日常化妆和婚庆相关化妆为主（新娘妆、伴娘妆、订婚妆）
- 化妆师需要简单直观的管理方式，不需要复杂后台
- 预约不涉及支付，核心是时间管理和沟通

## Constraints

- **平台**: 微信小程序 — 必须符合微信小程序开发规范和审核要求
- **用户身份**: 微信登录 — 使用微信提供的用户身份能力

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 单化妆师模式 | 用户明确只需要个人品牌展示 | — Pending |
| 手动接单 | 化妆师需要审核预约时间是否冲突 | — Pending |
| 不接入支付 | 线下结算，简化开发 | — Pending |
| 小程序内管理 | 化妆师操作习惯，不需要额外后台 | — Pending |

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
*Last updated: 2026-04-17 after initialization*
