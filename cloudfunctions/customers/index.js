const cloud = require('wx-server-sdk')
const { requireArtist } = require('./shared/auth')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * customers 云函数 — 客户档案（Phase 20）
 * Actions: list, detail, getNote, saveNote
 *
 * 决策依据：.planning/phases/20-customer-profiles/20-CONTEXT.md (D-01 ~ D-14)
 *   - D-01/D-02: 状态标签仅按 completed 预约数（5/2/1 阈值）
 *   - D-04: 列表按最近预约时间倒序
 *   - D-05/D-06/D-07: customer_notes 集合，按 user_openid 唯一，upsert 覆盖
 *   - D-09/D-10/D-11: 客户详情 = 完整历史预约 + 评价记录
 * 安全要求（威胁模型 T-20-01 ~ T-20-04）：
 *   - 所有 4 个 action 必须先过 requireArtist（防越权读取客户 PII）
 *   - saveNote 的 _openid 取自 wxContext.OPENID，绝不可来自 event（防跨化妆师篡改）
 */

// Handle collection-not-exist errors gracefully (same pattern as reviews)
// customer_notes / reviews 集合首次访问可能尚未创建，降级为空数据返回
const isCollectionMissing = (error) => {
  if (!error) return false
  const msg = error.errMsg || error.message || ''
  return error.errCode === -502005 || /not exist|COLLECTION_NOT_EXIST|ResourceNotFound/i.test(msg)
}

// D-01/D-02: 标签阈值仅基于 completed 预约数
//   5+ → vip, 2-4 → returning, 0-1 → new
const tagForCompleted = (count) => {
  if (count >= 5) return 'vip'
  if (count >= 2) return 'returning'
  return 'new'
}

