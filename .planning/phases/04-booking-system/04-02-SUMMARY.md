---
phase: 04-booking-system
plan: 02
subsystem: booking-management
tags: [admin, booking, history, status-management, navigation]
dependency_graph:
  requires: [04-01]
  provides: [admin-booking-list, admin-booking-detail, user-booking-history, profile-navigation]
  affects: [app.json, profile/index]
tech_stack:
  added: []
  patterns: [status-filter-tabs, artist-notes, reject-dialog, pagination, pull-refresh]
key_files:
  created:
    - miniprogram/pages/admin/bookings/list.js
    - miniprogram/pages/admin/bookings/list.json
    - miniprogram/pages/admin/bookings/list.wxml
    - miniprogram/pages/admin/bookings/list.wxss
    - miniprogram/pages/admin/bookings/detail.js
    - miniprogram/pages/admin/bookings/detail.json
    - miniprogram/pages/admin/bookings/detail.wxml
    - miniprogram/pages/admin/bookings/detail.wxss
    - miniprogram/pages/profile/history.js
    - miniprogram/pages/profile/history.json
    - miniprogram/pages/profile/history.wxml
    - miniprogram/pages/profile/history.wxss
  modified:
    - miniprogram/app.json
    - miniprogram/pages/profile/index.js
decisions:
  - History page uses enablePullDownRefresh in JSON config for native pull-down refresh
  - Admin list uses custom scroll-view tabs instead of TDesign tabs for lighter weight
  - Detail page reloads after status change to ensure data consistency
metrics:
  duration: 245s
  completed: 2026-04-17
  tasks: 2
  files: 14
---

# Phase 4 Plan 02: Admin Booking Management & User History Summary

Admin booking management pages (list with status filters + detail with accept/reject/notes/complete) and user booking history page with cancel support, pagination, and pull-down refresh.

## Files Created

### Admin Booking List (pages/admin/bookings/list)
- **list.json**: TDesign components (loading, empty, tabs), nav title "预约管理"
- **list.wxml**: Loading state → status filter tabs with pending count badge → booking cards with service/date/user/notes/status → empty state
- **list.js**: Artist auth guard, loadBookings with status filter, onShow refresh, pending count tracking, navigation to detail
- **list.wxss**: Sticky filter tabs with pill-style active state, badge for pending count, card layout

### Admin Booking Detail (pages/admin/bookings/detail)
- **detail.json**: TDesign loading + dialog components, nav title "预约详情"
- **detail.wxml**: Loading → colored status bar → info card (service/date/time/customer/notes) → artist internal notes textarea → reject reason display → action buttons (accept/reject for pending, complete for accepted) → reject dialog with reason input
- **detail.js**: Artist auth guard, loadDetail, saveNotes, onAccept, onReject with dialog, onRejectConfirm with reason, onComplete
- **detail.wxss**: Status bar with dynamic color, fixed bottom action area with safe-area padding, info card rows, notes textarea

### User Booking History (pages/profile/history)
- **history.json**: TDesign loading + empty, nav title "预约记录", enablePullDownRefresh: true
- **history.wxml**: Loading → booking cards with status badge, notes, reject reason, cancel link for pending → empty state → "no more" footer
- **history.js**: loadBookings with pagination (page/10), onPullDownRefresh reset, onReachBottom load more, cancelBooking with confirmation modal
- **history.wxss**: Card layout with status badge pill, cancel link underline, no-more footer

## Files Modified

### miniprogram/app.json
- Added `pages/profile/history` to pages array (line 9)
- Added `bookings/list` and `bookings/detail` to admin subPackage pages (lines 64-65)

### miniprogram/pages/profile/index.js
- `goToAdminBookings`: Changed from toast to `wx.navigateTo({ url: '/pages/admin/bookings/list' })`
- `goToBookingHistory`: Changed from toast to `wx.navigateTo({ url: '/pages/profile/history' })`

## Acceptance Criteria Met

- [x] Admin bookings list verifies artist identity (isArtist check in onLoad)
- [x] List shows status filter tabs with pending count badge
- [x] Each booking card shows service, date, time, user, notes, status
- [x] Detail page shows full booking info with colored status bar
- [x] Detail page has accept/reject buttons for pending bookings
- [x] Detail page has "标记完成" for accepted bookings
- [x] Reject shows dialog with reason input
- [x] Artist can save internal notes
- [x] Admin pages registered in app.json subPackages
- [x] History page loads user's bookings via getMyBookings
- [x] Each booking shows service, date, time, status badge
- [x] Pending bookings show "取消预约" link
- [x] Cancel shows confirmation dialog
- [x] Reject reason displayed if booking was rejected
- [x] Pagination via onReachBottom
- [x] Pull-down refresh supported
- [x] Profile page navigates to history page
- [x] History route in app.json

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- All 12 new files exist on disk
- app.json contains "bookings/list", "bookings/detail", and "profile/history"
- profile/index.js contains "admin/bookings/list" and "profile/history" navigation
- Verification command: PASS
