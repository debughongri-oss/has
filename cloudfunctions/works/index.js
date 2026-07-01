const cloud = require('wx-server-sdk')
const { requireArtist } = require('./shared/auth')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  switch (event.action) {
    case 'list': {
      const { category, page = 1, pageSize = 10 } = event
      try {
        let query = db.collection('works')
        const conditions = {}
        if (category && category !== 'all') {
          conditions.category = category
        }
        if (Object.keys(conditions).length > 0) {
          query = query.where(conditions)
        }

        const total = (await query.count()).total
        const data = await query
          .orderBy('sort_order', 'asc')
          .orderBy('created_at', 'desc')
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .get()

        return {
          errCode: 0,
          data: {
            list: data.data,
            total: total,
            page: page,
            pageSize: pageSize,
            hasMore: page * pageSize < total
          }
        }
      } catch (error) {
        console.error('获取作品列表失败:', error)
        return { errCode: -1, errMsg: '获取作品列表失败' }
      }
    }

    case 'detail': {
      const { id } = event
      try {
        const res = await db.collection('works').doc(id).get()
        return { errCode: 0, data: res.data }
      } catch (error) {
        console.error('获取作品详情失败:', error)
        return { errCode: -1, errMsg: '作品不存在' }
      }
    }

    case 'create': {
      const { data } = event
      try {
        const authCheck = await requireArtist(wxContext, db)
        if (!authCheck.ok) return authCheck.response

        const workData = {
          ...data,
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }
        const res = await db.collection('works').add({ data: workData })
        return { errCode: 0, data: { _id: res._id } }
      } catch (error) {
        console.error('创建作品失败:', error)
        return { errCode: -1, errMsg: '创建作品失败' }
      }
    }

    case 'update': {
      const { id, data } = event
      try {
        const authCheck = await requireArtist(wxContext, db)
        if (!authCheck.ok) return authCheck.response

        const updateData = { ...data, updated_at: db.serverDate() }
        await db.collection('works').doc(id).update({ data: updateData })
        return { errCode: 0, data: { success: true } }
      } catch (error) {
        console.error('更新作品失败:', error)
        return { errCode: -1, errMsg: '更新作品失败' }
      }
    }

    case 'delete': {
      const { id } = event
      try {
        const authCheck = await requireArtist(wxContext, db)
        if (!authCheck.ok) return authCheck.response

        await db.collection('works').doc(id).remove()
        return { errCode: 0, data: { success: true } }
      } catch (error) {
        console.error('删除作品失败:', error)
        return { errCode: -1, errMsg: '删除作品失败' }
      }
    }

    case 'getShareQRCode': {
      const { id } = event
      try {
        // 权限验证 per D-26
        const authCheck = await requireArtist(wxContext, db)
        if (!authCheck.ok) return authCheck.response

        // 尝试从云存储获取已缓存的 QR 码 per D-07
        const cloudPath = 'qrcodes/' + id + '.png'
        try {
          const downloadRes = await cloud.downloadFile({
            fileID: cloudPath
          })
          // 缓存命中 — 直接返回 fileID
          return { errCode: 0, data: { fileID: downloadRes.fileID } }
        } catch (cacheErr) {
          // 缓存未命中 — 继续生成
        }

        // 生成小程序码 per D-05/D-06
        // checkPath: false 跳过"page 必须已发布"校验（开发期必须）
        // envVersion: 'develop' 扫码进入开发版（正式发布后改 'release'）
        const qrResult = await cloud.openapi.wxacode.getUnlimitedQRCode({
          scene: id,
          page: 'pages/works/detail',
          checkPath: false,
          envVersion: 'develop',
          width: 280,
          autoColor: false,
          lineColor: { r: 156, g: 122, b: 90 },
          isHyaline: false
        })

        // 上传到云存储 per D-07/D-25
        const uploadRes = await cloud.uploadFile({
          cloudPath: cloudPath,
          fileContent: qrResult
        })

        return { errCode: 0, data: { fileID: uploadRes.fileID } }
      } catch (error) {
        console.error('生成小程序码失败:', error)
        // 透传微信原始 errCode/ErrMsg，方便客户端诊断
        // 常见: 48001(个人主体无权限) / 41030(无效 page) / 40097(无效 scene)
        return {
          errCode: error.errCode || -1,
          errMsg: error.errMsg || '生成小程序码失败'
        }
      }
    }

    default:
      return { errCode: -1, errMsg: '未知操作' }
  }
}
