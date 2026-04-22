const express = require('express')
const Recommendation = require('../models/Recommendation')

const router = express.Router()

// 获取公共推荐列表（用户端使用）
router.get('/public', async (req, res) => {
  try {
    const { limit = 6, type } = req.query
    
    const query = { status: 'active' }
    
    // 可选：按内容类型筛选
    if (type && ['video', 'course', 'product', 'link', 'custom'].includes(type)) {
      query.contentType = type
    }

    const recommendations = await Recommendation.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean()

    res.json({
      success: true,
      data: {
        list: recommendations,
        count: recommendations.length
      }
    })
  } catch (error) {
    console.error('[Recommendation] 获取公共推荐失败:', error)
    res.status(500).json({ success: false, message: '获取推荐失败' })
  }
})

// 管理端：获取所有推荐（分页）
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, type, keyword } = req.query
    const query = {}
    
    if (status) query.status = status
    if (type) query.contentType = type
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ]
    }

    const [list, total] = await Promise.all([
      Recommendation.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(parseInt(pageSize))
        .populate('createdBy', 'name')
        .lean(),
      Recommendation.countDocuments(query)
    ])

    res.json({
      success: true,
      data: {
        list,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    })
  } catch (error) {
    console.error('[Recommendation] 获取推荐列表失败:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 管理端：创建推荐
router.post('/', async (req, res) => {
  try {
    const { title, description, contentType, contentId, link, image, price, priority, tags, metadata } = req.body

    if (!title) {
      return res.status(400).json({ success: false, message: '标题不能为空' })
    }

    const recommendation = await Recommendation.create({
      title,
      description,
      contentType: contentType || 'custom',
      contentId,
      link,
      image,
      price: price || 0,
      priority: priority || 0,
      tags: tags || [],
      metadata: metadata || {},
      createdBy: req.user?._id || null
    })

    res.status(201).json({
      success: true,
      data: { recommendation },
      message: '创建成功'
    })
  } catch (error) {
    console.error('[Recommendation] 创建失败:', error)
    res.status(500).json({ success: false, message: '创建失败' })
  }
})

// 管理端：更新推荐
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body
    
    const recommendation = await Recommendation.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    )

    if (!recommendation) {
      return res.status(404).json({ success: false, message: '推荐不存在' })
    }

    res.json({
      success: true,
      data: { recommendation },
      message: '更新成功'
    })
  } catch (error) {
    console.error('[Recommendation] 更新失败:', error)
    res.status(500).json({ success: false, message: '更新失败' })
  }
})

// 管理端：删除推荐
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const result = await Recommendation.findByIdAndDelete(id)

    if (!result) {
      return res.status(404).json({ success: false, message: '推荐不存在' })
    }

    res.json({
      success: true,
      message: '删除成功'
    })
  } catch (error) {
    console.error('[Recommendation] 删除失败:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

// 记录点击（用户点击推荐时调用）
router.post('/:id/click', async (req, res) => {
  try {
    const { id } = req.params
    
    await Recommendation.findByIdAndUpdate(
      id,
      { $inc: { clickCount: 1 } }
    )

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false })
  }
})

// 记录展示（用户看到推荐时调用）
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params
    
    await Recommendation.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } }
    )

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false })
  }
})

module.exports = router
