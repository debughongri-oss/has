# 化妆师个人作品展示与预约小程序

## What This Is

一款微信小程序，帮助独立化妆师展示个人作品、管理服务项目和接受客户预约。已实现完整的作品展示与管理（含妆前妆后对比滑块）、服务目录、在线预约流程（含订阅消息通知、日历管理）、客户评价系统和海报生成功能。化妆师可在小程序内通过管理后台管理作品、服务项目、预约订单和评价，客户可以浏览作品后直接预约化妆服务并在完成后提交评价。

## Core Value

客户看到作品后能直接预约化妆服务——从"看到好看的作品"到"我要预约"的路径最短。

## Current State

**Shipped:** v1.0 MVP (2026-04-19), v1.1 品牌升级 & 体验增强 (2026-04-23)
**In progress:** v1.2 上线前加固 (2026-06-23 — planned, 3 phases / 16 reqs)
**Tech stack:** 微信原生框架 (WXML/WXSS/JS) + 微信云开发 (CloudBase) + TDesign MiniProgram
**Cloud functions:** login, profile, works, services, bookings, booking-reminder, reviews (7 functions)
**Pages:** 5 TabBar pages + works detail/compare/poster + admin sub-package (works/services/bookings/profile/reviews/calendar management) + booking history + review create
**Known debt (v1.2 scope):** 2026-06-23 全项目 review 发现 16 项问题。经核实无 Critical 阻塞（服务端 requireArtist 鉴权已存在），最高为 High（登录竞态、客户端可伪造展示身份），其余 Medium/Low。详见 `.planning/REQUIREMENTS.md`。

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
- ✓ 服务端身份验证 (SEC-01/02) — v1.1 Phase 6
- ✓ 简介增强 (PROF-01/02/03/04) — v1.1 Phase 6
- ✓ 预约备注结构化 (BOOK-09/10/11/12) — v1.1 Phase 6
- ✓ 前后对比滑块 (PORT-07/08/09) — v1.1 Phase 7
- ✓ 预约状态变更通知 (BOOK-06/07) — v1.1 Phase 8
- ✓ 日历视图 (BOOK-13/14) — v1.1 Phase 8
- ✓ 时间段提示 (BOOK-15/16) — v1.1 Phase 8
- ✓ 客户评价系统 (REVW-01/02/03/04/05/06) — v1.1 Phase 9
- ✓ 海报生成 (GROW-01/02/03) — v1.1 Phase 10

### Active

**v1.2 上线前加固**（详见 `.planning/REQUIREMENTS.md`）— 技术债/安全/发布卫生加固，不引入新功能

**Phase 11 — Auth & Security 修复 (High):**
- [ ] SEC-03: 登录态就绪机制，消除冷启动身份竞态
- [ ] SEC-04: 化妆师身份源统一（消除前后端硬编码 magic constant 的重复）
- [ ] SEC-05: 身份信息（昵称/头像）服务端权威，拒绝客户端传入
- [ ] SEC-06: 用户信息缓存统一，profile 更新后同步刷新

**Phase 12 — 发布卫生 (Medium):**
- [ ] HYG-01: project.private.config.json 移出版本控制
- [ ] HYG-02: 移除 demo-ui 生产注册
- [ ] HYG-03: sitemap 屏蔽 admin 子包
- [ ] HYG-04: 统一 errCode 响应契约
- [ ] HYG-05: 消除重复错误 toast

**Phase 13 — 一致性 & 打磨 (Low):**
- [ ] POL-01..07: booking tab UX、设计 token 状态色、缓存守卫、并发上传、错误上报、聚合统计、配置外部化

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

*Last updated: 2026-04-24 after v1.1 milestone*
