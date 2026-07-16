const cloud = require('wx-server-sdk')
const { requireArtist, sanitizeProfileUpdate } = require('./shared/auth')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 化妆师个人资料云函数
 *
 * event.action:
 * - 'get': 获取化妆师公开资料（任何用户可调用）
 * - 'update': 更新化妆师资料（仅化妆师可调用）
 * - 'init': 初始化默认资料（仅化妆师，首次使用时）
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (event.action) {
    case 'get': {
      try {
        // artist_profile 是单文档集合 — 获取第一条记录
        const query = await db.collection('artist_profile')
          .limit(1)
          .get()

        if (query.data.length === 0) {
          // 没有数据 — 返回默认占位资料
          return {
            errCode: 0,
            data: getDefaultProfile()
          }
        }

        const profile = query.data[0]
        // 去掉内部字段
        delete profile._openid

        return {
          errCode: 0,
          data: profile
        }
      } catch (error) {
        console.error('获取资料失败:', error)
        return { errCode: -1, errMsg: '获取资料失败' }
      }
    }

    case 'update': {
      try {
        // SEC-04: 服务端身份验证 — 只有化妆师可以更新资料
        // requireArtist 改为 async（查 artist_profile._openid 权威源）
        const authCheck = await requireArtist(wxContext, db)
        if (!authCheck.ok) return authCheck.response

        // 字段白名单过滤 (per D-13)
        const updateData = sanitizeProfileUpdate(event.data || {})
        updateData.updated_at = db.serverDate()

        const query = await db.collection('artist_profile')
          .limit(1)
          .get()

        if (query.data.length === 0) {
          // 创建资料
          await db.collection('artist_profile').add({ data: updateData })
        } else {
          // 更新资料
          await db.collection('artist_profile')
            .doc(query.data[0]._id)
            .update({ data: updateData })
        }

        return { errCode: 0, data: { success: true } }
      } catch (error) {
        console.error('更新资料失败:', error)
        return { errCode: -1, errMsg: '更新资料失败' }
      }
    }

    case 'init': {
      try {
        // SEC-04 bootstrap: init 不再调用 requireArtist（鸡生蛋问题——artist_profile
        // 不存在时 requireArtist 永远失败）。改为幂等创建：artist_profile 已存在则
        // 拒绝（防抢占），不存在时允许当前调用者创建，_openid 由云开发自动注入锁定。
        const existing = await db.collection('artist_profile')
          .limit(1)
          .get()

        if (existing.data.length > 0) {
          return { errCode: -1, errMsg: '化妆师资料已存在，无法重复初始化' }
        }

        const defaultProfile = getDefaultProfile()
        await db.collection('artist_profile').add({ data: defaultProfile })

        return { errCode: 0, data: defaultProfile, message: '初始化成功' }
      } catch (error) {
        console.error('初始化资料失败:', error)
        return { errCode: -1, errMsg: '初始化资料失败' }
      }
    }

    default:
      return { errCode: -1, errMsg: '未知操作' }
  }
}

/**
 * 默认化妆师资料 — 占位数据
 * 用户看到后知道这是模板，需要化妆师填写真实信息
 * REVW-14/D-17: avg_rating / total_reviews 冗余字段默认 0（新资料稳定读取）
 */
function getDefaultProfile() {
  return {
    name: '化妆师',
    avatar: '',
    bio: '一位热爱美的化妆师，专注打造属于你的独特妆容。',
    experience: '5年从业经验',
    experience_years: 0,
    style_tags: [],
    specialties: ['新娘妆', '日常妆', '订婚妆'],
    contact_info: {
      wechat: '',
      phone: '',
      location: ''
    },
    working_schedule: {
      off_days: [],
      work_start: '09:00',
      work_end: '18:00'
    },
    // REVW-14: 评价冗余统计字段（创建/删除评价时由 reviews 云函数同步）
    avg_rating: 0,
    total_reviews: 0,
    created_at: new Date(),
    updated_at: new Date()
  }
}
