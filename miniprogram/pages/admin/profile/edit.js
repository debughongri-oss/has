const profileService = require('../../../services/profile')
const authService = require('../../../services/auth')
const storageService = require('../../../services/storage')
const { STYLE_TAGS } = require('../../../utils/constants')

// E: 每周休息日配置（getDay: 0=周日, 1..6=周一..周六；显示按 周一-first）
const WEEKDAY_DEFS = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 0 }
]

Page({
  data: {
    avatar: '',
    avatarUploading: false,
    name: '',
    bio: '',
    experience: '',
    experienceYears: '',
    specialtiesText: '',
    selectedStyleTags: [],
    styleTagOptions: [],
    location: '',
    wechat: '',
    phone: '',
    weekdayOptions: WEEKDAY_DEFS.map(d => ({ ...d, selected: false })),
    workStart: '09:00',
    workEnd: '18:00',
    saving: false
  },

  onLoad: async function () {
    // SEC-03: 等待登录态就绪后再判身份，消除冷启动竞态
    try {
      await authService.ensureLogin()
    } catch (e) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
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
          experienceYears: data.experience_years ? String(data.experience_years) : '',
          specialtiesText: (data.specialties || []).join(','),
          selectedStyleTags: data.style_tags || [],
          styleTagOptions: STYLE_TAGS.map(t => ({
            ...t,
            selected: (data.style_tags || []).includes(t.label)
          })),
          location: (data.contact_info && data.contact_info.location) || '',
          wechat: (data.contact_info && data.contact_info.wechat) || '',
          phone: (data.contact_info && data.contact_info.phone) || '',
          weekdayOptions: WEEKDAY_DEFS.map(d => ({ ...d, selected: ((data.working_schedule && data.working_schedule.off_days) || []).includes(d.value) })),
          workStart: (data.working_schedule && data.working_schedule.work_start) || '09:00',
          workEnd: (data.working_schedule && data.working_schedule.work_end) || '18:00'
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
  onExperienceYearsInput: function (e) { this.setData({ experienceYears: e.detail.value }) },
  onSpecialtiesInput: function (e) { this.setData({ specialtiesText: e.detail.value }) },
  onToggleStyleTag: function (e) {
    const label = e.currentTarget.dataset.label
    const tags = this.data.selectedStyleTags.slice()
    const idx = tags.indexOf(label)
    if (idx >= 0) {
      tags.splice(idx, 1)
    } else {
      tags.push(label)
    }
    this.setData({
      selectedStyleTags: tags,
      styleTagOptions: STYLE_TAGS.map(t => ({ ...t, selected: tags.includes(t.label) }))
    })
  },
  onLocationInput: function (e) { this.setData({ location: e.detail.value }) },
  onWechatInput: function (e) { this.setData({ wechat: e.detail.value }) },
  onPhoneInput: function (e) { this.setData({ phone: e.detail.value }) },
  // E: 工作时间配置
  onToggleWeekday: function (e) {
    const value = Number(e.currentTarget.dataset.value)
    const opts = this.data.weekdayOptions.map(o => o.value === value ? { ...o, selected: !o.selected } : o)
    this.setData({ weekdayOptions: opts })
  },
  onWorkStartChange: function (e) { this.setData({ workStart: e.detail.value }) },
  onWorkEndChange: function (e) { this.setData({ workEnd: e.detail.value }) },

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
    const { name, bio, experience, experienceYears, specialtiesText, selectedStyleTags, location, wechat, phone, weekdayOptions, workStart, workEnd } = this.data
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
      experience_years: parseInt(experienceYears) || 0,
      style_tags: selectedStyleTags,
      specialties,
      contact_info: {
        wechat: wechat.trim(),
        phone: phone.trim(),
        location: location.trim()
      },
      working_schedule: {
        off_days: weekdayOptions.filter(o => o.selected).map(o => o.value),
        work_start: workStart,
        work_end: workEnd
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
      // SEC-06: profile 更新成功后刷新客户端缓存，下游页面读到最新昵称/头像
      return authService.refreshUserInfo().catch(err => {
        console.error('刷新缓存失败（不影响保存结果）:', err)
      })
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
