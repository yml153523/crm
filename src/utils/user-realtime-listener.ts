/**
 * 用户端实时监听器
 * 
 * 功能：
 * - 连接WebSocket服务器
 * - 接收管理端的实时事件
 * - 自动刷新UI数据
 * - 显示通知提醒
 */

import { ref, reactive, onMounted, onUnmounted } from 'vue'

// WebSocket连接状态
export const wsState = reactive({
  connected: false,
  connecting: false,
  reconnectAttempts: 0,
  lastMessageTime: null as number | null
})

let wsInstance: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

// 配置
const WS_URL = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.hostname}:5011/ws?type=user`
const RECONNECT_INTERVAL = 3000  // 用户端重连间隔更短（3秒）
const MAX_RECONNECT_ATTEMPTS = 20  // 最大重连次数更多

// 事件处理器注册表（外部可以注册回调）
const eventHandlers: Map<string, Function[]> = new Map()

// 数据刷新触发器（用于通知组件更新）
const dataRefreshTriggers = {
  video: ref(0),
  course: ref(0),
  product: ref(0),
  recommendation: ref(0),
  redPacket: ref(0),
  user: ref(0),
  all: ref(0)
}

/**
 * 初始化用户端WebSocket连接
 */
export function initUserWebSocket() {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    console.log('[UserWS] Already connected')
    return wsInstance
  }

  if (wsState.connecting) {
    console.log('[UserWS] Connection in progress')
    return wsInstance
  }

  try {
    wsState.connecting = true
    console.log('[UserWS] Connecting to:', WS_URL)
    
    wsInstance = new WebSocket(WS_URL)
    
    wsInstance.onopen = () => {
      console.log('[UserWS] Connected successfully')
      wsState.connected = true
      wsState.connecting = false
      wsState.reconnectAttempts = 0
      
      // 订阅所有频道（接收所有类型的事件）
      subscribe('*')  // 订阅全部
      
      // 发送用户身份信息
      send({
        type: 'user:identify',
        data: { 
          role: 'user',
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        }
      })
      
      // 显示连接成功提示
      uni.showToast({ title: '实时同步已连接', icon: 'success', duration: 1500 })
    }
    
    wsInstance.onmessage = (event) => {
      handleServerMessage(event.data)
    }
    
    wsInstance.onerror = (error) => {
      console.error('[UserWS] Connection error:', error)
      wsState.connecting = false
    }
    
    wsInstance.onclose = (event) => {
      console.log(`[UserWS] Disconnected. Code: ${event.code}`)
      wsState.connected = false
      wsState.connecting = false
      
      // 自动重连
      if (wsState.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        wsState.reconnectAttempts++
        console.log(`[UserWS] Reconnecting... (${wsState.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
        reconnectTimer = setTimeout(() => initUserWebSocket(), RECONNECT_INTERVAL)
        
        // 每5次重连显示一次提示
        if (wsState.reconnectAttempts % 5 === 0) {
          uni.showToast({ title: `正在重新连接(${wsState.reconnectAttempts})`, icon: 'none', duration: 2000 })
        }
      } else {
        console.error('[UserWS] Max reconnection attempts reached')
        uni.showToast({ title: '实时同步已断开', icon: 'none', duration: 3000 })
      }
    }
    
    return wsInstance
    
  } catch (error) {
    console.error('[UserWS] Init failed:', error)
    wsState.connecting = false
    return null
  }
}

/**
 * 处理服务器消息
 */
function handleServerMessage(rawData: string) {
  try {
    const data = JSON.parse(rawData)
    wsState.lastMessageTime = Date.now()
    
    switch (data.type) {
      case 'system:connected':
        console.log('[UserWS]', data.data.message)
        break
        
      case 'offline:messages':
        // 处理离线消息
        handleOfflineMessages(data.data.messages)
        break
        
      case 'pong':
        // 心跳响应，忽略
        break
        
      default:
        // 业务事件处理
        handleBusinessEvent(data.type, data.data, data.timestamp)
    }
  } catch (error) {
    console.error('[UserWS] Message parse error:', error)
  }
}

/**
 * 处理业务事件
 */
function handleBusinessEvent(eventType: string, payload: any, timestamp: number) {
  console.log(`[UserWS] Event received: ${eventType}`, payload)
  
  // 提取事件类别
  const category = eventType.split(':')[0]
  
  // 触发数据刷新计数器（用于watch监听）
  if (dataRefreshTriggers[category]) {
    dataRefreshTriggers[category].value++
  }
  dataRefreshTriggers.all.value++
  
  // 调用注册的事件处理器
  callEventHandlers(eventType, payload, timestamp)
  
  // 根据事件类型显示用户提示
  showUserNotification(eventType, payload)
  
  // 广播给其他监听者（Vue组件可以通过onEvent注册）
  window.dispatchEvent(new CustomEvent('ws:event', { 
    detail: { type: eventType, payload, timestamp } 
  }))
}

/**
 * 处理离线消息
 */
function handleOfflineMessages(messages: any[]) {
  if (!messages || messages.length === 0) return
  
  console.log(`[UserWS] Received ${messages.length} offline messages`)
  
  messages.forEach(msg => {
    handleBusinessEvent(msg.type, msg.data, msg.timestamp)
  })
  
  uni.showToast({ 
    title: `收到${messages.length}条新更新`, 
    icon: 'success', 
    duration: 2000 
  })
}

