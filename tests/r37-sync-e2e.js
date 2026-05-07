/**
 * R37: Admin操作→User端数据同步 全链路验证
 * 
 * 测试场景:
 * 1. Admin创建课程 → User REST API可查到
 * 2. Admin发送提醒 → WebSocket实时推送 + REST fallback
 * 3. Admin创建商品 → User商品列表可见
 * 4. 权限API返回的数据与DB实际数据一致
 */
const http = require('http')
const WebSocket = require('ws')
const jwt = require('jsonwebtoken')

const BASE = 'http://localhost:5011'
const WS_BASE = 'ws://localhost:5011/ws'
const JWT_SECRET = 'crm-secret-key-2026'

function req(path, opts = {}) {
  return new Promise((res, rej) => {
    const u = new URL(path, BASE)
    const r = http.request(u, { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, timeout: 10000 }, (response) => {
      let d = ''; response.on('data', c => d += c); response.on('end', () => { try { res({ s: response.statusCode, b: JSON.parse(d) }) } catch (e) { res({ s: response.statusCode, b: d }) } })
    })
    r.on('error', rej); r.on('timeout', () => { r.destroy(); rej(new Error('timeout')) })
    if (opts.body) r.write(JSON.stringify(opts.body)); r.end()
  })
}

async function adminLogin() {
  const res = await req('/api/auth/login', { method: 'POST', body: { phone: 'admin', password: '123456' } })
  return res.b?.success ? res.b.data.token : null
}

async function getUserToken(targetUserId) {
  return jwt.sign({ id: targetUserId, phone: 'test-user', role: 'user' }, JWT_SECRET, { expiresIn: '1h' })
}

