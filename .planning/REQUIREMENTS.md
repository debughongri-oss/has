# Requirements: 化妆师个人作品展示与预约小程序

**Defined:** 2026-04-17
**Core Value:** 客户看到作品后能直接预约化妆服务——从"看到好看的作品"到"我要预约"的路径最短

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can silently log in via WeChat (wx.login) and obtain unique identity (OpenID)
- [ ] **AUTH-02**: User can view makeup artist profile (name, avatar, bio, specialties, experience)

### Portfolio

- [ ] **PORT-01**: Artist can create portfolio items with multiple images and description
- [ ] **PORT-02**: Artist can edit own portfolio items
- [ ] **PORT-03**: Artist can delete own portfolio items
- [ ] **PORT-04**: User can browse portfolio items in a paginated image grid with lazy loading
- [ ] **PORT-05**: User can view portfolio item detail with multi-image carousel (long-press to save)
- [ ] **PORT-06**: User can filter portfolio items by category (bridal, daily, engagement, custom tags)
- [ ] **PORT-07**: User can view before/after comparison with interactive slider on portfolio detail

### Services

- [ ] **SERV-01**: Artist can create service items with name, duration estimate, price range, and description
- [ ] **SERV-02**: Artist can edit service items
- [ ] **SERV-03**: Artist can delete service items
- [ ] **SERV-04**: User can browse all service items in a card-style list

### Booking

- [ ] **BOOK-01**: User can select a service and submit a booking request with date and time
- [ ] **BOOK-02**: User can view artist's available time slots on a calendar before booking
- [ ] **BOOK-03**: User can attach a note/message when submitting a booking
- [ ] **BOOK-04**: Artist can review booking requests and accept, reject, or propose reschedule
- [ ] **BOOK-05**: Artist can add internal notes to bookings (visible only to artist)
- [ ] **BOOK-06**: User receives subscription message notification when booking status changes
- [ ] **BOOK-07**: Artist receives notification when new booking is submitted
- [ ] **BOOK-08**: User can view own booking history with status badges

### Management

- [ ] **MGMT-01**: Artist can access admin panel within mini program to manage portfolio, services, and bookings
- [ ] **MGMT-02**: User can share portfolio items to WeChat chat and Moments
- [ ] **MGMT-03**: Artist can generate a mini program QR code poster for marketing

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Notifications Enhancement

- **NOTF-01**: Artist can send custom reminder messages to users before appointment
- **NOTF-02**: User can set reminder preferences for upcoming appointments

### Portfolio Enhancement

- **PORT-V2-01**: User can view video content in portfolio items
- **PORT-V2-02**: Portfolio items auto-suggest linked service based on category

### Booking Enhancement

- **BOOK-V2-01**: Recurring booking support for regular clients
- **BOOK-V2-02**: Booking cancellation with reason tracking

## Out of Scope

| Feature | Reason |
|---------|--------|
| 在线支付 | PROJECT.md 明确排除，线下结算是独立化妆师惯例 |
| 多化妆师平台 | PROJECT.md 明确排除，仅做个人品牌 |
| 客户评价系统 | 单化妆师场景下口碑 > 匿名评价，v1 不需要 |
| 客户管理/CRM | 单化妆师管理 <200 客户，预约历史已足够 |
| AI试妆 | 技术不确定性高，复杂度远超 v1 范围 |
| 社交/社区功能 | 评论/点赞/动态属于平台功能，不是个人预约工具 |
| 直播功能 | 需要流媒体基础设施，不是预约工具的核心 |
| 地图/定位 | 化妆师服务范围固定，文字描述已足够 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| PORT-01 | — | Pending |
| PORT-02 | — | Pending |
| PORT-03 | — | Pending |
| PORT-04 | — | Pending |
| PORT-05 | — | Pending |
| PORT-06 | — | Pending |
| PORT-07 | — | Pending |
| SERV-01 | — | Pending |
| SERV-02 | — | Pending |
| SERV-03 | — | Pending |
| SERV-04 | — | Pending |
| BOOK-01 | — | Pending |
| BOOK-02 | — | Pending |
| BOOK-03 | — | Pending |
| BOOK-04 | — | Pending |
| BOOK-05 | — | Pending |
| BOOK-06 | — | Pending |
| BOOK-07 | — | Pending |
| BOOK-08 | — | Pending |
| MGMT-01 | — | Pending |
| MGMT-02 | — | Pending |
| MGMT-03 | — | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 0
- Unmapped: 24 ⚠️

---
*Requirements defined: 2026-04-17*
*Last updated: 2026-04-17 after initial definition*
