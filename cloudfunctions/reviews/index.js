const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { requireArtist } = require('./shared/auth')

// REVW-10/D-01: 评价标签白名单（云函数无法 import miniprogram 常量，复制同一份清单）
// 与 miniprogram/utils/constants.js REVIEW_TAGS 保持同步
const ALLOWED_TAG_KEYS = ['professional', 'natural', 'punctual', 'friendly', 'value']
const TAG_LABELS = {
  professional: '手法专业',
  natural: '妆面自然',
  punctual: '准时',
  friendly: '态度好',
  value: '性价比高'
}

// REVW-15/D-22: 订阅消息模板 ID（云函数无法 import miniprogram 常量，复制同一份）
const SUBSCRIBE_TEMPLATE_ID = '-i6OevJwdS5fGFXCsB9Xux4zaaxUkXTR0xfLg5T48jM'

// reviews 集合尚未创建（还没有任何评价）时，查询会抛错，视为「空数据」处理
const isCollectionMissing = (error) => {
  if (!error) return false
  const msg = error.errMsg || error.message || ''
  return error.errCode === -502005 || /not exist|COLLECTION_NOT_EXIST|ResourceNotFound/i.test(msg)
}

/**
 * REVW-14/D-19: 重算 artist_profile.avg_rating / total_reviews（recompute 策略，并发安全）
 *
 * 选择重算而非增量：微信云数据库事务能力弱；增量 (old_avg*old_total ± new)/new_total
 * 在并发写下沉受 FP 漂移 + race。单化妆师评价量小 → 重算成本可忽略。符合 POL-06。
 * 自愈：删除/数据漂移后下一次写自动校正。
 */
async function syncArtistRating() {
  try {
    const $ = db.command.aggregate
    const res = await db.collection('reviews').aggregate()
      .group({ _id: null, total: $.sum(1), avgRating: $.avg('$rating') })
      .end()
    const total = (res.list[0] && res.list[0].total) || 0
    const avg = (res.list[0] && res.list[0].avgRating) || 0

    const existing = await db.collection('artist_profile').limit(1).get()
    if (existing.data.length) {
      await db.collection('artist_profile').doc(existing.data[0]._id)
        .update({
          data: {
            avg_rating: Number(avg.toFixed(2)),
            total_reviews: total,
            updated_at: db.serverDate()
          }
        })
    } else {
      await db.collection('artist_profile').add({
        data: {
          avg_rating: Number(avg.toFixed(2)),
          total_reviews: total
        }
      })
    }
  } catch (error) {
    if (isCollectionMissing(error)) {
      // reviews 集合不存在 → 视为 0 条评价，写 0 兜底
      const existing = await db.collection('artist_profile').limit(1).get()
      if (existing.data.length) {
        await db.collection('artist_profile').doc(existing.data[0]._id)
          .update({ data: { avg_rating: 0, total_reviews: 0, updated_at: db.serverDate() } })
      }
      return
    }
    // 其它错误不阻塞主流程，仅记录（评价已写入，统计漂移会在下次写时自愈）
    console.error('syncArtistRating 失败:', error)
  }
}

/**
 * REVW-15/D-22/D-23: 推送订阅消息给化妆师（phrase5=新评价）
 * 推送失败静默吞掉（与 booking-reminder D-10 一致），绝不阻塞评价创建。
 */
async function notifyArtistNewReview(serviceName, rating) {
  try {
    // 收件人 = artist_profile._openid（化妆师身份）
    const profileRes = await db.collection('artist_profile').limit(1).get()
    const profile = profileRes.data[0]
    if (!profile || !profile._openid) return

    // thing 字段 ≤ 20 字符限制
    const safeService = (serviceName || '化妆服务').slice(0, 20)
    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    await cloud.openapi.subscribeMessage.send({
      touser: profile._openid,
      templateId: SUBSCRIBE_TEMPLATE_ID,
      page: 'pages/admin/reviews/list',
      data: {
        thing1: { value: safeService },
        date2: { value: dateStr },
        date3: { value: timeStr },
        thing4: { value: `${rating}星好评` },
        phrase5: { value: '新评价' }
      }
    })
  } catch (error) {
    // D-23: 推送失败静默吞掉，仅记录日志
    console.error('新评价推送失败（已忽略）:', error)
  }
}

