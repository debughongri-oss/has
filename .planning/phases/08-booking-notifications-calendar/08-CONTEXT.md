# Phase 8: Booking Notifications & Calendar - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

预约状态变更实时推送微信订阅消息通知（接受/拒绝/完成）+ 预约前一天提醒通知 + 化妆师管理后台日历视图管理预约日程 + 客户预约时剩余可用时段提示 + 紧凑日程警告。

不包含：评价系统（Phase 9）、海报生成（Phase 10）、时长感知的冲突检测（BOOK-17，v2）。

</domain>

<decisions>
## Implementation Decisions

### 订阅消息通知系统 (BOOK-06)

- **D-01:** 复用现有 `sendNotify()` 函数的模式和 `SUBSCRIBE_TEMPLATE_ID`，不新增模板。现有模板已包含服务名称、预约时间、状态变更等字段，完全覆盖 BOOK-06 需求（接受/拒绝/完成时通知客户）
- **D-02:** 客户端 `wx.requestSubscribeMessage()` 调用时机保持不变 — 在预约提交成功后触发（`booking/create.js:141`），让客户订阅状态变更通知
- **D-03:** 订阅消息发送失败（用户未订阅/拒绝/超过限额）时静默失败，不影响核心业务流程（现有 `sendNotify` 已用 try-catch 处理）
- **D-04:** 服务端发送逻辑已有：`updateStatus` action 中 `['accepted', 'rejected', 'completed'].includes(status)` 时调用 `sendNotify()` — **无需修改服务端通知逻辑**

### 预约前一天提醒 (BOOK-07)

- **D-05:** 使用微信云开发的**定时触发器**（云函数定时触发）实现预约前一天提醒，不使用客户端定时器或轮询
- **D-06:** 新建独立云函数 `booking-reminder`（非在 bookings 中添加 action），职责单一：每天固定时间扫描明天的已确认预约，发送提醒消息
- **D-07:** 定时触发时间设为每天 **20:00**（晚上8点提醒明天的预约，符合生活节奏）
- **D-08:** 提醒使用**现有模板** `SUBSCRIBE_TEMPLATE_ID`，status 设为 `预约提醒`（phrase5 字段）。不新增第二个模板，减少用户订阅弹窗次数
- **D-09:** 只提醒 `status === 'accepted'` 的预约（已确认但未完成），跳过 pending/rejected/cancelled/completed
- **D-10:** 提醒触发前客户需要已订阅该模板。如果用户未订阅，消息发送失败被 try-catch 吞掉，不影响其他用户的提醒

### 日历视图 (BOOK-13, BOOK-14)

- **D-11:** 新建管理端日历页面 `pages/admin/bookings/calendar`，使用 TDesign `t-calendar` 组件（已安装，72KB）
- **D-12:** 日历页面使用 `usePopup: false`（内嵌模式，非弹窗）+ `switchMode: "month"`（按月翻页）+ `readonly: true`（只读选择，不可选范围）+ `type: "single"`（单选日期）
- **D-13:** 在 `bookings` 云函数中新增 `getCalendarData` action，按月查询预约数据并按日期分组返回，减少客户端计算
- **D-14:** 日历上有预约的日期显示圆点标记 — 使用 `t-calendar` 的 `format` 属性，给有预约的日期设置 `suffix: { text: '•' }`
- **D-15:** 点击日期后，日历下方显示当天预约列表（按 `booking_time` 排序），列表复用现有 `bookings/list.wxml` 的 card 样式
- **D-16:** 从管理端预约列表页（`admin/bookings/list`）添加"日历视图"入口按钮，点击跳转到日历页面（使用 `wx.navigateTo`）
- **D-17:** 日历页面导航栏标题设为"预约日历"

### 剩余可用时段提示 (BOOK-15)

