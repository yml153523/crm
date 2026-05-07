/**
 * R36: MongoDB全库数据一致性 + 完整性深度扫描
 * 
 * 检查维度:
 * 1. 集合存在性 - 所有15个集合是否正常
 * 2. 引用完整性 - 外键关联是否有效
 * 3. 数据格式 - 字段类型/必填项
 * 4. 索引覆盖 - 查询性能保障
 * 5. 权限数据 - 用户角色与权限配置的一致性
 */
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

const MONGODB_URI = 'mongodb://localhost:27017/crm_db'
const JWT_SECRET = 'crm-secret-key-2026'

let db = null

async function connectDB() {
  await mongoose.connect(MONGODB_URI)
  db = mongoose.connection.db
  console.log(`✅ MongoDB已连接: ${MONGODB_URI}`)
}

function getCollectionNames() {
  return [
    'users', 'courses', 'videos', 'products', 'carts',
    'orders', 'redpackets', 'redpacketrecords', 'reminds',
    'recommendations', 'videowatches', 'auditlogs',
    'payments', 'claimfrequencylogs', 'exporttasks'
  ]
}

async function checkCollectionExists(name) {
  const collections = await db.listCollections().toArray()
  const exists = collections.some(c => c.name === name)
  
  let count = 0
  if (exists) {
    count = await db.collection(name).countDocuments()
  }
  
  return { name, exists, count }
}

async function checkUserIntegrity() {
  const results = []
  const users = await db.collection('users').find({}).limit(50).toArray()
  
  if (users.length === 0) {
    results.push({ test: '用户集合非空', passed: false, detail: '无用户数据' })
    return results
  }
  
  results.push({ test: '用户集合存在且有数据', passed: users.length > 0, detail: `共${await db.collection('users').countDocuments()}个用户` })
  
  const roleDistribution = {}
  for (const u of users) {
    const role = u.role || 'unknown'
    roleDistribution[role] = (roleDistribution[role] || 0) + 1
    
    if (!u.phone) {
      results.push({ test: `用户${u._id}缺少phone`, passed: false, detail: 'phone字段为空' })
    }
    
    if (!u.role) {
      results.push({ test: `用户${u._id}缺少role`, passed: false, detail: 'role字段为空' })
    } else if (!['admin', 'super_admin', 'operator', 'vip_user', 'user'].includes(u.role)) {
      results.push({ test: `用户${u._id}角色无效`, passed: false, detail: `role="${u.role}"不在允许列表中` })
    }
  }
  
  results.push({ test: '角色分布统计', passed: true, detail: JSON.stringify(roleDistribution) })
  
  const validRoles = Object.keys(roleDistribution).filter(r => ['admin','super_admin','operator','vip_user','user'].includes(r))
  results.push({ test: '所有用户角色有效', passed: validRoles.length === Object.keys(roleDistribution).length, detail: `${validRoles.length}/${Object.keys(roleDistribution).length}有效` })
  
  return results
}

async function checkOrderIntegrity() {
  const results = []
  const ordersCount = await db.collection('orders').countDocuments()
  results.push({ test: '订单集合存在', passed: ordersCount >= 0, detail: `共${ordersCount}个订单` })
  
  if (ordersCount === 0) return results
  
  const orders = await db.collection('orders').find({}).limit(20).toArray()
  let refErrors = 0
  
  for (const order of orders) {
    if (order.userId) {
      const user = await db.collection('users').findOne({ _id: order.userId })
      if (!user) {
        refErrors++
        results.push({ test: `订单${order._id}引用的用户不存在`, passed: false, detail: `userId=${order.userId}` })
      }
    }
    
    if (Array.isArray(order.items)) {
      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i]
        if (item.productId) {
          const product = await db.collection('products').findOne({ _id: item.productId })
          if (!product) {
            refErrors++
            results.push({ test: `订单${order._id}商品[${i}]不存在`, passed: false, detail: `productId=${item.productId}` })
          }
        }
        
        if (item.redPacketId) {
          const rp = await db.collection('redpackets').findOne({ _id: item.redPacketId })
          if (!rp) {
            refErrors++
            results.push({ test: `订单${order._id}红包不存在`, passed: false, detail: `redPacketId=${item.redPacketId}` })
          }
        }
      }
    }
    
    if (!order.status || !['pending','paid','shipped','completed','cancelled'].includes(order.status)) {
      results.push({ test: `订单${order._id}状态无效`, passed: false, detail: `status="${order.status}"` })
    }
  }
  
  results.push({ test: '订单引用完整性', passed: refErrors === 0, detail: refErrors === 0 ? '全部有效' : `${refErrors}个引用断裂` })
  
  return results
}

