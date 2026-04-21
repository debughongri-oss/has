const cloud = require('wx-server-sdk')
const { requireArtist } = require('../shared/auth')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const TIME_SLOTS = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30']
const TEMPLATE_ID = '-i6OevJwdS5fGFXCsB9Xux4zaaxUkXTR0xfLg5T48jM'

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
        thing4: { value: booking.notes || '无' },
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
      const { date } = event
      try {
        const existing = await db.collection('bookings')
          .where({
            booking_date: date,
            status: _.in(['pending', 'accepted'])
          })
          .get()
        const bookedSlots = existing.data.map(b => b.booking_time)
        const availableSlots = TIME_SLOTS.filter(s => !bookedSlots.includes(s))
        return { errCode: 0, data: { available: availableSlots, all: TIME_SLOTS } }
      } catch (error) {
        console.error('获取可用时段失败:', error)
        return { errCode: -1, errMsg: '获取可用时段失败' }
      }
    }

    case 'create': {
      const { service_id, service_name, booking_date, booking_time, notes, user_info } = event
      try {
        const existing = await db.collection('bookings')
          .where({
            booking_date,
            booking_time,
            status: _.in(['pending', 'accepted'])
          })
          .get()

        if (existing.data.length > 0) {
          return { errCode: -1, errMsg: '该时段已被预约，请选择其他时间' }
        }

        const booking = {
          user_openid: openid,
          user_info: user_info || {},
          service_id,
          service_name,
          booking_date,
          booking_time,
          notes: notes || '',
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
        let query = db.collection('bookings')
        const conditions = {}
        if (status) {
          conditions.status = status
        }
        if (Object.keys(conditions).length > 0) {
          query = query.where(conditions)
        }
        const total = (await query.count()).total
        const data = await query
          .orderBy('booking_date', 'desc')
          .orderBy('booking_time', 'asc')
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .get()
        return {
          errCode: 0,
          data: { list: data.data, total, page, pageSize, hasMore: page * pageSize < total }
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
        const authCheck = requireArtist(wxContext)
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

    default:
      return { errCode: -1, errMsg: '未知操作' }
  }
}
