# Requirements: 化妆师个人作品展示与预约小程序

**Milestone:** v2.3 客户经营 & 口碑增强
**Core Value:** 客户看到作品后能直接预约化妆服务

## v2.3 Requirements

### 客户档案（Medium）

- [ ] **CUST-01**: 化妆师后台查看客户列表——聚合 users + bookings 统计，展示昵称、头像、预约次数、最近预约时间、状态标签（新客/回头客/VIP）
- [ ] **CUST-02**: 客户详情页——客户基本信息 + 完整历史预约列表 + 该客户的评价记录
- [ ] **CUST-03**: 化妆师为客户添加/编辑备注（肤质、偏好、过敏史、自定义备注），存储于 customer_notes 集合（按 user_openid 索引）
- [ ] **CUST-04**: 预约管理详情页展示客户备注——化妆师接单/确认前可查看客户偏好和注意事项

### 评价增强（Medium）

- [ ] **REVW-10**: 评价标签快捷选择——预设标签（手法专业/妆面自然/准时/态度好/性价比高），客户评价时可多选，存入 review.tags[]
- [ ] **REVW-11**: 评价支持带图——客户评价时可上传 1-3 张图片，云存储上传 + msgSecCheck 内容安全审查
- [ ] **REVW-12**: 匿名评价选项——客户可选择不展示昵称头像，前台评价模块显示「匿名用户」
- [ ] **REVW-13**: 后台评价管理支持筛选（按评分/时间/标签）+ 排序（最新/最高/最低）
- [ ] **REVW-14**: artist_profile 冗余 avg_rating + total_reviews——评价创建/删除时同步更新，首页评价统计直接读取冗余字段
- [ ] **REVW-15**: 客户提交评价后推送通知化妆师（复用订阅消息，phrase「新评价」）

## Future Requirements (Deferred)

- **PROF-05**: 化妆师自定义主页主题色
- **PROF-06**: 化妆师调整主页模块顺序

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CUST-01 | Phase 20 | Pending |
| CUST-02 | Phase 20 | Pending |
| CUST-03 | Phase 20 | Pending |
| CUST-04 | Phase 20 | Pending |
| REVW-10 | Phase 21 | Pending |
| REVW-11 | Phase 21 | Pending |
| REVW-12 | Phase 21 | Pending |
| REVW-13 | Phase 21 | Pending |
| REVW-14 | Phase 21 | Pending |
| REVW-15 | Phase 21 | Pending |

**Coverage:** 10/10 v2.3 requirements mapped ✓

---
*Requirements defined: 2026-07-10*
*Traceability added: 2026-07-10 — ROADMAP v2.3 created*
