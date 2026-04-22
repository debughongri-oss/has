---
phase: 08-booking-notifications-calendar
plan: 02
subsystem: admin-calendar
tags: [calendar, tdesign, booking-management, busy-day-warning]
dependency_graph:
  requires: [bookings-collection, requireArtist-auth, TDesign-Calendar]
  provides: [calendar-page, getCalendarData-action, busy-day-warning]
  affects: []
tech_stack:
  added: [TDesign t-calendar component, server-side date grouping]
  patterns: [admin subpackage page, format callback for calendar markers]
key_files:
  created:
    - miniprogram/pages/admin/bookings/calendar.js
    - miniprogram/pages/admin/bookings/calendar.wxml
    - miniprogram/pages/admin/bookings/calendar.wxss
    - miniprogram/pages/admin/bookings/calendar.json
  modified:
    - cloudfunctions/bookings/index.js
    - miniprogram/services/bookings.js
    - miniprogram/pages/admin/bookings/list.wxml
    - miniprogram/pages/admin/bookings/list.js
    - miniprogram/pages/admin/bookings/list.wxss
    - miniprogram/app.json
decisions:
  - Server-side date-range query and grouping via getCalendarData (per D-13)
  - TDesign Calendar in embedded mode with format callback for markers (per D-12)
  - BUSY_DAY_THRESHOLD hardcoded at 3 (per D-22)
  - Orange dot + orange warning bar for busy days (per D-21/D-23)
  - Calendar entry button on admin bookings list (per D-16)
metrics:
  duration: 4m
  tasks_completed: 2
  files_created: 4
  files_modified: 6
  completed_at: "2026-04-22T09:05:00Z"
---

# Phase 08 Plan 02: Admin Calendar Page + getCalendarData Summary

Admin calendar page using TDesign Calendar with monthly booking view, date-based booking list, and orange busy-day warning for 3+ appointments.

## What Was Done

### Task 1: Backend — getCalendarData action + service + route
- Added `getCalendarData` action to bookings cloud function with `requireArtist` auth
- Server-side date-range query (`_.gte`/`_.lt`) excludes cancelled bookings
- Returns both `grouped` (by date) and flat `bookings` array
- Added `getCalendarData(year, month)` to bookings service layer
- Registered `bookings/calendar` route in admin subpackage

### Task 2: Frontend — Calendar page + admin list entry
- Created calendar page (4 files: js/wxml/wxss/json)
- TDesign Calendar in embedded mode (`usePopup: false`, `switchMode: 'month'`, `readonly: true`)
- `format` callback adds grey `•` for booked days, orange `•` + CSS class for 3+ bookings
- Day booking list sorted by `booking_time` with status badges
- Orange "⚠️ 紧凑日程：今日 X 个预约" warning bar when day has 3+ bookings
- "日历视图" entry button on admin bookings list page

## Verification Results

| Check | Result |
|-------|--------|
| calendar.js exists | ✅ |
| calendar.wxml has t-calendar | ✅ |
| calendar.wxss has busy-warning styles | ✅ |
| calendar.json has t-calendar component | ✅ |
| calendar.js has BUSY_DAY_THRESHOLD = 3 | ✅ |
| getCalendarData in cloud function | ✅ |
| getCalendarData in service layer | ✅ |
| app.json has bookings/calendar | ✅ |
| list.js has goToCalendar method | ✅ |
| list.wxml has calendar-entry | ✅ |
| requireArtist on getCalendarData | ✅ |

## Commits

| Hash | Message |
|------|---------|
| `d2a7672` | feat(08-02): add getCalendarData action + service function + calendar route |
| `83242cf` | feat(08-02): create admin calendar page with TDesign Calendar + busy day warning |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All files exist, all commits verified, all key features present.
