/**
 * 高并发压力测试脚本
 * 测试系统在50-100并发下的性能和稳定性
 */

const http = require('http')

const API = 'http://123.56.107.111:5011'

// 测试配置
const TEST_SCENARIOS = [
  { name: '轻量级(10并发)', concurrency: 10, requests: 20 },
  { name: '中等负载(30并发)', concurrency: 30, requests: 50 },
  { name: '高负载(50并发)', concurrency: 50, requests: 100 },
  { name: '极限测试(100并发)', concurrency: 100, requests: 200 }
]

let globalStats = {
  totalRequests: 0,
  successCount: 0,
  errorCount: 0,
  totalTime: 0,
  minTime: Infinity,
  maxTime: 0,
  timeBuckets: {
    '<100ms': 0,
    '100-200ms': 0,
    '200-500ms': 0,
    '500ms-1s': 0,
    '>1s': 0
  }
}

function makeRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const startTime = Date.now()

    const options = {
      hostname: '123.56.107.111',
      port: 5011,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TOKEN || ''}`
      },
      timeout: 10000
    }

    if (body) {
      const postData = JSON.stringify(body)
      options.headers['Content-Length'] = Buffer.byteLength(postData)
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        const elapsed = Date.now() - startTime
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 400,
          statusCode: res.statusCode,
          elapsed
        })
      })
    })

    req.on('error', (err) => {
      resolve({
        success: false,
        statusCode: 0,
        elapsed: Date.now() - startTime,
        error: err.message
      })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({
        success: false,
        statusCode: 0,
        elapsed: Date.now() - startTime,
        error: 'timeout'
      })
    })

    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function getAuthToken() {
  console.log('\n🔑 获取认证Token...')
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username: 'admin', password: 'admin123' })

    const req = http.request({
      hostname: '123.56.107.111',
      port: 5011,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          process.env.TOKEN = json.data?.token || ''
          console.log(`✅ Token获取成功: ${process.env.TOKEN.substring(0, 20)}...`)
          resolve(process.env.TOKEN)
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

async function runConcurrencyTest(scenario) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 场景: ${scenario.name}`)
  console.log(`   并发数: ${scenario.concurrency} | 总请求数: ${scenario.requests}`)
  console.log('='.repeat(60))

  const endpoints = [
    '/api/health',
    '/api/courses',
    '/api/products',
    '/api/recommendations/public'
  ]

  let results = []
  let completed = 0
  let activeConnections = 0

  // 批量发送请求
  for (let i = 0; i < scenario.requests; i++) {
    if (activeConnections >= scenario.concurrency) {
      await new Promise(resolve => setTimeout(resolve, 10))
      i--
      continue
    }

    activeConnections++
    const endpoint = endpoints[i % endpoints.length]

    makeRequest(endpoint).then(result => {
      results.push(result)
      completed++
      activeConnections--

      // 更新全局统计
      globalStats.totalRequests++
      globalStats.totalTime += result.elapsed
      if (result.elapsed < globalStats.minTime) globalStats.minTime = result.elapsed
      if (result.elapsed > globalStats.maxTime) globalStats.maxTime = result.elapsed

      if (result.success) {
        globalStats.successCount++
      } else {
        globalStats.errorCount++
      }

      // 时间桶统计
      if (result.elapsed < 100) globalStats.timeBuckets['<100ms']++
      else if (result.elapsed < 200) globalStats.timeBuckets['100-200ms']++
      else if (result.elapsed < 500) globalStats.timeBuckets['200-500ms']++
      else if (result.elapsed < 1000) globalStats.timeBuckets['500ms-1s']++
      else globalStats.timeBuckets['>1s']++
    })
  }

  // 等待所有请求完成
  while (completed < scenario.requests) {
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  // 计算本场景统计
  const successful = results.filter(r => r.success).length
  const avgTime = Math.round(results.reduce((sum, r) => sum + r.elapsed, 0) / results.length)
  const p95Time = results.map(r => r.elapsed).sort((a, b) => a - b)[Math.floor(results.length * 0.95)]

  console.log(`\n📈 结果:`)
  console.log(`   成功率: ${(successful / results.length * 100).toFixed(1)}% (${successful}/${results.length})`)
  console.log(`   平均响应时间: ${avgTime}ms`)
  console.log(`   P95响应时间: ${p95Time || 'N/A'}ms`)
  console.log(`   最快: ${Math.min(...results.map(r => r.elapsed))}ms | 最慢: ${Math.max(...results.map(r => r.elapsed))}ms`)

  return {
    ...scenario,
    successRate: successful / results.length * 100,
    avgTime,
    p95Time,
    errorRate: ((results.length - successful) / results.length * 100).toFixed(1)
  }
}

