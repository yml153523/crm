/**
 * 实时同步集成工具
 * 
 * 将WebSocket功能集成到现有的API请求流程中
 * 在管理端CRUD操作成功后自动发射事件
 */

import { 
  videoEvents, 
  courseEvents, 
  productEvents,
  recommendationEvents,
  redPacketEvents,
  userEvents,
  systemEvents,
  initAdminWebSocket
} from './admin-event-emitter'

// 初始化标志
let initialized = false

/**
 * 初始化实时同步系统（在管理端App启动时调用）
 */
export function initRealtimeSync() {
  if (initialized) {
    console.log('[RealtimeSync] Already initialized')
    return
  }
  
  console.log('[RealtimeSync] Initializing...')
  
  // 初始化WebSocket连接
  const ws = initAdminWebSocket()
  
  if (ws) {
    initialized = true
    console.log('[RealtimeSync] Initialized successfully')
    
    // 监听连接状态变化
    setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('[RealtimeSync] Connection lost, attempting reconnect...')
        initAdminWebSocket()
      }
    }, 30000)  // 每30秒检查一次
  } else {
    console.error('[RealtimeSync] Initialization failed')
  }
}

/**
 * 包装API请求，在成功后自动发射事件
 */
export function withRealtimeEmit<T>(
  apiCall: Promise<any>,
  eventType: string,
  getPayload?: (response: any) => any
): Promise<T> {
  return apiCall.then((response) => {
    // 检查是否成功
    if (response.success !== false && (response.statusCode === 200 || response.statusCode === 201)) {
      // 提取payload（如果有自定义函数）
      const payload = getPayload ? getPayload(response) : response.data
      
      // 发射事件
      emitEventByType(eventType, payload)
    }
    
    return response as T
  })
}

/**
 * 根据事件类型调用对应的发射函数
 */
function emitEventByType(eventType: string, payload: any) {
  const [category, action] = eventType.split(':')
  
  switch (category) {
    case 'video':
      if (action === 'created') videoEvents.created(payload)
      else if (action === 'updated') videoEvents.updated(payload)
      else if (action === 'deleted') videoEvents.deleted(payload)
      break
      
    case 'course':
      if (action === 'created') courseEvents.created(payload)
      else if (action === 'updated') courseEvents.updated(payload)
      else if (action === 'deleted') courseEvents.deleted(payload)
      break
      
    case 'product':
      if (action === 'created') productEvents.created(payload)
      else if (action === 'updated') productEvents.updated(payload)
      else if (action === 'deleted') productEvents.deleted(payload)
      break
      
    case 'recommendation':
      if (action === 'created') recommendationEvents.created(payload)
      else if (action === 'updated') recommendationEvents.updated(payload)
      else if (action === 'deleted') recommendationEvents.deleted(payload)
      else if (action === 'published') recommendationEvents.published(payload)
      break
      
    case 'redPacket':
      if (action === 'created') redPacketEvents.created(payload)
      else if (action === 'updated') redPacketEvents.updated(payload)
      else if (action === 'published') redPacketEvents.published(payload)
      break
      
    case 'user':
      if (action === 'created') userEvents.created(payload)
      else if (action === 'updated') userEvents.updated(payload)
      break
      
    default:
      systemEvents.notify({ type: eventType, payload })
  }
}

// ==================== 预定义的便捷包装函数 ====================

/** 视频操作 */
export const videoSync = {
  create: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'video:created', res => res.data?.video || res.data),
  
  update: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'video:updated', res => res.data?.video || res.data),
  
  delete: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'video:deleted', res => ({ id: res.data?._id || res.data }))
}

/** 课程操作 */
export const courseSync = {
  create: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'course:created', res => res.data?.course || res.data),
  
  update: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'course:updated', res => res.data?.course || res.data),
  
  delete: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'course:deleted', res => ({ id: res.data?._id || res.data }))
}

/** 商品操作 */
export const productSync = {
  create: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'product:created', res => res.data?.product || res.data),
  
  update: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'product:updated', res => res.data?.product || res.data),
  
  delete: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'product:deleted', res => ({ id: res.data?._id || res.data }))
}

/** 推荐操作 */
export const recommendationSync = {
  create: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'recommendation:created', res => res.data?.recommendation || res.data),
  
  update: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'recommendation:updated', res => res.data?.recommendation || res.data),
  
  delete: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'recommendation:deleted', res => ({ id: res.data?._id || res.data })),
  
  publish: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'recommendation:published', res => res.data?.recommendation || res.data)
}

/** 红包操作 */
export const redPacketSync = {
  create: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'redPacket:created', res => res.data?.packet || res.data),
  
  update: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'redPacket:updated', res => res.data?.packet || res.data),
  
  publish: (apiCall: Promise<any>) => 
    withRealtimeEmit(apiCall, 'redPacket:published', res => res.data?.packet || res.data)
}