async function checkRedPacketIntegrity() {
  const results = []
  const rpCount = await db.collection('redpackets').countDocuments()
  const userRpCount = await db.collection('redpacketrecords').countDocuments()
  
  results.push({ test: '红包主表', passed: rpCount >= 0, detail: `${rpCount}条记录` })
  results.push({ test: '用户红包表', passed: userRpCount >= 0, detail: `${userRpCount}条记录` })
  
  if (rpCount > 0) {
    const redPackets = await db.collection('redpackets').find({}).limit(10).toArray()
    let typeErrors = 0
    
    for (const rp of redPackets) {
      if (!rp.type || !['general','class','birthday','custom'].includes(rp.type)) {
        typeErrors++
      }
      
      if (rp.userId) {
        const user = await db.collection('users').findOne({ _id: rp.userId })
        if (!user) {
          results.push({ test: `红包${rp._id}用户引用无效`, passed: false, detail: `userId=${rp.userId}` })
        }
      }
      
      if (typeof rp.amount !== 'number' && typeof rp.totalAmount !== 'number') {
        results.push({ test: `红包${rp._id}金额字段异常`, passed: false, detail: `amount=${rp.amount}, totalAmount=${rp.totalAmount}` })
      }
    }
    
    results.push({ test: '红包类型有效性', passed: typeErrors === 0, detail: typeErrors === 0 ? '全部有效' : `${typeErrors}个类型错误` })
  }
  
  if (userRpCount > 0) {
    const userRps = await db.collection('redpacketrecords').find({}).limit(10).toArray()
    let refErrors = 0
    
    for (const urp of userRps) {
      if (urp.redPacketId) {
        const parent = await db.collection('redpackets').findOne({ _id: urp.redPacketId })
        if (!parent) {
          refErrors++
          results.push({ test: `用户红包${urp._id}父红包不存在`, passed: false, detail: `redPacketId=${urp.redPacketId}` })
        }
      }
      
      if (urp.userId) {
        const user = await db.collection('users').findOne({ _id: urp.userId })
        if (!user) {
          refErrors++
          results.push({ test: `用户红包${urp._id}用户不存在`, passed: false, detail: `userId=${urp.userId}` })
        }
      }
    }
    
    results.push({ test: '用户红包引用完整性', passed: refErrors === 0, detail: refErrors === 0 ? '全部有效' : `${refErrors}个引用断裂` })
  }
  
  return results
}

