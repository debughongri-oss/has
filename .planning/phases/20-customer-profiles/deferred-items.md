# Phase 20 Deferred Items

Out-of-scope discoveries logged during execution. Not fixed (per scope boundary rule), tracked for future handling.

## 1. Missing `deploy:customers` npm script alias

- **Discovered during:** Plan 20-01, Task 1 (investigating deploy mechanism)
- **What:** Root `package.json` has npm aliases for all existing cloud functions (`deploy:works`, `deploy:login`, `deploy:profile`, `deploy:services`, `deploy:bookings`, `deploy:reviews`, `deploy:reminder`) but not for the new `customers` function.
- **Why deferred:** `scripts/deploy-cloudfunction.js` auto-discovers cloud functions by scanning `cloudfunctions/*/index.js` (line 43-49), so `node scripts/deploy-cloudfunction.js customers` already works without an alias. Adding the alias would modify root `package.json`, which is outside plan 20-01's `files_modified` scope, for marginal convenience only.
- **Suggested fix:** Add `"deploy:customers": "node scripts/deploy-cloudfunction.js customers"` to root `package.json` scripts (one-line change, follows existing convention).
- **Impact:** None functional. Developer convenience only.
