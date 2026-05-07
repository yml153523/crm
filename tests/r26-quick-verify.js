/**
 * R26 精简版: 提醒系统核心验证
 * 直接测试: WS认证 + Admin发送 → 用户接收
 */
const WebSocket = require('ws')
const http = require('http')
const jwt = require('jsonwebtoken')

const BASE = 'http://localhost:5011'
const JWT_SECRET = 'crm-secret-key-2026'

function req(path, opts = {}) {
  return new Promise((res, rej) => {
    const u = new URL(path, BASE)
    const r = http.request(u, { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, timeout: 8000 }, (response) => {
      let d = ''; response.on('data', c => d += c); response.on('end', () => { try { res({ s: response.statusCode, b: JSON.parse(d) }) } catch (e) { res({ s: response.statusCode, b: d }) } })
    })
    r.on('error', rej); r.on('timeout', () => { r.destroy(); rej(new Error('timeout')) })
    if (opts.body) r.write(JSON.stringify(opts.body)); r.end()
  })
}

async function main() {
  console.log('=== R26 提醒系统核心验证 ===\n')

  // 1. Admin登录
  console.log('1️⃣ Admin登录...')
  const loginRes = await req('/api/auth/login', { method: 'POST', body: { phone: 'admin', password: '123456' } })
  if (!loginRes.b?.success) { console.log('❌ 登录失败:', loginRes.b); process.exit(1) }
  const adminToken = loginRes.b.data.token
  console.log('✅ Admin登录成功\n')

  // 2. 获取用户ID
  console.log('2️⃣ 获取目标用户...')
  const userRes = await req('/api/users', { headers: { 'Authorization': `Bearer ${adminToken}` } })
  const targetUser = userRes.b?.data?.list?.find(u => u.role === 'user') || userRes.b?.data?.list?.[0]
  if (!targetUser) { console.log('❌ 无用户'); process.exit(1) }
  const targetUserId = targetUser._id
  console.log(`✅ 目标用户: ${targetUserId} (${targetUser.name})\n`)

  // 3. 生成用户token（模拟用户登录后的token）
  const userToken = jwt.sign({ id: targetUserId, phone: targetUser.phone || 'test', role: 'user' }, JWT_SECRET, { expiresIn: '1h' })

  // 4. 建立WebSocket连接 + 认证
  console.log('3️⃣ 建立WebSocket连接...')
  const wsMessages = []
  
  const ws = new WebSocket(`ws://localhost:5011/ws?type=user&token=${encodeURIComponent(userToken)}`)
  
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WS连接超时')), 10000)
    
    ws.on('open', () => {
      console.log('✅ WS已连接, 发送auth消息...')
      ws.send(JSON.stringify({ type: 'user:auth', token: userToken }))
    })
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        wsMessages.push(msg)
        console.log(`📨 收到: ${msg.type}`)
        
        if (msg.type === 'auth:success') {
          console.log(`✅ WS认证成功! userId=${msg.data.userId}\n`)
          clearTimeout(timer)
          resolve()
        }
        if (msg.type === 'auth:fail' || msg.type === 'auth:failed') {
          clearTimeout(timer)
          reject(new Error('Auth failed: ' + (msg.data?.error || 'unknown')))
        }
      } catch (e) {}
    })
    
    ws.on('error', (err) => { clearTimeout(timer); reject(err) })
  })

  // 5. Admin发送提醒
  console.log('4️⃣ Admin发送红包提醒...')
  const sendRes = await req('/api/remind/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: {
      userId: targetUserId,
      type: 'redPacket',
      title: `[R26验证] 红包提醒 ${new Date().toLocaleTimeString()}`,
      content: '端到端测试 - 请确认用户WS能收到此消息'
    }
  })
  
  if (sendRes.s !== 201 || !sendRes.b?.success) {
    console.log('❌ 发送失败:', sendRes)
    ws.close()
    process.exit(1)
  }
  console.log(`✅ 提醒API调用成功! remindId=${sendRes.b.data.remind?._id}\n`)

  // 6. 等待WS收到提醒
  console.log('5️⃣ 等待WebSocket接收提醒(5秒)...')
  
  const received = await new Promise((resolve) => {
    const check = setInterval(() => {
      const found = wsMessages.some(m => m.type === 'remind')
      if (found) {
        clearInterval(check)
        resolve(wsMessages.find(m => m.type === 'remind'))
      }
    }, 300)
    
    setTimeout(() => {
      clearInterval(check)
      resolve(null)
    }, 5000)
  })

  // 7. 结果判定
  console.log('\n' + '='.repeat(50))
  if (received) {
    console.log('🎉🎉🎉  测试通过！用户WebSocket成功收到提醒！')
    console.log('\n📋 收到的提醒内容:')
    console.log(`   类型: ${received.data?.type}`)
    console.log(`   标题: ${received.data?.title}`)
    console.log(`   内容: ${received.data?.content}`)
    console.log(`   时间戳: ${new Date(received.timestamp).toLocaleString()}`)
    
    console.log('\n✅✅✅  R26修复验证成功！')
    console.log('   根因: websocket.js 缺少 ws.userId 赋值')
    console.log('   修复: 添加 URL token 解析 + user:auth 消息认证')
    console.log('   效果: broadcastToUser() 可正确匹配并推送消息')
  } else {
    console.log('⚠️  WebSocket未在5秒内收到提醒')
    console.log(`\n📊 WS共收到 ${wsMessages.length} 条消息:`)
    wsMessages.forEach(m => console.log(`   - ${m.type}`))
    
    console.log('\n可能原因:')
    console.log('  1. WSS实例未被remind.js正确引用')
    console.log('  2. userId类型不匹配(ObjectId vs String)')
    console.log('  3. broadcastToUser函数未被调用')
  }
  
  ws.close()
  console.log('='.repeat(50))
  process.exit(received ? 0 : 1)
}

main().catch(e => { console.error('💥 异常:', e.message); process.exit(1) })
