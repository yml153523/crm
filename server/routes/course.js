const express = require('express')
const Course = require('../models/Course')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, category, status, keyword } = req.query
    const query = {}
    
    if (category) query.category = category
    if (status) query.status = status
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { instructor: { $regex: keyword, $options: 'i' } }
      ]
    }

    const courses = await Course.find(query)
      .populate('createdBy', 'name')
      .populate('videos', 'title duration viewCount')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize))

    const total = await Course.countDocuments(query)

    res.json({
      success: true,
      data: {
        list: courses,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    })
  } catch (error) {
    console.error('获取课程列表错误:', error)
    res.status(500).json({ success: false, message: '获取课程列表失败' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('videos')

    if (!course) {
      return res.status(404).json({ success: false, message: '课程不存在' })
    }

    res.json({ success: true, data: { course } })
  } catch (error) {
    console.error('获取课程详情错误:', error)
    res.status(500).json({ success: false, message: '获取课程详情失败' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { title, description, category, instructor, duration, price, coverImage } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: '课程标题不能为空' })
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: '课程分类不能为空' })
    }
    if (!instructor || !instructor.trim()) {
      return res.status(400).json({ success: false, message: '讲师名称不能为空' })
    }
    if (title.trim().length > 200) {
      return res.status(400).json({ success: false, message: '课程标题不能超过200字' })
    }

    const numPrice = parseFloat(price)
    if (price !== undefined && (isNaN(numPrice) || numPrice < 0)) {
      return res.status(400).json({ success: false, message: '价格必须为非负数' })
    }

    const course = await Course.create({
      title: title.trim(),
      description: (description || '').trim(),
      category: category.trim(),
      instructor: instructor.trim(),
      duration: duration || '',
      price: isNaN(numPrice) ? 0 : numPrice,
      coverImage: coverImage || '',
      status: 'published',
      createdBy: req.user?._id || null
    })

    console.log(`[Course] 创建成功: ${course._id} by user ${req.user?._id || 'unknown'}`)
    res.status(201).json({
      success: true,
      data: { course },
      message: '课程创建成功'
    })
  } catch (error) {
    console.error('创建课程错误:', error)
    res.status(500).json({ success: false, message: '创建课程失败: ' + error.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )

    if (!course) {
      return res.status(404).json({ success: false, message: '课程不存在' })
    }

    res.json({ success: true, data: { course }, message: '更新成功' })
  } catch (error) {
    console.error('更新课程错误:', error)
    res.status(500).json({ success: false, message: '更新失败' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id)

    if (!course) {
      return res.status(404).json({ success: false, message: '课程不存在' })
    }

    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除课程错误:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

module.exports = router
