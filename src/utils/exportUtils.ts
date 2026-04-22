/**
 * 数据导出与撤销管理工具
 * 支持CSV/Excel格式导出 + 操作撤销机制
 */

// ========== 导出功能 ==========

interface ExportColumn {
  key: string
  label: string
  width?: number
}

interface ExportConfig {
  filename: string
  columns: ExportColumn[]
  data: any[]
  format?: 'csv' | 'excel'
}

/**
 * 导出数据为CSV文件（纯前端实现）
 */
export function exportToCSV(config: ExportConfig): void {
  const { filename, columns, data } = config

  // BOM头，确保Excel正确识别UTF-8编码
  const BOM = '\uFEFF'

  // CSV头部
  const header = columns.map(col => `"${col.label}"`).join(',')

  // CSV数据行
  const rows = data.map(item =>
    columns.map(col => {
      let value = getNestedValue(item, col.key)
      // 处理包含逗号、引号或换行的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = value.replace(/"/g, '""')
      }
      return `"${value ?? ''}"`
    }).join(',')
  )

  const csv = [BOM, header, ...rows].join('\n')

  // 触发下载
  downloadFile(csv, `${filename}_${getTimestamp()}.csv`, 'text/csv;charset=utf-8;')

  uni.showToast({ title: `已导出 ${data.length} 条数据`, icon: 'success' })
}

/**
 * 导出数据为Excel格式（使用纯前端实现，兼容Excel打开）
 */
export async function exportToExcel(config: ExportConfig): Promise<void> {
  const { filename, columns, data } = config

  try {
    // 使用HTML表格格式生成（Excel可直接打开）
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table border="1">'

    // 表头
    html += '<tr>'
    columns.forEach(col => {
      html += `<th style="background:#4472C4;color:white;font-weight:bold;padding:8px;">${col.label}</th>`
    })
    html += '</tr>'

    // 数据行
    data.forEach(item => {
      html += '<tr>'
      columns.forEach(col => {
        const value = getNestedValue(item, col.key) ?? ''
        html += `<td style="padding:6px;border:1px solid #ddd;">${escapeHtml(String(value))}</td>`
      })
      html += '</tr>'
    })

    html += '</table></body></html>'

    // 触发下载
    downloadFile(html, `${filename}_${getTimestamp()}.xls`, 'application/vnd.ms-excel')

    uni.showToast({ title: `已导出 ${data.length} 条数据`, icon: 'success' })
  } catch (error) {
    console.error('Excel导出失败:', error)
    // 如果HTML方式也失败，降级为CSV
    exportToCSV(config)
  }
}

/**
 * HTML转义
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * 智能导出（自动选择最佳格式）
 */
export async function exportData(config: ExportConfig): Promise<void> {
  if (config.format === 'excel') {
    await exportToExcel(config)
  } else {
    exportToCSV(config)
  }
}

// ========== 撤销管理 ==========

interface UndoAction {
  id: string
  type: 'delete' | 'update' | 'create'
  itemType: string
  itemData: any
  timestamp: number
  listRef: any[]
  index?: number
}

class UndoManager {
  private history: UndoAction[] = []
  private maxHistory = 20
  private undoToastTimer: number | null = null

  /**
   * 记录删除操作（可撤销）
   */
  recordDelete(itemType: string, itemData: any, listRef: any[]): string {
    const actionId = this.generateId()
    const index = listRef.findIndex((item: any) => item._id === itemData._id)

    this.history.push({
      id: actionId,
      type: 'delete',
      itemType,
      itemData: { ...itemData },
      timestamp: Date.now(),
      listRef,
      index: index >= 0 ? index : undefined
    })

    this.trimHistory()
    this.showUndoToast(actionId, '删除')

    return actionId
  }

  /**
   * 记录更新操作（可撤销到旧状态）
   */
  recordUpdate(itemType: string, oldData: any, listRef: any[]): string {
    const actionId = this.generateId()

    this.history.push({
      id: actionId,
      type: 'update',
      itemType,
      itemData: { ...oldData },
      timestamp: Date.now(),
      listRef
    })

    this.trimHistory()
    this.showUndoToast(actionId, '修改')

    return actionId
  }

