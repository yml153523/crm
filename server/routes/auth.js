const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const AuditLog = require('../models/AuditLog')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'crm-secret-key-2026'

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, phone: user.phone, role: user.role, type: 'access' },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  )
}

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, phone: user.phone, role: user.role, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d' }
  )
}

const createAuditLog = async (logData) => {
  try {
    await AuditLog.create(logData)
  } catch (error) {
    console.error('保存审计日志失败:', error.message)
  }
}

router.post('/login', async (req, res) => {
  const startTime = Date.now()
  let auditLogData = {
    action: 'POST /api/auth/login',
    resource: 'auth',
    method: 'POST',
    path: '/api/auth/login',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    requestBody: {
      phone: req.body.phone || req.body.username ? '***' : undefined
    },
    timestamp: new Date()
  }

  try {
    const { phone, username, password } = req.body
    const loginPhone = phone || username

    if (!loginPhone || !password) {
      auditLogData.statusCode = 400
      auditLogData.success = false
      auditLogData.errorMessage = '请填写完整信息'
      auditLogData.responseTime = Date.now() - startTime
      await createAuditLog(auditLogData)

      return res.status(400).json({ success: false, message: '请填写完整信息' })
    }

    let user = await User.findOne({ phone: loginPhone })

    if (!user && loginPhone === 'admin') {
      const hashedPassword = await bcrypt.hash('123456', 10)
      user = await User.create({
        phone: 'admin',
        password: hashedPassword,
        name: '系统管理员',
        role: 'admin'
      })
    }

    if (!user) {
      auditLogData.userId = null
      auditLogData.userRole = null
      auditLogData.statusCode = 401
      auditLogData.success = false
      auditLogData.errorMessage = '用户不存在'
      auditLogData.responseTime = Date.now() - startTime
      await createAuditLog(auditLogData)

      return res.status(401).json({ success: false, message: '用户不存在' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      auditLogData.userId = user._id
      auditLogData.userRole = user.role
      auditLogData.statusCode = 401
      auditLogData.success = false
      auditLogData.errorMessage = '密码错误'
      auditLogData.responseTime = Date.now() - startTime
      await createAuditLog(auditLogData)

      return res.status(401).json({ success: false, message: '密码错误' })
    }

    const token = generateToken(user)
    const refreshToken = generateRefreshToken(user)

    user.lastLoginAt = new Date()
    await user.save()

    auditLogData.userId = user._id
    auditLogData.userRole = user.role
    auditLogData.statusCode = 200
    auditLogData.success = true
    auditLogData.responseTime = Date.now() - startTime
    auditLogData.errorMessage = null
    await createAuditLog(auditLogData)

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        expiresIn: 2 * 60 * 60,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          isVIP: user.isVIP,
          balance: user.balance || 0
        }
      },
      message: '登录成功'
    })
  } catch (error) {
    console.error('登录错误:', error)
    
    auditLogData.statusCode = 500
    auditLogData.success = false
    auditLogData.errorMessage = error.message
    auditLogData.responseTime = Date.now() - startTime
    await createAuditLog(auditLogData)

    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.post('/register', async (req, res) => {
  try {
    const { phone, password, name } = req.body

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: '请填写手机号和密码' })
    }

    const existingUser = await User.findOne({ phone })
    if (existingUser) {
      return res.status(400).json({ success: false, message: '该手机号已注册' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      phone,
      password: hashedPassword,
      name: name || phone
    })

    const token = generateToken(user)

    res.status(201).json({
      success: true,
      data: { token, user: { id: user._id, phone: user.phone, name: user.name } },
      message: '注册成功'
    })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    res.json({ success: true, data: { user } })
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token无效或已过期' })
  }
})

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: '缺少刷新令牌' })
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET)
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: '无效的刷新令牌' })
    }

    const user = await User.findById(decoded.id).select('-password')
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: '用户不存在或已禁用' })
    }

    const newToken = generateToken(user)
    const newRefreshToken = generateRefreshToken(user)

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: 2 * 60 * 60,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          isVIP: user.isVIP,
          balance: user.balance || 0
        }
      }
    })
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '刷新令牌已过期，请重新登录', code: 'REFRESH_TOKEN_EXPIRED' })
    }
    res.status(401).json({ success: false, message: '刷新令牌无效', code: 'INVALID_REFRESH_TOKEN' })
  }
})

router.get('/heartbeat', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    let isAuthenticated = false
    let userRole = null

    if (token && !token.startsWith('demo-token-')) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET)
        isAuthenticated = true
        userRole = decoded.role
      } catch {}
    } else if (token && token.startsWith('demo-token-')) {
      isAuthenticated = true
      userRole = token.includes('admin') ? 'admin' : 'user'
    }

    const dataVersions = {}
    const models = ['User', 'Course', 'Video', 'Product', 'RedPacket', 'Order']
    for (const modelName of models) {
      try {
        const Model = require(`../models/${modelName}`)
        const latest = await Model.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean()
        dataVersions[modelName] = latest?.updatedAt ? new Date(latest.updatedAt).getTime() : 0
      } catch {}
    }

    res.json({
      success: true,
      data: {
        serverTime: Date.now(),
        status: 'ok',
        isAuthenticated,
        userRole,
        dataVersions
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: '心跳检测失败' })
  }
})

router.get('/sync/:model', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录' })
    }

    let userId = null
    if (!token.startsWith('demo-token-')) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET)
        userId = decoded.id
      } catch {
        return res.status(401).json({ success: false, message: 'Token无效' })
      }
    }

    const { model } = req.params
    const since = req.query.since ? parseInt(String(req.query.since)) : 0
    const page = parseInt(String(req.query.page)) || 1
    const pageSize = Math.min(parseInt(String(req.query.pageSize)) || 50, 200)

    const modelMap = {
      users: { model: require('../models/User'), publicFields: '_id phone name role avatar isVIP balance isActive createdAt updatedAt' },
      courses: { model: require('../models/Course'), publicFields: '_id title description category price status createdAt updatedAt' },
      videos: { model: require('../models/Video'), publicFields: '_id title videoUrl duration category status createdAt updatedAt' },
      products: { model: require('../models/Product'), publicFields: '_id name category price stock status createdAt updatedAt' },
      redPackets: { model: require('../models/RedPacket'), publicFields: '_id title type totalAmount totalCount status startDate endDate createdAt updatedAt' },
      orders: { model: require('../models/Order'), publicFields: '_id orderNo totalAmount status paymentStatus createdAt updatedAt' }
    }

    const config = modelMap[model]
    if (!config) {
      return res.status(400).json({ success: false, message: `不支持的模型: ${model}` })
    }

    const query = {}
    if (since > 0) {
      query.updatedAt = { $gt: new Date(since) }
    }
    if (model === 'orders' && userId) {
      query.userId = userId
    }

    const [items, total] = await Promise.all([
      config.model.find(query).select(config.publicFields).sort({ updatedAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      config.model.countDocuments(query)
    ])

    const latestItem = items[0]
    const latestVersion = latestItem?.updatedAt ? new Date(latestItem.updatedAt).getTime() : 0

    res.json({
      success: true,
      data: {
        model,
        items,
        pagination: { page, pageSize, total, hasMore: page * pageSize < total },
        since,
        latestVersion,
        serverTime: Date.now()
      }
    })
  } catch (error) {
    console.error('数据同步失败:', error)
    res.status(500).json({ success: false, message: '数据同步失败' })
  }
})

module.exports = router
