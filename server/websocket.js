/**
 * WebSocket 实时同步服务器
 * 
 * 功能：
 * - 管理端操作后，用户端实时收到通知
 * - 支持事件广播（视频/课程/商品/推荐等）
 * - 自动重连与心跳检测
 */

const { WebSocketServer, WebSocket } = require('ws')
const http = require('http')
const url = require('url')

// 事件类型定义
const EVENT_TYPES = {
  // 视频相关
  VIDEO_CREATED: 'video:created',
  VIDEO_UPDATED: 'video:updated',
  VIDEO_DELETED: 'video:deleted',
  
  // 课程相关
  COURSE_CREATED: 'course:created',
  COURSE_UPDATED: 'course:updated',
  COURSE_DELETED: 'course:deleted',
  
  // 商品相关
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_DELETED: 'product:deleted',
  
  // 推荐相关
  RECOMMENDATION_CREATED: 'recommendation:created',
  RECOMMENDATION_UPDATED: 'recommendation:updated',
  RECOMMENDATION_DELETED: 'recommendation:deleted',
  RECOMMENDATION_PUBLISHED: 'recommendation:published',
  
  // 红包相关
  RED_PACKET_CREATED: 'redPacket:created',
  RED_PACKET_UPDATED: 'redPacket:updated',
  RED_PACKET_PUBLISHED: 'redPacket:published',
  
  // 用户相关
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  
  // 系统通知
  SYSTEM_NOTIFICATION: 'system:notification',
  DATA_REFRESH_REQUIRED: 'data:refresh-required'
}

// 存储所有连接的客户端（按类型分组）
const clients = {
  admin: new Set(),      // 管理端连接
  user: new Set()        // 用户端连接
}

// 消息队列（用于离线消息）
const messageQueue = []

// 统计信息
const stats = {
  totalConnections: 0,
  adminConnections: 0,
  userConnections: 0,
  messagesSent: 0,
  startTime: Date.now()
}

// 存储WSS实例（供其他模块使用）
let _wss = null

/**
 * 创建WebSocket服务器并附加到HTTP服务器
 */
function createWSServer(httpServer) {
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',  // WebSocket路径
    perMessageDeflate: {  // 压缩配置
      zlibDeflateOptions: {
        level:6
      }
    }
  })

  // 连接处理
  wss.on('connection', handleConnection)
  
  // 错误处理
  wss.on('error', (error) => {
    console.error('[WebSocket] Server error:', error.message)
  })
  
  console.log(`[WebSocket] Server started at /ws`)
  
  _wss = wss
  
  return wss
}

function getWSS() {
  return _wss
}

/**
 * 处理新连接
 */
function handleConnection(ws, req) {
  const parsedUrl = url.parse(req.url, true)
  const clientType = parsedUrl.query.type || 'user'
  const clientId = generateClientId()
  let userId = null

  // 设置客户端属性
  ws.clientId = clientId
  ws.clientType = clientType
  ws.isAlive = true
  ws.connectTime = Date.now()
  ws.userId = null  // 初始化为null，等待认证

  // 如果URL中有token参数，尝试解析userId (用于用户端)
  if (parsedUrl.query.token) {
    try {
      const jwt = require('jsonwebtoken')
      const JWT_SECRET = process.env.JWT_SECRET || 'crm-secret-key-2026'
      const decoded = jwt.verify(parsedUrl.query.token, JWT_SECRET)
      if (decoded && decoded.id) {
        ws.userId = decoded.id.toString()
        console.log(`[WebSocket] User authenticated: ${ws.userId}`)
      }
    } catch (e) {
      console.warn('[WebSocket] Token解析失败:', e.message)
    }
  }

  // 注册客户端
  if (clientType === 'admin') {
    clients.admin.add(ws)
    stats.adminConnections++
  } else {
    clients.user.add(ws)
    stats.userConnections++
  }
  stats.totalConnections++
  
  console.log(`[WebSocket] ${clientType} connected: ${clientId}`)
  console.log(`[WebSocket] Stats - Admin: ${clients.admin.size}, User: ${clients.user.size}, Total: ${stats.totalConnections}`)
  
  // 发送欢迎消息
  sendToClient(ws, {
    type: 'system:connected',
    data: {
      clientId,
      clientType,
      message: `Welcome! You are connected as ${clientType}.`,
      timestamp: Date.now()
    }
  })
  
  // 发送离线消息（如果有）
  sendOfflineMessages(ws, clientType)
  
  // 心跳检测
  ws.on('pong', () => {
    ws.isAlive = true
  })
  
  // 消息处理
  ws.on('message', handleMessage.bind(null, ws))
  
  // 关闭处理
  ws.on('close', handleClose.bind(null, ws))
}

/**
 * 处理收到的消息
 */