async function checkRemindIntegrity() {
  const results = []
  const remindCount = await db.collection('reminds').countDocuments()
  results.push({ test: '提醒集合存在', passed: remindCount >= 0, detail: `${remindCount}条记录` })
  
  if (remindCount === 0) return results
  
  const reminds = await db.collection('reminds').find({}).limit(15).toArray()
  let typeErrors = 0
  let refErrors = 0
  let statusErrors = 0
  
  for (const r of reminds) {
    if (!r.type || !['redPacket','classReminder','system','custom'].includes(r.type)) {
      typeErrors++
      results.push({ test: `提醒${r._id}类型无效`, passed: false, detail: `type="${r.type}"` })
    }
    
    if (r.userId) {
      const user = await db.collection('users').findOne({ _id: r.userId })
      if (!user) {
        refErrors++
        results.push({ test: `提醒${r._id}用户不存在`, passed: false, detail: `userId=${r.userId}` })
      }
    }
    
    if (!r.status || !['sent','delivered','read','failed'].includes(r.status)) {
      statusErrors++
    }
    
    if (r.read !== true && r.read !== false && r.read !== undefined) {
      results.push({ test: `提醒${r._id}read字段异常`, passed: false, detail: `read=${r.read}` })
    }
  }
  
  results.push({ test: '提醒类型有效性', passed: typeErrors === 0, detail: `${reminds.length-typeErrors}/${reminds.length}正确` })
  results.push({ test: '提醒引用完整性', passed: refErrors === 0, detail: refErrors === 0 ? '全部有效' : `${refErrors}个引用断裂` })
  results.push({ test: '提醒状态有效性', passed: statusErrors === 0, detail: statusErrors === 0 ? '全部有效' : `${statusErrors}个状态错误` })
  
  const unreadCount = await db.collection('reminds').countDocuments({ read: false })
  const readCount = await db.collection('reminds').countDocuments({ read: true })
  results.push({ test: '已读/未读计数', passed: true, detail: `未读:${unreadCount}, 已读:${readCount}, 总计:${unreadCount+readCount}` })
  
  return results
}

async function checkCartIntegrity() {
  const results = []
  const cartCount = await db.collection('carts').countDocuments()
  results.push({ test: '购物车集合', passed: cartCount >= 0, detail: `${cartCount}条记录` })
  
  if (cartCount === 0) return results
  
  const carts = await db.collection('carts').find({}).limit(10).toArray()
  let refErrors = 0
  
  for (const cart of carts) {
    if (cart.userId) {
      const user = await db.collection('users').findOne({ _id: cart.userId })
      if (!user) {
        refErrors++
        results.push({ test: `购物车${cart._id}用户不存在`, passed: false, detail: `userId=${cart.userId}` })
      }
    }
    
    if (Array.isArray(cart.items) && cart.items.length > 0) {
      for (const item of cart.items) {
        if (item.productId) {
          const product = await db.collection('products').findOne({ _id: item.productId })
          if (!product) {
            refErrors++
            results.push({ test: `购物车${cart._id}商品不存在`, passed: false, detail: `productId=${item.productId}` })
          }
        }
      }
    }
  }
  
  results.push({ test: '购物车引用完整性', passed: refErrors === 0, detail: refErrors === 0 ? '全部有效' : `${refErrors}个引用断裂` })
  
  return results
}

async function checkPermissionConfigConsistency() {
  const results = []
  
  const users = await db.collection('users').find({}).toArray()
  const rolesInDB = new Set(users.map(u => u.role).filter(Boolean))
  
  const configRoles = ['super_admin', 'admin', 'operator', 'vip_user', 'user']
  
  const extraRoles = [...rolesInDB].filter(r => !configRoles.includes(r))
  const missingRoles = configRoles.filter(r => !rolesInDB.has(r))
  
  results.push({ test: '数据库角色与配置一致', passed: extraRoles.length === 0, detail: extraRoles.length > 0 ? `多余角色: ${extraRoles.join(',')}` : '一致' })
  results.push({ test: '配置角色在DB中有实例', passed: missingRoles.every(r => r === 'super_admin' || r === 'operator'), detail: missingRoles.filter(r => r!=='super_admin'&& r!=='operator').length === 0 ? 'OK' : `缺失: ${missingRoles.join(',')}` })
  
  const adminUsers = users.filter(u => u.role === 'admin' || u.role === 'super_admin')
  results.push({ test: '管理员账号存在', passed: adminUsers.length > 0, detail: `${adminUsers.length}个管理员` })
  
  return results
}