/**
 * 显示用户通知
 */
function showUserNotification(eventType: string, payload: any) {
  let message = ''
  let icon = 'success'
  
  switch (eventType) {
    // 视频相关
    case 'video:created':
      message = `🎬 新视频: ${payload.title || ''}`
      break
    case 'video:updated':
      message = `🎬 视频已更新: ${payload.title || ''}`
      break
    case 'video:deleted':
      message = '🎬 一个视频已被删除'
      icon = 'none'
      break
      
    // 课程相关
    case 'course:created':
      message = `📚 新课程: ${payload.title || ''}`
      break
    case 'course:updated':
      message = `📚 课程已更新: ${payload.title || ''}`
      break
    case 'course:deleted':
      message = '📚 一个课程已被删除'
      icon = 'none'
      break
      
    // 商品相关
    case 'product:created':
      message = `📦 新商品: ${payload.name || ''}`
      break
    case 'product:updated':
      message = `📦 商品已更新: ${payload.name || ''} ¥${payload.price || ''}`
      break
    case 'product:deleted':
      message = '📦 一个商品已下架'
      icon = 'none'
      break
      
    // 推荐相关
    case 'recommendation:created':
    case 'recommendation:published':
      message = '⭐ 有新的推荐内容'
      break
    case 'recommendation:updated':
      message = '⭐ 推荐内容已更新'
      break
      
    // 红包相关
    case 'redPacket:created':
    case 'redPacket:published':
      message = '🧧 新红包活动来了！快去领取'
      icon = 'none'
      break
      
    // 数据刷新要求
    case 'data:refresh-required':
      message = '数据已更新，正在刷新...'
      break
      
    // 系统通知
    case 'system:notification':
      message = payload.message || '系统通知'
      icon = 'none'
      break
      
    default:
      message = `收到更新: ${eventType}`
  }
  
  if (message) {
    uni.showToast({ title: message, icon: icon as any, duration: 2500 })
  }
}

/**
 * 注册事件处理器
 */
export function onEvent(eventType: string | string[], handler: Function) {
  const types = Array.isArray(eventType) ? eventType : [eventType]
  
  types.forEach(type => {
    if (!eventHandlers.has(type)) {
      eventHandlers.set(type, [])
    }
    eventHandlers.get(type)!.push(handler)
  })
}

/**
 * 移除事件处理器
 */
export function offEvent(eventType: string, handler?: Function) {
  if (!handler) {
    eventHandlers.delete(eventType)
  } else {
    const handlers = eventHandlers.get(eventType)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }
}

/**
 * 调用事件处理器
 */
function callEventHandlers(eventType: string, payload: any, timestamp: number) {
  // 调用精确匹配的处理器
  const exactHandlers = eventHandlers.get(eventType)
  if (exactHandlers) {
    exactHandlers.forEach(handler => {
      try {
        handler(payload, timestamp)
      } catch (error) {
        console.error(`[UserWS] Handler error for ${eventType}:`, error)
      }
    })
  }
  
  // 调用通配符处理器 (* 或 category:*)
  const [category] = eventType.split(':')
  const wildcardTypes = [`*`, `${category}:*`]
  
  wildcardTypes.forEach(wildcard => {
    const wildcardHandlers = eventHandlers.get(wildcard)
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(eventType, payload, timestamp)
        } catch (error) {
          console.error(`[UserWS] Wildcard handler error:`, error)
        }
      })
    }
  })
}

/**
 * 订阅频道
 */
function subscribe(channel: string) {
  send({ type: 'user:subscribe', channel })
}

/**
 * 发送消息
 */
function send(data: any) {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify(data))
  }
}

/**
 * 关闭连接
 */
export function closeUserWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  
  if (wsInstance) {
    wsInstance.close(1000, 'User disconnected normally')
    wsInstance = null
  }
  
  wsState.connected = false
  wsState.connecting = false
  wsState.reconnectAttempts = MAX_RECONNECT_ATTEMPTS
}

/**
 * 获取数据刷新触发器（用于Vue组件的watch）
 */
export function useDataRefresh(category?: string) {
  if (category && dataRefreshTriggers[category]) {
    return dataRefreshTriggers[category]
  }
  return dataRefreshTriggers.all
}

/**
 * 获取连接状态
 */
export function getUserWsStatus() {
  return {
    ...wsState,
    readyState: wsInstance?.readyState ?? WebSocket.CLOSED
  }
}

// 心跳定时器（每25秒发送一次ping）
let heartbeatTimer: ReturnType<typeof setInterval> | null = null

function startHeartbeat() {
  stopHeartbeat()
  heartbeatTimer = setInterval(() => {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      send({ type: 'ping' })
    }
  }, 25000)
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

// Vue Composable：在组件中使用
export function useRealtimeSync(options?: { autoConnect?: boolean }) {
  const autoConnect = options?.autoConnect ?? true
  
  onMounted(() => {
    if (autoConnect) {
      initUserWebSocket()
      startHeartbeat()
    }
  })
  
  onUnmounted(() => {
    closeUserWebSocket()
    stopHeartbeat()
  })
  
  return {
    wsState,
    onEvent,
    offEvent,
    useDataRefresh,
    getUserWsStatus
  }
}