- **D-18:** 在客户预约创建页（`booking/create`）选择日期后，时段列表上方显示提示文字：`"剩余 X 个可用时段"`，X 为 `data.available.length`
- **D-19:** 当所有时段已满（available === 0）时，显示"该日期已约满，请选择其他日期"，且时段 grid 全部显示为灰色不可选状态
- **D-20:** 数据来源复用现有 `getAvailableSlots` action 的返回值（`data.available` 数组长度），无需新增接口

### 紧凑日程警告 (BOOK-16)

- **D-21:** 紧凑日程警告在日历页面的日期预约列表中展示。当某天的预约数量 ≥ 3 时，在当天预约列表上方显示橙色警告条："⚠️ 紧凑日程：今日 X 个预约"
- **D-22:** 紧凑日程的阈值硬编码为 3（`BUSY_DAY_THRESHOLD = 3`），不做成可配置的
- **D-23:** 警告也在日历日期标记中体现：有 3+ 预约的日期使用不同的 `suffix` 样式（橙色 • 普通日期用灰色 •）

### 包体积管理

- **D-24:** TDesign Calendar 组件 72KB，放入 admin 子包不影响主包体积。当前 admin 子包已有 7 个页面，加一个日历页完全在微信子包 2MB 限制内
- **D-25:** `booking-reminder` 云函数是独立函数，不影响小程序包体积

### Agent's Discretion

- `booking-reminder` 云函数的具体代码组织（是否提取公共 `sendNotify` 模块）
- 日历页面预约列表卡片的具体样式细节（间距、字体、颜色）
- "剩余可用时段"提示文字的具体样式和位置
- 紧凑日程警告条的具体样式（圆角、背景色、图标）
- 日历页面的空状态文案（选中无预约日期时的提示）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` §Booking — BOOK-06/07/13/14/15/16

### 现有代码（必须读取以理解当前实现）
- `cloudfunctions/bookings/index.js` — 现有预约云函数（sendNotify、getAvailableSlots、create、updateStatus 等 actions）
- `cloudfunctions/shared/auth.js` — 服务端 isArtist 验证模块
- `miniprogram/services/bookings.js` — 客户端预约服务接口
- `miniprogram/pages/booking/create.js` — 当前预约创建页（requestSubscribeMessage 调用位置）
- `miniprogram/pages/booking/create.wxml` — 当前预约表单布局（时段 grid 结构）
- `miniprogram/pages/booking/create.wxss` — 当前预约表单样式
- `miniprogram/pages/admin/bookings/list.js` — 管理端预约列表页逻辑
- `miniprogram/pages/admin/bookings/list.wxml` — 管理端预约列表模板（card 样式参考）
- `miniprogram/pages/admin/bookings/list.wxss` — 管理端预约列表样式（seg、card、badge 样式参考）
- `miniprogram/utils/constants.js` — SUBSCRIBE_TEMPLATE_ID、ARTIST_OPENID 等常量
- `miniprogram/app.json` — 页面路由和子包配置（需新增 calendar 页面路由）
- `miniprogram/app.wxss` — 全局样式变量（颜色、间距、圆角）
- `miniprogram/miniprogram_npm/tdesign-miniprogram/calendar/type.d.ts` — TDesign Calendar 类型定义（props 和 events）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `cloudfunctions/bookings/index.js:18-35` — `sendNotify()` 函数已完整实现订阅消息发送，可复用其模式
- `cloudfunctions/bookings/index.js:42-58` — `getAvailableSlots` action 已返回 `{ available: [], all: [] }`，BOOK-15 只需客户端展示 available.length
- `cloudfunctions/shared/auth.js` — `requireArtist()` 已在 Phase 6 实现，定时触发器中不需要（定时触发器无用户上下文，直接查数据库）
- `miniprogram/pages/admin/bookings/list.wxss` — card、badge、seg 等样式可复用于日历页面的预约列表

### Established Patterns
- 云函数 action-dispatcher + `switch (event.action)` 模式
- 服务层 `callCloudFunction` 统一错误处理
- 订阅消息发送：`cloud.openapi.subscribeMessage.send({ touser, templateId, page, data })`
- 客户端订阅请求：`wx.requestSubscribeMessage({ tmplIds, complete })`
- 子包页面路由：`subPackages[{ root: "pages/admin", pages: [...] }]`
- CSS custom properties：`--accent`, `--orange`, `--text-secondary`, `--bg-elevated` 等

### Integration Points
- `cloudfunctions/bookings/index.js` — 新增 `getCalendarData` action
- `miniprogram/services/bookings.js` — 新增 `getCalendarData()` 函数
- `miniprogram/pages/admin/bookings/list.wxml` — 新增"日历视图"入口按钮
- `miniprogram/pages/admin/bookings/list.js` — 新增 `goToCalendar()` 导航方法
- `miniprogram/pages/booking/create.wxml` — 在时段列表上方新增剩余可用时段提示
- `miniprogram/pages/booking/create.js` — `onSelectDate` 回调中已有 `data.available`，直接使用
- `miniprogram/app.json` — admin subPackages.pages 新增 `bookings/calendar`
- **新建** `cloudfunctions/booking-reminder/` — 定时触发器云函数

### Calendar Component API (TDesign, verified from type.d.ts)
```typescript
// Key props
value: number | number[]          // 选中日期（timestamp）
minDate: number                   // 最小可选日期
maxDate: number                   // 最大可选日期
format: (day: TDate) => TDate     // 自定义日期渲染
switchMode: 'none' | 'month' | 'year-month'  // 翻页模式
type: 'single' | 'multiple' | 'range'         // 选择类型
readonly: boolean                 // 只读模式
usePopup: boolean                 // 是否弹窗模式（false = 内嵌）
title: string                     // 标题

