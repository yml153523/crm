/**
 * R28: 批量发送提醒(batch-send) WebSocket广播验证
 * 测试: Admin同时给多个用户发送 → 每个用户的WS都能收到
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
  console.log('=== R28 批量发送提醒广播验证 ===\n')

  // 1. Admin登录
  console.log('1️⃣ Admin登录...')
  const loginRes = await req('/api/auth/login', { method: 'POST', body: { phone: 'admin', password: '123456' } })
  if (!loginRes.b?.success) { console.log('❌ 登录失败'); process.exit(1) }
  const adminToken = loginRes.b.data.token
  console.log('✅ Admin登录成功\n')

  // 2. 获取所有用户
  console.log('2️⃣ 获取所有用户...')
  const userRes = await req('/api/users', { headers: { 'Authorization': `Bearer ${adminToken}` } })
  const allUsers = userRes.b?.data?.list || []
  console.log(`✅ 找到 ${allUsers.length} 个用户\n`)

  if (allUsers.length < 1) {
    console.log('❌ 用户不足，无法测试批量发送')
    process.exit(1)
  }

  // 3. 为每个用户建立WebSocket连接
  console.log('3️⃣ 为所有用户建立WebSocket连接...')
  const userConnections = []
  
  for (let i = 0; i < allUsers.length; i++) {
    const user = allUsers[i]
    const userToken = jwt.sign({ id: user._id, phone: user.phone || `user${i}`, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '1h' })
    
    const wsMessages = []
    const ws = new WebSocket(`ws://localhost:5011/ws?type=user&token=${encodeURIComponent(userToken)}`)
    
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`User${i} WS连接超时`)), 8000)
      
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'user:auth', token: userToken }))
      })
      
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString())
          wsMessages.push(msg)
          if (msg.type === 'auth:success') {
            clearTimeout(timer)
            resolve()
          }
        } catch (e) {}
      })
      
      ws.on('error', (err) => { clearTimeout(timer); reject(err) })
    })
    
    userConnections.push({ ws, userId: user._id, userName: user.name || `User${i}`, messages: wsMessages })
    console.log(`   ✅ 用户 ${user.name || user._id} WS已连接并认证`)
  }
  
  console.log(`\n✅ 所有 ${allUsers.length} 个用户WebSocket已就绪\n`)

  // 4. 批量发送提醒给所有用户
  console.log('4️⃣ Admin批量发送红包提醒...')
  const userIds = allUsers.map(u => u._id)
  
  const batchRes = await req('/api/remind/batch-send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: {
      userIds,
      type: 'redPacket',
      title: `[R28批量测试] 群发红包 ${new Date().toLocaleTimeString()}`,
      content: 'R28批量发送验证 - 所有用户应收到此消息'
    }
  })
  
  if (batchRes.s !== 201 || !batchRes.b?.success) {
    console.log('❌ 批量发送失败:', batchRes.b)
    userConnections.forEach(c => c.ws.close())
    process.exit(1)
  }
  
  console.log(`✅ 批量发送成功! 共 ${batchRes.b.data.count} 条提醒\n`)

  // 5. 验证每个用户是否都收到了提醒
  console.log('5️⃣ 验证每个用户的WS接收情况（等待5秒）...')
  
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  let receivedCount = 0
  const results = []
  
  for (const conn of userConnections) {
    const received = conn.messages.some(m => m.type === 'remind')
    
    if (received) {
      receivedCount++
      const remindMsg = conn.messages.find(m => m.type === 'remind')
      results.push({
        user: conn.userName,
        userId: conn.userId,
        status: '✅ 收到',
        title: remindMsg?.data?.title,
        totalMsgs: conn.messages.length
      })
    } else {
      results.push({
        user: conn.userName,
        userId: conn.userId,
        status: '❌ 未收到',
        title: null,
        totalMsgs: conn.messages.length
      })
    }
    
    conn.ws.close()
  }

  // 6. 输出结果
  console.log('\n' + '='.repeat(60))
  console.log('📊 R28 批量发送测试结果')
  console.log('='.repeat(60))
  
  console.log(`\n总用户数: ${allUsers.length}`)
  console.log(`成功接收: ${receivedCount}/${allUsers.length} (${((receivedCount / allUsers.length) * 100).toFixed(0)}%)`)
  
  console.log('\n详细结果:')
  results.forEach(r => {
    console.log(`  ${r.status} ${r.user} (${r.userId.slice(0,8)}...) - 共收到${r.totalMsgs}条消息`)
    if (r.title) console.log(`       提醒标题: ${r.title}`)
  })

  console.log('\n' + '='.repeat(60))
  
  if (receivedCount === allUsers.length) {
    console.log('🎉🎉🎉  完美！所有用户都收到了批量发送的提醒！')
    console.log('\n✅ batch-send + WebSocket广播 全链路验证通过')
    process.exit(0)
  } else if (receivedCount > 0) {
    console.log(`⚠️  部分用户收到 (${receivedCount}/${allUsers.length})`)
    console.log('可能原因: userId类型不匹配或WSS实例共享问题')
    process.exit(1)
  } else {
    console.log('❌ 没有用户收到提醒')
    console.log('batch-send的broadcastToUser可能未被正确调用')
    process.exit(1)
  }
}

main().catch(e => { console.error('💥 异常:', e.message); process.exit(1) })
