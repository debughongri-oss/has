const { callCloudFunction } = require('./api')

const getServicesList = async () => {
  const result = await callCloudFunction('services', { action: 'list' })
  if (result.errCode !== 0) throw new Error(result.errMsg || '获取服务列表失败')
  return result.data
}

const getAllServices = async () => {
  const result = await callCloudFunction('services', { action: 'listAll' })
  if (result.errCode !== 0) throw new Error(result.errMsg || '获取服务列表失败')
  return result.data
}

const getServiceDetail = async (id) => {
  const result = await callCloudFunction('services', { action: 'detail', id })
  if (result.errCode !== 0) throw new Error(result.errMsg || '获取服务详情失败')
  return result.data
}

const createService = async (data) => {
  const result = await callCloudFunction('services', { action: 'create', data })
  if (result.errCode !== 0) throw new Error(result.errMsg || '创建服务失败')
  return result.data
}

const updateService = async (id, data) => {
  const result = await callCloudFunction('services', { action: 'update', id, data })
  if (result.errCode !== 0) throw new Error(result.errMsg || '更新服务失败')
  return result.data
}

const deleteService = async (id) => {
  const result = await callCloudFunction('services', { action: 'delete', id })
  if (result.errCode !== 0) throw new Error(result.errMsg || '删除服务失败')
  return result.data
}

module.exports = {
  getServicesList,
  getAllServices,
  getServiceDetail,
  createService,
  updateService,
  deleteService
}
