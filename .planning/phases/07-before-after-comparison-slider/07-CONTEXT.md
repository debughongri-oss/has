# Phase 7: Before/After Comparison Slider - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

作品详情页的前后对比滑块交互：化妆师上传妆前照片、客户端拖动滑块对比前后效果、全屏查看模式。

不包含：预约通知（Phase 8）、评价系统（Phase 9）、海报生成（Phase 10）。

</domain>

<decisions>
## Implementation Decisions

### 妆前照片上传 (PORT-07)

- **D-01:** 在管理端作品编辑页（`admin/works/edit`）新增"妆前对比照"上传区域，位于主图上传区域下方，独立的 form-block
- **D-02:** 妆前照片限制 1 张（单图），与主图（最多 9 张）分离存储。字段名 `before_image`，存储云存储 fileID 字符串
- **D-03:** 妆前照片为可选上传。无 before_image 的作品保持现有展示（swiper），有 before_image 的作品进入对比模式
- **D-04:** 上传流程复用现有 `storageService.uploadWorkImages()`，取第一张即可（单图上传）
- **D-05:** 编辑页加载已有作品时，如果存在 `before_image` 则显示缩略图和删除按钮（与主图编辑交互一致）

### 滑块对比组件 (PORT-08)

- **D-06:** 新建自定义组件 `components/before-after-slider/slider`，使用纯 CSS `clip-path: inset()` + 手动 touch 事件实现滑块拖动
- **D-07:** 不使用 `movable-view` 组件。原因：`movable-view` 在全屏场景下存在触摸冲突和惯性回弹问题，手动 touch 事件更可控、更精确
- **D-08:** 组件结构：
  - 底层：after 图片（妆后，全宽展示）
  - 覆盖层：before 图片（妆前，通过 `clip-path: inset(0 Wpx 0 0)` 动态裁剪）
  - 滑块线：竖直分割线 + 圆形拖动手柄（居中位置）
  - 标签：左上"BEFORE"、右上"AFTER" 半透明文字标签
- **D-09:** 滑块初始位置在容器宽度 50%（居中），手指水平拖动更新 `clip-path` 的 inset 值
- **D-10:** 组件接受 properties：`beforeSrc`（String，妆前图 URL）、`afterSrc`（String，妆后图 URL）、`height`（String，默认 `900rpx`）
- **D-11:** 组件触发 events：`bind:fullscreen`（点击全屏按钮时通知父页面进入全屏模式）

### 全屏查看模式 (PORT-09)

- **D-12:** 全屏模式使用微信原生页面导航：跳转到独立全屏页面 `pages/works/compare`，传递 workId 参数，在该页面加载作品数据并全屏展示对比滑块
- **D-13:** 全屏页面使用自定义导航栏（`navigationStyle: custom`），背景纯黑（`#000000`），图片居中展示最大化可视区域
- **D-14:** 全屏页面底部显示"BEFORE / AFTER"切换按钮和滑动提示文案（"左右拖动滑块对比效果"），交互手势与内嵌模式完全一致
- **D-15:** 内嵌模式的作品详情页 gallery 区域右上角新增"全屏"按钮（icon），点击跳转到全屏页面

### 详情页展示逻辑

- **D-16:** 作品详情页加载后检查 `work.before_image` 是否存在：
  - 有 before_image → 显示 `<before-after-slider>` 组件替代 swiper
  - 无 before_image → 保持现有 swiper 展示（零影响）
- **D-17:** 对比模式下不显示 swiper 的图片计数器（1/9），改为显示全屏按钮
- **D-18:** 对比模式下多图作品仍可通过全屏页面查看所有妆后图片（全屏页面可切换普通浏览模式）

### 数据模型

- **D-19:** `works` 集合新增可选字段 `before_image: string`（云存储 fileID），不删除任何现有字段
- **D-20:** 云函数无需修改 — `create`/`update` action 已使用 `...data` 展开，`before_image` 字段会自动透传
- **D-21:** `services/works.js` 无需修改 — `createWork`/`updateWork` 已展开 data 参数

### Agent's Discretion

