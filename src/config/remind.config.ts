/**
 * 提醒中心模块 - Mock数据与工具函数
 *
 * 提取静态数据和通用函数，减少主组件代码量
 */

// Mock红包用户数据
export function getMockRedPacketUsers() {
  return [
    { _id: '1', name: '张三', phone: '138****1234', isVIP: true, isActive: true },
    { _id: '2', name: '李四', phone: '139****5678', isVIP: false, isActive: true },
    { _id: '3', name: '王五', phone: '137****9012', isVIP: true, isActive: false },
    { _id: '4', name: '赵六', phone: '136****3456', isVIP: false, isActive: true },
    { _id: '5', name: '孙七', phone: '135****7890', isVIP: true, isActive: true }
  ]
}

// Mock上课用户数据
export function getMockClassUsers() {
  return [
    { _id: '1', name: '小明', phone: '138****1111', courseName: '瑜伽基础', classTime: '今天 14:00' },
    { _id: '2', name: '小红', phone: '139****2222', courseName: '普拉提进阶', classTime: '今天 16:00' },
    { _id: '3', name: '小刚', phone: '137****3333', courseName: '舞蹈入门', classTime: '明天 10:00' }
  ]
}

// Mock历史记录
export function getMockHistory() {
  return [
    { _id: 'h1', type: 'redPacket', title: '红包提醒', targetName: '张三', time: '2026-04-19 14:30', status: 'success' },
    { _id: 'h2', type: 'classReminder', title: '上课提醒', targetName: '小红', time: '2026-04-19 16:00', status: 'success' },
    { _id: 'h3', type: 'redPacket', title: '红包提醒', targetName: '王五', time: '2026-04-18 09:15', status: 'failed' }
  ]
}

// 推荐类型图标映射
export const RECOMMEND_TYPE_ICONS: Record<string, string> = {
  video: '🎬',
  course: '📚',
  product: '📦',
  custom: '⭐'
}

// 推荐类型标签
export const RECOMMEND_TYPE_LABELS: Record<string, string> = {
  video: '视频',
  course: '课程',
  product: '商品',
  custom: '自定义'
}
