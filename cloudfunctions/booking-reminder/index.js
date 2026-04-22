const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const TEMPLATE_ID = '-i6OevJwdS5fGFXCsB9Xux4zaaxUkXTR0xfLg5T48jM'

// 计算"明天"的日期字符串 YYYY-MM-DD
function getTomorrowDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

exports.main = async (event, context) => {
  const tomorrow = getTomorrowDate()

  // 查询明天所有已确认的预约（per D-09: 只提醒 accepted）
  const { data: bookings } = await db.collection('bookings')
    .where({
      booking_date: tomorrow,
      status: 'accepted'
    })
    .get()

  console.log(`找到 ${bookings.length} 个明天(${tomorrow})的已确认预约`)

  // 逐个发送提醒（per D-08: 使用现有模板，phrase5 设为 "预约提醒"）
  let successCount = 0
  for (const booking of bookings) {
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: booking.user_openid,
        templateId: TEMPLATE_ID,
        page: 'pages/profile/history',
        data: {
          thing1: { value: booking.service_name || '化妆服务' },
          date2: { value: `${booking.booking_date} ${booking.booking_time}` },
          date3: { value: `${booking.booking_date} ${booking.booking_time}` },
          thing4: { value: booking.special_needs || booking.notes || '无' },
          phrase5: { value: '预约提醒' }
        }
      })
      successCount++
    } catch (err) {
      // per D-10: 发送失败静默吞掉，不影响其他用户
      console.error(`发送提醒失败(${booking._id}):`, err)
    }
  }

  return {
    errCode: 0,
    data: { total: bookings.length, success: successCount }
  }
}
