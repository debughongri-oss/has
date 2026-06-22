# 化妆师个人作品展示与预约小程序 (GEMINI.md)

This document provides foundational context and instructions for the "Makeup Artist Booking" (化妆师个人作品展示与预约小程序) project.

## Project Overview

A WeChat Mini Program designed for independent makeup artists to showcase their portfolio, manage service offerings, and handle client bookings. It leverages the WeChat Mini Program native framework and WeChat CloudBase for a serverless backend.

- **Frontend:** WeChat Mini Program (WXML, WXSS, JS)
- **UI Library:** TDesign MiniProgram (`tdesign-miniprogram`)
- **Backend:** WeChat CloudBase (Cloud Functions, Cloud Database, Cloud Storage)
- **Architecture:** Centralized API layer with action-based cloud functions and a dedicated admin subpackage.

## Directory Structure

- `miniprogram/`: The main frontend application code.
- `cloudfunctions/`: Backend logic organized into functional modules (e.g., `bookings`, `works`).
- `.planning/`: Extensive project documentation following a GSD (Goal-State-Decision) framework.
- `components/`: Reusable WXML components.
- `services/`: Business logic and API abstraction layers.

## Key Development Conventions

### 1. Centralized API Layer
All interactions with cloud functions must go through `miniprogram/services/api.js`. This ensures consistent error handling, logging, and request/response formatting.

```javascript
// Example usage in a page
const api = require('../../services/api')
const result = await api.callCloudFunction('bookings', { action: 'list', status: 'pending' })
```

### 2. Action-Based Cloud Functions
Cloud functions are grouped by domain. A single function handles multiple operations via an `event.action` parameter.

```javascript
// cloudfunctions/bookings/index.js
exports.main = async (event, context) => {
  switch (event.action) {
    case 'create': // ...
    case 'list':   // ...
    // ...
  }
}
```

### 3. Global Constants and Enums
Configuration values, environment IDs, and common enumerations (like booking statuses) are managed in `miniprogram/utils/constants.js`. Always import from here rather than hardcoding.

### 4. Admin Subpackage
Management-specific pages are located in the `admin` subpackage (`pages/admin/`) to keep the main package size small and logically separate user-facing code from management tools.

### 5. Planning and Documentation
The project uses a structured planning approach in `.planning/`.
- `PROJECT.md`: High-level goals and requirements.
- `ROADMAP.md`: Milestones and phase-by-phase execution plan.
- `SUMMARY.md`: Technical stack and architectural decisions.

## Building and Running

1. **Prerequisites:**
   - [WeChat Developer Tools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) installed.
   - A WeChat Mini Program AppID.

2. **Setup:**
   - Run `npm install` in the `miniprogram/` directory.
   - In WeChat Developer Tools, click **Tools** -> **Build NPM** to compile `tdesign-miniprogram`.
   - Configure your CloudBase environment ID in `miniprogram/utils/constants.js`.

3. **Cloud Functions:**
   - Right-click folders in `cloudfunctions/` and select **Upload and Deploy** within the WeChat Developer Tools.

4. **Testing:**
   - Use the **Simulator** in WeChat Developer Tools for frontend testing.
   - Use the **Cloud Development** console to inspect database records and storage files.

## Tech Stack Specifics
- **Styling:** Prefers CSS Custom Properties for theme consistency.
- **Components:** Primarily uses `tdesign-miniprogram` components (e.g., `t-button`, `t-cell`, `t-image`).
- **Icons:** Uses TDesign built-in icons where possible.
