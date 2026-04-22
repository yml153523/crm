/**
 * 数据格式化工具函数
 */

/**
 * 格式化手机号（脱敏处理）
 * @param phone - 原始手机号
 * @returns 脱敏后的手机号 (138****1234)
 */
export function maskPhone(phone: string): string {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/**
 * 格式化日期时间
 * @param date - 日期对象或字符串
 * @returns 格式化后的日期字符串 (YYYY-MM-DD HH:mm:ss)
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * 格式化数字（添加千位分隔符）
 * @param num - 数字
 * @returns 格式化后的字符串 (1,234,567)
 */
export function formatNumber(num: number): string {
  if (!num && num !== 0) return '0'
  return num.toLocaleString('zh-CN')
}

/**
 * 格式化价格
 * @param price - 价格数值
 * @returns 格式化后的价格字符串 (¥1,234.56)
 */
export function formatPrice(price: number): string {
  if (!price && price !== 0) return '¥0.00'
  return `¥${price.toFixed(2)}`
}

/**
 * 计算折扣百分比
 * @param originalPrice - 原价
 * @param currentPrice - 现价
 * @returns 折扣百分比 (如 25 表示75折)
 */
export function getDiscountPercent(originalPrice: number, currentPrice: number): number {
  if (!originalPrice || originalPrice === 0) return 0
  return Math.round((1 - currentPrice / originalPrice) * 100)
}

/**
 * 截断文本（超出长度显示省略号）
 * @param text - 原文本
 * @param maxLength - 最大长度
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
