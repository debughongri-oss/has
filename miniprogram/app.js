const authService = require('./services/auth')
const { CLOUD_ENV } = require('./utils/constants')

App({
  globalData: {
    // SEC-06 (Phase 11): 用户信息不再缓存在 globalData，统一由 authService 管理
    // isOpen 保留作为登录态标志（其他页面可能读取）
    isOpen: false
  },

  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.25.4 或以上版本的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      traceUser: true,
      env: CLOUD_ENV
    })

    // SEC-03: 预热登录，具体等待由各页面 ensureLogin() 处理
    authService.silentLogin().then(() => {
      this.globalData.isOpen = true
    }).catch(err => {
      console.error('登录失败:', err)
    })
  }
})
