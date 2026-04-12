const express = require('express')
const User = require('../models/User')

const router = express.Router()

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
  try {
    const { name, phone, isVIP, isActive, role } = req.body

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, phone, isVIP, isActive, role },
      { new: true, runValidators: true }
    ).select('-password')

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    res.json({ success: true, data: { user }, message: '更新成功' })
  } catch (error) {
    console.error('更新用户错误:', error)
    res.status(500).json({ success: false, message: '更新失败' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除用户错误:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

module.exports = router
