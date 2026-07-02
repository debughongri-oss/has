# Roadmap: 化妆师个人作品展示与预约小程序

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-04-19)
- ✅ **v1.1 品牌升级 & 体验增强** — Phases 6-10 (shipped 2026-04-24)
- ✅ **v1.2 上线前加固** — Phases 11-13 (shipped 2026-07-02) — [Archived](milestones/v1.2-ROADMAP.md)
- 🚧 **v2.0 评价互动 & 预约智能化** — Phases 14-15 (planned 2026-07-02)

## Overview

v2.0 引入两个独立功能：化妆师回复评价（增强客户信任互动）+ 可变时长冲突检测（消除双重预约风险）。两功能无文件重叠，可并行开发。

## Phases

**Phase Numbering:**
- Integer phases (1-5): v1.0 MVP (shipped)
- Integer phases (6-10): v1.1 品牌升级 & 体验增强 (shipped)
- Integer phases (11-13): v1.2 上线前加固 (shipped)
- Integer phases (14-15): v2.0 评价互动 & 预约智能化 (current)

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

<details>
<summary>✅ v1.2 上线前加固 (Phases 11-13) — SHIPPED 2026-07-02</summary>

- [x] Phase 11: Auth & Security 修复 (2/2 plans) — completed 2026-07-01
- [x] Phase 12: 发布卫生 (2/2 plans) — completed 2026-07-02
- [x] Phase 13: 一致性 & 打磨 (1/1 plan) — completed 2026-07-02

Full details: [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

### 🚧 v2.0 评价互动 & 预约智能化 (Current)

**Milestone Goal:** 化妆师回复评价增强互动信任 + 可变时长冲突检测消除双重预约

- [ ] **Phase 14: 化妆师回复评价** — reviews 云函数 reply action + 管理后台回复 UI + 前台回复展示
- [ ] **Phase 15: 可变时长冲突检测** — bookings 冲突检查改为时长区间重叠 + getAvailableSlots 按时长计算 + 前台实时可用时段

## Phase Details

### Phase 14: 化妆师回复评价
**Goal**: 化妆师可以对客户评价添加回复，回复展示在前台评价下方，增强客户信任互动
**Depends on**: Phase 13 (v1.2 complete)
**Requirements**: REVW-07, REVW-08, REVW-09
**Success Criteria** (what must be TRUE):
  1. 化妆师在管理后台评价列表中可以对任意评价添加/编辑/删除回复
  2. 回复内容经过 msgSecCheck 内容安全审查
  3. 客户在首页评价模块和作品详情页可以看到化妆师回复，样式区分于评价本身
**UI hint**: yes（回复编辑器 + 回复展示样式）

### Phase 15: 可变时长冲突检测
**Goal**: 预约系统按服务实际时长检测时间冲突，消除仅检查精确时间段匹配导致的双重预约风险
**Depends on**: Phase 13 (v1.2 complete)
**Requirements**: BOOK-17, BOOK-18
**Success Criteria** (what must be TRUE):
  1. 预约提交时，云函数按服务 duration 计算 [start, start+duration) 区间，与当天已有 pending/accepted 预约检查时间重叠
  2. getAvailableSlots 接受 service_id 参数，返回该服务时长下真正可用的时间段（排除因前序预约时长导致的不可用时段）
  3. 预约创建页选择服务后实时获取并展示可用时段
**UI hint**: minor（时段显示状态变化）

## Progress

**Execution Order:**
Phases 14 and 15 are independent (no file overlap), can execute in parallel or sequentially.

| Phase | Milestone | Plans Complete | Status |
|-------|-----------|----------------|--------|
| 14. 化妆师回复评价 | v2.0 | 0/? | Not Started |
| 15. 可变时长冲突检测 | v2.0 | 0/? | Not Started |
