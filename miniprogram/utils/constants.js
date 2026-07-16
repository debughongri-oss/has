/**
 * 应用常量配置
 */

// 云开发环境 ID — 用户需替换为自己的云开发环境 ID
const CLOUD_ENV = 'cloud1-d9gv17qrif53acb2f'

// 预约状态枚举
const BOOKING_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  RESCHEDULED: 'rescheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
}

// 服务分类
const SERVICE_CATEGORIES = [
  { key: 'bridal', label: '新娘妆' },
  { key: 'bridesmaid', label: '伴娘妆' },
  { key: 'engagement', label: '订婚妆' },
  { key: 'daily', label: '日常妆' },
  { key: 'creative', label: '创意妆' }
]

// 擅长风格标签
const STYLE_TAGS = [
  { key: 'korean', label: '韩系' },
  { key: 'natural', label: '自然' },
  { key: 'sweet', label: '甜美' },
  { key: 'elegant', label: '气质' },
  { key: 'retro', label: '复古' },
  { key: 'creative', label: '创意' },
  { key: 'fresh', label: '清新' },
  { key: 'glamorous', label: '华丽' }
]

// 肤质类型选项
const SKIN_TYPE_OPTIONS = [
  { key: 'dry', label: '干性' },
  { key: 'oily', label: '油性' },
  { key: 'combination', label: '混合性' },
  { key: 'sensitive', label: '敏感性' },
  { key: 'unknown', label: '不确定' }
]

// 评价标签预设（REVW-10 / D-01）— 固定 5 标签，前后端共享
// 云函数无法 import miniprogram 代码，需在 reviews/index.js 复制同一份清单做服务端白名单校验
const REVIEW_TAGS = [
  { key: 'professional', label: '手法专业' },
  { key: 'natural', label: '妆面自然' },
  { key: 'punctual', label: '准时' },
  { key: 'friendly', label: '态度好' },
  { key: 'value', label: '性价比高' }
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
  BOOKING_STATUS,
  SERVICE_CATEGORIES,
  STYLE_TAGS,
  SKIN_TYPE_OPTIONS,
  REVIEW_TAGS,
  IMAGE_CONFIG,
  SUBSCRIBE_TEMPLATE_ID
}
