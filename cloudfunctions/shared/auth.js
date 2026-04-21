/**
 * 服务端安全验证模块
 * 供云函数 require 引入 — 不是独立云函数
 *
 * 提供两个功能：
 * 1. requireArtist(wxContext) — isArtist 身份验证
 * 2. sanitizeProfileUpdate(data) — profile update 字段白名单过滤
 */

const ARTIST_OPENID = 'oDmtI48gecuF3n9OkEBJN91BJliI'

// profile update 允许的字段白名单 (per D-13)
const PROFILE_ALLOWED_FIELDS = [
  'name', 'bio', 'experience', 'experience_years',
  'service_area', 'specialties', 'avatar', 'contact_info'
]

/**
 * 验证调用者是否为化妆师身份
 * @param {object} wxContext - cloud.getWXContext() 返回值
 * @returns {{ ok: boolean, response?: object }} ok=true 通过，ok=false 时 response 为错误响应
 */
function requireArtist(wxContext) {
  if (wxContext.OPENID === ARTIST_OPENID) {
    return { ok: true }
  }
  return {
    ok: false,
    response: { errCode: -1, errMsg: '无权限操作' }
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
