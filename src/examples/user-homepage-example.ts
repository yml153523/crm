/**
 * 用户端首页 - 实时同步集成示例
 * 
 * 展示如何在用户端监听管理端事件并自动刷新UI
 */

import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRealtimeSync, useDataRefresh, onEvent } from '@/utils/user-realtime-listener'

// 使用Composable方式（推荐）
export function useHomePageWithRealtime() {
  
  // 数据状态
  const recommendations = ref([])
  const videos = ref([])
  const courses = ref([])
  const products = ref([])
  const loading = ref(false)
  
  // 实时同步
  const { wsState, useDataRefresh } = useRealtimeSync({ autoConnect: true })
  
  // 数据刷新触发器
  const refreshTrigger = useDataRefresh('all')  // 监听所有类型的事件
  
  /**
   * 加载推荐内容
   */
  async function loadRecommendations() {
    loading.value = true
    try {
      const res = await uni.request({
        url: '/api/recommendations/public',
        method: 'GET'
      })
      
      if (res.data?.success) {
        recommendations.value = res.data.data?.list || []
      }
    } catch (error) {
      console.error('[首页] 加载推荐失败:', error)
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 加载视频列表
   */
  async function loadVideos() {
    try {
      const res = await uni.request({ url: '/api/videos?limit=6', method: 'GET' })
      if (res.data?.success) {
        videos.value = res.data.data?.list || []
      }
    } catch (error) {
      console.error('[首页] 加载视频失败:', error)
    }
  }
  
  /**
   * 加载课程列表
   */
  async function loadCourses() {
    try {
      const res = await uni.request({ url: '/api/courses?limit=6', method: 'GET' })
      if (res.data?.success) {
        courses.value = res.data.data?.list || []
      }
    } catch (error) {
      console.error('[首页] 加载课程失败:', error)
    }
  }
  
  /**
   * 加载商品列表
   */
  async function loadProducts() {
    try {
      const res = await uni.request({ url: '/api/products?limit=6', method: 'GET' })
      if (res.data?.success) {
        products.value = res.data.data?.list || []
      }
    } catch (error) {
      console.error('[首页] 加载商品失败:', error)
    }
  }
  
  /**
   * 刷新所有数据
   */
  async function refreshAll() {
    console.log('[首页] 🔄 收到更新通知，正在刷新数据...')
    
    await Promise.all([
      loadRecommendations(),
      loadVideos(),
      loadCourses(),
      loadProducts()
    ])
    
    console.log('[首页] ✅ 数据刷新完成')
  }
  
  // 监听数据刷新触发器
  watch(refreshTrigger, (newVal, oldVal) => {
    if (newVal !== oldVal && newVal > 0) {
      // 触发器值变化，说明有新事件，刷新数据
      refreshAll()
    }
  }, { immediate: false })
  
  // 注册特定事件处理器（可选，用于更精细的控制）
  onEvent(['video:created', 'video:updated'], (payload) => {
    console.log('[首页] 视频更新:', payload.title || payload._id)
    loadVideos()  // 只刷新视频列表
  })
  
  onEvent(['course:created', 'course:updated'], (payload) => {
    console.log('[首页] 课程更新:', payload.title || payload._id)
    loadCourses()  // 只刷新课程列表
  })
  
  onEvent(['product:created', 'product:updated'], (payload) => {
    console.log('[首页] 商品更新:', payload.name || payload._id)
    loadProducts()  // 只刷新商品列表
  })
  
  onEvent('recommendation:published', (payload) => {
    console.log('[首页] 新推荐发布:', payload.title || payload._id)
    loadRecommendations()  // 只刷新推荐列表
  })
  
  onEvent('redPacket:published', (payload) => {
    console.log('[首页] 🧧 新红包活动！')
    // 可以显示红包弹窗等特殊处理
    showRedPacketNotification(payload)
  })
  
  /**
   * 显示红包通知弹窗
   */
  function showRedPacketNotification(packetInfo: any) {
    uni.showModal({
      title: '🧧 新红包活动',
      content: `${packetInfo.name || ''} - ${packetInfo.description || '快来领取吧！'}`,
      confirmText: '立即查看',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/user/red-packet' })
        }
      }
    })
  }
  
  // 组件挂载时加载初始数据
  onMounted(() => {
    refreshAll()
  })
  
  return {
    // 状态
    recommendations,
    videos,
    courses,
    products,
    loading,
    wsState,
    
    // 方法
    refreshAll,
    loadRecommendations,
    loadVideos,
    loadCourses,
    loadProducts
  }
}

// ==================== 手动连接方式（如果不使用Composable）====================

/**
 * 手动初始化和使用的示例
 */
export function manualRealtimeExample() {
  import { initUserWebSocket, onEvent, getUserWsStatus } from '@/utils/user-realtime-listener'
  
  // 1. 手动初始化连接
  initUserWebSocket()
  
  // 2. 注册事件监听器
  onEvent('*', (eventType, payload, timestamp) => {
    console.log(`[手动模式] 收到事件: ${eventType}`, payload)
    
    // 根据事件类型执行不同操作
    switch (eventType.split(':')[0]) {
      case 'video':
        // 刷新视频相关UI
        break
      case 'course':
        // 刷新课程相关UI
        break
      case 'product':
        // 刷新商品相关UI
        break
    }
  })
  
  // 3. 检查连接状态
  setInterval(() => {
    const status = getUserWsStatus()
    console.log(`[手动模式] 连接状态: ${status.connected ? '✅ 已连接' : '❌ 断开'}`)
  }, 10000)
}
