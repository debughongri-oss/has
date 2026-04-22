---
phase: 08-booking-notifications-calendar
plan: 01
subsystem: booking-notifications
tags: [cron, subscription-message, slots-hint, booking]
dependency_graph:
  requires: [bookings-collection, subscription-template]
  provides: [booking-reminder-cron, slots-hint-ui]
  affects: []
tech_stack:
  added: [wx-server-sdk timer trigger, cloud.openapi.subscribeMessage.send]
  patterns: [cron cloud function, data-driven hint display]
key_files:
  created:
    - cloudfunctions/booking-reminder/index.js
    - cloudfunctions/booking-reminder/package.json
    - cloudfunctions/booking-reminder/config.json
  modified:
    - miniprogram/pages/booking/create.js
    - miniprogram/pages/booking/create.wxml
    - miniprogram/pages/booking/create.wxss
decisions:
  - Independent cloud function with cron trigger (per D-05/D-06)
  - Reuse existing subscription template with phrase5='预约提醒' (per D-08)
  - Sequential send to avoid API throttling
  - Data-driven slots hint reusing getAvailableSlots response (per D-20)
metrics:
  duration: 4m
  tasks_completed: 2
  files_created: 3
  files_modified: 3
  completed_at: "2026-04-22T09:00:00Z"
---

# Phase 08 Plan 01: Booking Reminder Cron + Slots Hint Summary

Daily 20:00 cron reminder for tomorrow's accepted bookings + remaining available slots hint on booking create page. BOOK-06 verified with zero regression.

## What Was Done

### Task 1: booking-reminder 定时触发器云函数
- Created independent `booking-reminder` cloud function with 3 files
- Timer trigger configured for daily 20:00 (cron `0 0 20 * * * *`)
- Queries tomorrow's `accepted` bookings and sends reminder via subscription message
- Reuses existing template with `phrase5: '预约提醒'` to distinguish from status notifications
- Sequential send loop with per-user error swallowing

### Task 2: 剩余可用时段提示
- Added `availableCount` and `allBooked` data fields to create.js
- Displayed "剩余 X 个可用时段" hint above time slot grid
- Orange "该日期已约满，请选择其他日期" variant when all booked
- Data sourced from existing `getAvailableSlots` response — no new API

## Verification Results

| Check | Result |
|-------|--------|
| booking-reminder/index.js exists | ✅ |
| booking-reminder/config.json has cron trigger | ✅ |
| booking-reminder/config.json has subscribeMessage.send permission | ✅ |
| create.js has availableCount/allBooked | ✅ |
| create.wxml has slots-hint elements | ✅ |
| create.wxss has slots-hint styles | ✅ |
| BOOK-06 sendNotify intact (line 18) | ✅ No regression |
| BOOK-06 requestSubscribeMessage intact (line 148) | ✅ No regression |

## Commits

| Hash | Message |
|------|---------|
| `4db75d2` | feat(08-01): add booking-reminder cron function for daily 20:00 reminders |
| `dae787b` | feat(08-01): add remaining available slots hint on booking create page |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All files exist, all commits verified, BOOK-06 regression check passed.
