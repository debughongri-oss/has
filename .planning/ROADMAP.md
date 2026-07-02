# Roadmap: 化妆师个人作品展示与预约小程序

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-04-19)
- ✅ **v1.1 品牌升级 & 体验增强** — Phases 6-10 (shipped 2026-04-24)
- 🚧 **v1.2 上线前加固** — Phases 11-13 (planned 2026-06-23)

## Overview

v1.2 是技术债/安全/发布卫生加固里程碑，不引入新功能。2026-06-23 的全项目 review 发现 16 项问题。经核实，初评的「3 Critical」中有 1 项（服务端鉴权）实际已在 v1.1 交付（shared/auth.js 的 requireArtist 覆盖 works/services/bookings/profile），真实缺陷是身份源硬编码与前后端重复——已下调为 Medium。故本里程碑无 Critical 阻塞项，按 High→Medium→Low 分三阶段：先修登录竞态与身份伪造（Phase 11），再清理发布卫生（Phase 12），最后统一一致性与打磨（Phase 13）。完成后代码具备上线条件，再进入 v2.0。

## Phases

**Phase Numbering:**
- Integer phases (1-5): v1.0 MVP (shipped)
- Integer phases (6-10): v1.1 品牌升级 & 体验增强 (shipped)
- Integer phases (11-13): v1.2 上线前加固 (current)
- Decimal phases (e.g., 11.1): Urgent insertions (marked with INSERTED)

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-04-19</summary>

- [x] Phase 1: Foundation & Profile (2/2 plans) — completed 2026-04-17
- [x] Phase 2: Portfolio System (2/2 plans) — completed 2026-04-17
- [x] Phase 3: Service Catalog (1/1 plan) — completed 2026-04-17
- [x] Phase 4: Booking System (2/2 plans) — completed 2026-04-17
- [x] Phase 5: Sharing & Growth (1/1 plan) — completed 2026-04-17

</details>

<details>
<summary>✅ v1.1 品牌升级 & 体验增强 (Phases 6-10) — SHIPPED 2026-04-24</summary>

- [x] Phase 6: Data Model Extensions & Quick Wins (3/3 plans) — completed 2026-04-20
- [x] Phase 7: Before/After Comparison Slider (2/2 plans) — completed 2026-04-21
- [x] Phase 8: Booking Notifications & Calendar (2/2 plans) — completed 2026-04-22
- [x] Phase 9: Customer Review System (2/2 plans) — completed 2026-04-23
- [x] Phase 10: QR Code & Poster Generation (2/2 plans) — completed 2026-04-23

</details>

### 🚧 v1.2 上线前加固 (Current)

**Milestone Goal:** 清偿 v1.0/v1.1 已发布代码中的安全、正确性、发布卫生与一致性债务，使代码具备安全上线条件

- [x] **Phase 11: Auth & Security 修复** — 登录竞态、身份源硬编码统一、身份信息服务端权威、缓存统一 (completed 2026-07-01)
- [x] **Phase 12: 发布卫生** — private config 出库、移除 demo 页、sitemap 收敛、统一 errCode 契约、去重错误提示 (completed 2026-07-02)
- [ ] **Phase 13: 一致性 & 打磨** — booking tab UX、设计 token 状态色、缓存守卫、并发上传、错误上报、聚合统计、配置外部化

## Phase Details

### Phase 11: Auth & Security 修复
**Goal**: 消除认证相关的高优先级缺陷——登录竞态、客户端伪造展示身份、身份源硬编码重复、缓存漂移
**Depends on**: Phase 10 (v1.1 complete)
**Requirements**: SEC-03, SEC-04, SEC-05, SEC-06
**Severity**: High（无 Critical 阻塞；服务端 requireArtist 鉴权已存在，本阶段处理竞态/伪造/DRY）
**Success Criteria** (what must be TRUE):
  1. 冷启动时身份相关页面（admin 守卫、预约提交）不再因登录未完成而误判，化妆师首次进入即可访问 admin
  2. 化妆师身份 openid 由单一服务端数据源管理，前端与云函数不再各自硬编码同一 magic constant
  3. 评价与预约的昵称/头像由云函数按 openid 从 users 集合权威读取，客户端传入的同名字段被忽略
  4. 用户信息存在单一权威缓存，profile 更新昵称/头像后预约/评价等下游读取到最新值
**Plans**:
- `11-01-PLAN.md` (Wave 1): 服务端权威源 — artist_profile._openid 取代 6 份 ARTIST_OPENID magic constant；bookings/reviews 服务端取用户信息 (SEC-04, SEC-05)
- `11-02-PLAN.md` (Wave 2): 客户端登录态就绪 + 缓存统一 — ensureLogin/refreshUserInfo；13 处守卫消除冷启动竞态；移除 globalData 双写 (SEC-03, SEC-06)
**UI hint**: no（后端 + 应用层逻辑，无视觉变更）

### Phase 12: 发布卫生
**Goal**: 清理发布包与错误处理契约，达到可上线卫生标准
**Depends on**: Phase 11
**Requirements**: HYG-01, HYG-02, HYG-03, HYG-04, HYG-05
**Severity**: Medium
**Success Criteria** (what must be TRUE):
  1. `project.private.config.json` 不再被 git 跟踪，已加入 .gitignore
  2. 生产包不含 demo-ui 页面注册，该页不被微信索引
  3. admin 子包页面被 sitemap 标记为 `disallow`，不被收录
  4. errCode 响应契约在 api.js 与所有 services/*.js 中一致（成功=0，失败≠0），有单一判定点
  5. 错误提示不重复——api.js 与调用方 toast 不再叠加出现
**Plans**:
- `12-01-PLAN.md` (Wave 1): 发布包卫生 — private config 出库 + demo-ui 移除 + sitemap 屏蔽 admin (HYG-01, HYG-02, HYG-03)
- `12-02-PLAN.md` (Wave 1): errCode 契约统一 + toast 去重 — api.js 单一判定点 + services 移除冗余守卫 (HYG-04, HYG-05)
**UI hint**: no

### Phase 13: 一致性 & 打磨
**Goal**: 统一设计系统与代码一致性，清理低风险代码异味
**Depends on**: Phase 12
**Requirements**: POL-01, POL-02, POL-03, POL-04, POL-05, POL-06, POL-07
**Severity**: Low
**Success Criteria** (what must be TRUE):
  1. 预约 tabBar 入口的 UX 经复核并落地（列表入口或保留并记录理由）
  2. 预约状态色全部引用 app.wxss 设计 token，无硬编码色值
  3. profile.initArtistProfile 失败时不污染缓存
  4. 作品图片上传为有限并发，9 图上传耗时显著下降
  5. 存储删除/压缩失败不再被静默吞掉，有错误上报或重试
  6. reviews getStats 用数据库聚合管道实现，不再全量拉取内存计算
  7. 硬编码常量（CLOUD_ENV 等）外部化方案经评估并（若采纳）落地
**Plans**: TBD (via `/gsd-plan-phase 13`)
**UI hint**: mostly no（POL-01 可能涉及少量布局调整）

## Progress

**Execution Order:**
Phases execute in numeric order: 11 → 12 → 13

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 11. Auth & Security 修复 | v1.2 | 2/2 | Complete    | 2026-07-01 |
| 12. 发布卫生 | v1.2 | 2/2 | Complete    | 2026-07-02 |
| 13. 一致性 & 打磨 | v1.2 | 0/TBD | Pending | — |
