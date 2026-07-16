const { callCloudFunction } = require('./api')

/**
 * 创建评价（REVW-10/11/12 增强）
 * SEC-05: 用户昵称/头像由服务端按 openid 从 users 集合权威读取，客户端传入被忽略。
 * REVW-11: 图片由客户端先经 storage.uploadWorkImages 上传得到 fileID[] 后再传入（D-06），
 *          云函数会对每张图做 imgSecCheck（fail-closed）。
 *
 * @param {string} bookingId - 预约ID
 * @param {number} rating - 评分 (1-5)
 * @param {string} content - 评价内容
 * @param {Object} [options] - 增强选项
 * @param {string[]} [options.tags] - 评价标签 key 数组（最多 5 个，需在 REVIEW_TAGS 白名单内）
 * @param {string[]} [options.imageFileIDs] - 已上传的图片 fileID 数组（最多 3 张）
 * @param {boolean} [options.isAnonymous] - 是否匿名评价（默认 false）
 * @returns {Promise<Object>} 评价数据
 */
const createReview = async (bookingId, rating, content, options) => {
  const opts = options || {}
  const result = await callCloudFunction('reviews', {
    action: 'create',
    booking_id: bookingId,
    rating,
    content: content || '',
    tags: opts.tags || [],
    images: opts.imageFileIDs || [],
    is_anonymous: !!opts.isAnonymous
  })

  return result.data
}

/**
 * 获取评价统计（平均评分 + 总数 + 最近3条评价 + 高频标签聚合）
 * REVW-14/D-20: average/total 改读 artist_profile 冗余字段（零计算）
 * REVW-10/D-04: 返回 topTags 高频标签聚合（前 5）
 * @returns {Promise<Object>} { average, total, recent, topTags }
 */
const getReviewStats = async () => {
  const result = await callCloudFunction('reviews', { action: 'getStats' })

  return result.data
}

/**
 * 根据预约ID查询评价
 * @param {string} bookingId - 预约ID
 * @returns {Promise<Object|null>} 评价数据或null
 */
const getByBooking = async (bookingId) => {
  const result = await callCloudFunction('reviews', { action: 'getByBooking', booking_id: bookingId })

  return result.data
}

/**
 * 获取评价列表（分页 + 服务端筛选排序，REVW-13/D-15）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @param {Object} [filters] - 筛选排序选项
 * @param {number} [filters.ratingFilter] - 评分筛选 (1-5)，不传=全部
 * @param {string} [filters.tagFilter] - 标签 key 筛选，不传=全部
 * @param {string} [filters.sortBy] - 排序方式：'latest' | 'highest' | 'lowest'（默认 'latest'）
 * @returns {Promise<Object>} { list, total, page, pageSize, hasMore }
 */
const getReviewsList = async (page, pageSize, filters) => {
  const f = filters || {}
  const result = await callCloudFunction('reviews', {
    action: 'list',
    page,
    pageSize,
    rating_filter: f.ratingFilter,
    tag_filter: f.tagFilter,
    sort_by: f.sortBy
  })

  return result.data
}

/**
 * 化妆师回复评价（REVW-07）
 * @param {string} reviewId - 评价ID
 * @param {string} content - 回复内容（空字符串=删除回复）
 * @returns {Promise<Object>} { artist_reply }
 */
const replyReview = async (reviewId, content) => {
  const result = await callCloudFunction('reviews', {
    action: 'reply',
    review_id: reviewId,
    content: content || ''
  })
  return result.data
}

/**
 * 删除评价（REVW-14/D-18，仅化妆师可调用）
 * 服务端会清理云存储图片并同步 artist_profile 冗余字段
 * @param {string} reviewId - 评价ID
 * @returns {Promise<Object>} { errCode: 0 }
 */
const deleteReview = async (reviewId) => {
  const result = await callCloudFunction('reviews', {
    action: 'delete',
    review_id: reviewId
  })
  return result.data
}

module.exports = {
  createReview,
  getReviewStats,
  getByBooking,
  getReviewsList,
  replyReview,
  deleteReview
}