// 批量给预约列表注入服务封面：按 service_id 查 services 取 cover_image
// 复用 bookings 云函数 attachServiceCover 模式（客户历史预约列表用）
const attachServiceCover = async (list) => {
  const serviceIds = Array.from(new Set(list.map(b => b.service_id).filter(Boolean)))
  if (!serviceIds.length) return
  const coverMap = {}
  const svcRes = await db.collection('services').where({ _id: _.in(serviceIds) }).limit(100).get()
  svcRes.data.forEach(s => { if (s.cover_image) coverMap[s._id] = s.cover_image })
  list.forEach(b => { b.service_image = coverMap[b.service_id] || '' })
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (event.action) {
    case 'list': {
      // CUST-01: 客户列表（聚合 users + bookings 统计）
      // D-01/D-02: 标签仅按 completed 计数；D-03: tag 可选筛选；D-04: 按最近预约倒序
      const authCheck = await requireArtist(wxContext, db)
      if (!authCheck.ok) return authCheck.response

      const { tag } = event // optional: 'new' | 'returning' | 'vip' | undefined
      try {
        // 查询所有非取消预约（cancelled = 客户撤回的待确认单，不计入客户视图）
        // 按 booking_date/booking_time 倒序，便于按首条记录确定最近预约时间
        const { data: allBookings } = await db.collection('bookings')
          .where({ status: _.neq('cancelled') })
          .orderBy('booking_date', 'desc')
          .orderBy('booking_time', 'desc')
          .get()

        // 单化妆师客户量有限，在 JS 里按 user_openid 分组聚合
        const userMap = {}
        allBookings.forEach(b => {
          const oid = b.user_openid
          if (!oid) return
          if (!userMap[oid]) {
            userMap[oid] = {
              user_openid: oid,
              nickname: (b.user_info && b.user_info.nickname) || '微信用户',
              avatar_url: (b.user_info && b.user_info.avatar_url) || '',
              completed_count: 0,
              last_booking_date: b.booking_date || ''
            }
          }
          // 保留最新（bookings 已按倒序返回，首条即最新；后续只在更晚时覆盖——防御性）
          if (b.booking_date && b.booking_date > userMap[oid].last_booking_date) {
            userMap[oid].last_booking_date = b.booking_date
          }
          if (b.status === 'completed') userMap[oid].completed_count++
        })

        // 构建列表并打标签
        let customers = Object.values(userMap).map(c => ({
          ...c,
          tag: tagForCompleted(c.completed_count)
        }))

        // D-04: 按最近预约时间倒序（JS 分组可能打乱原顺序，统一重排）
        customers.sort((a, b) => (b.last_booking_date || '').localeCompare(a.last_booking_date || ''))

        // D-03: 若指定 tag 则按标签筛选
        if (tag) customers = customers.filter(c => c.tag === tag)

        return { errCode: 0, data: { list: customers, total: customers.length } }
      } catch (error) {
        // bookings 集合理应存在（系统已上线多版本），但保持与 reviews 一致的优雅降级
        if (isCollectionMissing(error)) return { errCode: 0, data: { list: [], total: 0 } }
        console.error('获取客户列表失败:', error)
        return { errCode: -1, errMsg: '获取客户列表失败' }
      }
    }

    case 'detail': {
      // CUST-02: 客户详情（基本信息 + 完整历史预约 + 评价记录）
      // D-09/D-10: 历史预约按时间倒序；D-11: 评价按 user_openid 查询
      const authCheck = await requireArtist(wxContext, db)
      if (!authCheck.ok) return authCheck.response

      const { user_openid } = event
      if (!user_openid) return { errCode: -1, errMsg: '缺少客户标识' }
      try {
        // 完整历史预约（不含已取消），按日期/时间倒序
        const bookingRes = await db.collection('bookings')
          .where({ user_openid, status: _.neq('cancelled') })
          .orderBy('booking_date', 'desc')
          .orderBy('booking_time', 'desc')
          .get()
        const bookings = bookingRes.data || []
        await attachServiceCover(bookings)

        // 评价记录：reviews 集合按 user_openid 查询（集合首次未创建时降级为空）
        let reviews = []
        try {
          const reviewRes = await db.collection('reviews')
            .where({ user_openid })
            .orderBy('created_at', 'desc')
            .get()
          reviews = reviewRes.data || []
        } catch (e) {
          if (!isCollectionMissing(e)) throw e
          // reviews 集合尚未创建 = 该客户暂无评价
        }

        // 客户基本信息来自最近一次预约的冗余 user_info（与 bookings list 一致）
        const latestBooking = bookings[0] || {}
        const userInfo = latestBooking.user_info || {}
        const completedCount = bookings.filter(b => b.status === 'completed').length

        return {
          errCode: 0,
          data: {
            user_openid,
            nickname: userInfo.nickname || '微信用户',
            avatar_url: userInfo.avatar_url || '',
            completed_count: completedCount,
            tag: tagForCompleted(completedCount),
            bookings,
            reviews
          }
        }
      } catch (error) {
        console.error('获取客户详情失败:', error)
        return { errCode: -1, errMsg: '获取客户详情失败' }
      }
    }

    case 'getNote': {
      // CUST-03/CUST-04: 读取客户备注（customer_notes 集合）
      // D-06: 按 { _openid (化妆师), user_openid (客户) } 复合定位
      const authCheck = await requireArtist(wxContext, db)
      if (!authCheck.ok) return authCheck.response

      const { user_openid } = event
      if (!user_openid) return { errCode: -1, errMsg: '缺少客户标识' }
      try {
        const res = await db.collection('customer_notes')
          .where({ _openid: openid, user_openid })
          .limit(1)
          .get()
        return { errCode: 0, data: res.data[0] || null }
      } catch (error) {
        // customer_notes 集合尚未创建 = 该客户暂无备注
        if (isCollectionMissing(error)) return { errCode: 0, data: null }
        console.error('获取客户备注失败:', error)
        return { errCode: -1, errMsg: '获取备注失败' }
      }
    }

    case 'saveNote': {
      // CUST-03: 保存/更新客户备注（upsert by user_openid，覆盖更新 per D-07）
      // 安全：_openid 必须来自 wxContext.OPENID，绝不来自 event（T-20-02 防篡改）
      const authCheck = await requireArtist(wxContext, db)
      if (!authCheck.ok) return authCheck.response

      const { user_openid, skin_type, preference, allergy, custom_notes } = event
      if (!user_openid) return { errCode: -1, errMsg: '缺少客户标识' }
      try {
        const noteData = {
          _openid: openid,           // D-06: 化妆师 openid（服务端权威，防止跨化妆师注入）
          user_openid,               // D-06: 客户 openid
          skin_type: String(skin_type || '').slice(0, 50),
          preference: String(preference || '').slice(0, 500),
          allergy: String(allergy || '').slice(0, 500),
          custom_notes: String(custom_notes || '').slice(0, 1000),
          updated_at: db.serverDate()
        }

        // D-07: upsert — 先按 { _openid, user_openid } 查现有文档，有则覆盖更新，无则新增
        const existing = await db.collection('customer_notes')
          .where({ _openid: openid, user_openid })
          .limit(1)
          .get()

        if (existing.data.length > 0) {
          await db.collection('customer_notes').doc(existing.data[0]._id).update({ data: noteData })
          return { errCode: 0, data: { _id: existing.data[0]._id } }
        } else {
          noteData.created_at = db.serverDate()
          const res = await db.collection('customer_notes').add({ data: noteData })
          return { errCode: 0, data: { _id: res._id } }
        }
      } catch (error) {
        // customer_notes 集合首次写入时自动创建；此时 upsert 的查询会抛 isCollectionMissing
        // → 直接进入 add 分支（add 会自动建集合）
        if (isCollectionMissing(error)) {
          const noteData = {
            _openid: openid,
            user_openid,
            skin_type: String(skin_type || '').slice(0, 50),
            preference: String(preference || '').slice(0, 500),
            allergy: String(allergy || '').slice(0, 500),
            custom_notes: String(custom_notes || '').slice(0, 1000),
            created_at: db.serverDate(),
            updated_at: db.serverDate()
          }
          const res = await db.collection('customer_notes').add({ data: noteData })
          return { errCode: 0, data: { _id: res._id } }
        }
        console.error('保存客户备注失败:', error)
        return { errCode: -1, errMsg: '保存备注失败' }
      }
    }

    default:
      return { errCode: -1, errMsg: '未知操作' }
  }
}
