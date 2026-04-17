# Phase 1: Foundation & Profile - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

用户打开小程序即可看到化妆师的身份和资历，应用基础架构就绪。包括：微信静默登录、化妆师个人简介展示、底部TabBar导航结构。作品管理、服务管理、预约系统属于后续阶段。

</domain>

<decisions>
## Implementation Decisions

### TabBar导航结构
- **D-01:** 4个Tab：首页、作品、预约、我的
- **D-02:** 图标风格使用线性图标（TDesign内置图标库）
- **D-03:** 未建设的Tab（作品、预约、我的）显示占位提示"即将开放，敬请期待"，配简短引导图文

### 首页布局与个人资料展示
- **D-04:** 首页采用"名片式"布局——顶部化妆师个人资料卡片，下方展示精选作品预览
- **D-05:** 个人资料展示完整信息：头像、姓名、一句简介/格言、从业年限、擅长领域（标签形式）、服务地区
- **D-06:** 个人资料卡片下方展示2-3张精选作品预览卡片，点击跳转到作品Tab（Phase 2建设后生效）

### Agent's Discretion
- 个人资料卡片的具体排版细节（头像大小、间距、字体大小）
- 空状态页面的具体文案和图标选择
- 精选作品预览卡片的样式（圆角、阴影、布局）
- 登录loading状态的处理方式
- 头像和图片的占位图方案

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目定义
- `.planning/PROJECT.md` — 项目愿景、核心价值、约束条件
- `.planning/REQUIREMENTS.md` — AUTH-01（微信静默登录）、AUTH-02（化妆师个人资料展示）
- `.planning/ROADMAP.md` — Phase 1 目标和成功标准

### 技术栈
- `.planning/research/STACK.md` — 微信原生框架 + 云开发 + TDesign MiniProgram 技术选型
- `.planning/research/ARCHITECTURE.md` — 架构决策（角色区分、通知方案等）
- `.planning/research/SUMMARY.md` — 研究总结

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 无现有代码——全新项目（greenfield）
- TDesign MiniProgram 提供 t-tab-bar、t-empty、t-loading、t-image 等可直接使用的组件
- 微信云开发提供 wx.cloud API 用于数据存储和用户身份

### Established Patterns
- 无既有模式——Phase 1 将建立项目基础架构和代码规范
- 技术栈已确定：微信原生框架（WXML/WXSS/JS）+ 云开发 + TDesign

### Integration Points
- `app.js` — 全局初始化（云开发初始化、用户登录）
- `app.json` — TabBar配置、全局窗口样式、页面路由
- 云数据库 `artist_profile` 集合 — 化妆师个人资料数据
- `miniprogram/custom-tab-bar/` — 自定义TabBar组件（如需）

</code_context>

<specifics>
## Specific Ideas

- 首页整体感觉应该像一张"个人名片"——客户打开就了解化妆师是谁、擅长什么
- 精选作品预览的目的是引导用户去浏览完整作品集（Phase 2），所以需要视觉上有吸引力
- 擅长领域用标签形式展示（如"新娘妆"、"日常妆"、"订婚妆"），方便客户一眼看到

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-profile*
*Context gathered: 2026-04-17*
