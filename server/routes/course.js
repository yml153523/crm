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

    if (!title || !category || !instructor) {
      return res.status(400).json({ success: false, message: '请填写必要信息' })
    }

    const course = await Course.create({
      title,
      description: description || '',
      category,
      instructor,
      duration: duration || '',
      price: price || 0,
      coverImage: coverImage || '',
      status: 'published',
      createdBy: null
    })

    res.status(201).json({
      success: true,
      data: { course },
      message: '课程创建成功'
    })
  } catch (error) {
    console.error('创建课程错误:', error)
    res.status(500).json({ success: false, message: '创建课程失败' })
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
