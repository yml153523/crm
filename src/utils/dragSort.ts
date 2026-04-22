/**
 * 拖拽排序工具 (移动端触摸优化版)
 * 支持触摸拖拽、视觉反馈、自动滚动
 */

interface DragSortConfig {
  listRef: any[]           // 列表数据引用
  onReorder: (fromIndex: number, toIndex: number) => void  // 排序回调
  itemHeight?: number      // 单项高度(用于计算)
  disabled?: boolean       // 是否禁用
}

class DragSortManager {
  private config: Required<DragSortConfig>
  private isDragging = false
  private dragIndex = -1
  private dragOverIndex = -1
  private startY = 0
  private currentY = 0
  private containerEl: HTMLElement | null = null
  private dragEl: HTMLElement | null = null
  private placeholderEl: HTMLElement | null = null
  private scrollContainer: HTMLElement | null = null
  private autoScrollTimer: number | null = null

  constructor(config: DragSortConfig) {
    this.config = {
      ...config,
      itemHeight: config.itemHeight || 100,
      disabled: config.disabled || false
    }
  }

  /**
   * 初始化拖拽（在mounted时调用）
   */
  init(containerSelector: string): void {
    if (this.config.disabled) return

    this.containerEl = document.querySelector(containerSelector)
    if (!this.containerEl) {
      console.warn('DragSort: 容器元素未找到', containerSelector)
      return
    }

    this.scrollContainer = this.findScrollParent(this.containerEl)

    // 绑定全局事件
    document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false })
    document.addEventListener('touchend', this.onTouchEnd.bind(this))
    document.addEventListener('mousemove', this.onMouseMove.bind(this))
    document.addEventListener('mouseup', this.onMouseUp.bind(this))
  }

  /**
   * 开始拖拽
   */
  startDrag(index: number, event: TouchEvent | MouseEvent): void {
    if (this.config.disabled || this.isDragging) return

    this.isDragging = true
    this.dragIndex = index
    this.dragOverIndex = index

    const touch = 'touches' in event ? event.touches[0] : event
    this.startY = touch.clientY
    this.currentY = touch.clientY

    // 创建拖拽元素
    this.createDragElement(index)

    // 创建占位符
    this.createPlaceholder()

    // 添加拖拽样式类
    this.containerEl?.classList.add('drag-sorting')
  }

  /**
   * 触摸移动处理
   */
  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging) return
    event.preventDefault() // 防止页面滚动

    const touch = event.touches[0]
    this.currentY = touch.clientY
    this.updateDragPosition()
    this.checkAutoScroll()
  }

  /**
   * 鼠标移动处理
   */
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return

    this.currentY = event.clientY
    this.updateDragPosition()
    this.checkAutoScroll()
  }

  /**
   * 触摸结束处理
   */
  onTouchEnd(): void {
    this.endDrag()
  }

  /**
   * 鼠标松开处理
   */
  onMouseUp(): void {
    this.endDrag()
  }

  /**
   * 更新拖拽位置
   */
  private updateDragPosition(): void {
    if (!this.dragEl) return

    // 移动拖拽元素
    const deltaY = this.currentY - this.startY
    this.dragEl.style.transform = `translateY(${deltaY}px)`

    // 计算目标索引
    const targetIndex = this.calculateTargetIndex()

    if (targetIndex !== this.dragOverIndex && targetIndex !== -1) {
      this.dragOverIndex = targetIndex
      this.updatePlaceholderPosition(targetIndex)
      this.updateVisualFeedback(targetIndex)
    }
  }

  /**
   * 计算目标位置索引
   */
  private calculateTargetIndex(): number {
    if (!this.containerEl) return -1

    const items = this.containerEl.querySelectorAll('.drag-item')
    let targetIndex = -1

    items.forEach((item, index) => {
      const rect = item.getBoundingClientRect()
      const centerY = rect.top + rect.height / 2

      if (this.currentY >= rect.top && this.currentY <= rect.bottom) {
        // 判断是在上半部分还是下半部分
        if (this.currentY < centerY) {
          targetIndex = index
        } else {
          targetIndex = index + 1
        }
      }
    })

    return Math.min(Math.max(targetIndex, 0), this.config.listRef.length - 1)
  }

  /**
   * 结束拖拽
   */
  private endDrag(): void {
    if (!this.isDragging) return

    this.stopAutoScroll()

    // 执行重排序
    if (this.dragOverIndex !== this.dragIndex && this.dragOverIndex !== -1) {
      this.config.onReorder(this.dragIndex, this.dragOverIndex)
    }

    // 清理DOM
    this.removeDragElement()
    this.removePlaceholder()
    this.clearVisualFeedback()

    // 重置状态
    this.isDragging = false
    this.dragIndex = -1
    this.dragOverIndex = -1
    this.startY = 0
    this.currentY = 0

    this.containerEl?.classList.remove('drag-sorting')
  }

  /**
   * 创建拖拽元素
   */
  private createDragElement(index: number): void {
    if (!this.containerEl) return

    const items = this.containerEl.querySelectorAll('.drag-item')
    const sourceItem = items[index] as HTMLElement
    if (!sourceItem) return

    const rect = sourceItem.getBoundingClientRect()

    // 创建克隆元素
    this.dragEl = sourceItem.cloneNode(true) as HTMLElement
    this.dragEl.classList.add('drag-ghost')
    this.dragEl.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      z-index: 9999;
      pointer-events: none;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      opacity: 0.95;
      transform: translateY(0px);
      transition: transform 0.15s ease-out;
    `

    document.body.appendChild(this.dragEl)

    // 原元素半透明
    sourceItem.classList.add('drag-source')
  }

  /**
   * 创建占位符
   */
  private createPlaceholder(): void {
    this.placeholderEl = document.createElement('div')
    this.placeholderEl.className = 'drag-placeholder'
    this.placeholderEl.style.cssText = `
      height: ${this.config.itemHeight}px;
      background: linear-gradient(135deg, #007AFF20, #5856D620);
      border: 2px dashed #007AFF;
      border-radius: 12px;
      margin-bottom: 12px;
    `
  }

  /**
   * 更新占位符位置
   */
  private updatePlaceholderPosition(targetIndex: number): void {
    if (!this.placeholderEl || !this.containerEl) return

    const items = this.containerEl.querySelectorAll('.drag-item')

    if (items[targetIndex]) {
      const targetItem = items[targetIndex] as HTMLElement
      targetItem.parentNode?.insertBefore(this.placeholderEl, targetItem)
    } else if (items.length > 0) {
      const lastItem = items[items.length - 1]
      lastItem.parentNode?.insertBefore(this.placeholderEl, lastItem.nextSibling)
    }
  }

  /**
   * 更新视觉反馈
   */
  private updateVisualFeedback(targetIndex: number): void {
    if (!this.containerEl) return

    const items = this.containerEl.querySelectorAll('.drag-item')
    items.forEach((item, idx) => {
      if (idx === this.dragIndex) return // 跳过源元素

      const el = item as HTMLElement
      if (idx === targetIndex) {
        el.classList.add('drag-over-target')
        el.style.transform = targetIndex > this.dragIndex ? 'translateY(100%)' : 'translateY(-100%)'
      } else {
        el.classList.remove('drag-over-target')
        el.style.transform = ''
      }
    })
  }

  /**
   * 清除视觉反馈
   */
  private clearVisualFeedback(): void {
    if (!this.containerEl) return

    const items = this.containerEl.querySelectorAll('.drag-item')
    items.forEach(item => {
      const el = item as HTMLElement
      el.classList.remove('drag-over-target', 'drag-source')
      el.style.transform = ''
    })
  }

  /**
   * 移除拖拽元素
   */
  private removeDragElement(): void {
    if (this.dragEl) {
      this.dragEl.remove()
      this.dragEl = null
    }
  }

  /**
   * 移除占位符
   */
  private removePlaceholder(): void {
    if (this.placeholderEl) {
      this.placeholderEl.remove()
      this.placeholderEl = null
    }
  }

  /**
   * 自动滚动检测
   */
  private checkAutoScroll(): void {
    if (!this.scrollContainer) return

    const containerRect = this.scrollContainer.getBoundingClientRect()
    const scrollThreshold = 50

    if (this.currentY < containerRect.top + scrollThreshold) {
      // 向上滚动
      this.startAutoScroll(-5)
    } else if (this.currentY > containerRect.bottom - scrollThreshold) {
      // 向下滚动
      this.startAutoScroll(5)
    } else {
      this.stopAutoScroll()
    }
  }

  /**
   * 开始自动滚动
   */
  private startAutoScroll(speed: number): void {
    this.stopAutoScroll()

    this.autoScrollTimer = window.setInterval(() => {
      if (this.scrollContainer) {
        this.scrollContainer.scrollTop += speed
      }
    }, 16)
  }

  /**
   * 停止自动滚动
   */
  private stopAutoScroll(): void {
    if (this.autoScrollTimer) {
      clearInterval(this.autoScrollTimer)
      this.autoScrollTimer = null
    }
  }

  /**
   * 查找可滚动的父容器
   */
  private findScrollParent(element: HTMLElement): HTMLElement | null {
    const overflowProps = ['overflow', 'overflowY']
    let parent = element.parentElement

    while (parent) {
      const style = getComputedStyle(parent)
      for (const prop of overflowProps) {
        if (style[prop] === 'auto' || style[prop] === 'scroll') {
          return parent
        }
      }
      parent = parent.parentElement
    }

    return window.document.documentElement
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    document.removeEventListener('touchmove', this.onTouchMove.bind(this))
    document.removeEventListener('touchend', this.onTouchEnd.bind(this))
    document.removeEventListener('mousemove', this.onMouseMove.bind(this))
    document.removeEventListener('mouseup', this.onMouseUp.bind(this))

    this.stopAutoScroll()
    this.removeDragElement()
    this.removePlaceholder()
  }
}

// 导出工厂函数和CSS样式字符串
export { DragSortManager }

export const dragSortStyles = `
  /* 拖拽排序样式 */
  .drag-sorting .drag-item {
    transition: transform 0.2s ease-out;
    user-select: none;
    -webkit-user-select: none;
  }

  .drag-ghost {
    transition: box-shadow 0.2s ease-out !important;
  }

  .drag-source {
    opacity: 0.3;
  }

  .drag-over-target {
    outline: 2px solid #007AFF;
    outline-offset: -2px;
  }

  .drag-placeholder {
    animation: pulse-placeholder 1s ease-in-out infinite;
  }

  @keyframes pulse-placeholder {
    0%, 100% { background-color: rgba(0, 122, 255, 0.1); }
    50% { background-color: rgba(0, 122, 255, 0.2); }
  }

  /* 拖拽手柄样式 */
  .drag-handle {
    cursor: grab;
    padding: 8px;
    color: #999999;
    font-size: 18px;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }

  .drag-handle:active {
    cursor: grabbing;
    color: #007AFF;
  }

  /* 排序模式提示 */
  .sort-mode-hint {
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 122, 255, 0.95);
    color: white;
    padding: 10px 20px;
    border-radius: 20px;
    font-size: 13px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slide-down 0.3s ease-out;
  }

  @keyframes slide-down {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
`
