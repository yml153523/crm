/**
 * 事件发射器 - 管理端专用
 * 
 * 用于在管理端执行CRUD操作后，向用户端发送实时通知
 */

import { ref } from 'vue'

// WebSocket连接状态
const wsConnected = ref(false)
let wsInstance: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

// 配置
const WS_URL = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.hostname}:5011/ws?type=admin`
const RECONNECT_INTERVAL = 5000  // 重连间隔5秒
const MAX_RECONNECT_ATTEMPTS = 10  // 最大重连次数
let reconnectAttempts = 0

/**
 * 初始化WebSocket连接（管理端）
 */
export function initAdminWebSocket() {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    console.log('[AdminWS] Already connected')
    return wsInstance
  }

  try {
    console.log('[AdminWS] Connecting to:', WS_URL)
    
    wsInstance = new WebSocket(WS_URL)
    
    wsInstance.onopen = () => {
      console.log('[AdminWS] Connected successfully')
      wsConnected.value = true
      reconnectAttempts = 0
      
      // 发送身份标识
      send({
        type: 'admin:identify',
        data: { role: 'admin', timestamp: Date.now() }
      })
    }
    
    wsInstance.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleServerMessage(data)
      } catch (error) {
        console.error('[AdminWS] Message parse error:', error)
      }
    }
    
    wsInstance.onerror = (error) => {
      console.error('[AdminWS] Connection error:', error)
    }
    
    wsInstance.onclose = (event) => {
      console.log(`[AdminWS] Disconnected. Code: ${event.code}, Reason: ${event.reason}`)
      wsConnected.value = false
      
      // 自动重连
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++
        console.log(`[AdminWS] Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
        reconnectTimer = setTimeout(() => initAdminWebSocket(), RECONNECT_INTERVAL)
      } else {
        console.error('[AdminWS] Max reconnection attempts reached')
        uni.showToast({ title: '实时同步断开', icon: 'none' })
      }
    }
    
    return wsInstance
    
  } catch (error) {
    console.error('[AdminWS] Init failed:', error)
    return null
  }
}

/**
 * 处理服务器消息
 */
function handleServerMessage(data: any) {
  switch (data.type) {
    case 'system:connected':
      console.log('[AdminWS]', data.data.message)
      break
      
    case 'pong':
      // 心跳响应，忽略
      break
      
    default:
      console.log('[AdminWS] Received:', data.type, data.data)
  }
}

/**
 * 发送事件到用户端（管理端调用此函数）
 */
export function emitEvent(eventType: string, payload: any) {
  if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) {
    console.warn('[AdminWS] Not connected, event queued:', eventType)
    // 可以考虑将事件缓存起来，重连后发送
    return false
  }
  
  const message = {
    type: 'admin:event',
    eventType,
    payload,
    timestamp: Date.now(),
    source: 'admin'
  }
  
  try {
    wsInstance.send(JSON.stringify(message))
    console.log(`[AdminWS] Event emitted: ${eventType}`, payload)
    return true
  } catch (error) {
    console.error('[AdminWS] Send error:', error)
    return false
  }
}

/**
 * 发送原始消息
 */
function send(data: any) {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify(data))
  }
}

/**
 * 关闭连接
 */
export function closeAdminWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  
  if (wsInstance) {
    wsInstance.close(1000, 'Admin disconnected normally')
    wsInstance = null
  }
  
  wsConnected.value = false
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS  // 阻止自动重连
}

/**
 * 获取连接状态
 */
export function getAdminWsStatus() {
  return {
    connected: wsConnected.value,
    readyState: wsInstance?.readyState ?? WebSocket.CLOSED,
    reconnectAttempts
  }
}

// ==================== 便捷的事件发射函数 ====================

/** 视频相关事件 */
export const videoEvents = {
  created: (videoData: any) => emitEvent('video:created', videoData),
  updated: (videoData: any) => emitEvent('video:updated', videoData),
  deleted: (videoId: string) => emitEvent('video:deleted', { id: videoId })
}

/** 课程相关事件 */
export const courseEvents = {
  created: (courseData: any) => emitEvent('course:created', courseData),
  updated: (courseData: any) => emitEvent('course:updated', courseData),
  deleted: (courseId: string) => emitEvent('course:deleted', { id: courseId })
}

/** 商品相关事件 */
export const productEvents = {
  created: (productData: any) => emitEvent('product:created', productData),
  updated: (productData: any) => emitEvent('product:updated', productData),
  deleted: (productId: string) => emitEvent('product:deleted', { id: productId })
}

/** 推荐相关事件 */
export const recommendationEvents = {
  created: (recData: any) => emitEvent('recommendation:created', recData),
  updated: (recData: any) => emitEvent('recommendation:updated', recData),
  deleted: (recId: string) => emitEvent('recommendation:deleted', { id: recId }),
  published: (recData: any) => emitEvent('recommendation:published', recData)
}

/** 红包相关事件 */
export const redPacketEvents = {
  created: (packetData: any) => emitEvent('redPacket:created', packetData),
  updated: (packetData: any) => emitEvent('redPacket:updated', packetData),
  published: (packetData: any) => emitEvent('redPacket:published', packetData)
}

/** 用户相关事件 */
export const userEvents = {
  created: (userData: any) => emitEvent('user:created', userData),
  updated: (userData: any) => emitEvent('user:updated', userData)
}

/** 系统通知事件 */
export const systemEvents = {
  notify: (notification: any) => emitEvent('system:notification', notification),
  requireRefresh: (dataType?: string) => emitEvent('data:refresh-required', { dataType })
}
