/**
 * 隐私协议弹窗组件
 *
 * Pitfall P1: 必须在调用 wx.chooseMedia 等隐私接口前获得用户同意
 * 审核必拒项 — 不能跳过
 *
 * 使用方式：
 * 1. 在 app.json 全局引入或在需要的页面引入
 * 2. 页面中 <privacy-popup bind:agree="onPrivacyAgree" />
 */
Component({
  properties: {},

  data: {
    showPrivacy: false,
    resolve: null
  },

  lifetimes: {
    attached: function () {
      this.checkPrivacy()
    }
  },

  methods: {
    /**
     * 检查是否需要隐私授权
     */
    checkPrivacy: function () {
      if (wx.getPrivacySetting) {
        wx.getPrivacySetting({
          success: (res) => {
            if (res.needAuthorization) {
              // 需要用户同意隐私协议
              this.setData({ showPrivacy: true })
            }
          },
          fail: (err) => {
            console.error('获取隐私设置失败:', err)
          }
        })
      }
    },

    /**
     * 打开隐私协议全文
     */
    openPrivacyContract: function () {
      if (wx.openPrivacyContract) {
        wx.openPrivacyContract({
          success: () => {},
          fail: (err) => console.error('打开隐私协议失败:', err)
        })
      }
    },

    /**
     * 用户同意隐私协议
     */
    handleAgree: function () {
      this.setData({ showPrivacy: false })
      this.triggerEvent('agree')
    },

    /**
     * 用户拒绝隐私协议
     */
    handleDisagree: function () {
      this.setData({ showPrivacy: false })
      this.triggerEvent('disagree')
      wx.showToast({
        title: '您拒绝了隐私协议，部分功能可能无法使用',
        icon: 'none',
        duration: 3000
      })
    }
  }
})
