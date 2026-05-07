const express = require('express')
const Remind = require('../models/Remind')
const User = require('../models/User')
const { REMIND_TYPES, PAGINATION, SERVER_CONFIG } = require('../config/constants')

const router = express.Router()

let wssInstance = null

function getWSS() {
  if (!wssInstance) {
    try {
      const wsPath = require('path').join(__dirname, '../websocket')
      if (require('fs').existsSync(wsPath + '.js')) {
        const wsModule = require(wsPath)
        wssInstance = wsModule.wss || null
        if (!wssInstance && typeof global.__wss !== 'undefined') {
          wssInstance = global.__wss
        }
      }
    } catch (e) {
      console.warn('[Remind] 获取WSS实例失败:', e.message)
    }
  }
  return wssInstance
}

function setWSS(wss) {
  wssInstance = wss
  global.__wss = wss
}

function broadcastToUser(userId, data) {
  const wss = getWSS()
  if (!wss || !wss.clients) return

  const message = JSON.stringify({ type: 'remind', data, timestamp: Date.now() })
  wss.clients.forEach(client => {
    if (client.readyState === 1 && client.userId === userId) {
      client.send(message)
    }
  })
}

router.get('/history', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, type, userId } = req.query
    const query = {}
    
    if (type) query.type = type
    if (userId) query.userId = userId

    const reminds = await Remind.find(query)
      .populate('userId', 'name phone')
      .populate('sentBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize))

    const total = await Remind.countDocuments(query)

    res.json({
      success: true,
      data: {
        list: reminds,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    })
  } catch (error) {
    console.error('获取提醒历史错误:', error)
    res.status(500).json({ success: false, message: '获取提醒历史失败' })
  }
})

router.post('/send', async (req, res) => {
  try {
    const { userId, type, title, content } = req.body

    if (!userId || !type) {
      return res.status(400).json({ success: false, message: '缺少必要参数' })
    }

    const mongoose = require('mongoose')
    
    // 🔧 R46 FIX: 支持多种userId格式（手机号/姓名/字符串ID/ObjectId）
    let user = null
    
    // 尝试多种方式查找用户（兼容数据字段可能混淆的情况）
    
    // 方式1: 看起来像手机号 → 用phone或name字段查询
    if (/^1\d+$/.test(userId)) {
      user = await User.findOne({ $or: [{ phone: userId }, { name: userId }] })
    }
    
    // 方式2: 有效的ObjectId格式 → 用_id查询
    if (!user && mongoose.Types.ObjectId.isValid(userId) && /^[0-9a-fA-F]{24}$/.test(userId)) {
      user = await User.findById(userId)
    }
    
    // 方式3: 最后尝试模糊匹配（兼容各种异常数据）
    if (!user) {
      user = await User.findOne({ 
        $or: [
          { phone: userId },
          { name: userId },
          { id: userId },
          { _id: userId }
        ] 
      }).catch(() => null)  // 避免ObjectId转换错误
    }
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    const remind = await Remind.create({
      userId: user._id || userId,  // 使用找到的用户的_id，或回退到原始userId
      type,
      title: title || getDefaultTitle(type),
      content: content || getDefaultContent(type),
      sentAt: new Date(),
      status: 'sent',
      metadata: { method: 'system', channel: 'app' }
    })

    broadcastToUser(userId, {
      _id: remind._id,
      type,
      title: remind.title,
      content: remind.content
    })

    res.status(201).json({
      success: true,
      data: { remind },
      message: '提醒发送成功'
    })
  } catch (error) {
    console.error('发送提醒错误:', error)
    res.status(500).json({ success: false, message: '发送提醒失败' })
  }
})

router.post('/batch-send', async (req, res) => {
  try {
    const { userIds, type, title, content } = req.body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要发送的用户' })
    }

    const reminds = []
    for (const rawUserId of userIds) {
      const mongoose = require('mongoose')
      const uid = mongoose.Types.ObjectId.isValid(rawUserId) ? new mongoose.Types.ObjectId(rawUserId) : rawUserId
      const remind = await Remind.create({
        userId: uid,
        type,
        title: title || getDefaultTitle(type),
        content: content || getDefaultContent(type),
        sentAt: new Date(),
        status: 'sent'
      })
      reminds.push(remind)

      broadcastToUser(rawUserId, {
        _id: remind._id,
        type,
        title: remind.title,
        content: remind.content
      })
    }

    res.status(201).json({
      success: true,
      data: { count: reminds.length, reminds },
      message: `成功发送 ${reminds.length} 条提醒`
    })
  } catch (error) {
    console.error('批量发送错误:', error)
    res.status(500).json({ success: false, message: '批量发送失败' })
  }
})

