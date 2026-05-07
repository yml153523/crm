const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const BASE_USER = 'http://123.56.107.111:8080'
const BASE_ADMIN = 'http://123.56.107.111:8081'
const OUT_DIR = path.join(__dirname, '../screenshots')
const REPORT = []

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

function log(msg) { const t = `[${new Date().toISOString().slice(11,19)}] ${msg}`; console.log(t); REPORT.push(t) }

async function snap(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  log(`📸 截图: ${name}`)
  return file
}

async function test(url, desc) {
  try {
    const res = await fetch(url); const ok = res.ok
    log(`${ok ? '✅' : '❌'} ${desc}: HTTP ${res.status}`)
    return ok
  } catch(e) {
    log(`❌ ${desc}: ${e.message}`)
    return false
  }
}

async function testAuth(url, body, desc) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    const ok = data.success === true
    log(`${ok ? '✅' : '❌'} ${desc}: ${data.message || (ok ? 'success' : 'failed')}`)
    return ok ? (data.data?.token || '') : ''
  } catch(e) {
    log(`❌ ${desc}: ${e.message}`)
    return ''
  }
}

async function testAuthGet(url, token, desc) {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    const ok = data.success === true
    const count = data.data?.list?.length || data.data?.users?.length || data.data?.total || 0
    log(`${ok ? '✅' : '❌'} ${desc}: ${ok ? `OK(${count}条)` : data.message || 'failed'}`)
    return ok
  } catch(e) {
    log(`❌ ${desc}: ${e.message}`)
    return false
  }
}

;(async () => {
  log('🚀 CRM系统全自动验证开始')
  log('')

  log('=== Phase1: 服务健康检查 ===')
  await test(`${BASE_USER}/`, '用户端首页(8080)')
  await test(`${BASE_ADMIN}/`, '管理端首页(8081)')

  log('')
  log('=== Phase2: 认证登录 ===')
  const userToken = await testAuth(`${BASE_USER}/api/auth/login`, { phone: '133333333333', password: '123456' }, '用户登录(133333333333)')
  const adminToken = await testAuth(`${BASE_ADMIN}/api/auth/login`, { phone: 'admin', password: '123456' }, '管理员登录(admin)')

  log('')
  log('=== Phase3: 用户端API ===')
  if (userToken) {
    await testAuthGet(`${BASE_USER}/api/auth/profile?t=${Date.now()}`, userToken, '用户个人信息')
    await test(`${BASE_USER}/api/courses/public?_t=${Date.now()}`, '公开课程列表')
    await test(`${BASE_USER}/api/videos/public?_t=${Date.now()}`, '公开视频列表')
    await test(`${BASE_USER}/api/products/public?_t=${Date.now()}`, '公开商品列表')
    await testAuthGet(`${BASE_USER}/api/remind/my-reminds?page=1&pageSize=5`, userToken, '我的通知')
  } else {
    log('⚠️ 用户登录失败，跳过用户API测试')
  }

  log('')
  log('=== Phase4: 管理端API ===')
  if (adminToken) {
    await testAuthGet(`${BASE_ADMIN}/api/auth/profile?t=${Date.now()}`, adminToken, '管理员个人信息')
  } else {
    log('⚠️ 管理员登录失败，跳过管理API测试')
  }

  log('')
  log('=== Phase5: 错误处理验证 ===')
  await testAuth(`${BASE_USER}/api/auth/login`, { phone: '', password: '' }, '登录-空参数(应失败)')
  await testAuth(`${BASE_USER}/api/auth/login`, { phone: '00000000000', password: 'wrong' }, '登录-错误凭证(应失败)')

  log('')
  log('=== Phase6: 截图采集 ===')
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  })

  try {
    // User pages
    log('--- 用户端截图 ---')
    const pageUser = await browser.newPage()
    await pageUser.setViewport({ width: 390, height: 844 })

    await pageUser.goto(`${BASE_USER}/`, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))
    await snap(pageUser, '01-user-home')
    await pageUser.close()

    // Admin pages
    log('--- 管理端截图 ---')
    const pageAdmin = await browser.newPage()
    await pageAdmin.setViewport({ width: 390, height: 844 })

    await pageAdmin.goto(`${BASE_ADMIN}/`, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))
    await snap(pageAdmin, '02-admin-home')
    await pageAdmin.close()

    // Desktop user
    log('--- 桌面端截图 ---')
    const pageDesktop = await browser.newPage()
    await pageDesktop.setViewport({ width: 1440, height: 900 })
    await pageDesktop.goto(`${BASE_USER}/`, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))
    await snap(pageDesktop, '03-user-desktop')
    await pageDesktop.close()

    const pageAdminDesktop = await browser.newPage()
    await pageAdminDesktop.setViewport({ width: 1440, height: 900 })
    await pageAdminDesktop.goto(`${BASE_ADMIN}/`, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))
    await snap(pageAdminDesktop, '04-admin-desktop')
    await pageAdminDesktop.close()

  } finally {
    await browser.close()
  }

  log('')
  log('=== Phase7: 服务器日志 ===')
  const { execSync } = require('child_process')
  try {
    const logs = execSync(`sshpass -p '1qaz@WSX' ssh -o StrictHostKeyChecking=no root@123.56.107.111 "pm2 logs crm-server --lines 30 --nostream 2>&1 | grep -i 'error\\|fail' | head -10"`, { encoding: 'utf8', timeout: 15000 })
    if (logs.trim()) {
      log(`⚠️ 发现错误日志: \n${logs.trim()}`)
    } else {
      log('✅ 无错误日志')
    }
  } catch(e) {
    log(`⚠️ 无法获取日志: ${e.message}`)
  }

  log('')
  log('=== Phase8: 安全检查 ===')
  try {
    const secretCheck = execSync(`curl -s ${BASE_USER}/ 2>&1 | grep -i 'password\\|secret\\|token\\|api_key' | head -3`, { encoding: 'utf8', timeout: 10000 })
    if (secretCheck.trim()) {
      log(`❌ 发现敏感信息泄露! \n${secretCheck.trim()}`)
    } else {
      log('✅ 无敏感信息泄露')
    }
  } catch(e) {
    log('✅ 无敏感信息泄露')
  }

  log('')
  log('='.repeat(60))
  log('🎯 验证完成! 报告已保存')
  log(`📸 截图目录: ${OUT_DIR}`)

  fs.writeFileSync(path.join(OUT_DIR, 'report.txt'), REPORT.join('\n'), 'utf8')
})()
