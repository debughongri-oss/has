# Requirements: 化妆师个人作品展示与预约小程序

**Defined:** 2026-07-02
**Milestone:** v2.0 评价互动 & 预约智能化
**Core Value:** 客户看到作品后能直接预约化妆服务——从"看到好看的作品"到"我要预约"的路径最短

## v2.0 Requirements

> v2.0 引入两个独立功能：化妆师回复评价（增强互动信任）+ 可变时长冲突检测（减少双重预约）。两者可并行开发。

### Phase 14 — 化妆师回复评价（Medium）

- [ ] **REVW-07**: reviews 云函数新增 `reply` action——化妆师可对任意评价添加回复（含内容安全审查），支持编辑和删除；回复存入 `artist_reply` + `artist_reply_at` 字段
- [ ] **REVW-08**: 管理后台评价列表页增加回复入口——点击评价项展开回复编辑器，支持输入回复/修改回复/删除回复
- [ ] **REVW-09**: 前台评价展示（首页评价模块、作品详情评价区）显示化妆师回复——回复以区分于评价的样式展示在评价下方，带「化妆师回复」标签

### Phase 15 — 可变时长冲突检测（Medium）

- [ ] **BOOK-17**: bookings 云函数 `create` 改为按服务时长检查时间冲突——计算 `[start, start+duration)` 区间与当天已有预约的重叠；getAvailableSlots 同步改为按时长计算真正可用时段
- [ ] **BOOK-18**: 预约创建页选择服务后请求可用时段，实时显示被占用/因时长冲突不可用的时段；提交时服务端二次校验

## Deferred

### 从 v1.1 继承（未选入 v2.0）

- **PROF-05**: 化妆师可以自定义主页主题色
- **PROF-06**: 化妆师可以调整主页模块顺序

## Out of Scope

| Feature | Reason |
|---------|--------|
| 实时聊天/IM | 微信已有 contact 按钮，不需要自定义聊天 |
| 评价标签快捷选择 | 简化输入，延后 |
| 评价带图 | 增强可信度，延后 |
| 匿名评价 | 隐私选项，延后 |
| 评价通知推送 | 即时反馈，延后 |
| 在线支付 | 线下结算，小程序不涉及支付功能 |
| 多化妆师平台 | 仅支持单个化妆师，不做平台模式 |
| 视频展示 | v1 以图片为主，视频功能延后 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REVW-07 | Phase 14 | Pending |
| REVW-08 | Phase 14 | Pending |
| REVW-09 | Phase 14 | Pending |
| BOOK-17 | Phase 15 | Pending |
| BOOK-18 | Phase 15 | Pending |

**Coverage:**
- v2.0 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-02*
