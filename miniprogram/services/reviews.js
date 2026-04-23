const { callCloudFunction } = require('./api')

/**
 * 创建评价
 * @param {string} bookingId - 预约ID
 * @param {number} rating - 评分 (1-5)
 * @param {string} content - 评价内容
 * @param {Object} userInfo - 用户信息 { nickname, avatar }
 * @returns {Promise<Object>} 评价数据
 */
const createReview = async (bookingId, rating, content, userInfo) => {
  const result = await callCloudFunction('reviews', {
    action: 'create',
    booking_id: bookingId,
    rating,
    content: content || '',
    user_nickname: (userInfo && userInfo.nickname) || '',
    user_avatar: (userInfo && userInfo.avatar) || ''
  })
  if (result.errCode !== 0) throw new Error(result.errMsg)
  return result.data
}

/**
 * 获取评价统计（平均评分 + 总数 + 最近3条评价）
 * @returns {Promise<Object>} { average, total, recent }
 */
const getReviewStats = async () => {
  const result = await callCloudFunction('reviews', { action: 'getStats' })
  if (result.errCode !== 0) throw new Error(result.errMsg)
  return result.data
}

/**
 * 根据预约ID查询评价
 * @param {string} bookingId - 预约ID
 * @returns {Promise<Object|null>} 评价数据或null
 */
const getByBooking = async (bookingId) => {
  const result = await callCloudFunction('reviews', { action: 'getByBooking', booking_id: bookingId })
  if (result.errCode !== 0) throw new Error(result.errMsg)
  return result.data
}

/**
 * 获取评价列表（分页）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} { list, total, page, pageSize, hasMore }
 */
const getReviewsList = async (page, pageSize) => {
  const result = await callCloudFunction('reviews', { action: 'list', page, pageSize })
  if (result.errCode !== 0) throw new Error(result.errMsg)
  return result.data
}

module.exports = {
  createReview,
  getReviewStats,
  getByBooking,
  getReviewsList
}
