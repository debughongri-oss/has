/**
 * 化妆师个人资料服务
 * 通过 services/api.js 调用 profile 云函数
 */

const { callCloudFunction } = require('./api')

// 缓存化妆师资料（不常变化，适合缓存）
let _artistProfile = null

/**
 * 获取化妆师公开资料
 * AUTH-02: 用户在首页看到化妆师姓名、头像、简介、经验
 * @param {boolean} forceRefresh - 是否强制刷新缓存
 * @returns {Promise<Object>} 艺术家资料
 */
const getArtistProfile = async (forceRefresh = false) => {
  if (_artistProfile && !forceRefresh) {
    return _artistProfile
  }

  try {
    const result = await callCloudFunction('profile', {
      action: 'get'
    })

    _artistProfile = result.data
    return _artistProfile
  } catch (error) {
    console.error('获取化妆师资料失败:', error)
    throw error
  }
}

/**
 * 更新化妆师资料
 * @param {Object} data - 要更新的字段
 * @returns {Promise<Object>}
 */
const updateArtistProfile = async (data) => {
  try {
    const result = await callCloudFunction('profile', {
      action: 'update',
      data
    })

    // 清除缓存，下次获取时重新加载
    _artistProfile = null
    return result.data
  } catch (error) {
    console.error('更新化妆师资料失败:', error)
    throw error
  }
}

/**
 * 初始化默认资料（首次使用时）
 * @returns {Promise<Object>}
 */
const initArtistProfile = async () => {
  try {
    const result = await callCloudFunction('profile', {
      action: 'init'
    })

    _artistProfile = result.data
    return _artistProfile
  } catch (error) {
    console.error('初始化资料失败:', error)
    throw error
  }
}

/**
 * 清除缓存
 */
const clearCache = () => {
  _artistProfile = null
}

module.exports = {
  getArtistProfile,
  updateArtistProfile,
  initArtistProfile,
  clearCache
}
