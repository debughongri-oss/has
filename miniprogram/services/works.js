const { callCloudFunction } = require('./api')
const { SERVICE_CATEGORIES } = require('../utils/constants')

const getWorksList = async (category, page = 1, pageSize = 10) => {
  const result = await callCloudFunction('works', {
    action: 'list',
    category: category || 'all',
    page,
    pageSize
  })
  if (result.errCode !== 0) {
    throw new Error(result.errMsg || '获取作品列表失败')
  }
  return result.data
}

const getWorkDetail = async (id) => {
  const result = await callCloudFunction('works', {
    action: 'detail',
    id
  })
  if (result.errCode !== 0) {
    throw new Error(result.errMsg || '获取作品详情失败')
  }
  return result.data
}

const createWork = async (data) => {
  const result = await callCloudFunction('works', {
    action: 'create',
    data
  })
  if (result.errCode !== 0) {
    throw new Error(result.errMsg || '创建作品失败')
  }
  return result.data
}

const updateWork = async (id, data) => {
  const result = await callCloudFunction('works', {
    action: 'update',
    id,
    data
  })
  if (result.errCode !== 0) {
    throw new Error(result.errMsg || '更新作品失败')
  }
  return result.data
}

const deleteWork = async (id) => {
  const result = await callCloudFunction('works', {
    action: 'delete',
    id
  })
  if (result.errCode !== 0) {
    throw new Error(result.errMsg || '删除作品失败')
  }
  return result.data
}

const getCategories = () => {
  return [{ key: 'all', label: '全部' }, ...SERVICE_CATEGORIES]
}

const getShareQRCode = async (id) => {
  const result = await callCloudFunction('works', {
    action: 'getShareQRCode',
    id
  })
  if (result.errCode !== 0) {
    throw new Error(result.errMsg || '获取小程序码失败')
  }
  return result.data
}

module.exports = {
  getWorksList,
  getWorkDetail,
  createWork,
  updateWork,
  deleteWork,
  getCategories,
  getShareQRCode
}
