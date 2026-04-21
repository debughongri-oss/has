---
phase: 06-data-model-extensions-quick-wins
plan: "03"
subsystem: booking
tags: [booking, structured-notes, skin-type, special-needs, occasion]
dependency_graph:
  requires: [06-01, 06-02]
  provides: [structured booking notes, SKIN_TYPE_OPTIONS constant]
  affects: [booking create form, bookings cloud function, admin booking detail]
tech_stack:
  added:
    - SKIN_TYPE_OPTIONS constant in constants.js
    - skin_type/special_needs/occasion booking fields
  patterns:
    - Tag button group single-select for skin type
    - Backward compatible notes → structured fields migration
key_files:
  created: []
  modified:
    - miniprogram/utils/constants.js
    - miniprogram/pages/booking/create.js
    - miniprogram/pages/booking/create.wxml
    - miniprogram/pages/booking/create.wxss
    - cloudfunctions/bookings/index.js
    - miniprogram/pages/admin/bookings/detail.js
    - miniprogram/pages/admin/bookings/detail.wxml
decisions:
  - D-05: Three independent fields replace notes textarea
  - D-06: Skin type options: dry/oily/combination/sensitive/unknown
  - D-07: Three fields flat-displayed, no extra steps
  - D-08: Admin detail shows structured fields as separate rows
  - D-09: New fields stored directly in booking document
metrics:
  duration: 3m
  completed: 2026-04-21
---

# Phase 6 Plan 03: Structured Booking Notes Summary

Replaced single notes textarea with 3 structured fields (skin_type, special_needs, occasion) for clearer client-to-artist communication.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add SKIN_TYPE_OPTIONS + update booking form + cloud function | 5834b32 | constants.js, create.js/wxml/wxss, bookings/index.js |
| 2 | Update admin booking detail display | 7878912 | detail.js, detail.wxml |

## Implementation Details

### Booking Create Form
- **肤质类型**: 5-option tag button group (single-select, toggle), stored as key (e.g., 'dry')
- **特殊需求**: textarea (max 200 chars), placeholder: "过敏史、皮肤问题等..."
- **场合说明**: textarea (max 200 chars), placeholder: "婚礼主题、活动类型等..."
- Original single `notes` textarea removed from both data and template

### Cloud Function
- `create` action now receives `skin_type`, `special_needs`, `occasion` instead of `notes`
- `sendNotify` updated: `booking.special_needs || booking.notes || '无'` — backward compatible with old data

### Admin Detail
- 3 independent rows: 肤质 (with key-to-label conversion), 特殊需求, 场合说明
- Old `notes` still shown for legacy bookings when `!booking.skin_type` condition met
- skin_type label conversion: `{ dry: '干性', oily: '油性', ... }` in detail.js

## Deviations from Plan

None — plan executed exactly as written.

## Backward Compatibility

| Scenario | Behavior |
|----------|----------|
| Old booking with `notes` field | Shows "留言" row (only when no `skin_type` field) |
| New booking with structured fields | Shows 肤质 + 特殊需求 + 场合说明 rows |
| Mixed old+new in list | Each booking renders based on its own fields |
