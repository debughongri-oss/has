# Roadmap: 化妆师个人作品展示与预约小程序

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-04-19)
- 🚧 **v1.1 品牌升级 & 体验增强** — Phases 6-10 (in progress)

## Overview

v1.1 在已交付的 v1.0 MVP 基础上，补齐遗留功能并提升体验。从最简单的数据模型扩展和安全隐患修复开始，逐步交付前后对比滑块、预约通知与日历、客户评价系统，最终完成营销海报生成。每个阶段交付一个完整可验证的能力：化妆师信息更丰富且安全（Phase 6）→ 作品展示有 signature 视觉效果（Phase 7）→ 预约流程闭环通知+日历管理（Phase 8）→ 社会化评价增强信任（Phase 9）→ 营销工具赋能推广（Phase 10）。

## Phases

**Phase Numbering:**
- Integer phases (1-5): v1.0 MVP (shipped)
- Integer phases (6-10): v1.1 品牌升级 & 体验增强 (current)
- Decimal phases (6.1, 7.1): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-04-19</summary>

- [x] Phase 1: Foundation & Profile (2/2 plans) — completed 2026-04-17
- [x] Phase 2: Portfolio System (2/2 plans) — completed 2026-04-17
- [x] Phase 3: Service Catalog (1/1 plan) — completed 2026-04-17
- [x] Phase 4: Booking System (2/2 plans) — completed 2026-04-17
- [x] Phase 5: Sharing & Growth (1/1 plan) — completed 2026-04-17

</details>

### 🚧 v1.1 品牌升级 & 体验增强 (In Progress)

**Milestone Goal:** 补齐 v1.0 遗留功能，提升预约体验和化妆师品牌形象

- [ ] **Phase 6: Data Model Extensions & Quick Wins** — 简介增强、预约备注结构化、服务端安全加固
- [ ] **Phase 7: Before/After Comparison Slider** — 作品详情页妆前妆后滑块对比
- [ ] **Phase 8: Booking Notifications & Calendar** — 订阅消息通知、日历管理视图、时段提示
- [ ] **Phase 9: Customer Review System** — 预约完成后评价打分、公开评价展示
- [ ] **Phase 10: QR Code & Poster Generation** — 小程序码海报一键生成与保存

## Phase Details

### Phase 6: Data Model Extensions & Quick Wins
**Goal**: 化妆师资料更丰富、预约备注更结构化、所有写操作经服务端安全验证
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, BOOK-09, BOOK-10, BOOK-11, BOOK-12, SEC-01, SEC-02
**Success Criteria** (what must be TRUE):
  1. 化妆师可在个人资料编辑页设置服务区域、从业年限和擅长风格标签
  2. 客户在化妆师主页看到服务区域、从业年限和风格标签展示
  3. 客户预约时可填写肤质类型、特殊需求和场合说明，化妆师在管理后台以结构化形式查看这些信息
  4. 所有云函数写操作经服务端 isArtist 身份验证，非化妆师身份无法执行管理操作
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Wave 1: 服务端安全验证基础设施（shared/auth.js + 4个云函数写操作保护）
- [x] 06-02-PLAN.md — Wave 2: 化妆师资料增强（从业年限 + 风格标签 + 主页展示）
- [x] 06-03-PLAN.md — Wave 3: 预约备注结构化（肤质/特殊需求/场合说明替代留言）

**UI hint**: yes

### Phase 7: Before/After Comparison Slider
**Goal**: 作品详情页支持妆前妆后滑块对比，成为化妆效果的 signature 展示方式
**Depends on**: Phase 6
**Requirements**: PORT-07, PORT-08, PORT-09
**Success Criteria** (what must be TRUE):
  1. 化妆师上传作品时可额外上传一张"妆前照片"
  2. 客户查看有妆前照片的作品详情时，可用手指拖动滑块对比前后效果
  3. 前后对比支持全屏查看模式
**Plans**: TBD
**UI hint**: yes

### Phase 8: Booking Notifications & Calendar
**Goal**: 预约状态变更实时推送微信通知，化妆师可通过日历视图管理预约日程
**Depends on**: Phase 6
**Requirements**: BOOK-06, BOOK-07, BOOK-13, BOOK-14, BOOK-15, BOOK-16
**Success Criteria** (what must be TRUE):
  1. 预约状态变更（接受/拒绝/完成）时客户收到微信订阅消息通知
  2. 预约前一天客户收到预约提醒订阅消息
  3. 化妆师在管理后台以月历视图查看预约分布，点击日期查看当天预约列表（按时间排序）
  4. 客户预约时看到所选日期剩余可用时段数量提示
  5. 化妆师看到同一天 3+ 预约时显示"紧凑日程"警告
**Plans**: TBD
**UI hint**: yes

### Phase 9: Customer Review System
**Goal**: 客户可在预约完成后提交评价，评价公开展示于化妆师主页增强信任感
**Depends on**: Phase 8 (booking completion flow stable)
**Requirements**: REVW-01, REVW-02, REVW-03, REVW-04, REVW-05, REVW-06
**Success Criteria** (what must be TRUE):
  1. 客户在已完成的预约历史记录中看到"去评价"入口，可提交 1-5 星打分 + 文字评价（最多200字）
  2. 每个预约只能提交一次评价，重复提交被阻止
  3. 化妆师主页展示平均评分和评价总数
  4. 化妆师主页展示最近评价列表（评分+文字+客户昵称）
  5. 化妆师在管理后台可查看所有评价
**Plans**: TBD
**UI hint**: yes

### Phase 10: QR Code & Poster Generation
**Goal**: 化妆师可一键生成包含小程序码的分享海报用于线下和朋友圈推广
**Depends on**: Phase 7 (works detail page complete with before/after)
**Requirements**: GROW-01, GROW-02, GROW-03
**Success Criteria** (what must be TRUE):
  1. 化妆师在作品详情页可生成包含作品图片和个人信息的分享海报
  2. 海报包含小程序码，扫码可直接进入对应作品详情页
  3. 化妆师可将生成的海报保存到手机相册
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 6 → 7 → 8 → 9 → 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 6. Data Model Extensions & Quick Wins | v1.1 | 0/3 | Planning complete | - |
| 7. Before/After Comparison Slider | v1.1 | 0/? | Not started | - |
| 8. Booking Notifications & Calendar | v1.1 | 0/? | Not started | - |
| 9. Customer Review System | v1.1 | 0/? | Not started | - |
| 10. QR Code & Poster Generation | v1.1 | 0/? | Not started | - |
