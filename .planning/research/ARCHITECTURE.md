# Architecture Patterns

**Domain:** WeChat Mini Program — Individual Makeup Artist Portfolio + Booking
**Researched:** 2026-04-17

## Recommended Architecture

WeChat Mini Programs follow a **two-layer runtime architecture**: a View Layer (WXML/WXSS rendering) and a Logic Layer (JavaScript), communicating through the WeChat framework's event/data binding system. This is fundamentally different from web browsers — there is no DOM access from the logic layer. Data flows unidirectionally via `setData()`.

For this project (single-artist portfolio + booking), the architecture is a **frontend-heavy Mini Program with a cloud backend** — no traditional server needed.

```
┌──────────────────────────────────────────────────────────────┐
│                     WeChat Mini Program                       │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Client-Facing │  │  Artist Admin  │  │  Shared Components  │ │
│  │    Pages        │  │    Pages       │  │                     │ │
│  │                 │  │                │  │  ┌───────────────┐  │ │
│  │  ┌───────────┐ │  │  ┌───────────┐ │  │  │ ImageGallery  │  │ │
│  │  │ Home      │ │  │  │ WorkMgr   │ │  │  │ ServiceCard   │  │ │
│  │  │ Portfolio │ │  │  │ SvcMgr    │ │  │  │ BookingCard   │  │ │
│  │  │ Service   │ │  │  │ BookingMgr│ │  │  │ DatePicker    │  │ │
│  │  │ Booking   │ │  │  │ Profile   │ │  │  │ TimeSlots     │  │ │
│  │  │ About     │ │  │  │           │ │  │  │ EmptyState    │  │ │
│  │  └───────────┘ │  │  └───────────┘ │  │  └───────────────┘  │ │
│  └────────┬────────┘  └──────┬────────┘  └──────────┬──────────┘ │
│           │                  │                       │            │
│           └──────────────────┼───────────────────────┘            │
│                              │                                    │
│                    ┌─────────▼──────────┐                        │
│                    │   API / SDK Layer   │                        │
│                    │  (Request Module)   │                        │
│                    └─────────┬──────────┘                        │
│                              │                                    │
└──────────────────────────────┼────────────────────────────────────┘
                               │ HTTPS / Cloud SDK
                               │
                    ┌──────────▼──────────┐
                    │   Cloud Backend      │
                    │                      │
                    │  ┌────────────────┐  │
                    │  │ Cloud Functions │  │
                    │  │ (API handlers)  │  │
                    │  └───────┬────────┘  │
                    │          │            │
                    │  ┌───────▼────────┐  │
                    │  │ Cloud Database  │  │
                    │  │ (collections)   │  │
                    │  └────────────────┘  │
                    │                      │
                    │  ┌────────────────┐  │
                    │  │ Cloud Storage   │  │
                    │  │ (images/files)  │  │
                    │  └────────────────┘  │
                    └──────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  WeChat Platform     │
                    │  - Login (wx.login)  │
                    │  - Subscribe Msg     │
                    │  - Image APIs        │
                    └─────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Client Pages** | Display portfolio, services, booking form to customers | API Layer, Shared Components |
| **Admin Pages** | Artist manages works, services, bookings, profile | API Layer, Shared Components |
| **Shared Components** | Reusable UI: image gallery, date picker, cards | Consumed by both page groups |
| **API Layer** | Centralized request handling, auth token management, error handling | All Pages → Cloud Backend |
| **Cloud Functions** | Business logic: CRUD for works/services/bookings, auth, notification dispatch | Cloud Database, Cloud Storage, WeChat APIs |
| **Cloud Database** | Persistent data storage (collections: users, works, services, bookings) | Cloud Functions |
| **Cloud Storage** | Portfolio images, artist avatar | Cloud Functions, directly from mini program |
| **WeChat Platform** | User identity (openid), subscription messages, image picking | Mini Program (client APIs), Cloud Functions (server APIs) |

### Page Map

```
TabBar (bottom navigation)
├── 首页/Home (pages/index/index)         ← Client: artist intro + featured works
├── 作品/Portfolio (pages/works/list)     ← Client: all works with category filter
├── 服务/Services (pages/services/list)   ← Client: service catalog
├── 预约/Booking (pages/booking/create)   ← Client: create new booking
└── 我的/Profile (pages/profile/index)    ← Dual: client orders OR artist admin

