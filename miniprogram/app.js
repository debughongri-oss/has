const authService = require('./services/auth')
const { CLOUD_ENV } = require('./utils/constants')

App({
  globalData: {
    userInfo: null,
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

    // 静默登录 — AUTH-01
    authService.silentLogin().then(userInfo => {
      this.globalData.userInfo = userInfo
      this.globalData.isOpen = true
    }).catch(err => {
      console.error('登录失败:', err)
    })
  }
})
