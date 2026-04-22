const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const AuditLog = require('../models/AuditLog')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'crm-secret-key-2026'

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
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
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          isVIP: user.isVIP
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

module.exports = router
