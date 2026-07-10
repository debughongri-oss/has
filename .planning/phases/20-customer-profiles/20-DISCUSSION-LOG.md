# Phase 20: 客户档案 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-10
**Phase:** 20-customer-profiles
**Areas discussed:** 客户标签规则, 备注数据模型, 客户详情页交互, 预约详情联动

---

## 客户标签规则

| Option | Description | Selected |
|--------|-------------|----------|
| 按完成次数 | 只统计 status=completed 的预约 | ✓ |
| 按所有预约次数 | 统计所有非取消预约（含 pending/accepted/completed） | |
| 自定义阈值 | 我来定阈值，或用其他维度（如总消费金额） | |

**User's choice:** 按完成次数（只统计 completed）
**Notes:** 完成才代表真实成交

| Option | Description | Selected |
|--------|-------------|----------|
| 1 / 2-3 / 4+ | 新客=1，回头客=2-3，VIP=4+ | |
| 1 / 2-4 / 5+ | 新客=1，回头客=2-4，VIP=5+ | ✓ |
| 自定义 | 我来指定具体数字 | |

**User's choice:** 1 / 2-4 / 5+（VIP 更尊稀）

| Option | Description | Selected |
|--------|-------------|----------|
| 标签筛选条 | 顶部标签筛选（全部/新客/回头客/VIP），复用 seg 样式 | ✓ |
| 无筛选纯列表 | 平铺按最近预约倒序 | |
| 搜索+筛选 | 搜索框按昵称查找 + 标签筛选条 | |

**User's choice:** 标签筛选条

---

## 备注数据模型

| Option | Description | Selected |
|--------|-------------|----------|
| 化妆师画像为主 | customer_notes 存肤质/偏好/过敏史/自定义备注，与 booking 互补 | ✓ |
| 全量统一 | customer_notes 覆盖 booking 的结构化字段，成为唯一数据源 | |
| 自定义字段 | 我来指定字段 | |

**User's choice:** 化妆师画像为主
**Notes:** booking 字段是客户每次预约填的，customer_notes 是化妆师事后总结的客户画像

| Option | Description | Selected |
|--------|-------------|----------|
| 单文档/覆盖更新 | 每个 user_openid 一条文档，编辑时整体覆盖 | ✓ |
| 追加历史记录 | 每次备注追加带时间戳记录，可追溯变更 | |

**User's choice:** 单文档/覆盖更新

| Option | Description | Selected |
|--------|-------------|----------|
| inline 编辑 | 客户详情页内直接编辑，不跳转 | ✓ |
| 跳转独立编辑页 | 跳转到 pages/admin/customers/notes | |
| 弹窗填写 | t-dialog / 自定义弹层填写 | |

**User's choice:** inline 编辑

---

## 客户详情页交互

| Option | Description | Selected |
|--------|-------------|----------|
| 全部展示可跳转 | 完整列表按时间倒序，可点击跳转 | |
| 最近5条+展开 | 默认最近5条 + 查看全部展开 | ✓ |
| 最近3条摘要 | 只展示最近3条摘要，不做跳转 | |

**User's choice:** 最近5条+展开

| Option | Description | Selected |
|--------|-------------|----------|
| 完整评价列表 | 评分+服务名+文字+时间，按时间倒序 | ✓ |
| 摘要统计 | 只显示评价数量和平均分，点击跳转评价管理 | |

**User's choice:** 完整评价列表

| Option | Description | Selected |
|--------|-------------|----------|
| 可跳转预约详情 | 历史预约项 navigateTo 到 admin 预约详情 | ✓ |
| 纯展示不可点 | 纯展示，不可点击 | |

**User's choice:** 可跳转预约详情

---

## 预约详情联动

| Option | Description | Selected |
|--------|-------------|----------|
| 独立卡片 | 新增「客户档案」卡片，与「客户需求」卡片并排 | ✓ |
| 合并进现有卡片 | 合并进「客户需求」卡片，分组标题区分 | |

**User's choice:** 独立卡片
**Notes:** 两者数据源不同（客户填 vs 化妆师记），分开更清晰

| Option | Description | Selected |
|--------|-------------|----------|
| 画像+标签+次数 | 客户标签+完成次数+偏好+过敏史+自定义备注 | ✓ |
| 纯备注字段 | 只展示文字字段，不展示标签和次数 | |

**User's choice:** 画像+标签+次数

| Option | Description | Selected |
|--------|-------------|----------|
| 引导跳转补充 | 显示「暂无客户档案，点击查看客户详情」 | ✓ |
| 隐藏卡片 | 条件渲染隐藏，避免空状态 | |
| 空状态文案 | 空卡片 + 暂无备注文案，不引导跳转 | |

**User's choice:** 引导跳转补充

---

## Agent's Discretion

- 客户列表入口位置（建议 admin/bookings/list.wxml 的 .entries 区）
- 云函数组织方式（新建 customers 云函数 vs bookings 新增 action）
- customer_notes.skin_type 是否从 booking 预填引导
- 卡片/列表样式细节
- 数据聚合与分页性能策略

## Deferred Ideas

None — discussion stayed within phase scope