async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════╗')
  console.log('║     ⚡ CRM 高并发压力测试套件                      ║')
  console.log('║     目标服务器: 123.56.107.111:5011                ║')
  console.log('╚═══════════════════════════════════════════════════════╝')

  const startTime = Date.now()

  try {
    // 获取Token
    await getAuthToken()

    // 运行所有场景
    const scenarioResults = []
    for (const scenario of TEST_SCENARIOS) {
      const result = await runConcurrencyTest(scenario)
      scenarioResults.push(result)

      // 场景间暂停
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // 最终报告
    const totalTime = Date.now() - startTime

    console.log('\n\n' + '='.repeat(70))
    console.log('🎯 压力测试最终报告')
    console.log('='.repeat(70))
    console.log(`\n⏱️  总耗时: ${(totalTime / 1000).toFixed(1)}s`)
    console.log(`📊 总请求数: ${globalStats.totalRequests}`)
    console.log(`✅ 成功: ${globalStats.successCount} (${(globalStats.successCount / globalStats.totalRequests * 100).toFixed(1)}%)`)
    console.log(`❌ 失败: ${globalStats.errorCount} (${(globalStats.errorCount / globalStats.totalRequests * 100).toFixed(1)}%)`)

    console.log(`\n⚡ 性能指标:`)
    console.log(`   平均响应时间: ${Math.round(globalStats.totalTime / globalStats.totalRequests)}ms`)
    console.log(`   最快响应: ${globalStats.minTime}ms`)
    console.log(`   最慢响应: ${globalStats.maxTime}ms`)

    console.log(`\n📊 响应时间分布:`)
    Object.entries(globalStats.timeBuckets).forEach(([bucket, count]) => {
      const pct = (count / globalStats.totalRequests * 100).toFixed(1)
      const bar = '█'.repeat(Math.round(pct / 2))
      console.log(`   ${bucket.padEnd(10)} ${count.toString().padStart(4)} 次 (${pct.padStart(5)}%) ${bar}`)
    })

    console.log('\n📋 各场景详情:')
    console.log('-'.repeat(70))
    scenarioResults.forEach(r => {
      const status = parseFloat(r.successRate) >= 95 ? '✅' : parseFloat(r.successRate) >= 80 ? '⚠️' : '❌'
      console.log(`${status} ${r.name.padEnd(20)} 成功率:${r.successRate.toFixed(1).padStart(6)}%  平均:${r.avgTime}ms  P95:${r.p95Time || 'N/A'}ms`)
    })

    // 评估结论
    console.log('\n' + '='.repeat(70))
    const overallSuccess = globalStats.successCount / globalStats.totalRequests * 100
    const avgResponse = Math.round(globalStats.totalTime / globalStats.totalRequests)

    if (overallSuccess >= 99 && avgResponse < 200) {
      console.log('🏆 评级: A+ (卓越) - 系统在高并发下表现优异')
    } else if (overallSuccess >= 95 && avgResponse < 500) {
      console.log('🥇 评级: A (优秀) - 系统性能良好，可应对生产负载')
    } else if (overallSuccess >= 90 && avgResponse < 1000) {
      console.log('🥈 评级: B (良好) - 系统基本稳定，建议优化慢接口')
    } else {
      console.log('🥉 评级: C (需改进) - 存在性能瓶颈，需要优化')
    }
    console.log('='.repeat(70))

  } catch (error) {
    console.error('\n❌ 测试异常:', error.message)
  }

  process.exit(globalStats.errorCount > 0 ? 1 : 0)
}

runAllTests().catch(console.error)
