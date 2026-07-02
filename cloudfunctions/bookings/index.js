const cloud = require('wx-server-sdk')
const { requireArtist } = require('./shared/auth')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

const TIME_SLOTS = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30']
const TEMPLATE_ID = '-i6OevJwdS5fGFXCsB9Xux4zaaxUkXTR0xfLg5T48jM'
const DEFAULT_DURATION = 90 // 默认服务时长（分钟），duration 为 0 或缺失时使用

// "HH:MM" → 分钟数（BOOK-17: 时长冲突检测用）
const parseTime = (t) => {
  const parts = String(t || '').split(':')
  return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0)
}

// 区间重叠检测：[s1, s1+d1) 与 [s2, s2+d2) 是否有交集
const hasOverlap = (s1, d1, s2, d2) => {
  return s1 < s2 + d2 && s2 < s1 + d1
}

const STATUS_LABELS = {
  pending: '待确认',
  accepted: '已确认',
  rejected: '已拒绝',
  cancelled: '已取消',
  completed: '已完成'
}

async function sendNotify(booking, status) {
  try {
    // CONV-02: 完成时通知中提示评价，并跳转到预约记录页
    const isCompleted = status === 'completed'
    await cloud.openapi.subscribeMessage.send({
      touser: booking.user_openid,
      templateId: TEMPLATE_ID,
      page: isCompleted && booking._id
        ? `pages/review/create?booking_id=${booking._id}`
        : 'pages/profile/history',
      data: {
        thing1: { value: booking.service_name || '化妆服务' },
        date2: { value: `${booking.booking_date} ${booking.booking_time}` },
        date3: { value: `${booking.booking_date} ${booking.booking_time}` },
        thing4: { value: isCompleted ? '服务完成，期待您的评价' : (booking.special_needs || booking.notes || '无') },
        phrase5: { value: STATUS_LABELS[status] || status }
      }
    })
  } catch (err) {
    console.error('发送订阅消息失败:', err)
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (event.action) {
    case 'getAvailableSlots': {
      // BOOK-17: 按服务时长计算真正可用时段（不再仅排除精确匹配）
      const { date, service_id } = event
      try {
        // 查询服务时长
        let duration = DEFAULT_DURATION
        if (service_id) {
          try {
            const svc = await db.collection('services').doc(service_id).get()
            duration = (svc.data.duration && svc.data.duration > 0) ? svc.data.duration : DEFAULT_DURATION
          } catch (e) { /* 服务不存在用默认时长 */ }
        }

        const existing = await db.collection('bookings')
          .where({
            booking_date: date,
            status: _.in(['pending', 'accepted'])
          })
          .get()

        // AVAIL-02: 查询时间屏蔽
        let blockedDates = []
        try {
          const blocked = await db.collection('time_blocks')
            .where({ block_date: date }).get()
          blockedDates = blocked.data
        } catch (e) { /* time_blocks 集合可能不存在 */ }

        const availableSlots = TIME_SLOTS.filter(slot => {
          const slotStart = parseTime(slot)
          const slotEnd = slotStart + duration

          // 检查预约冲突
          const bookingConflict = existing.data.some(booking => {
            const bookStart = parseTime(booking.booking_time)
            const bookDur = (booking.service_duration && booking.service_duration > 0)
              ? booking.service_duration : DEFAULT_DURATION
            return hasOverlap(slotStart, duration, bookStart, bookDur)
          })
          if (bookingConflict) return false

          // AVAIL-02: 检查时间屏蔽（全日屏蔽或特定时段屏蔽）
          if (blockedDates.length > 0) {
            const fullDayBlock = blockedDates.some(b => !b.block_time)
            if (fullDayBlock) return false
            const slotBlock = blockedDates.some(b => b.block_time === slot)
            if (slotBlock) return false
          }

          return true
        })

        return { errCode: 0, data: { available: availableSlots, all: TIME_SLOTS } }
      } catch (error) {
        console.error('获取可用时段失败:', error)
        return { errCode: -1, errMsg: '获取可用时段失败' }
      }
    }

    case 'create': {
      // SEC-05: 移除对 event.user_info 的信任，改由服务端按 openid 查 users 集合取权威值
      const { service_id, service_name, booking_date, booking_time, service_mode, service_mode_label, service_address, contact_info, skin_type, special_needs, occasion } = event
      try {
        const mode = service_mode === 'home' ? 'home' : 'store'
        const address = String(service_address || '').trim()
        const contact = contact_info || {}
        const phone = String(contact.phone || '').trim()
        const wechat = String(contact.wechat || '').trim()

        if (mode === 'home' && !address) {
          return { errCode: -1, errMsg: '请填写上门地址' }
        }
        if (!phone && !wechat) {
          return { errCode: -1, errMsg: '请填写联系方式' }
        }

        // BOOK-17: 查询服务时长
        let serviceDuration = DEFAULT_DURATION
        if (service_id) {
          try {
            const svc = await db.collection('services').doc(service_id).get()
            serviceDuration = (svc.data.duration && svc.data.duration > 0) ? svc.data.duration : DEFAULT_DURATION
          } catch (e) { /* 用默认时长 */ }
        }

        // BOOK-17: 按时长区间重叠检测（替代精确时间段匹配）
        const dayBookings = await db.collection('bookings')
          .where({
            booking_date,
            status: _.in(['pending', 'accepted'])
          })
          .get()

        const newStart = parseTime(booking_time)
        const conflict = dayBookings.data.some(booking => {
          const bookStart = parseTime(booking.booking_time)
          const bookDur = (booking.service_duration && booking.service_duration > 0)
            ? booking.service_duration : DEFAULT_DURATION
          return hasOverlap(newStart, serviceDuration, bookStart, bookDur)
        })

        if (conflict) {
          return { errCode: -1, errMsg: '该时段与已有预约时间冲突，请选择其他时间' }
        }

        // SEC-05: 服务端权威读取用户昵称/头像，客户端传入被忽略
        const userRes = await db.collection('users').where({ _openid: openid }).limit(1).get()
        const user = userRes.data[0] || {}
        const userInfo = {
          nickname: user.nickname || '',
          avatar_url: user.avatar_url || ''
        }

        const booking = {
          user_openid: openid,
          user_info: userInfo,
          service_id,
          service_name,
          service_duration: serviceDuration,
          booking_date,
          booking_time,
          service_mode: mode,
          service_mode_label: service_mode_label || (mode === 'home' ? '上门' : '到店'),
          service_address: mode === 'home' ? address : '',
          contact_info: { phone, wechat },
          skin_type: skin_type || '',
          special_needs: special_needs || '',
          occasion: occasion || '',
          status: 'pending',
          artist_notes: '',
          reject_reason: '',
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }
        const res = await db.collection('bookings').add({ data: booking })
        return { errCode: 0, data: { _id: res._id } }
      } catch (error) {
        console.error('创建预约失败:', error)
        return { errCode: -1, errMsg: '创建预约失败' }
      }
    }

    case 'list': {
      const { status, page = 1, pageSize = 10 } = event
      try {
        // 「全部」排除已取消（已取消＝客户撤回的待确认单，不在管理端展示）
        const filter = status ? { status } : { status: _.neq('cancelled') }
        const query = db.collection('bookings').where(filter)
        const total = (await query.count()).total
        const data = await query
          .orderBy('booking_date', 'desc')
          .orderBy('booking_time', 'asc')
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .get()
        // 各状态计数（不受当前筛选影响、不含已取消），供管理端 tab 展示
        const countsAgg = await db.collection('bookings')
          .aggregate()
          .match({ status: _.neq('cancelled') })
          .group({ _id: '$status', count: $.sum(1) })
          .end()
        const statusCounts = {}
        countsAgg.list.forEach(g => { statusCounts[g._id] = g.count })
        return {
          errCode: 0,
          data: { list: data.data, total, page, pageSize, hasMore: page * pageSize < total, statusCounts }
        }
      } catch (error) {
        console.error('获取预约列表失败:', error)
        return { errCode: -1, errMsg: '获取预约列表失败' }
      }
    }

    case 'myBookings': {
      const { page = 1, pageSize = 20 } = event
      try {
        const total = (await db.collection('bookings').where({ user_openid: openid }).count()).total
        const data = await db.collection('bookings')
          .where({ user_openid: openid })
          .orderBy('created_at', 'desc')
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .get()
        return {
          errCode: 0,
          data: { list: data.data, total, page, pageSize, hasMore: page * pageSize < total }
        }
      } catch (error) {
        console.error('获取我的预约失败:', error)
        return { errCode: -1, errMsg: '获取预约记录失败' }
      }
    }

    case 'detail': {
      try {
        const res = await db.collection('bookings').doc(event.id).get()
        return { errCode: 0, data: res.data }
      } catch (error) {
        console.error('获取预约详情失败:', error)
        return { errCode: -1, errMsg: '预约不存在' }
      }
    }

    case 'updateStatus': {
      const { id, status, artist_notes, reject_reason } = event
      try {
        const authCheck = await requireArtist(wxContext, db)
        if (!authCheck.ok) return authCheck.response

        const updateData = { status, updated_at: db.serverDate() }
        if (artist_notes !== undefined) updateData.artist_notes = artist_notes
        if (reject_reason !== undefined) updateData.reject_reason = reject_reason
        await db.collection('bookings').doc(id).update({ data: updateData })
        const booking = await db.collection('bookings').doc(id).get()
        if (['accepted', 'rejected', 'completed'].includes(status)) {
          await sendNotify(booking.data, status)
        }
        return { errCode: 0, data: { success: true } }
      } catch (error) {
        console.error('更新预约状态失败:', error)
        return { errCode: -1, errMsg: '更新状态失败' }
      }
    }

    case 'cancel': {
      try {
        const booking = await db.collection('bookings').doc(event.id).get()
        if (booking.data.user_openid !== openid) {
          return { errCode: -1, errMsg: '无权操作' }
        }
        if (booking.data.status !== 'pending') {
          return { errCode: -1, errMsg: '只能取消待确认的预约' }
        }
        await db.collection('bookings').doc(event.id).update({
          data: { status: 'cancelled', updated_at: db.serverDate() }
        })
        return { errCode: 0, data: { success: true } }
      } catch (error) {
        console.error('取消预约失败:', error)
        return { errCode: -1, errMsg: '取消预约失败' }
      }
    }

    case 'getCalendarData': {
      const { year, month } = event
      try {
        const authCheck = await requireArtist(wxContext, db)
        if (!authCheck.ok) return authCheck.response

        // 构造该月的日期范围
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        // 计算下月第一天
        let nextMonth = month + 1
        let nextYear = year
        if (nextMonth > 12) { nextMonth = 1; nextYear = year + 1 }
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

        // 查询该月所有非取消的预约
        const { data: bookings } = await db.collection('bookings')
          .where({
            booking_date: _.gte(startDate).and(_.lt(endDate)),
            status: _.neq('cancelled')
          })
          .orderBy('booking_date', 'asc')
          .orderBy('booking_time', 'asc')
          .get()

        // 按日期分组（服务端分组，减少客户端计算 per D-13）
        const grouped = {}
        bookings.forEach(b => {
          if (!grouped[b.booking_date]) {
            grouped[b.booking_date] = []
          }
          grouped[b.booking_date].push(b)
        })

        return {
          errCode: 0,
          data: {
            grouped,
            bookings
          }
        }
      } catch (error) {
        console.error('获取日历数据失败:', error)
        return { errCode: -1, errMsg: '获取日历数据失败' }
      }
    }

    case 'blockTime': {
      // AVAIL-01: 化妆师屏蔽日期/时段
      const authCheck = await requireArtist(wxContext, db)
      if (!authCheck.ok) return authCheck.response

      const { date, time_slot, reason } = event
      if (!date) return { errCode: -1, errMsg: '缺少日期' }

      try {
        // 检查是否已存在相同屏蔽
        const existing = await db.collection('time_blocks')
          .where({ block_date: date, block_time: time_slot || '' })
          .limit(1).get()
        if (existing.data.length > 0) {
          return { errCode: -1, errMsg: '该日期/时段已屏蔽' }
        }

        const res = await db.collection('time_blocks').add({
          data: {
            block_date: date,
            block_time: time_slot || '',
            reason: reason || '',
            created_at: db.serverDate()
          }
        })
        return { errCode: 0, data: { _id: res._id } }
      } catch (error) {
        console.error('屏蔽时间失败:', error)
        return { errCode: -1, errMsg: '屏蔽失败' }
      }
    }

    case 'unblockTime': {
      const authCheck = await requireArtist(wxContext, db)
      if (!authCheck.ok) return authCheck.response

      try {
        await db.collection('time_blocks').doc(event.block_id).remove()
        return { errCode: 0, data: {} }
      } catch (error) {
        console.error('取消屏蔽失败:', error)
        return { errCode: -1, errMsg: '取消屏蔽失败' }
      }
    }

    case 'getBlockedTimes': {
      const authCheck = await requireArtist(wxContext, db)
      if (!authCheck.ok) return authCheck.response

      const { year, month } = event
      try {
        const prefix = year + '-' + String(month).padStart(2, '0')
        const { data } = await db.collection('time_blocks')
          .where({ block_date: db.regex('^' + prefix) })
          .orderBy('block_date', 'asc')
          .get()
        return { errCode: 0, data: { blocks: data } }
      } catch (error) {
        if (/not exist|COLLECTION_NOT_EXIST/i.test(error.errMsg || '')) {
          return { errCode: 0, data: { blocks: [] } }
        }
        console.error('获取屏蔽时间失败:', error)
        return { errCode: -1, errMsg: '获取失败' }
      }
    }

    case 'getDashboard': {
      // DASH-01: 化妆师经营数据看板
      const authCheck = await requireArtist(wxContext, db)
      if (!authCheck.ok) return authCheck.response

      try {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

        // 本月预约统计
        const monthBookings = await db.collection('bookings')
          .where({ booking_date: db.regex('^' + now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')) })
          .get()

        const statusCounts = { pending: 0, accepted: 0, completed: 0, rejected: 0, cancelled: 0 }
        let revenue = 0
        const serviceCount = {}

        monthBookings.data.forEach(b => {
          statusCounts[b.status] = (statusCounts[b.status] || 0) + 1
          if (b.status === 'completed') {
            const price = parseFloat(String(b.service_name || '').match(/[\d.]+/)) || 0
            revenue += price
          }
          if (b.service_name) {
            serviceCount[b.service_name] = (serviceCount[b.service_name] || 0) + 1
          }
        })

        // 上月预约数（环比）
        const lastMonthBookings = await db.collection('bookings')
          .where({ booking_date: db.regex('^' + lastMonthStart.getFullYear() + '-' + String(lastMonthStart.getMonth() + 1).padStart(2, '0')) })
          .count()

        // 热门服务 Top3
        const topServices = Object.entries(serviceCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count }))

        // 评价统计
        let reviewStats = { average: '0.0', total: 0 }
        try {
          const rStats = await db.collection('reviews').aggregate()
            .group({ _id: null, total: $.sum(1), avg: $.avg('$rating') })
            .end()
          if (rStats.list.length > 0) {
            reviewStats = { average: Number(rStats.list[0].avg || 0).toFixed(1), total: rStats.list[0].total }
          }
        } catch (e) { /* reviews 集合可能不存在 */ }

        return {
          errCode: 0,
          data: {
            thisMonth: {
              total: monthBookings.data.length,
              pending: statusCounts.pending,
              accepted: statusCounts.accepted,
              completed: statusCounts.completed,
              rejected: statusCounts.rejected,
              cancelled: statusCounts.cancelled
            },
            lastMonthTotal: lastMonthBookings.total,
            revenue,
            topServices,
            reviewStats
          }
        }
      } catch (error) {
        console.error('获取看板数据失败:', error)
        return { errCode: -1, errMsg: '获取看板数据失败' }
      }
    }

    default:
      return { errCode: -1, errMsg: '未知操作' }
  }
}
