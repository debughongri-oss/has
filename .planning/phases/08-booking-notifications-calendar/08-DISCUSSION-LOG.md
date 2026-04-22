# Phase 8: Booking Notifications & Calendar - Discussion Log

**Date:** 2026-04-21
**Participants:** Agent (researcher) → Planner (consumer)

## Discussion Flow

### 1. Subscription Message System Analysis

**Question:** 预约状态变更通知 (BOOK-06) 是否需要新增模板或修改代码？

**Investigation:**
- Read `cloudfunctions/bookings/index.js` — 发现 `sendNotify()` 函数已完整实现
- `updateStatus` action 在状态变为 `accepted/rejected/completed` 时已调用 `sendNotify()`
- 客户端 `booking/create.js:141` 已在提交成功后调用 `wx.requestSubscribeMessage()`
- 现有模板字段：thing1（服务名）、date2/date3（时间）、thing4（备注）、phrase5（状态）

**Conclusion:** BOOK-06 已在 v1.0 中实现。现有代码已覆盖状态变更通知的完整流程。**零改动需要。** 只需确认微信管理后台已正确注册该模板 ID `-i6OevJwdS5fGFXCsB9Xux4zaaxUkXTR0xfLg5T48jM`。

### 2. Booking Reminder (BOOK-07) — Day-before Notification

**Question:** 如何实现"预约前一天提醒"？

**Options considered:**
1. **客户端轮询** — 用户打开小程序时检查并提示。问题：用户可能不打开小程序，提醒不可靠
2. **云函数定时触发器** — 每天固定时间扫描明天的预约并发送消息。优点：可靠、服务端控制、无客户端依赖
3. **微信服务端定时任务** — 需要外部服务器，超出云开发范围

**Decision:** 使用云函数定时触发器（Option 2）。

**Key design decisions:**
- 独立云函数 `booking-reminder`（非 bookings 的 action），因为定时触发器需要在 `config.json` 中声明 `triggers` 配置
- 触发时间：每天 20:00 — 晚上提醒明天行程是合理的时间点
- 使用现有模板 ID（phrase5 设为"预约提醒"），避免第二个模板的注册和审核
- 只提醒 `accepted` 状态的预约
- 发送失败静默处理（用户可能未订阅该模板）

**WeChat constraint verified:** [CITED: developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html]
- 一次性订阅消息需要用户主动触发 `wx.requestSubscribeMessage()` 才能订阅
- 用户订阅一次 = 服务端可以发送一次
- 如果用户从未订阅该模板，服务端发送会失败（但不影响其他用户）

### 3. Calendar View (BOOK-13, BOOK-14)

**Question:** TDesign Calendar 组件如何集成？性能和包体积影响？

**Investigation:**
- 读取 `miniprogram_npm/tdesign-miniprogram/calendar/` 目录和类型定义
- Calendar 组件大小：72KB（在 admin 子包中，不影响主包）
- TDesign Calendar API：支持 `format` 自定义日期渲染、`switchMode: "month"` 按月翻页、`usePopup: false` 内嵌模式

**Key design decisions:**
- 新建独立页面 `pages/admin/bookings/calendar`，而非在列表页中嵌入
- 从列表页添加"日历视图"入口按钮，使用 `navigateTo` 跳转
- `getCalendarData` 云函数 action 按月查询，服务端分组返回
- 日期标记使用 `format` 函数的 `suffix` 属性
- 紧凑日程（3+预约）使用不同的 suffix 样式（橙色）

**Format function concern:** TDesign Calendar 的 `format` 属性接受函数引用。在微信小程序中，这需要通过组件 data 绑定传递。验证了 `type.d.ts` 中 `format` 的类型为 `CalendarFormatType = (day: TDate) => TDate`，确认在 page data 中设置函数引用即可。

### 4. Available Time Slots Display (BOOK-15)

**Question:** 如何展示剩余可用时段数量？

**Investigation:**
- `getAvailableSlots` action 已返回 `{ available: [...], all: [...] }`
- `booking/create.js:74-84` 的 `onSelectDate` 回调已获取该数据
- `timeSlots` 已标记每个时段的 `available` 状态

**Decision:** 在时段列表上方添加文字提示，数据来源直接用 `data.available.length`。当全部约满时显示特殊文案。**改动极小**，只需修改 `create.wxml` 和 `create.js`。

### 5. Busy Day Warning (BOOK-16)

**Question:** 紧凑日程警告在哪里展示？

**Options considered:**
1. 管理端预约列表页 — 显示每天标记
2. 日历页面 — 选中日期时在预约列表上方显示警告
3. 两个地方都显示

**Decision:** 在日历页面的预约列表上方展示警告条（Option 2）。日历是化妆师管理日程的主要视图，在此展示最自然。

- 阈值硬编码为 3（`BUSY_DAY_THRESHOLD`）
- 日历日期标记中区分：普通预约日（灰色 •）vs 紧凑日程日（橙色 •）

### 6. Package Size Assessment

**Concern (from STATE.md):** TDesign Calendar is large, admin sub-package may need monitoring.

**Investigation:**
- Calendar 组件：72KB
- TDesign 总包：4.6MB
- miniprogram 总大小：9.9MB
- 微信子包限制：2MB（每个子包）
- admin 子包当前页面：7 个

**Conclusion:** 72KB 在 admin 子包中完全没问题。STATE.md 中的担忧是过度预警。

### 7. What's Already Implemented vs What's New

| Requirement | Status | Work Needed |
|-------------|--------|-------------|
| BOOK-06 状态变更通知 | **已在 v1.0 实现** | ✅ 零改动（确认模板已注册） |
| BOOK-07 预约前一天提醒 | 新增 | 新建 `booking-reminder` 云函数 |
| BOOK-13 日历视图 | 新增 | 新建日历页面 + 云函数 action |
| BOOK-14 日历点击看预约列表 | 新增 | 日历页面内列表展示 |
| BOOK-15 剩余时段提示 | 新增 | 预约创建页加文字提示 |
| BOOK-16 紧凑日程警告 | 新增 | 日历页面警告条 |

## Key Technical Decisions Summary

| ID | Decision | Rationale |
|----|----------|-----------|
| D-01 | 复用现有模板，不新增 | 减少用户订阅弹窗次数 |
| D-05 | 云函数定时触发器 | 可靠、服务端控制 |
| D-06 | 独立云函数 booking-reminder | 定时触发器需要独立 config.json |
| D-08 | 用现有模板发提醒 | phrase5 区分状态，避免多模板 |
| D-11 | 新建日历页面 | 独立页面更清晰，不污染列表页 |
| D-13 | 服务端分组返回 | 减少客户端计算 |
| D-18 | 时段列表上方文字提示 | 最简单直接的展示方式 |
| D-21 | 日历页面警告条 | 日历是日程管理主视图 |
| D-24 | Calendar 72KB 放子包 | 远低于子包限制 |

## Blocker Confirmation

STATE.md 提到："WeChat admin console: subscription message template registration required before Phase 8 (1-3 day approval)"

**Status:** 这只影响 BOOK-06 的线上运行。由于 BOOK-06 代码已实现且模板 ID 已硬编码在 `constants.js` 中，Phase 8 的开发工作不受阻碍。**但部署上线前必须确认模板已在 mp.weixin.qq.com 注册。** 开发阶段可在开发者工具中测试（订阅消息在开发者工具中可能不会真正发送但不会报错）。

---

*Discussion completed: 2026-04-21*
