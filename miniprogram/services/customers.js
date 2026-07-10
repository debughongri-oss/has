const { callCloudFunction } = require('./api')

/**
 * 客户档案服务层（Phase 20）
 * Wrapper for the `customers` cloud function (4 actions).
 * 错误处理由调用方（页面）负责——api.js 为纯传输层 (HYG-05)。
 */

/**
 * 获取客户列表（CUST-01）
 * @param {string} [tag] - 可选标签筛选：'new' | 'returning' | 'vip'
 * @returns {Promise<Object>} { list: [...], total }
 */
const getCustomerList = async (tag) => {
  const result = await callCloudFunction('customers', { action: 'list', tag })

  return result.data
}

/**
 * 获取客户详情（CUST-02）
 * @param {string} userOpenid - 客户 openid
 * @returns {Promise<Object>} { user_openid, nickname, avatar_url, completed_count, tag, bookings, reviews }
 */
const getCustomerDetail = async (userOpenid) => {
  const result = await callCloudFunction('customers', { action: 'detail', user_openid: userOpenid })

  return result.data
}

/**
 * 获取客户备注（CUST-03/CUST-04）
 * @param {string} userOpenid - 客户 openid
 * @returns {Promise<Object|null>} 备注文档或 null
 */
const getCustomerNote = async (userOpenid) => {
  const result = await callCloudFunction('customers', { action: 'getNote', user_openid: userOpenid })

  return result.data
}

/**
 * 保存客户备注（CUST-03，upsert 覆盖更新 per D-07）
 * @param {string} userOpenid - 客户 openid
 * @param {Object} note - { skin_type, preference, allergy, custom_notes }
 * @returns {Promise<Object>} { _id }
 */
const saveCustomerNote = async (userOpenid, note) => {
  const result = await callCloudFunction('customers', {
    action: 'saveNote',
    user_openid: userOpenid,
    skin_type: note.skin_type || '',
    preference: note.preference || '',
    allergy: note.allergy || '',
    custom_notes: note.custom_notes || ''
  })

  return result.data
}

module.exports = {
  getCustomerList,
  getCustomerDetail,
  getCustomerNote,
  saveCustomerNote
}
