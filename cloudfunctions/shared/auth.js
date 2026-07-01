/**
 * 服务端安全验证模块
 * 供云函数 require 引入 — 不是独立云函数
 *
 * 提供两个功能：
 * 1. requireArtist(wxContext, db) — isArtist 身份验证（查 artist_profile._openid 权威源）
 * 2. sanitizeProfileUpdate(data) — profile update 字段白名单过滤
 *
 * SEC-04 (Phase 11): 化妆师身份由 artist_profile._openid 单一权威源，
 *                    移除硬编码 ARTIST_OPENID magic constant。
 */

// profile update 允许的字段白名单 (per D-13)
const PROFILE_ALLOWED_FIELDS = [
  'name', 'bio', 'experience', 'experience_years',
  'service_area', 'specialties', 'avatar', 'contact_info'
]

/**
 * 验证调用者是否为化妆师身份
 * SEC-04: 查询 artist_profile 集合的 _openid 字段作为单一权威源
 *
 * @param {object} wxContext - cloud.getWXContext() 返回值
 * @param {object} db - 已初始化的 cloud.database() 实例（由调用方传入，避免每个副本各自 cloud.init）
 * @returns {Promise<{ ok: boolean, response?: object }>} ok=true 通过，ok=false 时 response 为错误响应
 */
async function requireArtist(wxContext, db) {
  try {
    const { data } = await db.collection('artist_profile').limit(1).get()
    if (data.length === 0) {
      return { ok: false, response: { errCode: -1, errMsg: '化妆师资料未初始化' } }
    }
    if (wxContext.OPENID === data[0]._openid) {
      return { ok: true }
    }
    return { ok: false, response: { errCode: -1, errMsg: '无权限操作' } }
  } catch (err) {
    console.error('requireArtist 查询失败:', err)
    return { ok: false, response: { errCode: -1, errMsg: '身份验证失败' } }
  }
}

/**
 * 过滤 profile update 数据，只保留白名单字段
 * @param {object} data - 客户端提交的更新数据
 * @returns {object} 过滤后的数据
 */
function sanitizeProfileUpdate(data) {
  return Object.keys(data)
    .filter(key => PROFILE_ALLOWED_FIELDS.includes(key))
    .reduce((acc, key) => {
      acc[key] = data[key]
      return acc
    }, {})
}

module.exports = { requireArtist, sanitizeProfileUpdate }
