# Technology Stack

**Project:** 化妆师个人作品展示与预约微信小程序
**Researched:** 2026-04-17

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **微信小程序原生框架** (WXML/WXSS/JS) | 基础库 ≥ 3.4 | 前端 UI 层 | **这是正确选择。** 理由：(1) 此项目仅面向微信单一平台，不需要跨端能力；(2) 原生框架零抽象层开销，包体积最小，审核通过率最高；(3) 微信云开发的 SDK (`wx.cloud`) 与原生框架深度集成，无需额外适配；(4) 对于一个个人化妆师的展示+预约小程序，功能复杂度有限，原生框架完全足够；(5) 原生框架的文档最全、社区最大、踩坑资料最多。 | **HIGH** |

**关键决策：为什么不用 Taro / uni-app？**

| 框架 | 为什么不用 |
|------|-----------|
| **Taro 4.x** | 跨端框架引入编译层，对仅微信平台的项目是额外复杂度。Taro 适合需要同时发布微信/支付宝/H5 等多端的团队项目。个人项目用它，增加了构建配置、版本兼容、社区组件适配的负担，收益为零。 |
| **uni-app** | 同理。uni-app 核心价值是「一套代码，多端发布」，但本项目明确只有微信端。uni-app 的 Vue 语法需要编译到小程序，云开发集成需要额外配置 (`cloudfunctionRoot`)，增加调试难度。 |

### Backend / BaaS

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **微信云开发** (CloudBase) | 基础库 ≥ 2.25.4 | 数据库 + 云函数 + 云存储 | **这是最佳选择。** 理由：(1) 零运维——不需要购买服务器、配置域名、备案，开箱即用；(2) 与小程序无缝集成，`wx.cloud.init()` 即可使用，无需额外 SDK；(3) 提供云数据库（类 MongoDB，足够本项目使用）、云存储（图片上传/下载）、云函数（业务逻辑）；(4) 免费额度足够个人项目使用；(5) 支持后续扩展（消息推送、订阅消息等）。 | **HIGH** |
| **wx-server-sdk** | 3.0.4 | 云函数端 SDK | 云函数中使用，提供数据库操作、文件操作、获取用户 openid 等能力。 | **HIGH** |

### UI Component Library

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **TDesign MiniProgram** | 1.13.2 | UI 组件库 | 腾讯官方出品，专为微信小程序设计。提供 Upload（图片上传）、Calendar（日历选择，预约日期）、TabBar、Swiper（作品轮播）、Grid（分类展示）、Dialog、Toast 等项目需要的全部组件。设计风格现代、文档清晰、维护活跃。 | **HIGH** |

**TDesign 提供的项目关键组件：**

| 组件 | 用途 |
|------|------|
| `t-upload` | 作品图片上传（支持多图、拖拽排序、进度状态） |
| `t-calendar` | 预约日期选择 |
| `t-image-viewer` | 作品详情图片查看 |
| `t-tab-bar` | 底部导航（首页/作品/预约/我的） |
| `t-grid` | 服务分类展示 |
| `t-cell` / `t-card` | 列表项、服务卡片 |
| `t-dialog` / `t-toast` | 确认操作、提示信息 |
| `t-tabs` | 作品分类切换 |
| `t-swiper` | 首页作品轮播 |
| `t-empty` | 空状态展示 |
| `t-loading` | 加载状态 |
| `t-navbar` | 自定义导航栏 |

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **云数据库** (微信云开发内置) | — | 数据存储 | 类 MongoDB 的文档数据库，支持集合、索引、聚合查询、事务。对于本项目（用户、作品、服务、预约等几张表），完全够用。无需额外引入数据库。 | **HIGH** |

**核心数据集合设计预览：**

| 集合名 | 主要字段 |
|--------|---------|
| `artist_profile` | name, avatar, bio, experience, location |
| `portfolios` | title, images[], category, description, createdAt |
| `services` | name, price, duration, description, category |
| `appointments` | userId, serviceId, date, timeSlot, status, note |
| `categories` | name, icon, sort |

### Storage

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **云存储** (微信云开发内置) | — | 图片文件存储 | 作品图片、头像等文件上传。通过 `wx.cloud.uploadFile` / `wx.cloud.getTempFileURL` 直接使用，自带 CDN 加速，无需配置 OSS。 | **HIGH** |

### Supporting Libraries / Tools

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| **miniprogram-api-typings** | 5.1.2 | TypeScript 类型定义 | 如果使用 TS 开发（推荐），提供完整的 API 类型提示 | **HIGH** |
| **微信开发者工具** | 最新稳定版 | 开发、调试、预览、上传 | 唯一的官方 IDE，必装 | **HIGH** |