Non-TabBar Pages (navigateTo)
├── pages/works/detail       ← Work detail with full image gallery
├── pages/booking/result     ← Booking submission result
├── pages/admin/works        ← Artist: manage works (CRUD)
├── pages/admin/services     ← Artist: manage services (CRUD)
├── pages/admin/bookings     ← Artist: manage bookings (accept/reject/reschedule)
└── pages/admin/profile      ← Artist: edit personal profile
```

### Data Flow

```
=== Portfolio Browsing Flow ===
Client taps "作品" tab
  → Page onLoad fires
  → API Layer: request works list (with category filter)
  → Cloud Function: query works collection, get image URLs from cloud storage
  → Return: work items with signed image URLs
  → Page setData: render work grid
  → Client taps a work
  → navigateTo work detail page (pass workId)
  → Page loads work detail + full image list
  → wx.previewImage() for full-screen swipe gallery

=== Booking Flow ===
Client selects a service
  → Navigate to booking form
  → API Layer: fetch service detail + available time slots
  → Cloud Function: check bookings collection for conflicts on selected date
  → Return: available time slots
  → Client fills form (name, phone, date, time, notes)
  → API Layer: submit booking
  → Cloud Function: create booking record (status: pending)
  → Cloud Function: trigger WeChat subscription message to artist
  → Return: booking confirmation
  → Client sees result page

=== Artist Booking Management Flow ===
Artist opens "我的" → switches to admin mode (role detection by openid)
  → Navigate to booking management
  → API Layer: fetch pending bookings
  → Cloud Function: query bookings where status = pending, ordered by date
  → Artist taps "accept" or "reject"
  → API Layer: update booking status
  → Cloud Function: update booking, trigger notification to client
  → Return: updated booking

=== Portfolio Upload Flow ===
Artist taps "上传作品"
  → wx.chooseMedia() to select images
  → wx.compressImage() for each selected image
  → Upload each to Cloud Storage via cloud SDK
  → Get back fileIDs (cloud storage paths)
  → API Layer: save work record with fileIDs
  → Cloud Function: create work document in collection
  → Return: success, navigate back to works list
