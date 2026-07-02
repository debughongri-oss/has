const { callCloudFunction } = require('./api')
const { SERVICE_CATEGORIES } = require('../utils/constants')

const getWorksList = async (category, page = 1, pageSize = 10) => {
  const result = await callCloudFunction('works', {
    action: 'list',
    category: category || 'all',
    page,
    pageSize
  })
  return result.data
}

const getWorkDetail = async (id) => {
  const result = await callCloudFunction('works', {
    action: 'detail',
    id
  })
  return result.data
}

const createWork = async (data) => {
  const result = await callCloudFunction('works', {
    action: 'create',
    data
  })
  return result.data
}

const updateWork = async (id, data) => {
  const result = await callCloudFunction('works', {
    action: 'update',
    id,
    data
  })
  return result.data
}

const deleteWork = async (id) => {
  const result = await callCloudFunction('works', {
    action: 'delete',
    id
  })
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