### Type System

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **TypeScript** | 通过微信开发者工具内置支持 | 类型安全 | 微信开发者工具原生支持 TS 编译。虽然对于个人小项目 JS 也行，但 TS 能在开发阶段避免大量低级错误（字段拼写、类型不匹配），尤其推荐在数据模型定义（作品、服务、预约）时使用。 | **MEDIUM** — 建议使用但非必须 |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| 前端框架 | 微信原生 | Taro 4.x | 仅微信端，跨端无收益，增加编译复杂度 |
| 前端框架 | 微信原生 | uni-app (Vue3) | 同上，且云开发集成需额外配置 |
| 后端 | 微信云开发 | 自建 Node.js + MySQL 服务器 | 需要域名备案、服务器运维、HTTPS 配置，对个人项目完全没必要 |
| 后端 | 微信云开发 | 腾讯云托管 (CloudRun) | 更强大但更复杂，适合有自定义后端语言需求的项目。本项目用云函数足够 |
| UI 库 | TDesign MiniProgram | Vant Weapp | Vant 也是优秀选择，但 TDesign 是腾讯官方维护，与云开发生态更契合，组件 API 更现代化 |
| UI 库 | TDesign MiniProgram | WeUI | WeUI 太基础，缺少 Upload、Calendar 等高级组件，需要大量自定义开发 |
| 数据库 | 云数据库 | 外部 MySQL | 增加网络请求延迟和运维成本，文档模型对作品/服务数据更灵活 |

## Project Structure (Recommended)

```
hzs/
├── cloudfunctions/           # 云函数目录
│   ├── getPortfolios/        # 获取作品列表
│   ├── getServices/          # 获取服务项目
│   ├── createAppointment/    # 创建预约
│   ├── manageAppointment/    # 管理预约（接单/拒绝/改期）
│   └── uploadPortfolio/      # 上传作品
├── miniprogram/              # 小程序前端目录
│   ├── components/           # 自定义组件
│   │   ├── portfolio-card/   # 作品卡片
│   │   ├── service-card/     # 服务卡片
│   │   └── appointment-card/ # 预约卡片
│   ├── pages/                # 页面
│   │   ├── index/            # 首页（个人简介+作品预览）
│   │   ├── portfolios/       # 作品列表
│   │   ├── portfolio-detail/ # 作品详情
│   │   ├── services/         # 服务项目
│   │   ├── booking/          # 预约页面
│   │   ├── booking-manage/   # 预约管理（化妆师端）
│   │   ├── profile/          # 化妆师资料编辑
│   │   └── my/               # 个人中心
│   ├── utils/                # 工具函数
│   ├── styles/               # 全局样式
│   ├── app.js
│   ├── app.json
│   └── app.wxss
├── project.config.json       # 项目配置
└── sitemap.json
```

## Setup Instructions

### 1. 注册小程序账号
- 前往 [mp.weixin.qq.com](https://mp.weixin.qq.com) 注册个人小程序账号
- 获取 AppID

### 2. 安装微信开发者工具
- 下载最新稳定版：[developers.weixin.qq.com/miniprogram/dev/devtools/download.html](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)

### 3. 开通云开发
- 在微信开发者工具中点击「云开发」按钮
- 创建云开发环境（选择基础版，免费额度足够）
- 记录环境 ID

### 4. 项目初始化
```bash
# 微信开发者工具中创建云开发模板项目
# 或直接在开发者工具中导入项目目录
```

### 5. 安装 TDesign 组件库
```bash
# 在 miniprogram 目录下
cd miniprogram
npm init -y
npm install tdesign-miniprogram --production
```

然后在微信开发者工具中：工具 → 构建 npm

### 6. 配置 TDesign 组件
在 `app.json` 或页面 `json` 中按需引入组件：
```json
{
  "usingComponents": {
    "t-upload": "tdesign-miniprogram/upload/upload",
    "t-calendar": "tdesign-miniprogram/calendar/calendar",
    "t-image-viewer": "tdesign-miniprogram/image-viewer/image-viewer"
  }
}
```

### 7. 配置云函数目录
在 `project.config.json` 中：
```json
{
  "cloudfunctionRoot": "cloudfunctions/",
  "miniprogramRoot": "miniprogram/"
}
```

## Key Architecture Decisions

### 1. 角色区分：不在代码层面区分化妆师/客户
微信云开发通过 `openid` 自动识别用户。化妆师的 `openid` 作为配置存储在云数据库中，云函数通过比对 `openid` 判断是否为管理员。

### 2. 预约通知：使用微信订阅消息
微信小程序的「订阅消息」能力是预约提醒的最佳方案。用户预约时订阅一次，化妆师接受/拒绝时通过云函数调用 `cloud.openapi.subscribeMessage.send()` 发送通知。**不需要自建推送服务。**

### 3. 图片优化：利用云存储自带 CDN
云存储自带 CDN 加速和图片处理能力（缩略图、裁剪）。上传原图，展示时使用云存储的图片处理参数获取缩略图，减少加载时间。

## Cost Estimate

| Service | Free Tier | Estimated Monthly Cost |
|---------|-----------|----------------------|
| 云数据库 | 2GB 存储，5万次/天读操作 | ¥0（个人项目远低于免费额度） |
| 云存储 | 5GB 存储，5GB/月下载 | ¥0（作品图片按 200KB/张算，约存 25000 张） |
| 云函数 | 40万次/月调用 | ¥0（预约+作品操作远低于此） |
| 小程序发布 | 免费 | ¥0 |

**Total: ¥0/月**（在免费额度内运营）

## Sources

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/) — 官方框架文档
- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/basis/getting-started.html) — 云开发能力与计费
- [TDesign MiniProgram](https://github.com/Tencent/tdesign-miniprogram) — UI 组件库
- [Taro GitHub](https://github.com/NervJS/taro) — v4.2.0, 37.4k stars, 活跃维护
- npm registry — 版本号验证 (@tarojs/cli 4.2.0, tdesign-miniprogram 1.13.2, wx-server-sdk 3.0.4)
