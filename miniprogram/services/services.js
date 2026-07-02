const { callCloudFunction } = require('./api')

const getServicesList = async () => {
  const result = await callCloudFunction('services', { action: 'list' })
  return result.data
}

const getAllServices = async () => {
  const result = await callCloudFunction('services', { action: 'listAll' })
  return result.data
}

const getServiceDetail = async (id) => {
  const result = await callCloudFunction('services', { action: 'detail', id })
  return result.data
}

const createService = async (data) => {
  const result = await callCloudFunction('services', { action: 'create', data })
  return result.data
}

const updateService = async (id, data) => {
  const result = await callCloudFunction('services', { action: 'update', id, data })
  return result.data
}

const deleteService = async (id) => {
  const result = await callCloudFunction('services', { action: 'delete', id })
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
