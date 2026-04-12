const express = require('express')
const router = express.Router()
const Video = require('../models/Video')
const User = require('../models/User')
const Order = require('../models/Order')
const RedPacketRecord = require('../models/RedPacketRecord')

router.get('/overview', async (req, res) => {
  try {
    const { period = 'today' } = req.query
    const now = new Date()
    let startDate
    
    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1))
        break
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1))
        break
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0))
    }
    
    const [newUsers, activeUsers, videoViews, orders, redPackets] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate } }),
      User.countDocuments({ updatedAt: { $gte: startDate } }),
      Video.aggregate([{ $match: { createdAt: { $gte: startDate } } }, { $group: { _id: null, total: { $sum: '$viewCount' } } }]),
      Order.countDocuments({ createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } }),
      RedPacketRecord.countDocuments({ createdAt: { $gte: startDate }, status: { $in: ['available', 'used'] } })
    ])
    
    res.json({
      success: true,
      data: {
        period,
        cards: [
          { key: 'newUsers', label: '新增用户', value: newUsers },
          { key: 'activeUsers', label: '活跃用户', value: activeUsers || newUsers },
          { key: 'videoViews', label: '视频观看', value: videoViews[0]?.total || 0 },
          { key: 'orders', label: '订单数', value: orders },
          { key: 'redPackets', label: '红包领取', value: redPackets }
        ]
      }
    })
  } catch (error) {
    console.error('获取统计数据错误:', error)
    res.status(500).json({ success: false, message: '获取统计数据失败' })
  }
})

router.get('/top-videos', async (req, res) => {
  try {
    const { limit = 10 } = req.query
    const videos = await Video.find({ status: 'published' })
      .sort({ viewCount: -1 })
      .limit(parseInt(limit))
      .select('title viewCount completionCount duration category')
    
    res.json({
      success: true,
      data: { list: videos }
    })
  } catch (error) {
    console.error('获取热门视频错误:', error)
    res.status(500).json({ success: false, message: '获取热门视频失败' })
  }
})

router.get('/insights', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        insights: [
          { type: 'growth', title: '数据统计已启用', desc: '系统正在从数据库动态获取真实运营数据', icon: '📊' }
        ]
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取洞察数据失败' })
  }
})

module.exports = router
