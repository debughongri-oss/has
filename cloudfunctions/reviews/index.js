const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { requireArtist } = require('./shared/auth')

// reviews 集合尚未创建（还没有任何评价）时，查询会抛错，视为「空数据」处理
const isCollectionMissing = (error) => {
  if (!error) return false
  const msg = error.errMsg || error.message || ''
  return error.errCode === -502005 || /not exist|COLLECTION_NOT_EXIST|ResourceNotFound/i.test(msg)
}

/**
 * reviews 云函数 — 评价系统
 * Actions: create, list, getStats, getByBooking
 *
 * D-01: 独立 reviews 集合
 * D-08/D-09: msgSecCheck 内容安全审查（微信审核硬要求）
 * D-11: 服务端双重防重复（booking_id 唯一查重 + booking 状态校验）
 * D-17: getStats 实时聚合计算
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (event.action) {
    case 'create': {
      // SEC-05: 移除对 event.user_nickname/user_avatar 的信任，改由服务端按 openid 查 users 集合取权威值
      const { booking_id, rating, content } = event
      try {
        // 参数校验
        if (!booking_id) {
          return { errCode: -1, errMsg: '缺少预约ID' }
        }
        if (!rating || rating < 1 || rating > 5) {
          return { errCode: -1, errMsg: '请选择评分（1-5星）' }
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

        // SEC-05: 服务端权威读取用户昵称/头像，客户端传入被忽略
        const userRes = await db.collection('users').where({ _openid: openid }).limit(1).get()
        const user = userRes.data[0] || {}
        const userNickname = user.nickname || ''
        const userAvatar = user.avatar_url || ''

        // D-02: 写入 reviews 集合
        const reviewData = {
          booking_id: booking_id,
          user_openid: openid,
          user_nickname: userNickname,
          user_avatar: userAvatar,
          service_id: booking.data.service_id || '',
          service_name: booking.data.service_name || '',
          rating: rating,
          content: trimmedContent,
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }

        const res = await db.collection('reviews').add({ data: reviewData })

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
      // D-19: 分页查询 reviews，按 created_at 倒序
      const { page = 1, pageSize = 10 } = event
      try {
        const total = (await db.collection('reviews').count()).total
        const data = await db.collection('reviews')
          .orderBy('created_at', 'desc')
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
      // POL-06: 改用数据库聚合管道，替代拉取 1000 条内存计算
      try {
        const $ = db.command.aggregate

        // 聚合查询：服务端计算 total + average
        const statsResult = await db.collection('reviews').aggregate()
          .group({
            _id: null,
            total: $.sum(1),
            avgRating: $.avg('$rating')
          })
          .end()

        // 集合为空时聚合返回空 list
        if (!statsResult.list || statsResult.list.length === 0) {
          return {
            errCode: 0,
            data: { average: '0.0', total: 0, recent: [] }
          }
        }

        const stats = statsResult.list[0]
        const average = Number(stats.avgRating || 0).toFixed(1)

        // 最近 3 条评价（独立小查询，仅取需要的字段）
        const recentResult = await db.collection('reviews')
          .orderBy('created_at', 'desc')
          .limit(3)
          .field({ rating: true, content: true, user_nickname: true, created_at: true, artist_reply: true })
          .get()

        const recent = (recentResult.data || []).map(r => ({
          rating: r.rating,
          content: r.content ? r.content.slice(0, 30) : '',
          user_nickname: r.user_nickname || '',
          artist_reply: r.artist_reply || '',
          created_at: r.created_at
        }))

        return {
          errCode: 0,
          data: { average, total: stats.total, recent }
        }
      } catch (error) {
        if (isCollectionMissing(error)) {
          return { errCode: 0, data: { average: '0.0', total: 0, recent: [] } }
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

    default:
      return { errCode: -1, errMsg: '未知操作' }
  }
}
