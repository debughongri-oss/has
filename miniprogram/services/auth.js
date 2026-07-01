/**
 * 认证服务 — 处理微信静默登录、登录态就绪与角色判断
 *
 * AUTH-01: 用户通过 wx.login 静默获取身份标识
 * SEC-03 (Phase 11): ensureLogin() 提供登录态就绪 Promise，消除冷启动竞态
 * SEC-04 (Phase 11): isArtist 改读服务端权威 is_artist 字段，移除 ARTIST_OPENID 比对
 * SEC-06 (Phase 11): _userInfo 是客户端唯一权威缓存，refreshUserInfo 强制刷新
 */

const { callCloudFunction } = require('./api')

// 客户端唯一用户信息缓存（SEC-06: 消除 globalData 双写）
let _userInfo = null
// 幂等 Promise：并发 ensureLogin 复用同一次 wx.login（SEC-03）
let _loginPromise = null

/**
 * 静默登录
 * 调用 wx.login 获取 code → 云函数换取 openid → 缓存用户信息
 * @returns {Promise<Object>} 用户信息 { openid, role, is_artist, nickname, avatar_url, isNew }
 */
const silentLogin = async () => {
  try {
    // wx.login 获取临时登录凭证 code
    const loginRes = await new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject
      })
    })

    if (!loginRes.code) {
      throw new Error('wx.login 未返回 code')
    }

    // 调用云函数换取 openid 并创建/更新用户记录
    const result = await callCloudFunction('login', {
      action: 'login',
      code: loginRes.code
    })

    if (result.errCode !== 0) {
      throw new Error(result.errMsg || '登录失败')
    }

    _userInfo = result.data || {}

    return _userInfo
  } catch (error) {
    console.error('静默登录失败:', error)
    throw error
  }
}

/**
 * SEC-03: 确保登录态就绪
 * 幂等：已登录直接 resolve，登录中复用同一 Promise，未登录触发 silentLogin
 * 所有身份相关页面应在 onLoad 中 await ensureLogin() 后再读 isArtist()
 * @returns {Promise<Object>} 用户信息
 */
const ensureLogin = () => {
  if (_userInfo) return Promise.resolve(_userInfo)
  if (_loginPromise) return _loginPromise
  _loginPromise = silentLogin().finally(() => {
    _loginPromise = null
  })
  return _loginPromise
}

/**
 * SEC-06: 强制刷新用户信息缓存
 * profile 更新昵称/头像后调用，从服务端 users 集合拉取最新数据
 * @returns {Promise<Object>} 刷新后的用户信息
 */
const refreshUserInfo = async () => {
  try {
    const result = await callCloudFunction('login', { action: 'getUser' })
    if (result.errCode === 0) {
      _userInfo = result.data
      return _userInfo
    }
    throw new Error(result.errMsg)
  } catch (error) {
    console.error('刷新用户信息失败:', error)
    throw error
  }
}

/**
 * 获取当前用户信息（同步读缓存）
 * 注意：冷启动时可能为 null，应先 await ensureLogin()
 * @returns {Object|null} 缓存的用户信息
 */
const getUserInfo = () => {
  return _userInfo
}

/**
 * SEC-04: 判断当前用户是否为化妆师
 * 读 _userInfo.is_artist（由 login 云函数查 artist_profile 权威判定）
 * 注意：调用前必须 await ensureLogin()，否则 _userInfo 可能为 null
 * @returns {boolean}
 */
const isArtist = () => {
  if (!_userInfo) return false
  return _userInfo.is_artist === true
}

/**
 * 判断用户是否已登录
 * @returns {boolean}
 */
const isLoggedIn = () => {
  return _userInfo !== null && _userInfo.openid !== undefined
}

/**
 * 清除用户缓存（登出用，本项目中一般不需要）
 */
const clearUserInfo = () => {
  _userInfo = null
}

module.exports = {
  silentLogin,
  ensureLogin,
  refreshUserInfo,
  getUserInfo,
  isArtist,
  isLoggedIn,
  clearUserInfo
}