function handleMessage(ws, message) {
  try {
    const data = JSON.parse(message.toString())
    
    switch (data.type) {
      case 'ping':
        // 心跳响应
        sendToClient(ws, { type: 'pong' })
        break
        
      case 'admin:event':
        // 管理端发送的事件 → 广播给所有用户端
        broadcastToUsers(data.eventType, data.payload)
        stats.messagesSent += clients.user.size
        console.log(`[WebSocket] Admin event broadcast: ${data.eventType} to ${clients.user.size} users`)
        break
        
      case 'user:subscribe':
        // 用户订阅特定频道
        ws.channels = ws.channels || []
        if (!ws.channels.includes(data.channel)) {
          ws.channels.push(data.channel)
        }
        console.log(`[WebSocket] User ${ws.clientId} subscribed to: ${data.channel}`)
        break

      case 'user:auth':
        // 用户发送认证信息 (连接后异步认证)
        if (data.token) {
          try {
            const jwt = require('jsonwebtoken')
            const JWT_SECRET = process.env.JWT_SECRET || 'crm-secret-key-2026'
            const decoded = jwt.verify(data.token, JWT_SECRET)
            if (decoded && decoded.id) {
              ws.userId = decoded.id.toString()
              sendToClient(ws, { type: 'auth:success', data: { userId: ws.userId } })
              console.log(`[WebSocket] User authenticated via message: ${ws.userId}`)
            } else {
              sendToClient(ws, { type: 'auth:failed', data: { error: 'Invalid token' } })
            }
          } catch (e) {
            sendToClient(ws, { type: 'auth:failed', data: { error: e.message } })
          }
        }
        break
        
      default:
        console.warn(`[WebSocket] Unknown message type: ${data.type}`)
    }
  } catch (error) {
    console.error('[WebSocket] Message parse error:', error.message)
  }
}

/**
 * 处理连接关闭
 */
function handleClose(ws) {
  if (ws.clientType === 'admin') {
    clients.admin.delete(ws)
    stats.adminConnections--
  } else {
    clients.user.delete(ws)
    stats.userConnections--
  }
  
  console.log(`[WebSocket] ${ws.clientType} disconnected: ${ws.clientId}`)
  console.log(`[WebSocket] Stats - Admin: ${clients.admin.size}, User: ${clients.user.size}`)
}

/**
 * 向指定客户端发送消息
 */
function sendToClient(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data))
  }
}

/**
 * 广播给所有用户端
 */
function broadcastToUsers(eventType, payload) {
  const message = {
    type: eventType,
    data: payload,
    timestamp: Date.now(),
    id: generateEventId()
  }
  
  // 发送给所有在线用户端
  clients.user.forEach(client => {
    // 如果用户有订阅特定频道，检查是否匹配
    if (!client.channels || shouldSendToChannel(message.type, client.channels)) {
      sendToClient(client, message)
    }
  })
  
  // 同时记录到消息队列（供离线用户使用）
  messageQueue.push({
    ...message,
    targetAudience: 'user'
  })
  
  // 保持队列不超过100条
  if (messageQueue.length > 100) {
    messageQueue.shift()
  }
}

/**
 * 广播给所有管理端
 */
function broadcastToAdmins(eventType, payload) {
  const message = {
    type: eventType,
    data: payload,
    timestamp: Date.now()
  }
  
  clients.admin.forEach(client => {
    sendToClient(client, message)
  })
}

/**
 * 全局广播（发给所有人）
 */
function broadcastAll(eventType, payload) {
  broadcastToUsers(eventType, payload)
  broadcastToAdmins(eventType, payload)
}

/**
 * 发送离线消息给新连接的用户
 */
function sendOfflineMessages(ws, clientType) {
  if (clientType !== 'user') return
  
  // 只发送最近5分钟的消息
  const recentMessages = messageQueue.filter(
    msg => msg.timestamp > Date.now() - 5 * 60 * 1000 && msg.targetAudience === 'user'
  )
  
  if (recentMessages.length > 0) {
    sendToClient(ws, {
      type: 'offline:messages',
      data: {
        count: recentMessages.length,
        messages: recentMessages
      },
      timestamp: Date.now()
    })
  }
}

/**
 * 判断是否应该发送到某个频道
 */
function shouldSendToChannel(eventType, channels) {
  if (!channels || channels.length === 0) return true
  
  // 提取事件的类别
  const category = eventType.split(':')[0]
  
  return channels.some(channel => {
    return channel === '*' || channel === category
  })
}

/**
 * 心跳检测定时器（每30秒检测一次）
 */
function startHeartbeat(wss) {
  setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) {
        // 关闭死连接
        ws.terminate()
        return
      }
      
      ws.isAlive = false
      ws.ping()  // 发送ping
    })
  }, 30000)
}

/**
 * 获取统计信息
 */
function getStats() {
  return {
    ...stats,
    uptime: Date.now() - stats.startTime,
    currentConnections: {
      admin: clients.admin.size,
      user: clients.user.size,
      total: wss?.clients?.size || 0
    },
    queueSize: messageQueue.length
  }
}

// 工具函数
function generateClientId() {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function generateEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
}

module.exports = {
  EVENT_TYPES,
  createWSServer,
  getWSS,
  get wss() { return _wss },
  broadcastToUsers,
  broadcastToAdmins,
  broadcastAll,
  getStats
}
