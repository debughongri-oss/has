const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 登录云函数
 * 客户端调用 wx.login() 获取 code → 传入此云函数 → 返回 openid
 *
 * event.action:
 * - 'login': 通过 wx.login code 获取 openid，创建/更新用户记录
 * - 'getUser': 获取当前用户信息
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (event.action) {
    case 'login': {
      try {
        // 查询是否已有用户记录
        const userQuery = await db.collection('users')
          .where({ _openid: openid })
          .limit(1)
          .get()

        let userInfo

        if (userQuery.data.length === 0) {
          // 首次登录 — 创建用户记录
          const newUser = {
            _openid: openid,
            role: 'client',
            created_at: db.serverDate(),
            updated_at: db.serverDate()
          }
          const createResult = await db.collection('users').add({
            data: newUser
          })
          userInfo = { ...newUser, _id: createResult._id }
        } else {
          // 已有记录 — 更新登录时间
          userInfo = userQuery.data[0]
          await db.collection('users').doc(userInfo._id).update({
            data: { updated_at: db.serverDate() }
          })
        }

        // SEC-04: is_artist 由 artist_profile._openid 权威源判定，客户端不再用 magic constant
        const isArtist = await checkIsArtist(db, openid)

        return {
          errCode: 0,
          data: {
            openid: openid,
            role: userInfo.role,
            is_artist: isArtist,
            nickname: userInfo.nickname || '',
            avatar_url: userInfo.avatar_url || '',
            isNew: userQuery.data.length === 0
          }
        }
      } catch (error) {
        console.error('登录失败:', error)
        return {
          errCode: -1,
          errMsg: '登录失败，请重试'
        }
      }
    }

    case 'getUser': {
      try {
        const userQuery = await db.collection('users')
          .where({ _openid: openid })
          .limit(1)
          .get()

        if (userQuery.data.length === 0) {
          return { errCode: -1, errMsg: '用户不存在' }
        }

        const user = userQuery.data[0]
        // SEC-04: is_artist 由 artist_profile._openid 权威源判定
        const isArtist = await checkIsArtist(db, openid)

        return {
          errCode: 0,
          data: {
            openid: openid,
            role: user.role,
            is_artist: isArtist,
            nickname: user.nickname || '',
            avatar_url: user.avatar_url || ''
          }
        }
      } catch (error) {
        console.error('获取用户失败:', error)
        return { errCode: -1, errMsg: '获取用户信息失败' }
      }
    }

    case 'updateProfile': {
      const { nickname, avatar_url } = event
      try {
        const userQuery = await db.collection('users')
          .where({ _openid: openid })
          .limit(1)
          .get()
        if (userQuery.data.length === 0) {
          return { errCode: -1, errMsg: '用户不存在' }
        }
        const updateData = { updated_at: db.serverDate() }
        if (nickname !== undefined) updateData.nickname = nickname
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url
        await db.collection('users').doc(userQuery.data[0]._id).update({ data: updateData })
        return { errCode: 0, data: { success: true } }
      } catch (error) {
        console.error('更新用户资料失败:', error)
        return { errCode: -1, errMsg: '更新失败' }
      }
    }

    default:
      return { errCode: -1, errMsg: '未知操作' }
  }
}

/**
 * SEC-04: 检查当前 openid 是否为化妆师（查 artist_profile._openid 权威源）
 * @param {object} db - cloud.database() 实例
 * @param {string} openid - 待检查的 openid
 * @returns {Promise<boolean>}
 */
async function checkIsArtist(db, openid) {
  try {
    const { data } = await db.collection('artist_profile').limit(1).get()
    if (data.length === 0) return false
    return data[0]._openid === openid
  } catch (err) {
    console.error('checkIsArtist 查询失败:', err)
    return false
  }
}
