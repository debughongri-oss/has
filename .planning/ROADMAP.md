# Roadmap: 化妆师个人作品展示与预约小程序

## Overview

从微信登录和化妆师身份展示开始，逐步交付作品展示系统、服务目录、预约系统，最终完成分享和推广功能。每个阶段交付一个完整可验证的能力：用户能看到谁（Phase 1）→ 能看到作品（Phase 2）→ 能了解服务（Phase 3）→ 能直接预约（Phase 4）→ 能分享传播（Phase 5）。核心价值"看到作品→直接预约"的路径在每个阶段逐步缩短。

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Profile** - 微信登录、化妆师个人简介展示、项目基础架构
- [ ] **Phase 2: Portfolio System** - 完整的作品展示与管理（浏览、详情、分类、前后对比、管理后台）
- [ ] **Phase 3: Service Catalog** - 服务项目展示与管理（CRUD + 卡片列表）
- [ ] **Phase 4: Booking System** - 完整预约流程（提交、日历、审核、通知、历史）
- [ ] **Phase 5: Sharing & Growth** - 分享传播与营销推广（分享、小程序码海报）

## Phase Details

### Phase 1: Foundation & Profile
**Goal**: 用户打开小程序即可看到化妆师的身份和资历，应用基础架构就绪
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02
**Success Criteria** (what must be TRUE):
  1. 用户打开小程序后自动完成微信静默登录，无需手动操作即可获得身份标识
  2. 用户在首页看到化妆师姓名、头像、简介文字、从业经验等完整个人资料
  3. 应用显示底部 TabBar 导航结构，未建设的模块显示空状态引导
**Plans**: 2 plans
Plans:
- [x] 01-01-PLAN.md — 项目架构搭建与认证系统（云开发、静默登录、隐私协议）
- [x] 01-02-PLAN.md — 化妆师资料展示与 TabBar 空状态页面

### Phase 2: Portfolio System
**Goal**: 用户可以浏览化妆师完整作品集，化妆师可以在后台管理作品
**Depends on**: Phase 1
**Requirements**: PORT-01, PORT-02, PORT-03, PORT-04, PORT-05, PORT-06, PORT-07, MGMT-01
**Success Criteria** (what must be TRUE):
  1. 用户看到图片瀑布流/网格形式的作品列表，图片懒加载流畅滚动
  2. 用户点击作品进入详情页，可滑动浏览多张图片（支持长按保存）
  3. 用户可通过分类标签（新娘妆、日常妆、订婚妆等）筛选作品
  4. 用户在作品详情页可通过交互滑块查看妆前妆后对比效果
  5. 化妆师可在管理后台上传新作品（多图+描述）、编辑和删除已有作品
**Plans**: TBD
**UI hint**: yes

### Phase 3: Service Catalog
**Goal**: 用户可以浏览化妆师提供的所有服务项目及详情
**Depends on**: Phase 1
**Requirements**: SERV-01, SERV-02, SERV-03, SERV-04
**Success Criteria** (what must be TRUE):
  1. 用户以卡片列表形式浏览所有服务项目，每张卡片显示名称、时长预估、价格区间
  2. 化妆师可在管理后台创建新服务项目（名称、时长、价格区间、描述）
  3. 化妆师可编辑和删除已有服务项目
**Plans**: TBD
**UI hint**: yes

### Phase 4: Booking System
**Goal**: 用户可以在线预约化妆服务，化妆师可以管理整个预约生命周期
**Depends on**: Phase 3
**Requirements**: BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06, BOOK-07, BOOK-08
**Success Criteria** (what must be TRUE):
  1. 用户可选择服务项目、查看可用时间段日历、选择日期时间后提交预约（可附留言）
  2. 化妆师在管理后台查看预约请求，可接单、拒绝或提出改期建议
  3. 化妆师可为预约添加仅自己可见的内部备注
  4. 预约状态变更时用户收到订阅消息通知，新预约提交时化妆师收到通知
  5. 用户可在预约历史页面查看所有预约记录及状态标签
**Plans**: TBD
**UI hint**: yes

### Phase 5: Sharing & Growth
**Goal**: 用户可以分享作品传播，化妆师可以生成营销物料推广小程序
**Depends on**: Phase 2
**Requirements**: MGMT-02, MGMT-03
**Success Criteria** (what must be TRUE):
  1. 用户可将作品详情页分享到微信聊天和朋友圈，分享卡片展示作品封面图和标题
  2. 化妆师可一键生成包含小程序码的宣传海报图，可用于朋友圈推广
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Profile | 2/2 | Complete | 2026-04-17 |
| 2. Portfolio System | 0/? | Not started | - |
| 3. Service Catalog | 0/? | Not started | - |
| 4. Booking System | 0/? | Not started | - |
| 5. Sharing & Growth | 0/? | Not started | - |
