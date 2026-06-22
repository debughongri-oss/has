# Phase 9: Customer Review System - Discussion Log

**Date:** 2026-04-22
**Phase:** 09 - Customer Review System
**Status:** Context gathered, ready for planning

## Discussion Trace

### 1. Review Data Model: Separate Collection vs Embedded

**Question:** Should reviews be stored in a new `reviews` collection or embedded in the `bookings` documents?

**Analysis:**
- Cloud database (MongoDB-like) has no JOIN — embedding means every `myBookings` query carries review data
- Main query patterns for reviews: (1) list by time (homepage), (2) get stats (average + count), (3) check if booking reviewed — all benefit from a dedicated collection
- `myBookings` already returns booking cards with status info; adding review data increases document size for no benefit during list rendering
- Unique index on `booking_id` prevents duplicates at the database level

**Decision (D-01):** New `reviews` collection with `booking_id` unique index. Connected via `booking_id` reference, not embedded.

### 2. Content Security: msgSecCheck Integration

**Question:** How to handle WeChat审核 requirement for user-generated review text?

**Context from STATE.md:** "Review system: must integrate `security.msgSecCheck` for WeChat审核 in Phase 9" — this is flagged as a blocker.

**Analysis:**
- `cloud.openapi.security.msgSecCheck()` is built into wx-server-sdk 3.0.4 — no new dependency
- Must be called server-side (cloud function), not client-side
- API accepts: `content` (text), `openid` (user identifier), `scene` (2=comment), `version` (2)
- If `errCode === 87014`, content is flagged; if API call itself fails, should block submission for safety
- Pure rating without text should skip msgSecCheck (no text to check)

**Decision (D-08, D-09, D-10):** Server-side msgSecCheck in reviews cloud function `create` action. Block on failure. Skip for empty text.

### 3. Review Submission Flow & UI

**Question:** Where is the "去评价" entry point and what's the submission flow?

**Current state analysis:**
- `pages/profile/history.wxml` shows booking cards with status badge + cancel button (for pending)
- Completed bookings currently show only the status badge "已完成" — no action button
- Card structure has `card-action` section (line 17-19) used for cancel button

**Flow:**
```
History page → completed booking card → "去评价" button
  → navigateTo /pages/review/create?booking_id=xxx
  → Form: t-rate (1-5 stars) + textarea (200 chars)
  → Submit → reviews cloud function (validate + msgSecCheck + create)
  → navigateBack → history page refreshes → button changes to "已评价"
```

**Decision (D-04, D-05, D-06, D-07):** "去评价" button in history card-action area. New review form page. Submit returns to history.

### 4. Review Display on Artist Homepage

**Question:** How to display ratings and reviews on the public-facing homepage?

**Current homepage structure:**
1. Hero section (avatar, name, meta info, bio, tags)
2. Featured works (horizontal scroll)
3. Entries (browse works, services)
4. Action buttons (book, consult, wechat)

**Design:** Insert a "客户评价" module between hero and portfolio sections:
```
Hero section
  ↓
[客户评价] ⭐ 4.9 (23条评价)
  - "非常好，妆容很自然" — 小红 ⭐⭐⭐⭐⭐
  - "准时到达，很专业" — 小明 ⭐⭐⭐⭐
  - "推荐！化妆技术很棒" — 小芳 ⭐⭐⭐⭐⭐
  ↓
Featured works
```

**Decision (D-13, D-14, D-15, D-16):** Rating summary + recent 3 reviews between hero and portfolio. Conditional render (no reviews = no module).

### 5. Admin Review Management

**Question:** Where and how should the artist view all reviews?

**Options:**
- Option A: New page `pages/admin/reviews/list` with dedicated route
- Option B: Add reviews tab to existing admin bookings page
- Option C: Section on admin profile page

**Analysis:** Option A is cleanest — follows established pattern of dedicated admin pages (works/list, services/list, bookings/list). Reviews have different data shape from bookings, separate page keeps things simple.

**Entry point:** "评价管理" button on admin bookings list page, same style as existing "日历视图" entry.

**Decision (D-19, D-20, D-21):** New admin/reviews/list page. Simple time-ordered list. Entry from admin bookings list.

### 6. Duplicate Review Prevention Strategy

**Question:** How to ensure one review per booking?

**Layers of protection:**
1. **Database:** Unique index on `booking_id` field in `reviews` collection
2. **Server:** Before inserting, query `reviews` where `booking_id` = x — reject if found
3. **Client:** Load review status per booking (getByBooking), show/hide "去评价" button
4. **UI flow:** After submitting, navigateBack + refresh shows "已评价" state

**Decision (D-03, D-11, D-12):** Server double-check + client UI prevention + booking_id unique index.

### 7. Rating Calculation Approach

**Question:** How to calculate and display average rating?

