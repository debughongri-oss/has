---
phase: 06-data-model-extensions-quick-wins
plan: "01"
subsystem: security
tags: [auth, middleware, cloud-functions, whitelist]
dependency_graph:
  requires: []
  provides: [shared/auth.js, isArtist verification, profile whitelist]
  affects: [profile, works, services, bookings]
tech_stack:
  added:
    - cloudfunctions/shared/auth.js (new shared module)
  patterns:
    - requireArtist() guard pattern for cloud functions
    - sanitizeProfileUpdate() whitelist filtering
key_files:
  created:
    - cloudfunctions/shared/auth.js
  modified:
    - cloudfunctions/profile/index.js
    - cloudfunctions/works/index.js
    - cloudfunctions/services/index.js
    - cloudfunctions/bookings/index.js
decisions:
  - D-10: Hardcoded ARTIST_OPENID comparison for isArtist
  - D-11: Extracted shared/auth.js common verification module
  - D-12: Only write operations protected, reads stay public
  - D-13: Profile update field whitelist (8 fields)
  - D-14: Auth guards on works/services/profile/bookings write actions
metrics:
  duration: 3m
  completed: 2026-04-21
---

# Phase 6 Plan 01: Security Auth Middleware Summary

JWT-less isArtist verification via shared/auth.js + whitelist filtering for profile updates across 4 cloud functions.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create shared/auth.js verification module | 11fb31f | cloudfunctions/shared/auth.js |
| 2 | Add auth guards to 4 cloud functions | c73cfca | profile, works, services, bookings/index.js |

## Implementation Details

### shared/auth.js
- `requireArtist(wxContext)`: Compares `wxContext.OPENID` against hardcoded `ARTIST_OPENID`, returns `{ ok: true }` or `{ ok: false, response: { errCode: -1, errMsg: '无权限操作' } }`
- `sanitizeProfileUpdate(data)`: Filters input to only keep 8 allowed fields: name, bio, experience, experience_years, service_area, specialties, avatar, contact_info

### Cloud Function Guards
- **profile**: `update` + `init` protected; `update` also uses `sanitizeProfileUpdate` before writing
- **works**: `create`, `update`, `delete` protected; `list`, `detail` public
- **services**: `create`, `update`, `delete` protected; `list`, `listAll`, `detail` public; added `wxContext` variable
- **bookings**: `updateStatus` protected; `create`, `list`, `myBookings`, `detail`, `getAvailableSlots`, `cancel` public

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigation

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-06-01: Spoofing on write actions | requireArtist checks server-side OPENID | Implemented |
| T-06-02: Tampering profile update | sanitizeProfileUpdate whitelist | Implemented |
| T-06-03: Info disclosure on reads | Accepted — data is public by design | N/A |
| T-06-04: Elevation of privilege | Non-artist write blocked with errCode: -1 | Implemented |