  /**
   * 执行撤销操作
   */
  undo(actionId: string): boolean {
    const actionIndex = this.history.findIndex(a => a.id === actionId)
    if (actionIndex === -1) return false

    const action = this.history[actionIndex]

    switch (action.type) {
      case 'delete':
        // 恢复删除的项目
        if (action.index !== undefined && action.index >= 0) {
          action.listRef.splice(action.index, 0, action.itemData)
        } else {
          action.listRef.unshift(action.itemData)
        }
        uni.showToast({ title: '已撤销删除', icon: 'success' })
        break

      case 'update':
        // 恢复旧数据
        const idx = action.listRef.findIndex((item: any) => item._id === action.itemData._id)
        if (idx >= 0) {
          action.listRef[idx] = { ...action.itemData }
          uni.showToast({ title: '已撤销修改', icon: 'success' })
        }
        break
    }

    // 从历史记录中移除
    this.history.splice(actionIndex, 1)

    return true
  }

  /**
   * 显示撤销提示Toast（3秒内可点击撤销）
   */
  private showUndoToast(actionId: string, actionType: string): void {
    // 清除之前的定时器
    if (this.undoToastTimer) {
      clearTimeout(this.undoToastTimer)
    }

    // 使用uni.showModal替代Toast，提供撤销按钮
    uni.showModal({
      title: `${actionType}成功`,
      content: '是否撤销此操作？',
      confirmText: '撤销',
      cancelText: '保持',
      success: (res) => {
        if (res.confirm) {
          this.undo(actionId)
        }
      }
    })
  }

  /**
   * 清理过期历史记录
   */
  private trimHistory(): void {
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory)
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// 全局单例实例
export const undoManager = new UndoManager()

// ========== 工具函数 ==========

/**
 * 获取嵌套对象的值（支持点号路径）
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current?.[key]
  }, obj)
}

/**
 * 获取当前时间戳字符串
 */
function getTimestamp(): string {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
}

/**
 * 触发浏览器下载
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()

  // 延迟清理
  setTimeout(() => {
    URL.revokeObjectURL(url)
    document.body.removeChild(link)
  }, 100)
}

// ========== 预定义的导出配置 ==========

/**
 * 视频列表导出配置
 */
export const videoExportConfig = {
  columns: [
    { key: 'title', label: '标题', width: 30 },
    { key: 'category', label: '分类', width: 12 },
    { key: 'status', label: '状态', width: 10 },
    { key: 'duration', label: '时长', width: 10 },
    { key: 'viewCount', label: '观看次数', width: 12 },
    { key: 'completionCount', label: '完播数', width: 10 },
    { key: 'commentCount', label: '评论数', width: 10 },
    { key: 'isMarketing', label: '营销视频', width: 12 },
    { key: 'marketingType', label: '营销类型', width: 14 },
    { key: 'conversionRate', label: '转化率', width: 10 },
    { key: 'createdAt', label: '创建时间', width: 20 }
  ]
}

/**
 * 课程列表导出配置
 */
export const courseExportConfig = {
  columns: [
    { key: 'title', label: '课程名称', width: 30 },
    { key: 'category', label: '分类', width: 12 },
    { key: 'instructor', label: '讲师', width: 14 },
    { key: 'status', label: '状态', width: 10 },
    { key: 'price', label: '价格', width: 10 },
    { key: 'duration', label: '课时', width: 8 },
    { key: 'enrollmentCount', label: '报名人数', width: 12 },
    { key: 'completionRate', label: '完成率', width: 10 },
    { key: 'rating', label: '评分', width: 8 },
    { key: 'createdAt', label: '创建时间', width: 20 }
  ]
}

/**
 * 商品列表导出配置
 */
export const productExportConfig = {
  columns: [
    { key: 'name', label: '商品名称', width: 30 },
    { key: 'category', label: '分类', width: 12 },
    { key: 'status', label: '状态', width: 10 },
    { key: 'price', label: '价格', width: 10 },
    { key: 'originalPrice', label: '原价', width: 10 },
    { key: 'stock', label: '库存', width: 10 },
    { key: 'salesCount', label: '销量', width: 10 },
    { key: 'rating', label: '评分', width: 8 },
    { key: 'createdAt', label: '创建时间', width: 20 }
  ]
}
