# Phase 21: 评价增强 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-16
**Phase:** 21-review-enhancement
**Areas discussed:** 评价标签方案 (REVW-10), 评价图片上传与安全 (REVW-11), 匿名评价范围 (REVW-12), 后台筛选排序布局 (REVW-13), avg_rating 冗余与删除 (REVW-14)

---

## 评价标签方案 (REVW-10)

| Option | Description | Selected |
|--------|-------------|----------|
| 固定预设 | 代码写死 5 标签，无需管理 UI，符合个人项目 | ✓ |
| 化妆师可自定义 | 后台增减标签 + 集合，过度设计 | |

**User's choice:** 固定预设
**Notes:** 沿用需求 5 个：手法专业/妆面自然/准时/态度好/性价比高

| Option | Description | Selected |
|--------|-------------|----------|
| 不限（最多 5） | 全部可选，充分表达 | ✓ |
| 最多 3 个 | 信息密度高（推荐） | |

**User's choice:** 不限（最多 5）

| Option | Description | Selected |
|--------|-------------|----------|
| 展示高频标签 | getStats 返回 top 标签，服务口碑转化 | ✓ |
| 不统计 | 标签只随评价显示 | |

**User's choice:** 展示高频标签

| Option | Description | Selected |
|--------|-------------|----------|
| 首页评价模块 | 客户可见「大家这么说」增强信任 | ✓ |
| 仅后台 | 供化妆师了解口碑 | |
| 两者都展示 | | |

**User's choice:** 首页评价模块

| Option | Description | Selected |
|--------|-------------|----------|
| 沿用需求 5 个 | 手法专业/妆面自然/准时/态度好/性价比高 | ✓ |
| 调整清单 | 增减标签 | |

**User's choice:** 沿用需求 5 个

---

## 评价图片上传与安全 (REVW-11)

| Option | Description | Selected |
|--------|-------------|----------|
| 原生+自定义网格 | 复用 works/edit 的 chooseMedia + storage.uploadWorkImages | ✓ |
| TDesign t-upload | 自带网格/进度，但风格不一致且需适配云存储 | |

**User's choice:** 原生+自定义网格

| Option | Description | Selected |
|--------|-------------|----------|
| imgSecCheck 同步逐张 | 压缩后<1MB 适用，fail-closed（推荐） | ✓ |
| mediaCheckAsync 异步 | 支持大图，但需轮询/回调，体验差 | |

**User's choice:** imgSecCheck 同步逐张
**Notes:** 纠正需求文档中的 msgSecCheck（msgSecCheck 是文本审查 API）

| Option | Description | Selected |
|--------|-------------|----------|
| 详情+后台显图 | 首页保持简洁，详情/后台显缩略图+previewImage | ✓ |
| 首页也显图 | 视觉丰富但加载重 | |

**User's choice:** 详情+后台显图

---

## 匿名评价范围 (REVW-12)

| Option | Description | Selected |
|--------|-------------|----------|
| 后台见真实身份 | 带匿名标记，化妆师能关联客户档案跟进 | ✓ |
| 对化妆师也完全匿名 | 隐私最强但失去运营价值 | |

**User's choice:** 后台见真实身份

| Option | Description | Selected |
|--------|-------------|----------|
| 默认不匿名 | 公开昵称增强真实性（推荐） | ✓ |
| 默认匿名 | 保护隐私但降低信任 | |

**User's choice:** 默认不匿名

---

## 后台筛选排序布局 (REVW-13)

| Option | Description | Selected |
|--------|-------------|----------|
| .segs 条+排序切换 | 复用 bookings list 的 seg 模式，心智统一（推荐） | ✓ |
| 下拉/抽屉式 | 容纳更多条件但交互多一层 | |

**User's choice:** .segs 条+排序切换

| Option | Description | Selected |
|--------|-------------|----------|
| 服务端过滤 | where+orderBy，分页+标签数组筛选准确（推荐） | ✓ |
| 客户端过滤 | 量小可行但与分页冲突 | |

**User's choice:** 服务端过滤

---

## avg_rating 冗余与删除 (REVW-14)

| Option | Description | Selected |
|--------|-------------|----------|
| 本阶段建删除 | requireArtist + 同步减冗余 + 删云图，满足需求全文（推荐） | ✓ |
| 仅创建侧同步 | 不建 delete，avg_rating 只增不减 | |

**User's choice:** 本阶段建删除

| Option | Description | Selected |
|--------|-------------|----------|
| 均分读冗余字段 | 读 artist_profile，零计算最快（推荐） | ✓ |
| 仍实时聚合 | 与 Phase 9 D-17 一致但未达优化目标 | |

**User's choice:** 均分读冗余字段

---

## Agent's Discretion

- REVW-15 订阅消息授权触发点（用户未选择讨论此方面；锁定复用单模板 + 服务端发送，仅触发点交 planner）
- 标签 chip / 图片网格 / 匿名标记的视觉细节
- imgSecCheck 调用方式
- avg_rating 增量 vs 重算实现选择
- 删除评价 UI 交互
- 高频标签 top N 数量

## Deferred Ideas

None — discussion stayed within phase scope
