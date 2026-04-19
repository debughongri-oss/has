# Phase 6: Data Model Extensions & Quick Wins - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 06-data-model-extensions-quick-wins
**Areas discussed:** 风格标签交互, 预约备注表单设计, 预约备注管理展示, 安全验证策略

---

## 风格标签交互

| Option | Description | Selected |
|--------|-------------|----------|
| 预设标签多选 | 固定标签列表多选，类似 SERVICE_CATEGORIES 模式 | ✓ |
| 自由输入 | 保持当前逗号分隔文本输入 | |
| 预设 + 自定义 | 预设多选 + "其他"输入框 | |

**User's choice:** 预设标签多选
**Notes:** 标签列表写死在 constants.js

| Option | Description | Selected |
|--------|-------------|----------|
| 写死在 constants.js | 类似 SERVICE_CATEGORIES，新增标签需发版 | ✓ |
| 数据库配置 | 标签存云数据库，化妆师自助添加 | |

**User's choice:** 写死在 constants.js

| Option | Description | Selected |
|--------|-------------|----------|
| 数字 + 文本都保留 | 新增 experience_years 数字字段，保留 experience 文本 | ✓ |
| 纯数字替代文本 | 只保留纯数字，展示时加后缀 | |

**User's choice:** 数字 + 文本都保留

| Option | Description | Selected |
|--------|-------------|----------|
| 现有布局已够 | hero 区域已展示 experience + location + tags | ✓ |
| 新增信息卡片区域 | 加独立"服务信息"卡片 | |

**User's choice:** 现有布局已够

---

## 预约备注表单设计

| Option | Description | Selected |
|--------|-------------|----------|
| 三个独立字段替代留言 | 肤质单选 + 特殊需求 textarea + 场合说明 textarea | ✓ |
| 保留原留言 + 新增字段 | 原留言 textarea 保留，额外加字段 | |
| 只加肤质字段 | 只结构化最重要的数据 | |

**User's choice:** 三个独立字段替代留言

| Option | Description | Selected |
|--------|-------------|----------|
| 标签按钮组 | 五个选项（干性/油性/混合性/敏感性/不确定）以按钮组形式展示 | ✓ |
| Picker 下拉选择 | 用 picker 组件下拉，节省空间 | |

**User's choice:** 标签按钮组

| Option | Description | Selected |
|--------|-------------|----------|
| 平铺展示 | 选时间后所有字段同时展开 | ✓ |
| 新增第4步 | 三步骤变四步骤，补充信息为独立步骤 | |

**User's choice:** 平铺展示

---

## 预约备注管理展示

| Option | Description | Selected |
|--------|-------------|----------|
| 独立行显示 | 在现有 key-value 行布局中加三个独立行 | ✓ |
| 分组卡片显示 | 新增"客户需求"分组卡片 | |

**User's choice:** 独立行显示

| Option | Description | Selected |
|--------|-------------|----------|
| 三字段存 booking 文档 | skin_type/special_needs/occasion 直接存 booking | ✓ |
| 子集合存储 | 新增 booking_details 子集合 | |

**User's choice:** 三字段存 booking 文档

---

## 安全验证策略

| Option | Description | Selected |
|--------|-------------|----------|
| 硬编码 ARTIST_OPENID | 云函数内直接比较 openid，与客户端逻辑一致 | ✓ |
| 数据库查询比较 | 从 artist_profile 集合读取 artist_openid 比较 | |

**User's choice:** 硬编码 ARTIST_OPENID

| Option | Description | Selected |
|--------|-------------|----------|
| 公共验证模块 | 提取 shared/auth.js，各云函数 require 引入 | ✓ |
| 各函数内联验证 | 每个云函数各自实现验证逻辑 | |

**User's choice:** 公共验证模块

| Option | Description | Selected |
|--------|-------------|----------|
| 字段白名单 | profile update 只允许白名单字段通过 | ✓ |
| 不过滤 | 信任客户端发送的全部数据 | |

**User's choice:** 字段白名单

| Option | Description | Selected |
|--------|-------------|----------|
| 只保护写操作 | create/update/delete 需要 isArtist，list/detail/get 公开 | ✓ |
| 写操作 + 管理端读操作 | 额外保护 listAll 等管理端读接口 | |

**User's choice:** 只保护写操作

---

## Agent's Discretion

- 预设风格标签的具体列表内容
- 云函数公共模块的目录结构
- 白名单校验的具体实现方式
- 肤质选项的展示样式细节
- 移除 notes 字段的向后兼容处理

## Deferred Ideas

None
