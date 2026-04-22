/**
 * 视频管理模块 - 配置与常量定义
 *
 * 将大型组件中的配置数据提取到独立文件，提升可维护性和性能
 */

// 分类选项
export const VIDEO_CATEGORIES = [
  '瑜伽', '普拉提', '舞蹈', '健身', '营养学', '其他'
]

// 状态选项
export const VIDEO_STATUS_OPTIONS = [
  { value: 'draft', label: '📝 草稿' },
  { value: 'reviewing', label: '⏳ 审核中' },
  { value: 'published', label: '✅ 已发布' },
  { value: 'rejected', label: '❌ 已拒绝' }
]

// 营销类型选项
export const MARKETING_TYPES = [
  { value: 'product_intro', label: '产品介绍', icon: '📦' },
  { value: 'tutorial', label: '使用教程', icon: '📖' },
  { value: 'testimonial', label: '用户见证', icon: '⭐' },
  { value: 'live', label: '直播带货', icon: '📡' }
]

// 默认表单数据
export const DEFAULT_VIDEO_FORM = {
  title: '',
  description: '',
  category: '瑜伽',
  videoUrl: '',
  cover: '',
  status: 'draft',
  isRecommended: false,
  isMarketing: false,
  marketingType: null,
  ctaText: '',
  ctaLink: '',
  courseId: '',
  productIds: [] as string[]
}

// 视频字段映射（用于显示）
export const VIDEO_FIELD_MAP = {
  title: '标题',
  description: '描述',
  category: '分类',
  status: '状态',
  viewCount: '观看次数',
  completionCount: '完成次数',
  isRecommended: '是否推荐',
  isMarketing: '是否营销',
  marketingType: '营销类型'
}
