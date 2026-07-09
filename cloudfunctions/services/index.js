const cloud = require('wx-server-sdk')
const { requireArtist } = require('./shared/auth')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// booking_window：正整数（天）=可预约未来 N 天；其余一律归一为 null（=不限）
const sanitizeBookingWindow = (raw) => {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  switch (event.action) {
    case 'list': {
      try {
        const res = await db.collection('services')
          .where({ is_active: true })
          .orderBy('sort_order', 'asc')
          .orderBy('created_at', 'desc')
          .limit(100)
          .get()
        return { errCode: 0, data: res.data }
      } catch (error) {
        console.error('获取服务列表失败:', error)
        return { errCode: -1, errMsg: '获取服务列表失败' }
      }
    }

    case 'listAll': {
      try {
        const res = await db.collection('services')
          .orderBy('sort_order', 'asc')
          .orderBy('created_at', 'desc')
          .limit(100)
          .get()
        return { errCode: 0, data: res.data }
      } catch (error) {
        console.error('获取服务列表失败:', error)
        return { errCode: -1, errMsg: '获取服务列表失败' }
      }
    }

    case 'detail': {
      try {
        const res = await db.collection('services').doc(event.id).get()
        return { errCode: 0, data: res.data }
      } catch (error) {
        console.error('获取服务详情失败:', error)
        return { errCode: -1, errMsg: '服务不存在' }
      }
    }

    case 'create': {
      try {
        const authCheck = await requireArtist(wxContext, db)
        if (!authCheck.ok) return authCheck.response

        const data = {
          ...event.data,
          booking_window: sanitizeBookingWindow(event.data && event.data.booking_window),
          is_active: true,
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }
        const res = await db.collection('services').add({ data })
        return { errCode: 0, data: { _id: res._id } }
      } catch (error) {
        console.error('创建服务失败:', error)
        return { errCode: -1, errMsg: '创建服务失败' }
      }
    }

    case 'update': {
      try {
        const authCheck = await requireArtist(wxContext, db)
        if (!authCheck.ok) return authCheck.response

        const data = { ...event.data, updated_at: db.serverDate() }
        data.booking_window = sanitizeBookingWindow(event.data && event.data.booking_window)
        await db.collection('services').doc(event.id).update({ data })
        return { errCode: 0, data: { success: true } }
      } catch (error) {
        console.error('更新服务失败:', error)
        return { errCode: -1, errMsg: '更新服务失败' }
      }
    }

    case 'delete': {
      try {
        const authCheck = await requireArtist(wxContext, db)
        if (!authCheck.ok) return authCheck.response

        await db.collection('services').doc(event.id).remove()
        return { errCode: 0, data: { success: true } }
      } catch (error) {
        console.error('删除服务失败:', error)
        return { errCode: -1, errMsg: '删除服务失败' }
      }
    }

    default:
      return { errCode: -1, errMsg: '未知操作' }
  }
}