/**
 * reviews 云函数 — 评价系统
 * Actions: create, list, getStats, getByBooking, reply, delete
 *
 * D-01: 独立 reviews 集合
 * D-08/D-09: msgSecCheck 内容安全审查（微信审核硬要求）
 * D-11: 服务端双重防重复（booking_id 唯一查重 + booking 状态校验）
 * D-17 (POL-06): getStats 改读 artist_profile 冗余字段（avg_rating/total_reviews）
 * REVW-10: 评价标签（tags[]，5 个预设白名单）
 * REVW-11: 评价图片（images[]，最多 3 张，imgSecCheck fail-closed）
 * REVW-12: 匿名评价（is_anonymous）
 * REVW-13: 服务端筛选排序（rating_filter/tag_filter/sort_by）
 * REVW-14: avg_rating/total_reviews 冗余同步（recompute 策略）+ delete action
 * REVW-15: 新评价订阅消息推送（phrase5=新评价，失败静默）
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (event.action) {
    case 'create': {
      // SEC-05: 移除对 event.user_nickname/user_avatar 的信任，改由服务端按 openid 查 users 集合取权威值
      const { booking_id, rating, content } = event
      // REVW-10/11/12: 新增增强字段
      const rawTags = Array.isArray(event.tags) ? event.tags : []
      const rawImages = Array.isArray(event.images) ? event.images : []
      const isAnonymous = !!event.is_anonymous
      try {
        // 参数校验
        if (!booking_id) {
          return { errCode: -1, errMsg: '缺少预约ID' }
        }
        if (!rating || rating < 1 || rating > 5) {
          return { errCode: -1, errMsg: '请选择评分（1-5星）' }
        }

        // REVW-10/D-01: 标签白名单过滤（T-21-01 mitigate）
        const validTags = []
        const seenTagKeys = new Set()
        for (const t of rawTags) {
          if (typeof t === 'string' && ALLOWED_TAG_KEYS.indexOf(t) >= 0 && !seenTagKeys.has(t)) {
            validTags.push(t)
            seenTagKeys.add(t)
          }
        }
        if (validTags.length > 5) {
          return { errCode: -1, errMsg: '最多选择 5 个标签' }
        }

        // REVW-11/D-06: 图片数量上限 3 张（T-21-06 mitigate）
        const imageFileIDs = rawImages.filter(x => typeof x === 'string' && x).slice(0, 3)
        if (rawImages.length > 3) {
          return { errCode: -1, errMsg: '最多上传 3 张图片' }
        }

        // D-11 双重防护 Step 1: 验证预约存在 + 属于当前用户 + 已完成状态
        let booking
        try {
          booking = await db.collection('bookings').doc(booking_id).get()
        } catch (e) {
          return { errCode: -1, errMsg: '预约不存在' }
        }

        if (!booking.data || booking.data.user_openid !== openid) {
          return { errCode: -1, errMsg: '无权操作此预约' }
        }
        if (booking.data.status !== 'completed') {
          return { errCode: -1, errMsg: '只能评价已完成的预约' }
        }

        // D-11 双重防护 Step 2: 查询 reviews 集合，该 booking_id 无已有评价
        let existingReview
        try {
          existingReview = await db.collection('reviews')
            .where({ booking_id: booking_id })
            .limit(1)
            .get()
        } catch (e) {
          // 集合还没创建（第一条评价）→ 视为无重复，继续写入（add 会自动建集合）
          if (!isCollectionMissing(e)) throw e
          existingReview = { data: [] }
        }

        if (existingReview.data.length > 0) {
          return { errCode: -1, errMsg: '该预约已评价，不能重复评价' }
        }

        // D-10: 纯评分无文字跳过 msgSecCheck
        const trimmedContent = (content || '').slice(0, 200)
        if (trimmedContent.length > 0) {
          // D-08/D-09: 内容安全审查
          try {
            const secResult = await cloud.openapi.security.msgSecCheck({
              content: trimmedContent,
              openid: openid,
              scene: 2,     // 2=评论场景
              version: 2
            })
            // D-24: errCode 87014 内容违规
            if (secResult.errCode === 87014) {
              return { errCode: -1, errMsg: '评价内容包含不当信息，请修改后重新提交' }
            }
          } catch (secErr) {
            // D-24: msgSecCheck API 调用失败 → 阻止提交
            console.error('msgSecCheck 调用失败:', secErr)
            return { errCode: -1, errMsg: '内容安全检查失败，请稍后重试' }
          }
        }

        // REVW-11/D-07: 图片内容安全审查（imgSecCheck，逐张同步，fail-closed）
        // 与 msgSecCheck D-24 一致：违规或 API 失败均阻止提交
        for (const fileID of imageFileIDs) {
          try {
            const dl = await cloud.downloadFile({ fileID })
            const buffer = dl.fileContent
            if (!buffer) {
              return { errCode: -1, errMsg: '图片安全检查失败，请稍后重试' }
            }
            const imgResult = await cloud.openapi.security.imgSecCheck({
              media: {
                contentType: 'image/jpeg',
                value: buffer
              }
            })
            // errCode 87014 = 内容违规；其它非 0 也视为不通过
            if (imgResult.errCode === 87014) {
              return { errCode: -1, errMsg: '评价图片包含不当内容，请删除后重新提交' }
            }
            if (imgResult.errCode && imgResult.errCode !== 0) {
              console.error('imgSecCheck 违规 errCode:', imgResult.errCode)
              return { errCode: -1, errMsg: '评价图片包含不当内容，请删除后重新提交' }
            }
          } catch (imgErr) {
            // API 调用失败 → fail-closed 阻止提交
            console.error('imgSecCheck 调用失败:', imgErr)
            return { errCode: -1, errMsg: '图片安全检查失败，请稍后重试' }
          }
        }

        // SEC-05: 服务端权威读取用户昵称/头像，客户端传入被忽略
        const userRes = await db.collection('users').where({ _openid: openid }).limit(1).get()
        const user = userRes.data[0] || {}
        const userNickname = user.nickname || ''
        const userAvatar = user.avatar_url || ''

        // D-02: 写入 reviews 集合（含 REVW-10/11/12 新字段）
        const reviewData = {
          booking_id: booking_id,
          user_openid: openid,
          user_nickname: userNickname,
          user_avatar: userAvatar,
          service_id: booking.data.service_id || '',
          service_name: booking.data.service_name || '',
          rating: rating,
          content: trimmedContent,
          // REVW-10: 评价标签（已白名单过滤）
          tags: validTags,
          // REVW-11: 评价图片 fileID 数组（已 imgSecCheck 通过）
          images: imageFileIDs,
          // REVW-12: 匿名标记（服务端存原始值，展示层 D-11 控制公开展示）
          is_anonymous: isAnonymous,
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }

        const res = await db.collection('reviews').add({ data: reviewData })

        // REVW-14/D-19: 同步 artist_profile 冗余字段（不阻塞返回，但失败也不影响评价写入）
        await syncArtistRating()

        // REVW-15/D-22: 推送新评价通知给化妆师（失败静默吞掉，不阻塞）
        await notifyArtistNewReview(booking.data.service_name, rating)

        return {
          errCode: 0,
          data: { _id: res._id }
        }
      } catch (error) {
        console.error('创建评价失败:', error)
        return { errCode: -1, errMsg: '提交评价失败' }
      }
    }

    case 'list': {
      // REVW-13/D-15: 服务端筛选（rating_filter/tag_filter）+ 排序（sort_by）+ 分页
      const { page = 1, pageSize = 10 } = event
      const ratingFilter = event.rating_filter
      const tagFilter = event.tag_filter
      // T-21-02 mitigate: sort_by 枚举校验（默认 latest）
      const sortByRaw = typeof event.sort_by === 'string' ? event.sort_by : 'latest'
      const sortBy = ['latest', 'highest', 'lowest'].indexOf(sortByRaw) >= 0 ? sortByRaw : 'latest'
      try {
        // 构造 where（参数化，无字符串拼接）
        const where = {}
        // rating_filter 数值校验 1-5
        if (typeof ratingFilter === 'number' && ratingFilter >= 1 && ratingFilter <= 5) {
          where.rating = ratingFilter
        }
        // tag_filter 白名单校验（数组 contains 查询）
        if (typeof tagFilter === 'string' && ALLOWED_TAG_KEYS.indexOf(tagFilter) >= 0) {
          where.tags = db.command.in([tagFilter])
        }

        let baseQuery = db.collection('reviews')
        if (Object.keys(where).length > 0) {
          baseQuery = baseQuery.where(where)
        }

        const total = (await baseQuery.count()).total

        // 排序：latest→created_at desc；highest→rating desc + created_at desc；lowest→rating asc + created_at desc
        let dataQuery = baseQuery
        if (sortBy === 'highest') {
          dataQuery = dataQuery.orderBy('rating', 'desc').orderBy('created_at', 'desc')
        } else if (sortBy === 'lowest') {
          dataQuery = dataQuery.orderBy('rating', 'asc').orderBy('created_at', 'desc')
        } else {
          dataQuery = dataQuery.orderBy('created_at', 'desc')
        }

        const data = await dataQuery
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .get()

        return {
          errCode: 0,
          data: {
            list: data.data,
            total,
            page,
            pageSize,
            hasMore: page * pageSize < total
          }
        }
      } catch (error) {
        if (isCollectionMissing(error)) {
          return { errCode: 0, data: { list: [], total: 0, page, pageSize, hasMore: false } }
        }
        console.error('获取评价列表失败:', error)
        return { errCode: -1, errMsg: '获取评价列表失败' }
      }
    }

    case 'getStats': {
      // REVW-14/D-20/D-21: avg/total 读 artist_profile 冗余字段（零计算）
      // REVW-10/D-04: 新增 topTags 高频标签聚合
      // 保留 recent 最近 3 条评价，新增 tags/images/is_anonymous 投影供展示层使用
      try {
        let average = '0.0'
        let total = 0

        // 优先读 artist_profile 冗余字段（D-20）
        let profileOk = false
        try {
          const profileRes = await db.collection('artist_profile').limit(1).get()
          const profile = profileRes.data[0]
          if (profile && (profile.avg_rating !== undefined || profile.total_reviews !== undefined)) {
            // 容忍缺失字段（旧资料）：undefined → 0
            total = profile.total_reviews ?? 0
            const avg = profile.avg_rating ?? 0
            average = Number(avg).toFixed(1)
            profileOk = true
          }
        } catch (e) {
          // artist_profile 集合不存在 → 走聚合兜底
        }

        // 兜底：profile 不存在/无冗余字段 → 实时聚合计算
        if (!profileOk) {
          const $ = db.command.aggregate
          const statsResult = await db.collection('reviews').aggregate()
            .group({
              _id: null,
              total: $.sum(1),
              avgRating: $.avg('$rating')
            })
            .end()
          if (statsResult.list && statsResult.list.length > 0) {
            const stats = statsResult.list[0]
            average = Number(stats.avgRating || 0).toFixed(1)
            total = stats.total
          }
        }

        // 最近 3 条评价（独立小查询，含 REVW-10/11/12 新字段投影）
        let recent = []
        try {
          const recentResult = await db.collection('reviews')
            .orderBy('created_at', 'desc')
            .limit(3)
            .field({
              rating: true,
              content: true,
              user_nickname: true,
              user_avatar: true,
              created_at: true,
              artist_reply: true,
              tags: true,
              images: true,
              is_anonymous: true
            })
            .get()

          recent = (recentResult.data || []).map(r => ({
            rating: r.rating,
            content: r.content ? r.content.slice(0, 30) : '',
            user_nickname: r.user_nickname || '',
            user_avatar: r.user_avatar || '',
            artist_reply: r.artist_reply || '',
            tags: Array.isArray(r.tags) ? r.tags : [],
            images: Array.isArray(r.images) ? r.images : [],
            is_anonymous: !!r.is_anonymous,
            created_at: r.created_at
          }))
        } catch (e) {
          if (!isCollectionMissing(e)) throw e
          // reviews 集合不存在 → recent = []
        }

        // REVW-10/D-04: topTags 高频标签聚合（top 5）
        // 微信云数据库 aggregate unwind 支持有限 → 拉取全量 tags 字段（评价量小）在 JS 算频次
        let topTags = []
        try {
          const allTagsRes = await db.collection('reviews')
            .field({ tags: true })
            .get()
          const freq = {}
          for (const r of (allTagsRes.data || [])) {
            if (Array.isArray(r.tags)) {
              for (const t of r.tags) {
                if (typeof t === 'string' && ALLOWED_TAG_KEYS.indexOf(t) >= 0) {
                  freq[t] = (freq[t] || 0) + 1
                }
              }
            }
          }
          topTags = Object.keys(freq)
            .map(key => ({ key, label: TAG_LABELS[key] || key, count: freq[key] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        } catch (e) {
          if (!isCollectionMissing(e)) throw e
          // reviews 集合不存在 → topTags = []
        }

        return {
          errCode: 0,
          data: { average, total, recent, topTags }
        }
      } catch (error) {
        if (isCollectionMissing(error)) {
          return { errCode: 0, data: { average: '0.0', total: 0, recent: [], topTags: [] } }
        }
        console.error('获取评价统计失败:', error)
        return { errCode: -1, errMsg: '获取评价统计失败' }
      }
    }

    case 'getByBooking': {
      // D-12: 根据 booking_id + user_openid 查询评价
      const { booking_id } = event
      try {
        if (!booking_id) {
          return { errCode: -1, errMsg: '缺少预约ID' }
        }
        const { data } = await db.collection('reviews')
          .where({
            booking_id: booking_id,
            user_openid: openid
          })
          .limit(1)
          .get()

        return {
          errCode: 0,
          data: data.length > 0 ? data[0] : null
        }
      } catch (error) {
        if (isCollectionMissing(error)) {
          return { errCode: 0, data: null }
        }
        console.error('查询预约评价失败:', error)
        return { errCode: -1, errMsg: '查询评价失败' }
      }
    }

    case 'reply': {
      // REVW-07: 化妆师回复评价（仅化妆师可操作）
      const { review_id, content } = event
      try {
        if (!review_id) {
          return { errCode: -1, errMsg: '缺少评价ID' }
        }

        const authCheck = await requireArtist(wxContext, db)
        if (!authCheck.ok) return authCheck.response

        const trimmedContent = (content || '').slice(0, 200)

        // 空内容 = 删除回复
        if (!trimmedContent) {
          await db.collection('reviews').doc(review_id).update({
            data: { artist_reply: '', artist_reply_at: null }
          })
          return { errCode: 0, data: { artist_reply: '' } }
        }

        // 内容安全审查
        try {
          const secResult = await cloud.openapi.security.msgSecCheck({
            content: trimmedContent,
            openid: openid,
            scene: 2,
            version: 2
          })
          if (secResult.errCode === 87014) {
            return { errCode: -1, errMsg: '回复内容包含不当信息，请修改后重新提交' }
          }
        } catch (secErr) {
          console.error('msgSecCheck 调用失败:', secErr)
          return { errCode: -1, errMsg: '内容安全检查失败，请稍后重试' }
        }

        await db.collection('reviews').doc(review_id).update({
          data: {
            artist_reply: trimmedContent,
            artist_reply_at: db.serverDate()
          }
        })

        return { errCode: 0, data: { artist_reply: trimmedContent } }
      } catch (error) {
        console.error('回复评价失败:', error)
        return { errCode: -1, errMsg: '回复失败' }
      }
    }

    case 'delete': {
      // REVW-14/D-18: 删除评价（仅化妆师可操作）
      // 流程：requireArtist 鉴权 → 删云存储图片 → 删 reviews 文档 → 同步 artist_profile 冗余
      const { review_id } = event
      try {
        if (!review_id) {
          return { errCode: -1, errMsg: '缺少评价ID' }
        }

        // T-21-04 mitigate: 仅化妆师可删除
        const authCheck = await requireArtist(wxContext, db)
        if (!authCheck.ok) return authCheck.response

        // 取评价文档（确认存在 + 拿 images 用于清理）
        let review
        try {
          const r = await db.collection('reviews').doc(review_id).get()
          review = r.data
        } catch (e) {
          return { errCode: -1, errMsg: '评价不存在' }
        }
        if (!review) {
          return { errCode: -1, errMsg: '评价不存在' }
        }

        // D-09: 删除评价关联的云存储图片（防孤立文件累积，best-effort 不阻塞删除）
        if (Array.isArray(review.images) && review.images.length > 0) {
          try {
            // 服务端 SDK 使用 cloud.deleteFile（非 miniprogram 的 wx.cloud.deleteCloudFile）
            await cloud.deleteFile({ fileList: review.images })
          } catch (delErr) {
            console.error('删除评价图片失败（已忽略）:', delErr)
          }
        }

        // 删除 reviews 文档
        await db.collection('reviews').doc(review_id).remove()

        // REVW-14: 同步 artist_profile 冗余字段
        await syncArtistRating()

        return { errCode: 0 }
      } catch (error) {
        console.error('删除评价失败:', error)
        return { errCode: -1, errMsg: '删除评价失败' }
      }
    }

    default:
      return { errCode: -1, errMsg: '未知操作' }
  }
}
