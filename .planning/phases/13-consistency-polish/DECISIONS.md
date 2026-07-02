# Phase 13 Decisions

## POL-01: 预约 tabBar 指向 create 表单 — 保留现状

**决策：保留**。「预约」tabBar 继续指向 `pages/booking/create`（预约表单页），不改为预约历史列表。

**理由：**
- 项目核心价值定义为「从看到好看的作品到我要预约的路径最短」
- tabBar 直接进表单 = 1 tap 到达预约，是最短路径
- 若改为列表入口，用户需要：列表 → 找「新建预约」按钮 → 表单 = 至少 2 tap
- 预约历史已有入口：「我的」页 → 预约历史（`pages/profile/history`），不需要 tabBar 占位
- 对于独立化妆师的客户（低频预约），每次进预约 tab 都是「我要预约」的意图，直奔表单最自然

## POL-03: profile.initArtistProfile 缓存守卫 — Phase 12 已修复

**状态：已修复（由 Phase 12 api.js 重构间接修复），无需额外改动。**

**分析：**
Phase 12 将 api.js `callCloudFunction` 改为失败时 reject（isApiError 单一判定点）。`initArtistProfile` 中：
```javascript
const result = await callCloudFunction('profile', { action: 'init' })
_artistProfile = result.data  // 仅在 callCloudFunction resolve（成功）时执行
```
若 init 失败（errCode !== 0），callCloudFunction 抛出 Error → 进入 catch 块 → `_artistProfile` 赋值行不可达。缓存不会被污染。

Phase 12 前的问题（`callCloudFunction` 成功返回 errCode !== 0 的 result，service 层的 errCode 守卫是唯一防线）已被 api.js 的 reject-on-failure 契约消除。

## POL-07: 硬编码常量外部化 — 评估后不采纳

**决策：不采纳。** CLOUD_ENV / SUBSCRIBE_TEMPLATE_ID 保持硬编码在 `constants.js`。

**评估：**
| 常量 | 当前 | 外部化方案 | 评估 |
|------|------|-----------|------|
| CLOUD_ENV | constants.js 硬编码 | 配置文件 / 环境变量 / 云函数下发 | 本项目单一部署（一个化妆师一个小程序），无多环境切换需求。外部化增加加载复杂度，零收益。 |
| SUBSCRIBE_TEMPLATE_ID | constants.js 硬编码 | 同上 | 模板 ID 与 AppID 绑定，不随环境变化。 |
| ARTIST_OPENID | Phase 11 已移除 | — | 已由 artist_profile._openid 权威源替代。 |

外部化适合：多环境（dev/staging/prod）、多租户、CI/CD 管线。本项目均不满足。微信小程序也无环境变量机制，外部化只能通过额外的云函数调用或配置文件读取，增加启动延迟。
