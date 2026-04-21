# Phase 7: Before/After Comparison Slider - Discussion Log

**Date:** 2026-04-21
**Phase:** 07 — Before/After Comparison Slider
**Requirements:** PORT-07, PORT-08, PORT-09

---

## Discussion Flow

### 1. Implementation Approach: Touch Events vs movable-view

**Question:** 使用微信原生 `movable-view` 还是手动 touch 事件实现滑块？

**Analysis:**
- `movable-view` 方案：微信原生可拖动组件，提供 `bindchange` 获取位置，内置阻尼和惯性
  - 优势：原生性能，API 简单
  - 问题：(1) `movable-view` 有惯性回弹，对比滑块不需要惯性；(2) 在全屏页面中 `movable-area` 与页面触摸事件可能冲突；(3) damping 参数需要额外调试；(4) 控制精确位置（如初始居中 50%）需要计算 rpx→px 转换
- 手动 touch 事件方案：`bindtouchstart` + `bindtouchmove` + `bindtouchend`
  - 优势：(1) 完全精确控制位置，无惯性回弹；(2) 更容易适配全屏场景；(3) 代码量只多 10-15 行；(4) `clip-path` 更新直接由 touch `clientX` 驱动，逻辑链路更短
  - 问题：需要自行处理边界值

**Decision (D-06/D-07):** 使用手动 touch 事件 + CSS `clip-path: inset()`。理由：更可控、更精确、全屏场景无冲突，代码量差异可忽略。

---

### 2. Before/After Layer Order

**Question:** 哪张图在底层，哪张在裁剪层？

**Analysis:**
- 方案 A：Before 在底层，After 在裁剪层（clip from right）→ 滑块左移看到 Before，右移看到 After
- 方案 B：After 在底层，Before 在裁剪层（clip from left）→ 滑块左移看到 After，右移看到 Before

行业惯例（Instagram、beauty app、photo comparison tools）普遍使用方案 B：
- 默认视图展示 After（妆后效果）→ 底图是 After
- 滑块从左向右"揭开"Before（妆前）→ Before 是裁剪层

**Decision (D-08):** After 底图 + Before 裁剪层。`clip-path: inset(0 Wpx 0 0)` 其中 W 从右侧裁剪 Before，露出下方 After。

---

### 3. Fullscreen Mode: Navigation vs Overlay

**Question:** 全屏查看是使用页面导航还是弹出层覆盖？

**Analysis:**
- 方案 A：`wx.navigateTo` 跳转独立全屏页面
  - 优势：(1) 独立页面生命周期，触摸事件无冲突；(2) 自由布局，不受父页面影响；(3) 用户可返回按钮回到详情页；(4) 系统返回手势自然支持
  - 劣势：多一个页面路由
- 方案 B：`t-popup` 全屏覆盖层（placement=center, 100vw×100vh）
  - 优势：不离开当前页面，切换快
  - 劣势：(1) popup 内的触摸事件可能与 popup 本身的关闭手势冲突；(2) popup 的 `prevent-scroll-through` 可能干扰滑块 touch；(3) popup 层叠在页面上，多层事件冒泡复杂

**Decision (D-12):** 使用独立全屏页面 `pages/works/compare`。理由：触摸交互型全屏体验需要独立事件域，popup 会增加调试复杂度。一个新页面路由成本极低。

---

### 4. Before Photo Upload UX

**Question:** 妆前照片上传区域如何设计？

**Analysis:**
- 现有主图上传：9 宫格 grid，最多 9 张，支持批量选择
- 妆前照片特点：只需要 1 张，与主图性质不同（对比参考 vs 作品展示）

设计方案：
- 在主图上传区域下方，新增独立 form-block
- 单图卡片样式（非 grid）：展示缩略图 + "点击上传妆前照片" 占位
- 已上传时显示缩略图 + 删除按钮（与主图的 img-del 样式一致）
- 使用 `wx.chooseMedia({ count: 1 })` 单选模式

**Decision (D-01/D-02/D-04):** 独立 form-block + 单图卡片 + 复用现有上传服务。

---

### 5. Detail Page Conditional Rendering

**Question:** 详情页如何判断展示对比模式还是 swiper？

**Analysis:**
- 条件判断：`work.before_image` 存在且非空字符串 → 对比模式
- 对比模式下的多图问题：作品可能有多张妆后图（images[]），但对比只展示 images[0] 与 before_image
- 解决：对比模式下，gallery 区域只展示 slider（使用 images[0] 作为 after），多图浏览通过全屏页面支持

**Decision (D-16/D-18):** 条件渲染 — `wx:if="{{work.before_image}}"` 显示 slider，`wx:else` 显示现有 swiper。

---

### 6. Data Model Impact

**Question:** 后端需要改动吗？

**Analysis of current code:**
```javascript
// cloudfunctions/works/index.js — create action
case 'create': {
  const workData = { ...data, created_at: db.serverDate(), ... }
  // data 展开通传 → before_image 会自动存储
}

// services/works.js — createWork
const createWork = async (data) => {
  const result = await callCloudFunction('works', { action: 'create', data })
  // data 直传 → before_image 会自动带上
}
```

**结论：零后端改动。** `create`/`update` action 都使用 `...data` 展开，新增 `before_image` 字段完全透传。客户端服务层也是直接传 data。

