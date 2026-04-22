/**
 * 仪表盘模块 - 配置与默认值
 */

export const DASHBOARD_WIDGETS = {
  stats: {
    totalUsers: { title: '总用户数', icon: '👥', color: '#007AFF' },
    totalVideos: { title: '视频总数', icon: '🎬', color: '#34C759' },
    totalCourses: { title: '课程总数', icon: '📚', color: '#FF9500' },
    conversionRate: { title: '转化率', icon: '📈', color: '#AF52DE' }
  },
  
  quickActions: [
    { label: '添加视频', icon: '🎬', path: '/pages/admin/video/list' },
    { label: '创建课程', icon: '📚', path: '/pages/admin/course/library' },
    { label: '商品管理', icon: '📦', path: '/pages/admin/product/list' },
    { label: '发送提醒', icon: '🔔', path: '/pages/admin/remind/index' }
  ]
}

export const TIME_PERIODS = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'quarter', label: '本季度' },
  { value: 'year', label: '本年' }
]