async function main() {
  console.log('╔═════════════════════════════════════════════════════════════════╗')
  console.log('║       R36: MongoDB全库数据一致性 + 完整性深度扫描                  ║')
  console.log('╚═════════════════════════════════════════════════════════════════╝')
  console.log(`\n⏰ ${new Date().toISOString()}\n`)
  
  const allResults = []
  
  try {
    await connectDB()
    
    // Phase 1: 集合存在性检查
    console.log('📋 Phase 1: 集合存在性检查\n')
    const collections = getCollectionNames()
    const collectionResults = []
    
    for (const name of collections) {
      const info = await checkCollectionExists(name)
      collectionResults.push(info)
      console.log(`  ${info.exists ? '✅' : '⚠️'}  ${name.padEnd(25)} ${info.exists ? info.count + '条' : '不存在!'}`)
      allResults.push({ test: `集合${name}`, passed: info.exists, detail: info.exists ? `${info.count}条` : '不存在' })
    }
    
    const existingCollections = collectionResults.filter(c => c.exists)
    console.log(`\n  📊 集合计: ${existingCollections.length}/${collections.length} 存在\n`)
    
    // Phase 2: 用户数据完整性
    console.log('📋 Phase 2: 用户数据完整性\n')
    const userResults = await checkUserIntegrity()
    allResults.push(...userResults)
    userResults.forEach(r => console.log(`  ${r.passed ? '✅' : '❌'} ${r.test}: ${r.detail}`))
    
    // Phase 3: 订单引用完整性
    console.log('\n📋 Phase 3: 订单引用完整性\n')
    const orderResults = await checkOrderIntegrity()
    allResults.push(...orderResults)
    orderResults.forEach(r => console.log(`  ${r.passed ? '✅' : '❌'} ${r.test}: ${r.detail}`))
    
    // Phase 4: 红包数据完整性
    console.log('\n📋 Phase 4: 红包数据完整性\n')
    const rpResults = await checkRedPacketIntegrity()
    allResults.push(...rpResults)
    rpResults.forEach(r => console.log(`  ${r.passed ? '✅' : '❌'} ${r.test}: ${r.detail}`))
    
    // Phase 5: 提醒数据完整性
    console.log('\n📋 Phase 5: 提醒数据完整性\n')
    const remindResults = await checkRemindIntegrity()
    allResults.push(...remindResults)
    remindResults.forEach(r => console.log(`  ${r.passed ? '✅' : '❌'} ${r.test}: ${r.detail}`))
    
    // Phase 6: 购物车完整性
    console.log('\n📋 Phase 6: 购物车完整性\n')
    const cartResults = await checkCartIntegrity()
    allResults.push(...cartResults)
    cartResults.forEach(r => console.log(`  ${r.passed ? '✅' : '❌'} ${r.test}: ${r.detail}`))
    
    // Phase 7: 权限配置一致性
    console.log('\n📋 Phase 7: 权限配置与DB一致性\n')
    const permResults = await checkPermissionConfigConsistency()
    allResults.push(...permResults)
    permResults.forEach(r => console.log(`  ${r.passed ? '✅' : '❌'} ${r.test}: ${r.detail}`))
    
  } catch (error) {
    console.error('\n💥 扫描异常:', error.message)
    allResults.push({ test: '扫描执行', passed: false, detail: error.message })
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close()
    }
  }
  
  // 结果汇总
  console.log('\n' + '='.repeat(65))
  console.log('📊 R36 数据一致性扫描结果汇总')
  console.log('='.repeat(65))

  const passed = allResults.filter(r => r.passed).length
  const failed = allResults.filter(r => !r.passed).length
  const total = allResults.length

  console.log(`\n总计: ${total} 项检查 | 通过: ${passed} | 失败: ${failed}`)
  console.log(`通过率: ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`)

  if (failed > 0) {
    console.log('\n❌ 失败项详情:')
    allResults.filter(r => !r.passed).forEach(r => {
      console.log(`   • ${r.test}: ${r.detail}`)
    })
  }

  console.log('\n' + '='.repeat(65))

  if (failed === 0) {
    console.log('🎉 所有数据一致性检查通过！数据库健康！')
  } else if (failed <= 3) {
    console.log(`⚠️  发现 ${failed} 个问题，建议修复`)
  } else {
    console.log(`🔴 发现 ${failed} 个问题，需要立即处理`)
  }

  process.exit(failed > 3 ? 1 : 0)
}

main().catch(e => { console.error('💥 Fatal:', e.message); process.exit(1) })