```

### Data Model

```
┌─────────────────────────────────────────────────┐
│                  Cloud Database                   │
│                                                   │
│  artist_profile (single doc)                      │
│  ├── name: string                                 │
│  ├── avatar: string (cloud storage fileID)        │
│  ├── bio: string                                  │
│  ├── experience: string                           │
│  ├── specialties: string[]                        │
│  ├── contact_info: { wechat, phone, location }    │
│  └── updated_at: date                             │
│                                                   │
│  works (collection)                               │
│  ├── _id: auto                                    │
│  ├── title: string                                │
│  ├── category: string (日常妆|新娘妆|订婚妆|...)   │
│  ├── images: string[] (cloud storage fileIDs)     │
│  ├── description: string                          │
│  ├── is_featured: boolean                         │
│  ├── sort_order: number                           │
│  ├── created_at: date                             │
│  └── updated_at: date                             │
│                                                   │
│  services (collection)                            │
│  ├── _id: auto                                    │
│  ├── name: string                                 │
│  ├── description: string                          │
│  ├── price: number | string (e.g., "面议")        │
│  ├── duration: number (minutes)                   │
│  ├── category: string                             │
│  ├── is_active: boolean                           │
│  ├── sort_order: number                           │
│  └── created_at: date                             │
│                                                   │
│  bookings (collection)                            │
│  ├── _id: auto                                    │
│  ├── user_openid: string                          │
│  ├── user_info: { name, phone }                   │
│  ├── service_id: string (ref services)            │
│  ├── service_name: string (denormalized)           │
│  ├── booking_date: string (YYYY-MM-DD)            │
│  ├── booking_time: string (HH:mm)                 │
│  ├── notes: string                                │
│  ├── status: string (pending|accepted|rejected|    │
│  │                completed|cancelled)             │
│  ├── reject_reason: string (optional)             │
│  ├── created_at: date                             │
│  └── updated_at: date                             │
│                                                   │
│  users (collection)                               │
│  ├── _openid: string (auto from cloud)            │
│  ├── nickname: string                             │
│  ├── avatar_url: string                           │
│  ├── phone: string (optional)                     │
│  ├── role: string (client|artist)                 │
│  └── created_at: date                             │
└─────────────────────────────────────────────────┘
```

## Recommended Project Structure

Using **Taro (React)** for cross-platform DX with native WeChat compilation:

```
src/
├── app.config.ts          # Global config: pages, tabBar, window
├── app.ts                 # App entry: global state, onLaunch
├── app.scss               # Global styles
│
├── pages/                 # Route pages (registered in app.config)
│   ├── index/             # Home page
│   │   ├── index.tsx
│   │   ├── index.config.ts
│   │   └── index.scss
│   ├── works/             # Portfolio pages
│   │   ├── list/          # Work list (tabBar page)
│   │   └── detail/        # Work detail
│   ├── services/          # Service catalog (tabBar page)
│   ├── booking/           # Booking pages
│   │   ├── create/        # Create booking (tabBar page)
│   │   └── result/        # Booking result
│   ├── profile/           # Profile/My page (tabBar page)
│   └── admin/             # Artist admin pages
│       ├── works/         # Manage works
│       ├── services/      # Manage services
│       ├── bookings/      # Manage bookings
│       └── profile/       # Edit artist profile
│
├── components/            # Shared components
│   ├── WorkCard/          # Portfolio item card
│   ├── ServiceCard/       # Service item card
│   ├── BookingCard/       # Booking summary card
│   ├── ImageGallery/      # Swipeable image gallery
│   ├── DatePicker/        # Date selection
│   ├── TimeSlots/         # Time slot grid
│   ├── EmptyState/        # Empty state placeholder
│   ├── CategoryFilter/    # Horizontal category tabs
│   └── UploadImage/       # Image upload component
│
├── services/              # API & business logic layer
│   ├── api.ts             # Centralized API client
│   ├── auth.ts            # WeChat login, role detection
│   ├── works.ts           # Work CRUD operations
│   ├── services.ts        # Service CRUD operations
│   ├── bookings.ts        # Booking CRUD + status management
│   ├── storage.ts         # Cloud storage upload helpers
│   └── notification.ts    # Subscribe message helpers
│
├── store/                 # Global state management
│   ├── index.ts           # Store setup
│   ├── artistStore.ts     # Artist profile state
│   └── userStore.ts       # Current user state + role
│
├── utils/                 # Utilities
│   ├── format.ts          # Date, price formatters
│   ├── validate.ts        # Form validation
│   └── constants.ts       # App constants, enums
│
└── styles/                # Shared styles
    ├── variables.scss     # Colors, spacing, typography
    ├── mixins.scss        # Reusable style patterns
    └── reset.scss         # Base style reset
```

## Patterns to Follow

### Pattern 1: Centralized API Layer
**What:** All backend calls go through a single `services/api.ts` module, not scattered `wx.request()` calls in pages.
**When:** Always — this is non-negotiable for maintainability.
**Why:** Cloud function invocation patterns, error handling, auth token injection, and loading states all belong in one place.
**Example:**
```typescript
// services/api.ts
import Taro from '@tarojs/taro'

const callCloudFunction = async <T>(name: string, data?: Record<string, unknown>): Promise<T> => {
  try {
    const res = await Taro.cloud.callFunction({ name, data })
    return res.result as T
  } catch (error) {
    console.error(`Cloud function ${name} failed:`, error)
    Taro.showToast({ title: '请求失败，请重试', icon: 'none' })
    throw error
  }
}

export const worksApi = {
  list: (category?: string) => callCloudFunction('works', { action: 'list', category }),
  detail: (id: string) => callCloudFunction('works', { action: 'detail', id }),
  create: (data: WorkCreateInput) => callCloudFunction('works', { action: 'create', data }),
  update: (id: string, data: Partial<WorkCreateInput>) => callCloudFunction('works', { action: 'update', id, data }),
  delete: (id: string) => callCloudFunction('works', { action: 'delete', id }),
}
```

### Pattern 2: Role-Based View Switching
**What:** The "我的" (Profile) page detects if the current user is the artist (by comparing openid) and shows admin controls accordingly. No separate login for the artist.
**When:** Profile page rendering, admin page entry.
**Example:**
```typescript
// Detect artist role on app launch
const ARTIST_OPENID = 'artist_openid_stored_in_config'

