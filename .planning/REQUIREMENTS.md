# Requirements: 化妆师个人作品展示与预约小程序

**Milestone:** v2.1 经营工具 & 转化优化
**Core Value:** 客户看到作品后能直接预约化妆服务

## v2.1 Requirements

### Phase 16 — 数据看板（Medium）

- [ ] **DASH-01**: bookings 云函数新增 `getDashboard` action——返回本月/上月预约数、按状态分布、热门服务 Top3、营收统计（已完成预约的服务价格合计）、评价平均分+总数
- [ ] **DASH-02**: 新增 admin dashboard 页面——数字卡片展示预约/营收/评价核心指标，热门服务排行

### Phase 17 — 不可用时间管理（Medium）

- [ ] **AVAIL-01**: 新建 `time_blocks` 集合 + bookings 云函数新增 `blockTime`/`unblockTime`/`getBlockedTimes` action——化妆师可屏蔽日期或具体时段
- [ ] **AVAIL-02**: getAvailableSlots 合并 time_blocks 排除——被屏蔽的日期/时段不显示为可用
- [ ] **AVAIL-03**: admin 日历管理页——化妆师在日历上点选日期/时段进行屏蔽/取消

### Phase 18 — 转化优化 Quick Wins（Low）

- [ ] **CONV-01**: 服务卡片展示预计时长（"约60分钟"）——services list + booking create 页面
- [ ] **CONV-02**: 完成预约自动邀评——预约标记完成时通知中提示评价；客户「我的」页有待评价提醒入口

## Deferred

- **PROF-05**: 化妆师自定义主页主题色
- **PROF-06**: 化妆师调整主页模块顺序

---
*Requirements defined: 2026-07-02*
