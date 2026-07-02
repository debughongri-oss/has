---
phase: 15-duration-conflict
plan: 01
subsystem: bookings
tags: [conflict-detection, duration, time-overlap, available-slots]

requirements-completed: [BOOK-17, BOOK-18]
duration: ~15min
completed: 2026-07-02
---

# Phase 15: 可变时长冲突检测 Summary

**预约冲突检查从精确时间段匹配改为时长区间重叠检测，getAvailableSlots 按服务时长计算真正可用时段。**

## Task Commits

1. `ea033c8` (feat) — parseTime/hasOverlap + getAvailableSlots + create 冲突检测 + client 传 service_id

## Key Design

- `parseTime("10:30")` → 630 分钟；`hasOverlap(s1,d1,s2,d2)` 区间交集检测
- getAvailableSlots 接受 `service_id`，查服务 duration，对每个 TIME_SLOT 检查与当天已有预约的重叠
- create 存储 `service_duration` 到 booking 文档，供后续冲突检测使用
- 旧预约无 `service_duration`，默认 90 分钟（TIME_SLOTS 间隔）

## Verification

| 检查项 | 结果 |
|--------|------|
| hasOverlap 函数定义 | ✅ |
| getAvailableSlots 接受 service_id | ✅ |
| create 用 hasOverlap 检测 | ✅ |
| booking 文档存 service_duration | ✅ |
| client 传 service_id | ✅ |
| 3 JS 文件 node --check | ✅ |
