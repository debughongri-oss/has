const profileService = require('../../../services/profile')
const authService = require('../../../services/auth')
const storageService = require('../../../services/storage')

Page({
  data: {
    avatar: '',
    avatarUploading: false,
    name: '',
    bio: '',
    experience: '',
    specialtiesText: '',
    location: '',
    wechat: '',
    phone: '',
    saving: false
  },

  onLoad: function () {
    if (!authService.isArtist()) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.loadProfile()
  },

  loadProfile: function () {
    wx.showLoading({ title: '加载中...' })
    profileService.getArtistProfile()
      .then(data => {
        this.setData({
          avatar: data.avatar || '',
          name: data.name || '',
          bio: data.bio || '',
          experience: data.experience || '',
          specialtiesText: (data.specialties || []).join(','),
          location: (data.contact_info && data.contact_info.location) || '',
          wechat: (data.contact_info && data.contact_info.wechat) || '',
          phone: (data.contact_info && data.contact_info.phone) || ''
        })
        wx.hideLoading()
      })
      .catch(err => {
        wx.hideLoading()
        console.error('加载资料失败:', err)
      })
  },

  onNameInput: function (e) { this.setData({ name: e.detail.value }) },
  onBioInput: function (e) { this.setData({ bio: e.detail.value }) },
  onExperienceInput: function (e) { this.setData({ experience: e.detail.value }) },
  onSpecialtiesInput: function (e) { this.setData({ specialtiesText: e.detail.value }) },
  onLocationInput: function (e) { this.setData({ location: e.detail.value }) },
  onWechatInput: function (e) { this.setData({ wechat: e.detail.value }) },
  onPhoneInput: function (e) { this.setData({ phone: e.detail.value }) },

  chooseAvatar: function () {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this.setData({ avatar: tempPath })
      }
    })
  },

  saveProfile: function () {
    const { name, bio, experience, specialtiesText, location, wechat, phone } = this.data
    if (!name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    const specialties = specialtiesText.split(/[,，]/).filter(s => s.trim())

    const saveData = {
      name: name.trim(),
      bio: bio.trim(),
      experience: experience.trim(),
      specialties,
      contact_info: {
        wechat: wechat.trim(),
        phone: phone.trim(),
        location: location.trim()
      }
    }

    let avatarPromise = Promise.resolve()
    if (this.data.avatar && !this.data.avatar.startsWith('cloud://')) {
      this.setData({ avatarUploading: true })
      avatarPromise = storageService.uploadImage(this.data.avatar, `profile/avatar_${Date.now()}.jpg`)
        .then(fileID => {
          saveData.avatar = fileID
          this.setData({ avatarUploading: false })
        })
        .catch(err => {
          console.error('上传头像失败:', err)
          this.setData({ avatarUploading: false })
        })
    } else if (this.data.avatar) {
      saveData.avatar = this.data.avatar
    }

    avatarPromise.then(() => {
      return profileService.updateArtistProfile(saveData)
    }).then(() => {
      this.setData({ saving: false })
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(err => {
      this.setData({ saving: false })
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  }
})