Taro.getCloudEnv() // or check context in cloud function
const currentUser = await Taro.cloud.callFunction({ name: 'auth', data: { action: 'getOpenId' } })
const isArtist = currentUser.openid === ARTIST_OPENID
```

### Pattern 3: Optimistic Image Loading
**What:** Portfolio images use `mode="aspectFill"` for grid thumbnails and lazy loading. Full gallery uses `wx.previewImage()` for native swipe experience.
**When:** Any image-heavy list or gallery.
**Example:**
```tsx
// Grid thumbnail — lazy load, crop fill
<Image src={work.images[0]} mode="aspectFill" lazyLoad />

// Detail page — native full-screen gallery
const previewImages = (urls: string[], current: number) => {
  Taro.previewImage({ urls, current: urls[current] })
}
```

### Pattern 4: Cloud Storage for Portfolio Images
**What:** Use cloud storage (not cloud database) for image files. Store `fileID` references in the database. Cloud storage generates CDN-backed URLs automatically.
**When:** Any image upload (portfolio, avatar).
**Example:**
```typescript
// Upload to cloud storage
const uploadWorkImages = async (filePath: string) => {
  const res = await Taro.cloud.uploadFile({
    cloudPath: `works/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
    filePath,
  })
  return res.fileID // Store this in database
}
```

### Pattern 5: Subscription Message for Notifications
**What:** Use WeChat's subscription message API for booking notifications. User subscribes on booking page, backend sends via cloud function.
**When:** Booking confirmation, status changes.
**Example:**
```typescript
// Client: request subscription permission
Taro.requestSubscribeMessage({
  tmplIds: ['booking_confirm_template_id'],
  success: (res) => {
    if (res['booking_confirm_template_id'] === 'accept') {
      // User agreed, backend can send notifications
    }
  }
})

// Cloud Function: send notification
const cloud = require('wx-server-sdk')
cloud.init()
exports.main = async (event) => {
  return cloud.openapi.subscribeMessage.send({
    touser: event.openid,
    templateId: 'booking_confirm_template_id',
    page: `pages/booking/result?id=${event.bookingId}`,
    data: {
      thing1: { value: event.serviceName },
      date2: { value: event.bookingDate },
      thing3: { value: event.status === 'accepted' ? '已接受' : '已拒绝' },
    }
  })
}
```

### Pattern 6: Denormalized Read Data
**What:** Store `service_name` directly in booking records rather than joining. Single-artist app means data volume is low — optimize for read speed.
**When:** Booking creation, display.
**Why:** Cloud database doesn't support joins. Read-heavy patterns (browsing bookings) benefit from denormalization.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Putting Business Logic in Pages
**What:** Calling cloud functions directly from page components with inline logic.
**Why bad:** Pages become unmaintainable, logic can't be reused, testing is impossible.
**Instead:** All backend communication goes through `services/` modules. Pages call service functions, services call cloud functions.

### Anti-Pattern 2: Storing Images in Database
**What:** Encoding images as base64 and storing in database documents.
**Why bad:** Cloud database document size limit is 16MB, read performance degrades, no CDN caching.
**Instead:** Upload to Cloud Storage, store only the `fileID` string in the database.

### Anti-Pattern 3: Mixing Admin and Client State
**What:** One giant state store that holds both artist admin data and client browsing data.
**Why bad:** State conflicts, unnecessary re-renders, confusing data ownership.
**Instead:** Separate stores for artist state and user state. Role detection at the page level decides which to use.

### Anti-Pattern 4: Over-Engineering Auth
**What:** Building a custom login form with username/password.
**Why bad:** WeChat provides `wx.login()` with OpenID. Users expect WeChat login. Adding custom auth is unnecessary friction.
**Instead:** Use WeChat silent login (`wx.login()`) for identity. Compare OpenID with stored artist OpenID for role detection. No separate auth system needed.

### Anti-Pattern 5: Ignoring 2MB Main Package Size Limit
**What:** Putting all pages and assets in the main package.
**Why bad:** WeChat enforces a 2MB limit on the main package. Exceeding it blocks deployment.
**Instead:** Keep the main package lean (tabBar pages + core components only). Use sub-packages (分包) for admin pages if needed. Compress images before upload. Use lazy loading.

## Component Dependency Graph & Build Order

```
Phase 1: Foundation (no dependencies)
├── App shell + tabBar configuration
├── Cloud backend setup (database collections, storage)
├── API layer scaffold (services/api.ts)
├── Auth service (WeChat login + role detection)
└── Shared styles (variables, mixins)

Phase 2: Core Display (depends on Phase 1)
├── Artist profile data model + cloud function
├── Home page (artist intro)
├── Shared components: WorkCard, ServiceCard
├── Works list page + category filter
├── Works detail page + ImageGallery component
└── Service list page

Phase 3: Booking System (depends on Phase 2)
├── Booking data model + cloud functions
├── Shared components: DatePicker, TimeSlots, BookingCard
├── Booking creation page (select service → pick date → confirm)
├── Booking result page
└── Booking conflict checking (date/time availability)

Phase 4: Artist Admin (depends on Phase 2, Phase 3)
├── Admin routing + role guard
├── Work management (upload/edit/delete + image upload)
├── Service management (CRUD)
├── Booking management (accept/reject/reschedule)
├── Profile editing
└── Image upload component (UploadImage)

Phase 5: Notifications & Polish (depends on Phase 3, Phase 4)
├── Subscribe message template setup
├── Notification triggers in cloud functions
├── Share configuration (onShareAppMessage per page)
├── Empty states + loading states
└── Error handling + retry logic
```

**Key dependency chain:**
- Booking pages require Services to exist (user selects a service to book)
- Admin work management requires Cloud Storage setup
- Notifications require Booking system to be functional
- Role detection requires Auth service

## Scalability Considerations

| Concern | At 1 artist, 100 clients | At 1 artist, 1K clients | At 1 artist, 10K clients |
|---------|--------------------------|-------------------------|--------------------------|
| Database reads | Trivial — single artist, light traffic | Fine — add pagination to works list | May need client-side caching of service list |
| Image storage | Cloud storage handles well | Ensure image compression before upload | Consider CDN cache headers, image CDN transforms |
| Concurrent bookings | Low — single day conflict check is fast | Add date-indexed queries | Time slot availability caching per date |
| Cloud function invocations | Well within free tier | Monitor quota, batch operations | May need to combine cloud function calls |
| Package size | Main package only is fine | Consider sub-package for admin pages | Sub-packages mandatory for admin section |

**Important:** This is a single-artist app. Scalability concerns are minimal. The architecture should prioritize simplicity and developer experience over premature optimization.

## WeChat Platform Constraints That Shape Architecture

| Constraint | Impact on Architecture |
|------------|----------------------|
| **2MB main package limit** | Keep admin pages lean; use sub-packages if needed |
| **HTTPS-only network requests** | Cloud functions bypass this (cloud SDK uses private protocol) |
| **Domain whitelisting required** | Cloud development bypasses domain config entirely |
| **No DOM access from logic layer** | All UI manipulation via `setData()` — use framework (Taro) for abstraction |
| **10 concurrent request limit** | Batch image uploads sequentially, not in parallel |
| **Subscription messages require user opt-in** | Must call `requestSubscribeMessage` at appropriate UX moments |
| **Background execution limited to 5s** | No background sync — all operations complete in foreground |
| **Cloud database: No joins** | Denormalize read-heavy data (service_name in bookings) |
| **Cloud storage: fileID-based** | All image references use fileID, not URL; SDK handles URL resolution |

## Sources

- WeChat Mini Program official docs: https://developers.weixin.qq.com/miniprogram/dev/framework/ (HIGH confidence)
- WeChat Cloud Development CLI: Context7 `/weixincloud/wxcloud` (HIGH confidence)
- Taro framework docs: Context7 `/nervjs/taro-docs` (HIGH confidence)
- TDesign Mini Program components: Context7 `/tencent/tdesign-miniprogram` (HIGH confidence)
- WeChat subscription message guide: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html (HIGH confidence)
- WeChat network constraints: https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html (HIGH confidence)
- uni-app project structure: Context7 `/dcloudio/uni-app` (MEDIUM confidence — used for comparison, not recommendation)
