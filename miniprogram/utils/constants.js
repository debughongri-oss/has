/**
 * 应用常量配置
 */

// 云开发环境 ID — 用户需替换为自己的云开发环境 ID
const CLOUD_ENV = 'cloud1-d9gv17qrif53acb2f'

// 化妆师的 OpenID — 用于角色判断
// 首次部署后通过云函数获取并替换
const ARTIST_OPENID = 'oDmtI48gecuF3n9OkEBJN91BJliI'

// 预约状态枚举
const BOOKING_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  RESCHEDULED: 'rescheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

// 服务分类
const SERVICE_CATEGORIES = [
  { key: 'bridal', label: '新娘妆' },
  { key: 'bridesmaid', label: '伴娘妆' },
  { key: 'engagement', label: '订婚妆' },
  { key: 'daily', label: '日常妆' },
  { key: 'creative', label: '创意妆' }
]

// 图片相关配置
const IMAGE_CONFIG = {
  MAX_COUNT: 9,            // 单次最多选择图片数
  COMPRESS_QUALITY: 80,    // 压缩质量 (0-100)
  THUMB_QUALITY: 30,       // 缩略图质量
  MAX_SIZE: 10 * 1024 * 1024  // 10MB
}

const SUBSCRIBE_TEMPLATE_ID = '-i6OevJwdS5fGFXCsB9Xux4zaaxUkXTR0xfLg5T48jM'

module.exports = {
  CLOUD_ENV,
  ARTIST_OPENID,
  BOOKING_STATUS,
  SERVICE_CATEGORIES,
  IMAGE_CONFIG,
  SUBSCRIBE_TEMPLATE_ID
}
