/**
 * 通用状态映射配置
 */

export const COMMON_STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '启用' },
  { value: 'inactive', label: '禁用' }
]

export const PAGINATION_DEFAULTS = {
  page: 1,
  pageSize: 10,
  pageSizeOptions: [10, 20, 50, 100]
}

export const EMPTY_STATES = {
  noData: {
    icon: '📭',
    title: '暂无数据',
    description: '还没有相关内容'
  },
  noSearch: {
    icon: '🔍',
    title: '未找到结果',
    description: '尝试使用其他关键词搜索'
  },
  noNetwork: {
    icon: '🌐',
    title: '网络异常',
    description: '请检查网络连接后重试'
  },
  error: {
    icon: '⚠️',
    title: '加载失败',
    description: '请稍后重试或联系管理员'
  }
}