// TDate interface (format callback parameter)
interface TDate {
  date: Date
  day: number
  type: 'selected' | 'disabled' | 'start' | 'start-end' | 'centre' | 'end' | ''
  className?: string
  prefix?: string
  suffix?: string
}

// Events
bind:select  — 日期选择事件
bind:confirm — 确认选择事件
bind:change  — 日期变更事件
```

</code_context>

<specifics>
## Specific Ideas

- 定时触发器 `booking-reminder` 配置为 `cron: "0 0 20 * * * *"`（每天20:00），在 `config.json` 中声明
- 日历页面的 `format` 函数需要是 WXML 中绑定的数据引用，不能是函数引用 — 需在 `attached` 或 `observers` 中动态设置
- TDesign Calendar 的 `value` 属性接受 timestamp（非 Date 对象），选中日期后 `bind:select` 返回的也是 timestamp
- 预约数据按日期分组可在服务端完成（减少传输数据量），也可在客户端完成（减少云函数复杂度）— 选择服务端分组，因为分组逻辑简单且客户端只需渲染
- 紧凑日程的橙色标记使用 `className` 属性添加自定义 CSS 类名，在页面 wxss 中定义橙色样式

</specifics>

<deferred>
## Deferred Ideas

- 长期订阅消息（仅限特定类目）— 当前小程序为个人类目，只能使用一次性订阅消息，长期订阅需要企业类目
- 通知模板拆分为两个（预约状态变更 vs 预约提醒）— 当前使用同一模板，phrase5 字段区分状态，减少用户订阅次数
- 时长感知的冲突检测（BOOK-17）— 需要 service.duration 字段参与计算，推迟到 v2
- 日历页面支持手势滑动切换月份 — TDesign Calendar 的 `switchMode: "month"` 已提供上下翻月按钮
- 日历导出/截图分享 — 超出当前阶段范围
- 化妆师自定义提醒时间（不固定20:00）— 过度设计，固定时间足够

</deferred>

---

*Phase: 08-booking-notifications-calendar*
*Context gathered: 2026-04-21*
