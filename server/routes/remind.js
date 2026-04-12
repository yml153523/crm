const express = require('express')
const Remind = require('../models/Remind')
const User = require('../models/User')

const router = express.Router()

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

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    const remind = await Remind.create({
      userId,
      type,
      title: title || getDefaultTitle(type),
      content: content || getDefaultContent(type),
      sentAt: new Date(),
      status: 'sent',
      metadata: { method: 'system', channel: 'app' }
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
    for (const userId of userIds) {
      const remind = await Remind.create({
        userId,
        type,
        title: title || getDefaultTitle(type),
        content: content || getDefaultContent(type),
        sentAt: new Date(),
        status: 'sent'
      })
      reminds.push(remind)
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
  const titles = {
    redPacket: '红包提醒',
    classReminder: '上课提醒',
    system: '系统通知',
    custom: '自定义提醒'
  }
  return titles[type] || '提醒通知'
}

function getDefaultContent(type) {
  const contents = {
    redPacket: '您有新的红包待领取，请及时查看！',
    classReminder: '您的课程即将开始，请准时参加！',
    system: '系统消息通知',
    custom: '这是一条提醒消息'
  }
  return contents[type] || '提醒内容'
}

module.exports = router
