/**
 * 集中式 API 层 — 所有云函数调用统一经过此模块
 * Pattern from ARCHITECTURE.md: Centralized API Layer
 */

/**
 * 调用云函数
 * @param {string} name - 云函数名称
 * @param {Object} data - 传递数据
 * @returns {Promise<any>} 云函数返回结果
 */
const callCloudFunction = async (name, data = {}) => {
  try {
    const res = await wx.cloud.callFunction({ name, data })
    const result = res.result || {}

    // 统一错误处理
    if (result.errCode) {
      console.error(`云函数 ${name} 错误:`, result.errMsg || result.errCode)
      wx.showToast({
        title: result.errMsg || '请求失败，请重试',
        icon: 'none',
        duration: 2000
      })
      return Promise.reject(result)
    }

    return result
  } catch (error) {
    console.error(`云函数 ${name} 调用失败:`, error)
    wx.showToast({
      title: '网络异常，请重试',
      icon: 'none',
      duration: 2000
    })
    return Promise.reject(error)
  }
}

module.exports = {
  callCloudFunction
}