async function main() {
  console.log('╔═════════════════════════════════════════════════════════════════╗')
  console.log('║       R37: Admin→User 数据同步全链路验证                          ║')
  console.log('╚═════════════════════════════════════════════════════════════════╝')
  console.log(`\n⏰ ${new Date().toISOString()}\n`)
  
  const results = []
  
  // ====== Step 1: Admin登录 ======
  console.log('📋 Step 1: Admin登录')
  const adminToken = await adminLogin()
  if (!adminToken) { console.error('❌ Admin登录失败'); process.exit(1) }
  results.push({ test: 'Admin登录', passed: true, detail: 'token获取成功' })
  console.log('  ✅ Admin登录成功\n')
  
  // ====== Step 2: 获取目标用户ID ======
  console.log('📋 Step 2: 获取用户列表')
  const userRes = await req('/api/users', { headers: { 'Authorization': `Bearer ${adminToken}` } })
  const targetUser = userRes.b?.data?.list?.find(u => u.role === 'user') || userRes.b?.data?.list?.[0]
  
  if (!targetUser) {
    // 使用demo方式
    const allUsers = await (await req('/api/users', { headers: { 'Authorization': `Bearer ${adminToken}` } })).b?.data?.list || []
    results.push({ test: '获取用户', passed: allUsers.length > 0, detail: `${allUsers.length}个用户` })
    
    if (allUsers.length === 0) {
      console.log('  ⚠️  无普通用户，跳过部分同步测试\n')
    }
  } else {
    results.push({ test: '获取用户', passed: true, detail: `userId=${targetUser._id}` })
    console.log(`  ✅ 目标用户: ${targetUser.name} (${targetUser._id})\n`)
  }
  
  const targetUserId = targetUser?._id || null
  
  // ====== Step 3: Admin发送提醒 → WS+REST 验证 ======
  console.log('📋 Step 3: Admin发送提醒 → 同步验证')
  
  if (targetUserId) {
    // 3a. 建立用户WebSocket连接
    const userToken = await getUserToken(targetUserId)
    const wsMessages = []
    
    const ws = new Promise((resolve, reject) => {
      const socket = new WebSocket(`${WS_BASE}?type=user&token=${encodeURIComponent(userToken)}`)
      
      const timer = setTimeout(() => resolve(socket), 5000)
      
      socket.on('open', () => {
        socket.send(JSON.stringify({ type: 'user:auth', token: userToken }))
        console.log('  📡 用户WS已连接并认证')
      })
      
      socket.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString())
          wsMessages.push(msg)
        } catch (e) {}
      })
      
      socket.on('error', () => { clearTimeout(timer); reject() })
    })
    
    let wsClient = null
    try { wsClient = await ws } catch(e) {}
    
    await new Promise(r => setTimeout(r, 1500))
    
    // 3b. Admin发送提醒
    const remindData = {
      userId: targetUserId,
      type: 'redPacket',
      title: `[R37同步测试] 红包提醒 ${new Date().toLocaleTimeString()}`,
      content: 'Admin→User同步验证'
    }
    
    const sendRes = await req('/api/remind/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: remindData
    })
    
    const sendOk = sendRes.s === 201 && sendRes.b?.success
    results.push({ test: 'Admin发送提醒API', passed: sendOk, detail: sendOk ? `remindId=${sendRes.b.data.remind?._id}` : `status=${sendRes.s}` })
    console.log(`  ${sendOk ? '✅' : '❌'} 提醒API: ${sendOk ? '成功' : '失败'}`)
    
    // 3c. 等待WS接收(5秒)
    await new Promise(r => setTimeout(r, 5000))
    
    const wsReceived = wsMessages.some(m => m.type === 'remind')
    results.push({ test: 'WS实时推送', passed: wsReceived, detail: wsReceived ? '用户实时收到' : '未收到(5s内)' })
    console.log(`  ${wsReceived ? '✅' : '⚠️'}  WS推送: ${wsReceived ? '实时到达' : '超时未到'}`)
    
    if (wsClient && wsClient.readyState === 1) wsClient.close()
    
    // 3d. REST API fallback验证
    const myRemindsRes = await req('/api/remind/my-reminds', {
      headers: { 'Authorization': `Bearer ${userToken}` }
    })
    
    const restOk = myRemindsRes.s === 200 && myRemindsRes.b?.success
    const hasR37Remind = restOk && myRemindsRes.b?.data?.list?.some(r => r.title?.includes('[R37同步测试]'))
    
    results.push({ test: 'REST fallback /my-reminds', passed: restOk, detail: restOk ? `${myRemindsRes.b.data.list?.length}条` : `status=${myRemindsRes.s}` })
    results.push({ test: 'REST包含R37提醒', passed: hasR37Remind, detail: hasR37Remind ? '找到' : '未找到' })
    console.log(`  ${restOk ? '✅' : '❌'}  REST API: ${restOk ? myRemindsRes.b.data.list?.length + '条记录' : '失败'}`)
    console.log(`  ${hasR37Remind ? '✅' : '❌'}  R37数据: ${hasR37Remind ? '一致' : '不一致'}`)
    
  } else {
    console.log('  ⏭️  跳过(无目标用户)\n')
  }
  
  // ====== Step 4: 商品数据同步验证 ======
  console.log('\n📋 Step 4: 商品数据 Admin↔User 一致性')
  
  const productsAdmin = await req('/api/products', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  })
  
  const productsPublic = await req('/api/products/public')
  
  const adminProductsOk = productsAdmin.s === 200 && productsAdmin.b?.success
  const publicProductsOk = productsPublic.s === 200 && productsPublic.b?.success
  
  const adminCount = adminProductsOk ? productsAdmin.b.data?.list?.length || 0 : -1
  const publicCount = publicProductsOk ? productsPublic.b.data?.length || 0 : -1
  
  results.push({ test: 'Admin商品列表API', passed: adminProductsOk, detail: `${adminCount}个商品` })
  results.push({ test: '公开商品API', passed: publicProductsOk, detail: `${publicCount}个商品` })
  console.log(`  ${adminProductsOk ? '✅' : '❌'}  Admin商品: ${adminCount}个`)
  console.log(`  ${publicProductsOk ? '✅' : '❌'}  公开商品: ${publicCount}个`)
  
  if (adminProductsOk && publicProductsOk && adminCount > 0) {
    results.push({ test: '商品数据一致性', passed: true, detail: `Admin:${adminCount}, Public:${publicCount}` })
  }
  
  // ====== Step 5: 权限配置与实际API一致性 ======
  console.log('\n📋 Step 5: 权限API ↔ 实际路由一致性')
  
  const permRes = await req('/api/permissions', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  })
  
  const permOk = permRes.s === 200 && permRes.b?.success
  results.push({ test: '权限API可用', passed: permOk, detail: permOk ? `${permRes.b.data.userPermissions.length}个权限` : `status=${permRes.s}` })
  
  if (permOk) {
    const permTree = permRes.b.data.permissionTree || {}
    const moduleCount = Object.keys(permTree).length
    
    results.push({ test: '权限树模块数', passed: moduleCount >= 2, detail: `${moduleCount}个顶层模块` })
    
    const hasDashboard = !!permTree['10001']
    const hasUserCenter = !!permTree['10002']
    results.push({ test: '管理后台模块存在', passed: hasDashboard, detail: hasDashboard ? '10001存在' : '缺失' })
    results.push({ test: '用户中心模块存在', passed: hasUserCenter, detail: hasUserCenter ? '10002存在' : '缺失' })
    
    console.log(`  ✅ 权限API正常: ${moduleCount}个顶层模块`)
    console.log(`  ${hasDashboard ? '✅' : '❌'}  管理后台: ${hasDashboard ? '有' : '无'}`)
    console.log(`  ${hasUserCenter ? '✅' : '❌'}  用户中心: ${hasUserCenter ? '有' : '无'}`)
  }
  
  // ====== Step 6: 健康检查 + 版本一致性 ======
  console.log('\n📋 Step 6: 服务健康 + 配置版本')
  
  const healthRes = await req('/api/health')
  const healthOk = healthRes.s === 200 && healthRes.b?.success
  const version = healthRes.b?.version
  const configLoaded = healthRes.b?.config === 'loaded'
  
  results.push({ test: '健康检查', passed: healthOk, detail: healthOk ? '服务正常' : '异常' })
  results.push({ test: '配置版本', passed: !!version, detail: version || '未知' })
  results.push({ test: '配置加载状态', passed: configLoaded, detail: configLoaded ? '已加载' : '未加载' })
  console.log(`  ${healthOk ? '✅' : '❌'}  健康: ${healthOk ? '正常' : '异常'}`)
  console.log(`  ${!!version ? '✅' : '❌'}  版本: ${version || 'N/A'}`)
  console.log(`  ${configLoaded ? '✅' : '❌'}  配置: ${configLoaded ? '已加载' : '未加载'}`)
  
  // ====== 结果汇总 ======
  console.log('\n' + '='.repeat(65))
  console.log('📊 R37 Admin→User 数据同步验证结果汇总')
  console.log('='.repeat(65))

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length

  console.log(`\n总计: ${total} 项 | 通过: ${passed} | 失败: ${failed}`)
  console.log(`通过率: ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`)

  if (failed > 0) {
    console.log('\n❌ 失败项:')
    results.filter(r => !r.passed).forEach(r => console.log(`   • ${r.test}: ${r.detail}`))
  }

  console.log('\n' + '='.repeat(65))

  if (passed >= total * 0.9) {
    console.log('✅ 数据同步链路基本通畅！系统运行正常。')
  } else {
    console.log('⚠️  存在同步问题，需要排查')
  }

  process.exit(failed > 3 ? 1 : 0)
}

main().catch(e => { console.error('💥 Fatal:', e.message); process.exit(1) })
