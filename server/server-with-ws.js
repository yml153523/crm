/**
 * 增强的HTTP服务器 - 集成WebSocket支持
 * 
 * 在原有HTTP服务基础上添加WebSocket功能
 */

const http = require('http')
const { createWSServer, getStats, broadcastAll } = require('./websocket')

// 存储服务器实例
let httpServer = null
let wssInstance = null

/**
 * 创建集成了WebSocket的HTTP服务器
 */
function createServer(options = {}) {
  const { port = 5011, host = '0.0.0.0' } = options
  
  // 创建HTTP服务器
  httpServer = http.createServer((req, res) => {
    // 基础的API路由处理（这里只是示例，实际应该使用Express等框架）
    if (req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ 
        status: 'ok', 
        timestamp: Date.now(),
        websocket: wssInstance ? 'active' : 'inactive'
      }))
    } else if (req.url === '/api/ws-stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(getStats()))
    } else {
      // 其他请求返回404（实际项目中这里应该是API路由）
      res.writeHead(404)
      res.end('Not Found')
    }
  })
  
  // 添加WebSocket支持
  wssInstance = createWSServer(httpServer)
  
  // 启动心跳检测
  if (wssInstance) {
    startHeartbeat(wssInstance)
  }
  
  return {
    server: httpServer,
    wss: wssInstance,
    
    /**
     * 启动服务器
     */
    listen(callback) {
      httpServer.listen(port, host, () => {
        console.log(`\n🚀 Server running at http://${host}:${port}`)
        console.log(`📡 WebSocket endpoint: ws://${host}:${port}/ws`)
        console.log(`\nAvailable endpoints:`)
        console.log(`  - Health check: http://${host}:${port}/api/health`)
        console.log(`  - WS Stats:     http://${host}:${port}/api/ws-stats\n`)
        
        if (callback) callback()
      })
      
      return this
    },
    
    /**
     * 关闭服务器
     */
    close(callback) {
      console.log('\n⏹️  Shutting down server...')
      
      // 先关闭WebSocket连接
      if (wssInstance) {
        wssInstance.clients.forEach(client => {
          client.close(1001, 'Server shutting down')
        })
        wssInstance.close(() => {
          console.log('[WebSocket] Server closed')
        })
      }
      
      // 再关闭HTTP服务器
      httpServer.close(() => {
        console.log('[HTTP] Server closed')
        if (callback) callback()
      })
      
      return this
    },
    
    /**
     * 获取服务器统计信息
     */
    stats() {
      return {
        ...getStats(),
        http: {
          listening: httpServer.listening,
          port,
          host
        }
      }
    }
  }
}

/**
 * 心跳检测定时器
 */
function startHeartbeat(wss) {
  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) {
        ws.terminate()
        return
      }
      
      ws.isAlive = false
      ws.ping()
    })
  }, 30000)
  
  // 清理定时器（当进程退出时）
  process.on('SIGINT', () => {
    clearInterval(interval)
  })
  process.on('SIGTERM', () => {
    clearInterval(interval)
  })
}

// 导出便捷函数
module.exports = {
  createServer,
  getStats,
  broadcastAll
}