**Decision (D-20/D-21):** 云函数和服务层无需修改。

---

### 7. Slider Component Properties and Events

**Question:** 组件的接口如何设计？

**Design:**
```
Component properties:
- beforeSrc: String (required) — 妆前图 URL
- afterSrc: String (required) — 妆后图 URL
- height: String (default '900rpx') — 容器高度

Component events:
- bind:fullscreen — 点击全屏按钮时触发

Component internal state:
- sliderPosition: Number (0-100, 默认 50) — 滑块位置百分比
- containerWidth: Number — 容器实际像素宽度（onReady 时获取）
```

**Decision (D-10/D-11):** 采用此接口设计，简洁且足够。

---

### 8. Visual Design Tokens

**Question:** 滑块的视觉风格如何与现有设计系统统一？

**Analysis:**
- 现有设计系统：暖色调（`--accent: #9C7A5A`），圆角（`--radius-*`），柔和背景
- 对比滑块属于图片展示功能，应让图片本身成为焦点
- UI 元素（标签、手柄、线条）应低调不抢视觉

设计方案：
- 分割线：2rpx 白色半透明（`rgba(255,255,255,0.7)`）
- 手柄：60rpx 圆形，白色描边 + 半透明白底 + 左右箭头图标
- 标签："BEFORE" / "AFTER"，小字号（`--fs-xs`），白色半透明背景胶囊
- 全屏按钮：与 share 按钮风格一致（圆形毛玻璃背景）

**Decision (D-15):** 低调 UI，图片为主角。全屏按钮复用现有 share-btn 毛玻璃风格。

---

## Decisions Summary

| # | Decision | Choice | Confidence |
|---|----------|--------|------------|
| D-01 | 上传区域位置 | 主图下方独立 form-block | HIGH |
| D-02 | 妆前照片数量 | 1 张，字段 before_image | HIGH |
| D-03 | 妆前照片必填性 | 可选，无则保持 swiper | HIGH |
| D-04 | 上传复用 | 复用 storageService.uploadWorkImages | HIGH |
| D-05 | 编辑页回显 | 缩略图 + 删除按钮 | HIGH |
| D-06 | 组件实现 | 手动 touch 事件 + clip-path | HIGH |
| D-07 | 不用 movable-view | 手动 touch 更可控 | HIGH |
| D-08 | 图层顺序 | After 底图 + Before 裁剪层 | HIGH |
| D-09 | 滑块初始位置 | 50% 居中 | HIGH |
| D-10 | 组件接口 | beforeSrc, afterSrc, height | HIGH |
| D-11 | 组件事件 | bind:fullscreen | HIGH |
| D-12 | 全屏实现 | 独立全屏页面 | HIGH |
| D-13 | 全屏页面样式 | 自定义导航栏，纯黑背景 | HIGH |
| D-14 | 全屏交互 | 与内嵌一致 + 底部提示 | HIGH |
| D-15 | 全屏按钮位置 | gallery 右上角，share 按钮旁 | HIGH |
| D-16 | 条件渲染 | before_image 存在 → slider，否则 → swiper | HIGH |
| D-17 | 对比模式不显示计数器 | 替换为全屏按钮 | HIGH |
| D-18 | 多图浏览 | 通过全屏页面支持 | HIGH |
| D-19 | 数据模型 | works 集合新增 before_image 字段 | HIGH |
| D-20 | 云函数无需修改 | ...data 展开自动透传 | HIGH |
| D-21 | 服务层无需修改 | data 直传自动带上 | HIGH |

**Overall confidence: HIGH** — 所有决策基于已读取的代码和确认的技术可行性。

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `components/before-after-slider/slider.js` | 自定义对比滑块组件逻辑 |
| `components/before-after-slider/slider.wxml` | 对比滑块模板 |
| `components/before-after-slider/slider.wxss` | 对比滑块样式 |
| `components/before-after-slider/slider.json` | 组件声明 |
| `pages/works/compare.js` | 全屏对比页面逻辑 |
| `pages/works/compare.wxml` | 全屏对比页面模板 |
| `pages/works/compare.wxss` | 全屏对比页面样式 |
| `pages/works/compare.json` | 全屏对比页面配置 |

### Modified Files
| File | Change |
|------|--------|
| `pages/works/detail.wxml` | gallery 区域条件渲染（slider vs swiper）+ 全屏按钮 |
| `pages/works/detail.js` | 加载 work 后处理 before_image，跳转全屏页面方法 |
| `pages/works/detail.json` | 注册 before-after-slider 组件 |
| `pages/works/detail.wxss` | 全屏按钮样式 |
| `pages/admin/works/edit.wxml` | 新增妆前照片上传区域 |
| `pages/admin/works/edit.js` | 新增 beforeImage data、上传/删除方法、保存逻辑 |
| `pages/admin/works/edit.wxss` | 妆前照片上传区域样式 |
| `app.json` | 新增 pages/works/compare 页面路由 |

### Unchanged Files (Verified)
| File | Why |
|------|-----|
| `cloudfunctions/works/index.js` | ...data 展开，before_image 自动透传 |
| `miniprogram/services/works.js` | data 直传，无需修改 |
| `miniprogram/services/storage.js` | 复用现有方法，无需新增 |

---

*Discussion completed: 2026-04-21*
