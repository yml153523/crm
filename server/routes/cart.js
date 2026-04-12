const express = require('express')
const router = express.Router()
const Cart = require('../models/Cart')
const Product = require('../models/Product')

router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ success: false, message: '请先登录' })
    
    const cartItems = await Cart.find({ userId }).populate('productId')
    const items = cartItems.map(item => ({
      _id: item._id,
      productId: item.productId?._id,
      quantity: item.quantity,
      price: item.price,
      variantName: item.variantName,
      product: item.productId ? {
        name: item.productId.name,
        coverImage: item.productId.coverImage,
        stock: item.productId.stock,
        price: item.productId.price,
        status: item.productId.status
      } : null,
      subtotal: item.price * item.quantity
    })).filter(item => item.product && item.product.status === 'active')
    
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0)
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    
    res.json({
      success: true,
      data: { items, totalAmount, itemCount }
    })
  } catch (error) {
    console.error('获取购物车错误:', error)
    res.status(500).json({ success: false, message: '获取购物车失败' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { productId, quantity = 1, variantName } = req.body
    const userId = req.user?.id
    
    const product = await Product.findOne({ _id: productId, status: 'active' })
    if (!product) return res.status(400).json({ success: false, message: '商品不存在或已下架' })
    if (product.stock < quantity) return res.status(400).json({ success: false, message: '库存不足' })
    
    const existingItem = await Cart.findOne({ userId, productId })
    
    let cartItem
    if (existingItem) {
      existingItem.quantity += parseInt(quantity)
      cartItem = await existingItem.save()
    } else {
      cartItem = await Cart.create({
        userId,
        productId,
        quantity: parseInt(quantity),
        variantName: variantName || '',
        price: product.price
      })
    }
    
    res.json({ success: true, message: '已添加到购物车', data: { cartItem } })
  } catch (error) {
    res.status(500).json({ success: false, message: '添加到购物车失败' })
  }
})

router.put('/item/:itemId', async (req, res) => {
  try {
    const { quantity } = req.body
    const cartItem = await Cart.findById(req.params.itemId).populate('productId')
    
    if (!cartItem) return res.status(404).json({ success: false, message: '购物车项不存在' })
    if (quantity > cartItem.productId.stock) {
      return res.json({
        success: true,
        message: `库存不足，已调整为您最大可购数量(${cartItem.productId.stock})`,
        data: { adjustedQuantity: cartItem.productId.stock }
      })
    }
    
    cartItem.quantity = Math.max(1, parseInt(quantity))
    await cartItem.save()
    
    res.json({ success: true, message: '更新成功' })
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败' })
  }
})

router.delete('/item/:itemId', async (req, res) => {
  try {
    await Cart.findByIdAndDelete(req.params.itemId)
    res.json({ success: true, message: '已删除' })
  } catch (error) {
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

router.delete('/clear', async (req, res) => {
  try {
    const userId = req.user?.id
    await Cart.deleteMany({ userId })
    res.json({ success: true, message: '购物车已清空' })
  } catch (error) {
    res.status(500).json({ success: false, message: '清空失败' })
  }
})

module.exports = router
