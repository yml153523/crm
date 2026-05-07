/**
 * WebSocket E2E 测试脚本
 * 验证连接、广播、心跳等功能
 */

const WebSocket = require('ws')
const http = require('http')

const WS_URL = 'ws://123.56.107.111:5011/ws'
const API_URL = 'http://123.56.107.111:5011'

let testResults = {
  passed: 0,
  failed: 0,
  total: 0
}

function logTest(name, passed, details = '') {
  testResults.total++
  if (passed) {
    testResults.passed++
    console.log(`✅ PASS: ${name} ${details}`)
  } else {
    testResults.failed++
    console.log(`❌ FAIL: ${name} ${details}`)
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testWSConnection() {
  console.log('\n=== 测试1: WebSocket连接测试 ===')

  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}?type=user`)

    const timeout = setTimeout(() => {
      logTest('User客户端连接', false, '(超时)')
      ws.close()
      resolve(false)
    }, 5000)

    ws.on('open', () => {
      clearTimeout(timeout)
      logTest('User客户端连接', true, '(连接成功)')
      ws.close()
      resolve(true)
    })

    ws.on('error', (err) => {
      clearTimeout(timeout)
      logTest('User客户端连接', false, `(错误: ${err.message})`)
      resolve(false)
    })
  })
}

async function testAdminConnection() {
  console.log('\n=== 测试2: Admin客户端连接测试 ===')

  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}?type=admin`)

    const timeout = setTimeout(() => {
      logTest('Admin客户端连接', false, '(超时)')
      ws.close()
      resolve(false)
    }, 5000)

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'system:connected') {
          clearTimeout(timeout)
          const isCorrectType = msg.data?.clientType === 'admin'
          logTest('Admin客户端连接', isCorrectType, isCorrectType ? `(clientId: ${msg.data?.clientId})` : '(类型错误)')
          ws.close()
          resolve(isCorrectType)
        }
      } catch (e) {}
    })

    ws.on('error', (err) => {
      clearTimeout(timeout)
      logTest('Admin客户端连接', false, `(错误: ${err.message})`)
      resolve(false)
    })
  })
}

async function testBroadcast() {
  console.log('\n=== 测试3: 广播消息测试 ===')

  const adminWs = new WebSocket(`${WS_URL}?type=admin`)
  const userWs = new WebSocket(`${WS_URL}?type=user`)

  await new Promise((resolve) => {
    let connected = 0
    const checkConnected = (ws) => {
      connected++
      if (connected >= 2) resolve()
    }

    adminWs.on('open', () => checkConnected(adminWs))
    userWs.on('open', () => checkConnected(userWs))

    setTimeout(() => resolve(), 3000)
  })

  return new Promise((resolve) => {
    let receivedByUser = false

    userWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'course:created') {
          receivedByUser = true
          logTest('用户端收到广播', true, `(事件: ${msg.type})`)
        }
      } catch (e) {}
    })

    // Admin发送广播事件
    adminWs.send(JSON.stringify({
      type: 'admin:event',
      eventType: 'course:created',
      payload: {
        title: 'E2E测试课程',
        action: 'test'
      }
    }))

    console.log('⏳ 等待用户端接收广播...')

    setTimeout(() => {
      if (!receivedByUser) {
        logTest('用户端收到广播', false, '(未收到消息)')
      }
      adminWs.close()
      userWs.close()
      resolve(receivedByUser)
    }, 2000)
  })
}

async function testHeartbeat() {
  console.log('\n=== 测试4: 心跳检测测试 ===')

  const ws = new WebSocket(`${WS_URL}?type=user`)

  await new Promise((resolve) => {
    ws.on('open', resolve)
    setTimeout(resolve, 3000)
  })

  return new Promise((resolve) => {
    let receivedPong = false

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'pong') {
          receivedPong = true
          logTest('心跳响应', true)
        }
      } catch (e) {}
    })

    // 发送ping
    ws.send(JSON.stringify({ type: 'ping' }))

    setTimeout(() => {
      if (!receivedPong) {
        logTest('心跳响应', false, '(未收到pong)')
      }
      ws.close()
      resolve(receivedPong)
    }, 1500)
  })
}

async function testMultipleConnections() {
  console.log('\n=== 测试5: 多连接并发测试 ===')

  const connections = []
  const numClients = 5

  for (let i = 0; i < numClients; i++) {
    connections.push(new WebSocket(`${WS_URL}?type=user`))
  }

  await new Promise((resolve) => {
    let connected = 0
    connections.forEach(ws => {
      ws.on('open', () => {
        connected++
        if (connected >= numClients) resolve()
      })
    })
    setTimeout(resolve, 5000)
  })

  const success = connections.every(ws => ws.readyState === WebSocket.OPEN)
  logTest(`${numClients}个并发连接`, success, `(${connected}/${numClients} 成功)`)

  connections.forEach(ws => ws.close())
  return success
}

async function runAllTests() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   🔄 WebSocket E2E 测试套件             ║')
  console.log('║   目标服务器: 123.56.107.111:5011       ║')
  console.log('╚══════════════════════════════════════════╝')

  try {
    await testWSConnection()
    await testAdminConnection()
    await testBroadcast()
    await testHeartbeat()
    await testMultipleConnections()

  } catch (error) {
    console.error('\n❌ 测试套件异常:', error.message)
  }

  // 输出总结
  console.log('\n' + '='.repeat(50))
  console.log('📊 测试总结')
  console.log('='.repeat(50))
  console.log(`总计: ${testResults.total} 个测试`)
  console.log(`通过: ✅ ${testResults.passed}`)
  console.log(`失败: ❌ ${testResults.failed}`)
  console.log(`通过率: ${(testResults.passed / testResults.total * 100).toFixed(1)}%`)
  console.log('='.repeat(50))

  process.exit(testResults.failed > 0 ? 1 : 0)
}

runAllTests().catch(console.error)