- 滑块手柄的视觉设计（圆形/三角形/菱形等具体样式）
- BEFORE/AFTER 标签的具体样式（字体大小、透明度、位置）
- 全屏页面的过渡动画细节
- 全屏页面中普通浏览模式的切换交互细节
- 滑块的触摸灵敏度阈值
- 妆前照片上传区域的提示文案内容

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` §Portfolio — PORT-07/08/09 前后对比需求

### 现有代码（必须读取以理解当前实现）
- `miniprogram/pages/works/detail.js` — 当前作品详情页逻辑（swiper + 图片预览）
- `miniprogram/pages/works/detail.wxml` — 当前详情页模板（gallery swiper 结构）
- `miniprogram/pages/works/detail.wxss` — 当前详情页样式（gallery 高度 900rpx、圆角 body）
- `miniprogram/pages/works/detail.json` — 当前注册的组件
- `miniprogram/pages/admin/works/edit.js` — 作品编辑页逻辑（图片上传、保存）
- `miniprogram/pages/admin/works/edit.wxml` — 编辑页模板（图片上传 grid）
- `miniprogram/pages/admin/works/edit.wxss` — 编辑页样式（img-grid 布局）
- `miniprogram/services/storage.js` — 云存储上传服务（uploadWorkImages、compressImage）
- `miniprogram/services/works.js` — 作品 API 服务（getWorkDetail、createWork、updateWork）
- `cloudfunctions/works/index.js` — 作品云函数（create/update action 已使用 ...data 展开）
- `miniprogram/utils/constants.js` — 常量定义（IMAGE_CONFIG）
- `miniprogram/app.wxss` — 全局样式变量（颜色、间距、圆角）
- `miniprogram/app.json` — 页面路由配置（新增全屏页面路由）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `miniprogram/services/storage.js` — `uploadWorkImages()` 已处理图片压缩 + 云存储上传，可直接用于妆前照片上传
- `cloudfunctions/works/index.js` — `create`/`update` action 使用 `...data` 展开，新增 `before_image` 字段自动透传，零改动
- `miniprogram/services/works.js` — `createWork`/`updateWork` 同样展开 data，零改动
- `miniprogram/pages/works/detail.wxss` — `.gallery` 已定义 900rpx 高度、相对定位布局，对比组件可直接复用此高度

### Established Patterns
- 云函数 action-dispatcher + `...data` 展开 → 新字段无需改后端
- 前端服务层 `callCloudFunction` → 统一错误处理
- 自定义导航栏 `navigationStyle: custom` → 已在 detail 页使用，全屏页复用同模式
- 管理端图片上传：`wx.chooseMedia` → `storageService.uploadWorkImages` → fileID 数组
- CSS custom properties 主题变量 → `--accent`, `--bg`, `--text-*` 等全局可用
- `.tappable` 全局类 → 按钮点击反馈

### Integration Points
- `miniprogram/pages/works/detail.wxml` gallery 区域 — 条件渲染：有 before_image 用对比组件，无则用 swiper
- `miniprogram/pages/works/detail.json` — 注册 `before-after-slider` 组件
- `miniprogram/pages/admin/works/edit.wxml` — 新增"妆前对比照"上传区域（独立 form-block）
- `miniprogram/pages/admin/works/edit.js` — 新增 beforeImage data 字段 + chooseBeforeImage/removeBeforeImage 方法
- `miniprogram/app.json` — 新增 `pages/works/compare` 全屏页面路由

### Component Tree
```
detail.wxml
├── gallery (现有 900rpx 区域)
│   ├── [有 before_image]
│   │   └── <before-after-slider> （新组件）
│   │       ├── after image (底图)
│   │       ├── before image (clip-path 裁剪层)
│   │       ├── divider line + handle
│   │       └── BEFORE/AFTER labels
│   ├── [无 before_image]
│   │   └── <swiper> （现有）
│   ├── gallery-counter / fullscreen-btn
│   └── gallery-share
├── detail-body （不变）
└── empty-container （不变）
```

</code_context>

<specifics>
## Specific Ideas

- 妆前照片上传区域建议使用单图卡片样式（非 grid），视觉上与主图 9 宫格区分
- 对比组件的 clip-path 方案无性能问题：仅更新 CSS 变量值，不触发重排
- 全屏页面使用纯黑背景最大化视觉冲击力，符合化妆效果展示场景
- "BEFORE" / "AFTER" 标签使用半透明白色，不遮挡图片内容
- 滑块手柄使用 60rpx 圆形 + 白色边框 + 内部左右箭头，视觉引导拖动

</specifics>

<deferred>
## Deferred Ideas

- 对比组件支持双指缩放（pinch zoom）— 过度复杂，全屏模式已足够放大查看
- 自动播放对比动画（来回滑动展示差异）— 增加 implementation 复杂度，v2 考虑
- 妆前照片裁剪/对齐工具 — 用户应该在上传前自行调整，不属于预约工具职责
- 视频对比（短视频）— 超出图片展示范围，属于独立功能

</deferred>

---

*Phase: 07-before-after-comparison-slider*
*Context gathered: 2026-04-21*
