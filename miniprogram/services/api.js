/**
 * 集中式 API 层 — 所有云函数调用统一经过此模块
 * Pattern from ARCHITECTURE.md: Centralized API Layer
 *
 * HYG-04 (Phase 12): isApiError 是 errCode 契约的【唯一判定点】
 *   envelope: { errCode: 0 为成功, errCode !== 0 为失败 }
 * HYG-05 (Phase 12): api.js 为纯传输层，不弹 toast；错误由调用方（页面）负责提示
 */

/**
 * 判定云函数响应是否为错误（errCode 契约的单一判定点）
 * 成功 = errCode === 0；失败 = errCode !== 0（含 undefined/null）
 * @param {Object} result - 云函数返回的 result 对象
 * @returns {boolean}
 */
const isApiError = (result) => {
  return !result || result.errCode !== 0
}

/**
 * 调用云函数（纯传输层，不弹 toast）
 * @param {string} name - 云函数名称
 * @param {Object} data - 传递数据
 * @returns {Promise<Object>} 成功时 resolve 完整 result（含 data）；失败时 reject Error（含 .errCode/.errMsg/.message）
 */
const callCloudFunction = async (name, data = {}) => {
  try {
    const res = await wx.cloud.callFunction({ name, data })
    const result = res.result || {}

    // HYG-04: 单一判定点
    if (isApiError(result)) {
      const err = new Error(result.errMsg || '请求失败')
      err.errCode = result.errCode
      err.errMsg = result.errMsg || '请求失败'
      throw err
    }

    return result
  } catch (error) {
    // 已处理的业务错误直接上抛（携带 errCode/errMsg）
    if (error && error.errCode !== undefined) {
      throw error
    }
    // 未处理的异常（网络错误等）包装为通用错误上抛
    console.error(`云函数 ${name} 调用失败:`, error)
    throw new Error('网络异常，请重试')
  }
}

module.exports = {
  callCloudFunction,
  isApiError
}
