#!/usr/bin/env node

/**
 * WebSocket服务器独立启动脚本
 * 
 * 使用方法：
 *   node server/start-ws-server.js [port]
 *   
 * 默认端口：5011
 */

const { createServer } = require('./server-with-ws')

// 从命令行参数获取端口
const port = parseInt(process.argv[2]) || 5011
const host = process.env.HOST || '0.0.0.0'

console.log('╔══════════════════════════════════════════════════════════╗')
console.log('║     📡 CRM Real-time Sync Server - Starting...       ║')
console.log('╚══════════════════════════════════════════════════════════╝')
console.log(`\nConfiguration:`)
console.log(`  Host: ${host}`)
console.log(`  Port: ${port}`)
console.log(`  Time: ${new Date().toLocaleString()}\n`)

// 创建并启动服务器
const app = createServer({ port, host })

app.listen(() => {
  console.log('✅ Server is ready to accept connections!')
  console.log('\n📋 Connection URLs:')
  console.log(`   Admin:  ws://${host}:${port}/ws?type=admin`)
  console.log(`   User:   ws://${host}:${port}/ws?type=user`)
  console.log('\nPress Ctrl+C to stop the server\n')
})

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\n🛑 Received SIGINT, shutting down gracefully...')
  
  app.close(() => {
    console.log('✅ Server stopped successfully')
    process.exit(0)
  })
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...')
  
  app.close(() => {
    console.log('✅ Server stopped')
    process.exit(0)
  })
})

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
})