**Options:**
- Option A: Real-time aggregation (read all reviews, compute average in JS)
- Option B: Cached stats in `artist_profile` document, updated on each review

**Analysis:** Single-artist personal app. Realistically < 100 reviews ever. Cloud database has no built-in avg() aggregation. In-memory calculation with `.limit(1000)` is trivial for this scale.

**Decision (D-17, D-18):** Real-time aggregation now. Cache optimization deferred.

### 8. Cloud Function Architecture

**Question:** New reviews cloud function or add actions to existing bookings?

**Decision (D-22):** New `reviews` cloud function. Cleaner separation — review logic includes msgSecCheck, unique constraint checking, stats aggregation. Different domain from booking management.

### 9. Additional Decisions

- **D-23:** msgSecCheck in reviews cloud function create action
- **D-24:** msgSecCheck failure = block submission (fail-safe)
- **D-25:** New services/reviews.js client-side wrapper
- **D-26, D-27:** Route config for review/create (main) and admin/reviews/list (sub)

## Summary of Locked Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D-01 | New `reviews` collection | Independent lifecycle, efficient pagination |
| D-02 | Review fields with denormalized user/service info | Avoid extra queries for display |
| D-03 | `booking_id` unique index | DB-level duplicate prevention |
| D-04 | "去评价" in history page card-action | Natural entry point after service completion |
| D-05 | New review form page `/pages/review/create` | Clean separation, deep-linkable |
| D-06 | t-rate + native textarea | t-rate installed; native textarea lighter than t-textarea |
| D-07 | navigateBack after submit | Return to refreshed history page |
| D-08 | Server-side msgSecCheck | WeChat审核 hard requirement |
| D-09 | Error message for flagged content | Clear user feedback |
| D-10 | Skip msgSecCheck for empty text | Pure rating is valid |
| D-11 | Server double-check (booking_id + status + openid) | Security in depth |
| D-12 | Client check via getByBooking | UX: show/hide review button |
| D-13 | Review module on homepage between hero and portfolio | High visibility for trust-building |
| D-14 | Rating display format "⭐ 4.9 (23条评价)" | Standard, trustworthy |
| D-15 | Conditional render (hide when 0 reviews) | Avoid empty state awkwardness |
| D-16 | Single getStats API (stats + recent reviews) | Reduce network requests |
| D-17 | Real-time aggregation for stats | Scale appropriate (< 1000 reviews) |
| D-18 | Cache optimization deferred | Not needed at current scale |
| D-19 | New admin/reviews/list page | Follows admin page pattern |
| D-20 | No filters/search on admin reviews | Unnecessary for single artist |
| D-21 | Entry from admin bookings list | Consistent with calendar entry pattern |
| D-22 | New `reviews` cloud function | Domain separation |
| D-23 | msgSecCheck in create action | Server-side content moderation |
| D-24 | Block on msgSecCheck failure | Fail-safe approach |
| D-25 | New services/reviews.js | Follows service module pattern |
| D-26 | review/create in main pages | Customer-facing page |
| D-27 | admin/reviews/list in subpackage | Admin page, keeps main package small |

## Estimated Files

**New Files (8):**
- `cloudfunctions/reviews/index.js` — Review CRUD cloud function
- `cloudfunctions/reviews/package.json` — Dependencies
- `cloudfunctions/reviews/config.json` — Config
- `miniprogram/services/reviews.js` — Client-side review service
- `miniprogram/pages/review/create.js` — Review form page
- `miniprogram/pages/review/create.wxml` — Review form template
- `miniprogram/pages/review/create.wxss` — Review form styles
- `miniprogram/pages/review/create.json` — Page config (register t-rate)
- `miniprogram/pages/admin/reviews/list.js` — Admin review list
- `miniprogram/pages/admin/reviews/list.wxml` — Admin review template
- `miniprogram/pages/admin/reviews/list.wxss` — Admin review styles
- `miniprogram/pages/admin/reviews/list.json` — Page config (register t-rate, t-empty, t-loading)

**Modified Files (7):**
- `miniprogram/app.json` — Add review/create to pages, admin/reviews/list to subPackages
- `miniprogram/pages/profile/history.js` — Add review status check, goReview method
- `miniprogram/pages/profile/history.wxml` — Add "去评价" button + "已评价" mark
- `miniprogram/pages/profile/history.wxss` — Style review button/mark
- `miniprogram/pages/profile/history.json` — Register t-rate
- `miniprogram/pages/index/index.js` — Add loadReviewStats, parallel with loadFeaturedWorks
- `miniprogram/pages/index/index.wxml` — Add review module section
- `miniprogram/pages/index/index.wxss` — Style review module
- `miniprogram/pages/index/index.json` — Register t-rate
- `miniprogram/pages/admin/bookings/list.wxml` — Add "评价管理" entry button
- `miniprogram/pages/admin/bookings/list.js` — Add goToReviews method
