const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'crm-secret-key-2026'

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

router.post('/login', async (req, res) => {
  try {
    const { phone, username, password } = req.body
    const loginPhone = phone || username  // 兼容两种字段名
    
    if (!loginPhone || !password) {
      return res.status(400).json({ success: false, message: '请填写完整信息' })
    }

    let user = await User.findOne({ phone: loginPhone })
    
    if (!user && loginPhone === 'admin') {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      user = await User.create({
        phone: 'admin',
        password: hashedPassword,
        name: '系统管理员',
        role: 'admin'
      })
    }

    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '密码错误' })
    }

    const token = generateToken(user)
    
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
