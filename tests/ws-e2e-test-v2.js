/**
 * WebSocket E2E 测试脚本 (通过Nginx代理)
 */

const WebSocket = require('ws')

// 尝试不同的连接方式
const TEST_URLS = [
  'ws://123.56.107.111:5011/ws',      // 直连API
  'ws://123.56.107.111:8080/ws',       // 通过用户端Nginx
  'ws://123.56.107.111:8081/ws'        // 通过管理端Nginx
]

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

async function testConnection(wsUrl, label) {
  console.log(`\n=== 测试: ${label} (${wsUrl}) ===`)

  return new Promise((resolve) => {
    const ws = new WebSocket(wsUrl)

    const timeout = setTimeout(() => {
      logTest(label, false, '(超时5s)')
      ws.close()
      resolve(false)
    }, 5000)

    ws.on('open', () => {
      clearTimeout(timeout)
      logTest(label, true, '(连接成功)')
      ws.close()
      resolve(true)
    })

    ws.on('error', (err) => {
      clearTimeout(timeout)
      logTest(label, false, `(错误: ${err.message})`)
      resolve(false)
    })
  })
}

async function testBroadcast(successUrl) {
  if (!successUrl) {
    console.log('\n=== 跳过广播测试 (无可用连接) ===')
    return false
  }

  console.log('\n=== 测试: 广播消息 ===')

  const adminWs = new WebSocket(`${successUrl}?type=admin`)
  const userWs = new WebSocket(`${successUrl}?type=user`)

  await new Promise((resolve) => {
    let connected = 0
    const onConnect = () => { connected++; if (connected >= 2) resolve() }
    adminWs.on('open', onConnect)
    userWs.on('open', onConnect)
    setTimeout(resolve, 3000)
  })

  if (adminWs.readyState !== 1 || userWs.readyState !== 1) {
    logTest('广播准备', false, '(连接未就绪)')
    return false
  }

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

    // Admin发送事件
    adminWs.send(JSON.stringify({
      type: 'admin:event',
      eventType: 'course:created',
      payload: { title: 'E2E测试课程', action: 'test' }
    }))

    console.log('⏳ 等待广播...')

    setTimeout(() => {
      if (!receivedByUser) logTest('用户端收到广播', false, '(未收到)')
      adminWs.close()
      userWs.close()
      resolve(receivedByUser)
    }, 2000)
  })
}

async function runAllTests() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   🔄 WebSocket E2E 测试 (多路径)         ║')
  console.log('╚══════════════════════════════════════════╝')

  let workingUrl = null

  // 测试所有URL
  for (const url of TEST_URLS) {
    const label = url.includes(':5011') ? '直连API(5011)' :
                  url.includes(':8080') ? '用户端Nginx(8080)' :
                  '管理端Nginx(8081)'
    const success = await testConnection(url, label)
    if (success && !workingUrl) workingUrl = url
  }

  // 广播测试
  await testBroadcast(workingUrl)

  // 总结
  console.log('\n' + '='.repeat(50))
  console.log('📊 测试总结')
  console.log('='.repeat(50))
  console.log(`总计: ${testResults.total}`)
  console.log(`通过: ✅ ${testResults.passed}`)
  console.log(`失败: ❌ ${testResults.failed}`)
  console.log(`通过率: ${(testResults.passed / testResults.total * 100 || 0).toFixed(1)}%`)
  console.log('='.repeat(50))

  process.exit(testResults.failed > 0 ? 1 : 0)
}

runAllTests().catch(console.error)