router.get('/users/:type', async (req, res) => {
  try {
    const { type } = req.params
    let users = []

    if (type === 'redPacket') {
      users = await User.find({ isActive: true }).select('_id name phone isVIP').limit(10)
    } else if (type === 'classReminder') {
      users = await User.find({ 
        isActive: true,
        courses: { $exists: true, $ne: [] }
      }).select('_id name phone').limit(10)
    } else {
      users = await User.find({}).select('_id name phone').limit(10)
    }

    res.json({ success: true, data: { list: users } })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    res.status(500).json({ success: false, message: '获取用户列表失败' })
  }
})

function getDefaultTitle(type) {
  return REMIND_TYPES[type]?.title || '提醒通知'
}

function getDefaultContent(type) {
  return REMIND_TYPES[type]?.content || '提醒内容'
}

router.get('/my-reminds', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token || token.startsWith('demo-')) {
      return res.json({ success: true, data: { list: [], unreadCount: 0 } })
    }

    const jwt = require('jsonwebtoken')
    const mongoose = require('mongoose')
    const JWT_SECRET = SERVER_CONFIG.JWT_SECRET
    let decoded
    try { decoded = jwt.verify(token, JWT_SECRET) } catch {}

    if (!decoded?.id) {
      return res.json({ success: true, data: { list: [], unreadCount: 0 } })
    }

    const { page = PAGINATION.DEFAULT_PAGE, pageSize = PAGINATION.DEFAULT_PAGE_SIZE, unreadOnly } = req.query

    // 🔧 R46 FIX: 安全的 userId 匹配 - 避免BSONError
    // JWT decoded.id 通常是 String 格式，数据库中可能存的是 String 或 ObjectId
    const userIdStr = String(decoded.id)  // 确保是字符串

    let userIdQuery
    if (mongoose.Types.ObjectId.isValid(userIdStr) && userIdStr.length === 24 && /^[0-9a-fA-F]{24}$/.test(userIdStr)) {
      // 确实是有效ObjectId格式 → 同时匹配两种格式
      userIdQuery = {
        $or: [
          { userId: userIdStr },
          { userId: new mongoose.Types.ObjectId(userIdStr) }
        ]
      }
    } else {
      // 普通字符串 → 只匹配字符串格式
      userIdQuery = { userId: userIdStr }
    }

    let query = unreadOnly === '1' 
      ? { ...userIdQuery, readAt: { $exists: false } }
      : userIdQuery

    if (unreadOnly === '1') query.readAt = { $exists: false }

    const reminds = await Remind.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * parseInt(pageSize))
      .limit(parseInt(pageSize))
      .lean()

    const total = await Remind.countDocuments(query)
    const unreadCount = await Remind.countDocuments({ ...userIdQuery, readAt: { $exists: false } })

    res.json({
      success: true,
      data: {
        list: reminds.map(r => ({
          _id: r._id,
          type: r.type,
          title: r.title,
          content: r.content,
          status: r.status,
          sentAt: r.sentAt || r.createdAt,
          read: !!r.readAt
        })),
        unreadCount,
        pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total }
      }
    })
  } catch (error) {
    console.error('获取我的提醒错误:', error)
    res.status(500).json({ success: false, message: '获取提醒失败' })
  }
})

router.post('/my-reminds/:id/read', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ success: false, message: '未登录' })

    const jwt = require('jsonwebtoken')
    const JWT_SECRET = SERVER_CONFIG.JWT_SECRET
    let decoded
    try { decoded = jwt.verify(token, JWT_SECRET) } catch {}
    if (!decoded?.id) return res.status(401).json({ success: false, message: '未登录' })

    const mongoose = require('mongoose')
    let remindId = req.params.id
    if (typeof remindId === 'string') {
      const hexMatch = remindId.match(/([0-9a-fA-F]{24})/)
      if (hexMatch) {
        remindId = new mongoose.Types.ObjectId(hexMatch[1])
      }
    }

    const updateResult = await Remind.findOneAndUpdate(
      { _id: remindId, userId: decoded.id },
      { readAt: new Date() },
      { new: true }
    )

    if (!updateResult) {
      return res.status(404).json({ success: false, message: '提醒不存在或无权操作' })
    }

    console.log(`[Remind] 标记已读成功: remindId=${remindId}, userId=${decoded.id}`)
    res.json({ success: true, message: '已标记为已读' })
  } catch (error) {
    console.error('标记已读失败:', error)
    res.status(500).json({ success: false, message: '操作失败' })
  }
})

module.exports = router
