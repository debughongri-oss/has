# Phase 6: Data Model Extensions & Quick Wins - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

化妆师资料增强（服务区域/从业年限/风格标签）、预约备注结构化（肤质/特殊需求/场合说明）、所有云函数写操作经服务端安全验证（isArtist + 字段白名单）。

不包含：预约通知（Phase 8）、日历视图（Phase 8）、前后对比滑块（Phase 7）。

</domain>

<decisions>
## Implementation Decisions

### 风格标签交互
- **D-01:** 擅长风格使用预设标签多选（标签按钮组），标签列表写死在 `constants.js`（与 SERVICE_CATEGORIES 同模式）
- **D-02:** 从业年限新增 `experience_years` 数字字段（如 5），保留现有 `experience` 文本字段（如"5年经验"），主页按需优先使用数字字段展示
- **D-03:** 服务区域使用现有 `contact_info.location` 字段，编辑页已有该输入框，无需新增字段
- **D-04:** 主页展示布局保持现有 hero 区域结构不变（已有 experience 文本 + location + specialties 标签），仅补充 experience_years 数字展示

### 预约备注表单
- **D-05:** 用三个独立字段替换现有留言 textarea：肤质类型（标签按钮组单选）、特殊需求（textarea，最多200字）、场合说明（textarea，最多200字）
- **D-06:** 肤质选项：干性/油性/混合性/敏感性/不确定 — 标签按钮组形式，选填，不选默认"未填写"
- **D-07:** 三个字段在选时间后平铺展示（不新增步骤），与当前留言 textarea 展示时机一致

### 预约备注管理展示
- **D-08:** 化妆师管理后台预约详情页用独立行显示三个结构化字段（肤质/特殊需求/场合），与现有 key-value 行布局风格一致
- **D-09:** 数据存储在 booking 文档中直接新增 `skin_type`/`special_needs`/`occasion` 三个字段，移除原有 `notes` 字段

### 安全验证策略
- **D-10:** 云函数内使用硬编码 `ARTIST_OPENID` 与 `wxContext.OPENID` 比较判断 isArtist 身份（与客户端逻辑一致）
- **D-11:** 提取公共验证模块（如 `shared/auth.js`），各云函数 require 引入，避免重复代码
- **D-12:** 只保护写操作（create/update/delete），读操作（list/detail/get）保持公开 — 客户需要查看数据
- **D-13:** profile 云函数 update 操作增加字段白名单校验（name/bio/experience/experience_years/service_area/specialties/avatar/contact_info），不在白名单的字段被忽略
- **D-14:** 需要加验证的云函数和 action：
  - `works`: create, update, delete
  - `services`: create, update, delete
  - `profile`: update, init
  - `bookings`: updateStatus

### Agent's Discretion
- 预设风格标签的具体列表内容（建议参考行业常见风格分类）
- 云函数公共模块的目录结构（shared/ 或 cloudFunctions/common/）
- 白名单校验的具体实现方式（pick/omit/filter）
- 肤质选项的展示样式细节
- 移除 notes 字段的向后兼容处理（旧预约数据中已有 notes 字段）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` §Profile — PROF-01/02/03/04 化妆师资料增强需求
- `.planning/REQUIREMENTS.md` §Booking — BOOK-09/10/11/12 预约备注结构化需求
- `.planning/REQUIREMENTS.md` §Security — SEC-01/SEC-02 安全验证需求

### 现有代码（必须读取以理解当前实现）
- `miniprogram/utils/constants.js` — ARTIST_OPENID、SERVICE_CATEGORIES、现有常量定义
- `miniprogram/services/auth.js` — 客户端 isArtist 判断逻辑
- `miniprogram/services/bookings.js` — 客户端预约服务接口
- `miniprogram/services/profile.js` — 客户端资料服务接口
- `miniprogram/pages/booking/create.wxml` — 当前预约表单布局（单 textarea）
- `miniprogram/pages/booking/create.js` — 当前预约提交逻辑
- `miniprogram/pages/admin/profile/edit.wxml` — 当前资料编辑表单布局
- `miniprogram/pages/admin/profile/edit.js` — 当前资料编辑保存逻辑
- `miniprogram/pages/admin/bookings/detail.wxml` — 当前管理端预约详情展示
- `miniprogram/pages/index/index.wxml` — 主页化妆师信息展示布局
- `cloudfunctions/profile/index.js` — 当前 profile 云函数（无验证）
- `cloudfunctions/works/index.js` — 当前 works 云函数（无验证）
- `cloudfunctions/services/index.js` — 当前 services 云函数（无验证）
- `cloudfunctions/bookings/index.js` — 当前 bookings 云函数（updateStatus 无验证）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `miniprogram/utils/constants.js` — 已有 SERVICE_CATEGORIES 标签列表模式，风格标签列表可完全复制此模式
- `miniprogram/services/auth.js` — `isArtist()` 客户端判断逻辑已成熟，服务端只需复制 openid 比较部分
- `miniprogram/pages/admin/profile/edit.js` — 资料编辑页已有完整的表单处理、头像上传、保存逻辑，可直接扩展新字段

### Established Patterns
- 云函数统一返回 `{ errCode, data/error, errMsg }` 格式 — 安全验证失败应返回 `{ errCode: -1, errMsg: '无权限操作' }`
- 预约数据模型：booking 文档为扁平结构（无嵌套对象，除 user_info 和 contact_info）
- 前端 UI：key-value 行布局用于详情展示，标签按钮组用于多选/单选

### Integration Points
- `cloudfunctions/bookings/index.js` create action — 需要接收新的 `skin_type`/`special_needs`/`occasion` 字段
- `cloudfunctions/profile/index.js` update action — 需要字段白名单 + isArtist 验证
- `miniprogram/pages/booking/create.js` submitBooking — 需要发送新字段替代 notes
- `miniprogram/pages/admin/bookings/detail.wxml` — 需要展示新字段

</code_context>

<specifics>
## Specific Ideas

- 风格标签交互参考 SERVICE_CATEGORIES 的常量列表模式，保持项目一致性
- 预约表单保持简洁 — 三个字段平铺替代一个 textarea，总输入量不会显著增加

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-data-model-extensions-quick-wins*
*Context gathered: 2026-04-19*
