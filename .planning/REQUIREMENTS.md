# Requirements: 化妆师个人作品展示与预约小程序

**Defined:** 2026-04-19
**Milestone:** v1.1 品牌升级 & 体验增强
**Core Value:** 客户看到作品后能直接预约化妆服务——从"看到好看的作品"到"我要预约"的路径最短

## v1.1 Requirements

### Profile (个人简介)

- [ ] **PROF-01**: 化妆师可以设置服务区域（文字描述，如"上海市区，可上门"）
- [ ] **PROF-02**: 化妆师可以设置从业年限（数字）
- [ ] **PROF-03**: 化妆师可以设置擅长风格标签（多选标签，如"韩系""森系""复古"）
- [ ] **PROF-04**: 客户在主页可以看到服务区域、从业年限、风格标签

### Booking (预约体验)

- [ ] **BOOK-06**: 客户提交预约后，预约状态变更时收到微信订阅消息通知（接受/拒绝/完成）
- [ ] **BOOK-07**: 化妆师接受预约后，客户收到"预约提醒"订阅消息（预约前一天）
- [ ] **BOOK-09**: 客户填写预约时可以填写肤质（干性/油性/混合性/敏感性/不确定）
- [ ] **BOOK-10**: 客户填写预约时可以填写特殊需求（过敏史等，最多200字）
- [ ] **BOOK-11**: 客户填写预约时可以填写场合说明（婚礼主题等，最多200字）
- [ ] **BOOK-12**: 化妆师在管理后台可以看到结构化预约备注（肤质、特殊需求、场合）
- [ ] **BOOK-13**: 化妆师在管理后台可以用日历视图查看预约（按月显示，有预约的日期标点）
- [ ] **BOOK-14**: 化妆师点击日历日期后可以看到当天预约列表（按时间排序）
- [ ] **BOOK-15**: 客户预约时看到剩余可用时段数量提示
- [ ] **BOOK-16**: 化妆师看到同一天3+预约时显示"紧凑日程"警告

### Portfolio (作品展示)

- [ ] **PORT-07**: 化妆师上传作品时可以上传"妆前照片"（before image）
- [ ] **PORT-08**: 客户查看有妆前照片的作品详情时，可以用滑块拖动对比前后效果
- [ ] **PORT-09**: 前后对比滑块支持全屏查看

### Review (客户评价)

- [ ] **REVW-01**: 客户在预约完成后可以提交评价（1-5星打分 + 文字，文字最多200字）
- [ ] **REVW-02**: 每个预约只能评价一次
- [ ] **REVW-03**: 客户在预约历史页面可以看到已完成预约的"评价"入口
- [ ] **REVW-04**: 化妆师主页公开展示平均评分和评价总数
- [ ] **REVW-05**: 化妆师主页公开展示最近评价列表（评分+文字+昵称）
- [ ] **REVW-06**: 化妆师在管理后台可以查看所有评价

### Growth (增长工具)

- [ ] **GROW-01**: 化妆师可以在作品详情页生成包含作品图片+个人信息的分享海报
- [ ] **GROW-02**: 海报包含小程序码，扫码可直接进入作品详情
- [ ] **GROW-03**: 化妆师可以将海报保存到手机相册

### Security (安全)

- [ ] **SEC-01**: 所有云函数写操作增加服务端身份验证（isArtist 检查）
- [ ] **SEC-02**: profile 云函数更新操作增加字段白名单校验

## v2 Requirements

### Deferred

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

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROF-01 | Phase 6 | Pending |
| PROF-02 | Phase 6 | Pending |
| PROF-03 | Phase 6 | Pending |
| PROF-04 | Phase 6 | Pending |
| BOOK-09 | Phase 6 | Pending |
| BOOK-10 | Phase 6 | Pending |
| BOOK-11 | Phase 6 | Pending |
| BOOK-12 | Phase 6 | Pending |
| SEC-01 | Phase 6 | Pending |
| SEC-02 | Phase 6 | Pending |
| PORT-07 | Phase 7 | Pending |
| PORT-08 | Phase 7 | Pending |
| PORT-09 | Phase 7 | Pending |
| BOOK-06 | Phase 8 | Pending |
| BOOK-07 | Phase 8 | Pending |
| BOOK-13 | Phase 8 | Pending |
| BOOK-14 | Phase 8 | Pending |
| BOOK-15 | Phase 8 | Pending |
| BOOK-16 | Phase 8 | Pending |
| REVW-01 | Phase 9 | Pending |
| REVW-02 | Phase 9 | Pending |
| REVW-03 | Phase 9 | Pending |
| REVW-04 | Phase 9 | Pending |
| REVW-05 | Phase 9 | Pending |
| REVW-06 | Phase 9 | Pending |
| GROW-01 | Phase 10 | Pending |
| GROW-02 | Phase 10 | Pending |
| GROW-03 | Phase 10 | Pending |

**Coverage:**
- v1.1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-19*
*Last updated: 2026-04-19 after v1.1 roadmap creation (traceability mapped)*
