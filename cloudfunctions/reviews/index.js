const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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
      const { booking_id, rating, content, user_nickname, user_avatar } = event
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
        const existingReview = await db.collection('reviews')
          .where({ booking_id: booking_id })
          .limit(1)
          .get()

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

        // D-02: 写入 reviews 集合
        const reviewData = {
          booking_id: booking_id,
          user_openid: openid,
          user_nickname: user_nickname || '',
          user_avatar: user_avatar || '',
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
        console.error('获取评价列表失败:', error)
        return { errCode: -1, errMsg: '获取评价列表失败' }
      }
    }

    case 'getStats': {
      // D-16/D-17: 实时聚合计算平均评分、总数、最近3条评价
      try {
        const { data: reviews } = await db.collection('reviews')
          .orderBy('created_at', 'desc')
          .limit(1000)
          .get()

        if (reviews.length === 0) {
          return {
            errCode: 0,
            data: { average: '0.0', total: 0, recent: [] }
          }
        }

        const total = reviews.length
        const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0)
        const average = (sum / total).toFixed(1)

        // 最近3条评价，content 截断到30字
        const recent = reviews.slice(0, 3).map(r => ({
          rating: r.rating,
          content: r.content ? r.content.slice(0, 30) : '',
          user_nickname: r.user_nickname || '',
          created_at: r.created_at
        }))

        return {
          errCode: 0,
          data: { average, total, recent }
        }
      } catch (error) {
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
        console.error('查询预约评价失败:', error)
        return { errCode: -1, errMsg: '查询评价失败' }
      }
    }

    default:
      return { errCode: -1, errMsg: '未知操作' }
  }
}
