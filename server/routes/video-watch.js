const express = require('express')
const router = express.Router()
const VideoWatch = require('../models/VideoWatch')
const Video = require('../models/Video')

// ==================== 记录观看 ====================

// POST /api/video-watches - 记录一次观看
router.post('/', async (req, res) => {
  try {
    const { userId, userPhone, userName, videoId, videoTitle, watchedDuration, totalDuration, deviceInfo } = req.body
    
    if (!videoId) {
      return res.status(400).json({ success: false, message: '视频ID不能为空' })
    }

    const progress = totalDuration > 0 ? Math.round((watchedDuration / totalDuration) * 100) : 0
    const completed = progress >= 80 // 观看超过80%视为完成

    // 查找是否已有记录（同用户同视频）
    const existingRecord = await VideoWatch.findOne({
      userId: userId || 'anonymous',
      videoId: videoId
    }).sort({ createdAt: -1 })

    if (existingRecord) {
      // 更新已有记录
      existingRecord.watchedDuration = Math.max(existingRecord.watchedDuration, watchedDuration || 0)
      existingRecord.totalDuration = totalDuration || existingRecord.totalDuration
      existingRecord.watchProgress = Math.max(existingRecord.watchProgress, progress)
      if (!existingRecord.completed && completed) {
        existingRecord.completed = true
        // 更新视频的完成观看数
        await Video.findByIdAndUpdate(videoId, { $inc: { completionCount: 1 } })
      }
      existingRecord.deviceInfo = deviceInfo || existingRecord.deviceInfo
      await existingRecord.save()

      console.log(`📝 更新观看记录: 用户${userPhone || '匿名'} → ${videoTitle}, 进度:${progress}%`)

      return res.json({
        success: true,
        data: { record: existingRecord },
        message: '观看记录已更新'
      })
    }

    // 创建新记录
    const record = await VideoWatch.create({
      userId: userId || 'anonymous',
      userPhone: userPhone || '匿名用户',
      userName: userName || '',
      videoId,
      videoTitle: videoTitle || '未知视频',
      watchedDuration: watchedDuration || 0,
      totalDuration: totalDuration || 0,
      watchProgress: progress,
      completed,
      deviceInfo: deviceInfo || '',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || ''
    })

    // 更新视频的观看次数
    await Video.findByIdAndUpdate(videoId, { $inc: { viewCount: 1 } })
    if (completed) {
      await Video.findByIdAndUpdate(videoId, { $inc: { completionCount: 1 } })
    }

    console.log(`✅ 新观看记录: 用户${userPhone || '匿名'} → ${videoTitle}`)

    res.status(201).json({
      success: true,
      data: { record },
      message: '观看记录已保存'
    })
  } catch (error) {
    console.error('记录观看错误:', error)
    res.status(500).json({ success: false, message: '记录观看失败' })
  }
})

// ==================== 查询观看记录 ====================

// GET /api/video-watches - 获取所有观看记录（管理端）
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, videoId, userId, startDate, endDate } = req.query
    const query = {}

    if (videoId) query.videoId = videoId
    if (userId) query.userId = userId
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59')
    }

    const [records, total] = await Promise.all([
      VideoWatch.find(query)
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize)),
      VideoWatch.countDocuments(query)
    ])

    res.json({
      success: true,
      data: {
        list: records,
        pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total }
      }
    })
  } catch (error) {
    console.error('获取观看记录错误:', error)
    res.status(500).json({ success: false, message: '获取观看记录失败' })
  }
})

// GET /api/video-watches/stats - 获取观看统计（管理端）
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const matchStage = {}
    
    if (startDate || endDate) {
      matchStage.createdAt = {}
      if (startDate) matchStage.createdAt.$gte = new Date(startDate)
      if (endDate) matchStage.createdAt.$lte = new Date(endDate + 'T23:59:59')
    }

    const stats = await VideoWatch.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalWatches: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          uniqueVideos: { $addToSet: '$videoId' },
          totalCompleted: { $sum: { $cond: ['$completed', 1, 0] } },
          avgProgress: { $avg: '$watchProgress' }
        }
      }
    ])

    // 今日观看数
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayCount = await VideoWatch.countDocuments({
      createdAt: { $gte: todayStart }
    })

    // 本周热门视频 Top 5
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const topVideos = await VideoWatch.aggregate([
      { $match: { createdAt: { $gte: weekAgo } } },
      { $group: { _id: '$videoId', title: { $first: '$videoTitle' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ])

    // 最活跃用户 Top 5
    const topUsers = await VideoWatch.aggregate([
      { $match: { createdAt: { $gte: weekAgo } } },
      { $group: { _id: '$userId', phone: { $first: '$userPhone' }, name: { $first: '$userName' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ])

    const result = stats[0] || {}

    res.json({
      success: true,
      data: {
        totalWatches: result.totalWatches || 0,
        uniqueUsers: (result.uniqueUsers || []).length,
        uniqueVideos: (result.uniqueVideos || []).length,
        totalCompleted: result.totalCompleted || 0,
        avgProgress: Math.round(result.avgProgress || 0),
        todayWatches: todayCount,
        topVideos: topVideos.map(v => ({ videoId: v._id, title: v.title, watchCount: v.count })),
        topUsers: topUsers.map(u => ({ userId: u._id, phone: u.phone, name: u.name, watchCount: u.count }))
      }
    })
  } catch (error) {
    console.error('获取观看统计错误:', error)
    res.status(500).json({ success: false, message: '获取观看统计失败' })
  }
})

// GET /api/video-watches/user/:phone - 获取某用户的观看历史
router.get('/user/:phone', async (req, res) => {
  try {
    const records = await VideoWatch.find({ userPhone: req.params.phone })
      .sort({ createdAt: -1 })
      .limit(50)

    res.json({ success: true, data: { list: records } })
  } catch (error) {
    console.error('获取用户观看历史错误:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// GET /api/video-watches/video/:id - 获取某视频的观看者列表
router.get('/video/:id', async (req, res) => {
  try {
    const records = await VideoWatch.find({ videoId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(100)

    res.json({ success: true, data: { list: records, total: records.length } })
  } catch (error) {
    console.error('获取视频观看者错误:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

module.exports = router
