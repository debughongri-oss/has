# Roadmap: 化妆师个人作品展示与预约小程序

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-04-19)
- ✅ **v1.1 品牌升级 & 体验增强** — Phases 6-10 (shipped 2026-04-24)
- ✅ **v1.2 上线前加固** — Phases 11-13 (shipped 2026-07-02)
- ✅ **v2.0 评价互动 & 预约智能化** — Phases 14-15 (shipped 2026-07-02)
- ✅ **v2.1 经营工具 & 转化优化** — Phases 16-18 (shipped 2026-07-02)
- ✅ **v2.2 预约体验增强** — Phase 19 (shipped 2026-07-10)
- 🚧 **v2.3 客户经营 & 口碑增强** — Phases 20-21 (in progress)

## Archived Milestones

<details>
<summary>✅ v1.0–v2.2 (SHIPPED)</summary>

- v1.0 (Phases 1-5): MVP — Foundation, Portfolio, Services, Booking, Sharing
- v1.1 (Phases 6-10): 品牌升级 — Data Extensions, Slider, Notifications, Reviews, QR Poster
- v1.2 (Phases 11-13): 上线前加固 — Auth Security, Release Hygiene, Polish
- v2.0 (Phases 14-15): 评价互动 — Review Reply, Duration Conflict Detection
- v2.1 (Phases 16-18): 经营工具 — Dashboard, Availability Blocks, Conversion Quick Wins
- v2.2 (Phase 19): 预约体验增强 — 营收修复, 新预约提醒, No-show 追踪, 客户自助改期, 工作时间配置

</details>

### 🚧 v2.3 客户经营 & 口碑增强 (In Progress)

**Milestone Goal:** 让化妆师记住每位客户、让评价更有说服力，提升复购和转化

- [x] **Phase 20: 客户档案** — 客户列表 + 详情页 + 备注管理 + 预约详情联动 (CUST-01~04) ✓ Complete 2026-07-16
- [x] **Phase 21: 评价增强** — 标签/带图/匿名 + 后台筛选排序 + avg_rating 冗余 + 评价推送 (REVW-10~15) (completed 2026-07-16)

## Phase Details

### Phase 20: 客户档案
**Goal**: 化妆师在后台能集中查看每位客户的信息、历史预约和偏好，并在接单/确认预约时立即看到客户备注——把「记得客户」从脑力负担变成系统记忆，支撑个性化服务和复购。
**Depends on**: Phase 19 (bookings/users 集合已就绪)
**Requirements**: CUST-01, CUST-02, CUST-03, CUST-04
**Success Criteria** (what must be TRUE):
  1. 化妆师在后台客户列表页可看到所有曾预约的客户，列表项展示昵称、头像、预约次数、最近预约时间、状态标签（新客/回头客/VIP）
  2. 化妆师点击任意客户可进入客户详情页，看到客户基本信息 + 完整历史预约列表 + 该客户提交过的评价记录
  3. 化妆师可在客户详情页为客户添加/编辑备注（肤质、偏好、过敏史、自定义备注），保存后再次打开备注仍保留
  4. 化妆师在预约管理详情页可看到该预约对应客户的备注信息（偏好/注意事项），无需跳转到客户详情即可获知
**Plans**: 4 plans
- [x] 20-01-PLAN.md — 客户数据云函数 + 服务层 + 路由注册（后端基础设施）
- [x] 20-02-PLAN.md — 客户列表页 + 预约列表入口（CUST-01）
- [x] 20-03-PLAN.md — 客户详情页 + inline 备注编辑（CUST-02, CUST-03）
- [x] 20-04-PLAN.md — 预约详情客户档案卡片（CUST-04）✓ 2026-07-16
**UI hint**: yes

### Phase 21: 评价增强
**Goal**: 评价从「文字+星级」升级为「标签+图片+可选匿名」的更有说服力的口碑载体；化妆师后台能高效筛选排序评价；前台评价统计性能更优；新评价化妆师即时知情——全面提升评价作为转化利器的价值。
**Depends on**: Phase 20 (顺序排列；功能上独立)
**Requirements**: REVW-10, REVW-11, REVW-12, REVW-13, REVW-14, REVW-15
**Success Criteria** (what must be TRUE):
  1. 客户在评价表单中可选择预设标签（多选）、上传 1-3 张图片、勾选「匿名评价」；提交后前台评价模块正确展示（匿名显示「匿名用户」、图片可查看、标签可见）
  2. 化妆师在后台评价管理页可按评分/时间/标签筛选评价、按最新/最高/最低排序，列表正确响应筛选和排序条件
  3. 首页评价统计（均分、总数）直接读取 artist_profile 冗余字段；新建/删除评价时冗余字段自动同步更新（无需重新跑聚合）
  4. 客户提交新评价后化妆师收到订阅消息推送（phrase「新评价」），化妆师无需主动刷新即可感知
**Plans**: 4 plans
- [x] 21-01-PLAN.md — 评价云函数扩展（create 标签/图片/匿名 + imgSecCheck + avg_rating 冗余同步 + 推送 + delete）+ 共享层（REVW-10~15 后端）
- [x] 21-02-PLAN.md — 客户评价表单（标签 chip + 图片网格 + 匿名开关）（REVW-10/11/12 客户端）
- [x] 21-03-PLAN.md — 后台评价管理（筛选/排序/删除/缩略图/匿名标记）+ 客户详情匿名标记 + 化妆师订阅授权（REVW-13/14/12/15）
- [x] 21-04-PLAN.md — 首页评价统计读冗余字段 + 「大家这样说」标签云（REVW-14/10）
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 20. 客户档案 | v2.3 | 4/4 | ✓ Complete | 2026-07-16 |
| 21. 评价增强 | v2.3 | 4/4 | Complete    | 2026-07-16 |
