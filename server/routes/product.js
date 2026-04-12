const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const Product = require('../models/Product')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/products'
    const fs = require('fs')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, category, sort = 'sales', keyword } = req.query
    const query = { status: 'active' }
    
    if (category) query.category = category
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ]
    }
    
    let sortOption = { salesCount: -1 }
    if (sort === 'price') sortOption = { price: 1 }
    if (sort === 'new') sortOption = { createdAt: -1 }
    
    const products = await Product.find(query)
      .sort(sortOption)
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize))
    
    const total = await Product.countDocuments(query)
    
    res.json({
      success: true,
      data: {
        list: products,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    })
  } catch (error) {
    console.error('获取商品列表错误:', error)
    res.status(500).json({ success: false, message: '获取商品列表失败' })
  }
})

router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query
    if (!keyword) return res.json({ success: true, data: { list: [] } })
    
    const products = await Product.find({
      status: 'active',
      $text: { $search: keyword }
    }).limit(20).select('name coverImage price originalPrice')
    
    res.json({ success: true, data: { list: products } })
  } catch (error) {
    res.status(500).json({ success: false, message: '搜索失败' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在' })
    }
    
    product.viewCount += 1
    await product.save()
    
    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      category: product.category,
      status: 'active'
    }).limit(4).select('name coverImage price')
    
    res.json({ success: true, data: { product, relatedProducts } })
  } catch (error) {
    console.error('获取商品详情错误:', error)
    res.status(500).json({ success: false, message: '获取商品详情失败' })
  }
})

router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, category, price, originalPrice, stock, tags } = req.body
    
    const images = req.files ? req.files.map(f => `/uploads/products/${f.filename}`) : []
    const coverImage = images[0] || ''
    
    const product = await Product.create({
      name,
      description: description || '',
      category: category || 'other',
      price: parseFloat(price),
      originalPrice: parseFloat(originalPrice) || 0,
      stock: parseInt(stock) || 0,
      coverImage,
      images,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      status: 'draft'
    })
    
    res.status(201).json({ success: true, data: { product }, message: '商品创建成功' })
  } catch (error) {
    console.error('创建商品错误:', error)
    res.status(500).json({ success: false, message: '创建商品失败: ' + error.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    
    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在' })
    }
    
    res.json({ success: true, data: { product }, message: '更新成功' })
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败' })
  }
})

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
    
    res.json({ success: true, message: `商品已${status === 'active' ? '上架' : '下架'}` })
  } catch (error) {
    res.status(500).json({ success: false, message: '操作失败' })
  }
})

module.exports = router
