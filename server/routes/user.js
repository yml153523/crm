const express = require('express')
const User = require('../models/User')
const AuditLog = require('../models/AuditLog')
const bcrypt = require('bcrypt')

const router = express.Router()

const createUserAuditLog = async (req, logData) => {
  try {
    const auditLog = {
      action: `${req.method} ${req.path}`,
      resource: 'user',
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.id || null,
      userRole: req.user?.role || null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestBody: req.method !== 'GET' ? {
        ...logData.requestBody
      } : undefined,
      statusCode: logData.statusCode || null,
      responseTime: logData.responseTime || 0,
      success: logData.success || false,
      errorMessage: logData.errorMessage || null,
      timestamp: new Date()
    }
    await AuditLog.create(auditLog)
  } catch (error) {
    console.error('保存用户操作审计日志失败:', error.message)
  }
}

// 创建用户（管理员手动添加会员）
router.post('/', async (req, res) => {
  const startTime = Date.now()
  try {
    const { phone, name, role = 'user', isActive = true, isVIP = false } = req.body

    if (!phone) {
      await createUserAuditLog(req, {
        statusCode: 400,
        success: false,
        errorMessage: '手机号不能为空',
        requestBody: { phone, name, role }
      })
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '手机号不能为空' }
      })
    }

    // 检查手机号是否已存在
    const existingUser = await User.findOne({ phone })
    if (existingUser) {
      await createUserAuditLog(req, {
        statusCode: 409,
        success: false,
        errorMessage: '该手机号已被注册',
        requestBody: { phone }
      })
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_PHONE', message: '该手机号已被注册' }
      })
    }

    // 创建新用户
    const defaultPassword = bcrypt.hashSync('123456', 10) // 默认密码
    const newUser = new User({
      phone,
      name: name || `用户${phone.slice(-4)}`,
      password: defaultPassword,
      role,
      isActive,
      isVIP,
      createdBy: req.user?._id
    })

    await newUser.save()

    // 记录审计日志
    await createUserAuditLog(req, {
      statusCode: 201,
      success: true,
      responseTime: Date.now() - startTime,
      requestBody: { phone, name, role, isActive, isVIP }
    })

    res.status(201).json({
      success: true,
      data: {
        _id: newUser._id,
        phone: newUser.phone,
        name: newUser.name,
        role: newUser.role,
        isActive: newUser.isActive,
        isVIP: newUser.isVIP,
        createdAt: newUser.createdAt
      },
      message: '用户创建成功，默认密码为 123456'
    })

  } catch (error) {
    console.error('创建用户失败:', error)
    await createUserAuditLog(req, {
      statusCode: 500,
      success: false,
      errorMessage: error.message,
      responseTime: Date.now() - startTime
    })
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '创建用户失败' }
    })
  }
})

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, role, isActive, isVIP } = req.query
    const query = {}
    
    if (role) query.role = role
    if (isActive !== undefined) query.isActive = isActive === 'true'
    if (isVIP !== undefined) query.isVIP = isVIP === 'true'

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize))

    const total = await User.countDocuments(query)

    res.json({
      success: true,
      data: {
        list: users,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    res.status(500).json({ success: false, message: '获取用户列表失败' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    res.json({ success: true, data: { user } })
  } catch (error) {
    console.error('获取用户详情错误:', error)
    res.status(500).json({ success: false, message: '获取用户详情失败' })
  }
})

router.put('/:id', async (req, res) => {
  const startTime = Date.now()

  try {
    const { name, phone, isVIP, isActive, role } = req.body

    const originalUser = await User.findById(req.params.id).select('-password')
    if (!originalUser) {
      await createUserAuditLog(req, {
        statusCode: 404,
        success: false,
        errorMessage: '用户不存在',
        responseTime: Date.now() - startTime,
        requestBody: { action: 'update', userId: req.params.id }
      })
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, phone, isVIP, isActive, role },
      { new: true, runValidators: true }
    ).select('-password')

    await createUserAuditLog(req, {
      statusCode: 200,
      success: true,
      responseTime: Date.now() - startTime,
      requestBody: {
        action: 'update',
        userId: req.params.id,
        changes: {
          from: { name: originalUser.name, isVIP: originalUser.isVIP, role: originalUser.role },
          to: { name, isVIP, role }
        }
      }
    })

    res.json({ success: true, data: { user }, message: '更新成功' })
  } catch (error) {
    console.error('更新用户错误:', error)

    await createUserAuditLog(req, {
      statusCode: 500,
      success: false,
      errorMessage: error.message,
      responseTime: Date.now() - startTime,
      requestBody: { action: 'update', userId: req.params.id }
    })
    res.status(500).json({ success: false, message: '更新失败' })
  }
})

router.delete('/:id', async (req, res) => {
  const startTime = Date.now()

  try {
    const user = await User.findById(req.params.id).select('-password')

    if (!user) {
      await createUserAuditLog(req, {
        statusCode: 404,
        success: false,
        errorMessage: '用户不存在',
        responseTime: Date.now() - startTime,
        requestBody: { action: 'delete', userId: req.params.id }
      })
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    const deletedUserInfo = {
      id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role
    }

    await User.findByIdAndDelete(req.params.id)

    await createUserAuditLog(req, {
      statusCode: 200,
      success: true,
      responseTime: Date.now() - startTime,
      requestBody: {
        action: 'delete',
        deletedUser: deletedUserInfo
      }
    })

    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除用户错误:', error)

    await createUserAuditLog(req, {
      statusCode: 500,
      success: false,
      errorMessage: error.message,
      responseTime: Date.now() - startTime,
      requestBody: { action: 'delete', userId: req.params.id }
    })
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

module.exports = router
