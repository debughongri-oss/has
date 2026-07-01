# Requirements: 化妆师个人作品展示与预约小程序

**Defined:** 2026-06-23
**Milestone:** v1.2 上线前加固 (Pre-launch Hardening)
**Core Value:** 客户看到作品后能直接预约化妆服务——从"看到好看的作品"到"我要预约"的路径最短

## v1.2 Requirements

> v1.2 是技术债/安全/发布卫生加固里程碑，不引入新功能。16 项需求来自 2026-06-23 的全项目 review，覆盖 v1.0/v1.1 已发布代码中发现的安全、正确性、发布卫生与一致性问题。

### Phase 11 — Auth & Security 修复（High）

- [ ] **SEC-03**: 应用层提供「登录态就绪」机制（Promise/回调），身份相关页面（admin 守卫、预约提交）在登录完成后再读取身份，消除冷启动竞态 *(review #1)*
- [ ] **SEC-04**: 化妆师身份 openid 当前以 magic constant 硬编码于两处（`miniprogram/utils/constants.js` + `cloudfunctions/shared/auth.js`），DRY 违反且不可热更新；统一为单一服务端数据源（集合/配置），消除双写漂移 *(review #3)*
- [ ] **SEC-05**: 评价/预约的用户昵称与头像一律由云函数按 openid 从 users 集合取，拒绝 event 传入的 user_nickname/user_avatar，杜绝冒名 *(review #2)*
- [ ] **SEC-06**: 统一用户信息缓存来源（消除 globalData 与 auth.js 模块缓存的双写漂移），profile 更新昵称/头像后同步刷新缓存 *(review #8)*

> **订正说明 (2026-06-23):** 初版 review 将 #3 标为 Critical「服务端无角色鉴权」。经核实 `cloudfunctions/shared/auth.js` 的 `requireArtist()` 已在 works/services/bookings/profile 四个云函数写操作中强制服务端校验（v1.1 Phase 6 SEC-01 已交付）。真实缺陷是身份源的硬编码与前后端重复，severity 调整为 Medium。本里程碑无 Critical 阻塞项；Phase 11 以 High 优先级处理登录竞态与身份伪造。

### Phase 12 — 发布卫生（Medium）

- [ ] **HYG-01**: `project.private.config.json` 移出版本控制（加入 .gitignore 并 `git rm --cached`），符合微信官方本地化要求 *(review #4)*
- [ ] **HYG-02**: 移除 `pages/demo-ui/demo-ui` 在 app.json 的生产注册及 sitemap 索引 *(review #5)*
- [ ] **HYG-03**: `sitemap.json` 对 `pages/admin/*` 子包页面设 `disallow`，避免管理页被微信收录 *(review #10)*
- [ ] **HYG-04**: 统一 errCode 响应契约——定义单一 envelope（{errCode:0 为成功}），api.js 与 services/*.js 采用同一判定，消除 `if(errCode)` 与 `errCode!==0` 分歧 *(review #6)*
- [ ] **HYG-05**: 消除重复错误提示——api.js 与调用方 toast 二选一，定义清晰的错误归属层 *(review #7)*

### Phase 13 — 一致性 & 打磨（Low）

- [ ] **POL-01**: 复核「预约」tabBar 指向 create 表单的 UX，调整为列表入口或保留并说明理由 *(review #9)*
- [ ] **POL-02**: 预约状态色改用 app.wxss 设计 token（`--gold/--rose/--green` 等），移除 bookings.js 硬编码色值 *(review #11)*
- [ ] **POL-03**: `profile.initArtistProfile` 在缓存前校验 errCode，失败不污染缓存 *(review #12)*
- [ ] **POL-04**: 作品图片上传改为有限并发（如 3 路），提升 9 图上传体验 *(review #13)*
- [ ] **POL-05**: 存储删除/压缩失败不再静默吞掉，上报错误或重试，避免孤立云文件累积成本 *(review #14)*
- [ ] **POL-06**: reviews getStats 改用数据库聚合管道，替代拉取 1000 条内存计算 *(review #15)*
- [ ] **POL-07**: 评估将 CLOUD_ENV / SUBSCRIBE_TEMPLATE_ID / ARTIST_OPENID 等硬编码常量外部化，支持多环境切换 *(review #16)*

## v2 Requirements

### Deferred（从 v1.1 继承）

- **PROF-05**: 化妆师可以自定义主页主题色
- **PROF-06**: 化妆师可以调整主页模块顺序
- **REVW-07**: 化妆师可以回复客户评价
- **BOOK-17**: 预约时自动检测可变时长服务的时间冲突

## Out of Scope

| Feature | Reason |
|---------|--------|
| 实时聊天/IM | 微信已有 contact 按钮，不需要自定义聊天 |
| 评价回复 | 单化妆师模式不需要公开回复，可通过微信私下沟通 |
| 多模板消息（5+） | 订阅消息弹窗过多影响体验，限制在2个模板 |
| 照片滤镜/编辑 | 不属于预约工具职责，使用专业修图工具 |
| 付费推广 | 个人品牌工具不是平台 |
| 多语言 | 目标用户全部为中文用户 |
| 在线支付 | 线下结算，小程序不涉及支付功能 |
| 多化妆师平台 | 仅支持单个化妆师，不做平台模式 |
| 视频展示 | v1 以图片为主，视频功能延后 |

## Traceability

| Requirement | Phase | Review # | Status |
|-------------|-------|----------|--------|
| SEC-03 | Phase 11 | #1 | Pending |
| SEC-04 | Phase 11 | #3 | Pending |
| SEC-05 | Phase 11 | #2 | Pending |
| SEC-06 | Phase 11 | #8 | Pending |
| HYG-01 | Phase 12 | #4 | Pending |
| HYG-02 | Phase 12 | #5 | Pending |
| HYG-03 | Phase 12 | #10 | Pending |
| HYG-04 | Phase 12 | #6 | Pending |
| HYG-05 | Phase 12 | #7 | Pending |
| POL-01 | Phase 13 | #9 | Pending |
| POL-02 | Phase 13 | #11 | Pending |
| POL-03 | Phase 13 | #12 | Pending |
| POL-04 | Phase 13 | #13 | Pending |
| POL-05 | Phase 13 | #14 | Pending |
| POL-06 | Phase 13 | #15 | Pending |
| POL-07 | Phase 13 | #16 | Pending |

**Coverage:**
- v1.2 requirements: 16 total
- Mapped to phases: 16
- Mapped to review items: 16/16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-23*
*Source: 全项目 review (2026-06-23)*
