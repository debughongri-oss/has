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
    await cloud.openapi.subscribeMessage.send({
      touser: booking.user_openid,
      templateId: TEMPLATE_ID,
      page: `pages/profile/history`,
      data: {
        thing1: { value: booking.service_name || '化妆服务' },
        date2: { value: `${booking.booking_date} ${booking.booking_time}` },
        date3: { value: `${booking.booking_date} ${booking.booking_time}` },
        thing4: { value: booking.special_needs || booking.notes || '无' },
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

        // 按时长区间重叠检测：某时段可用 = 不与任何已有预约的时间范围重叠
        const availableSlots = TIME_SLOTS.filter(slot => {
          const slotStart = parseTime(slot)
          const slotEnd = slotStart + duration
          return !existing.data.some(booking => {
            const bookStart = parseTime(booking.booking_time)
            const bookDur = (booking.service_duration && booking.service_duration > 0)
              ? booking.service_duration : DEFAULT_DURATION
            return hasOverlap(slotStart, duration, bookStart, bookDur)
          })
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

    default:
      return { errCode: -1, errMsg: '未知操作' }
  }
}
