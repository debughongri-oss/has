const { callCloudFunction } = require('./api')

const getAvailableSlots = async (date) => {
  const result = await callCloudFunction('bookings', { action: 'getAvailableSlots', date })

  return result.data
}

const createBooking = async (data) => {
  const result = await callCloudFunction('bookings', { action: 'create', ...data })

  return result.data
}

const getBookingsList = async (status, page, pageSize) => {
  const result = await callCloudFunction('bookings', { action: 'list', status, page, pageSize })

  return result.data
}

const getMyBookings = async (page, pageSize) => {
  const result = await callCloudFunction('bookings', { action: 'myBookings', page, pageSize })

  return result.data
}

const getBookingDetail = async (id) => {
  const result = await callCloudFunction('bookings', { action: 'detail', id })

  return result.data
}

const updateBookingStatus = async (id, status, extra = {}) => {
  const result = await callCloudFunction('bookings', { action: 'updateStatus', id, status, ...extra })

  return result.data
}

const cancelBooking = async (id) => {
  const result = await callCloudFunction('bookings', { action: 'cancel', id })

  return result.data
}

const getCalendarData = async (year, month) => {
  const result = await callCloudFunction('bookings', { action: 'getCalendarData', year, month })

  return result.data
}

const getStatusLabel = (status) => {
  const labels = {
    pending: '待确认',
    accepted: '已确认',
    rejected: '已拒绝',
    rescheduled: '已改期',
    completed: '已完成',
    cancelled: '已取消'
  }
  return labels[status] || status
}

const getStatusColor = (status) => {
  const colors = {
    pending: '#FF9800',
    accepted: '#4CAF50',
    rejected: '#F44336',
    rescheduled: '#2196F3',
    completed: '#9E9E9E',
    cancelled: '#9E9E9E'
  }
  return colors[status] || '#999'
}

module.exports = {
  getAvailableSlots,
  createBooking,
  getBookingsList,
  getMyBookings,
  getBookingDetail,
  updateBookingStatus,
  cancelBooking,
  getCalendarData,
  getStatusLabel,
  getStatusColor
}
