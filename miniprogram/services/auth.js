/**
 * 认证服务 — 处理微信静默登录和角色判断
 *
 * AUTH-01: 用户通过 wx.login 静默获取身份标识
 * 角色判断: 通过比较 openid 与 ARTIST_OPENID 判断是否为化妆师
 */

const { callCloudFunction } = require('./api')
const { ARTIST_OPENID } = require('../utils/constants')

// 缓存用户信息
let _userInfo = null

/**
 * 静默登录
 * 调用 wx.login 获取 code → 云函数换取 openid → 缓存用户信息
 * @returns {Promise<Object>} 用户信息 { openid, role, isNew }
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
 * 获取当前用户信息
 * @returns {Object|null} 缓存的用户信息
 */
const getUserInfo = () => {
  return _userInfo
}

/**
 * 判断当前用户是否为化妆师
 * 通过比较 openid 与 constants 中存储的 ARTIST_OPENID
 * @returns {boolean}
 */
const isArtist = () => {
  if (!_userInfo || !_userInfo.openid) return false
  if (!ARTIST_OPENID) return false
  return _userInfo.openid === ARTIST_OPENID
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
  getUserInfo,
  isArtist,
  isLoggedIn,
  clearUserInfo
}
