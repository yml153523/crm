const express = require('express')
const router = express.Router()
const Order = require('../models/Order')
const Product = require('../models/Product')
const Payment = require('../models/Payment')
const Cart = require('../models/Cart')

router.post('/', async (req, res) => {
  try {
    const { items, shippingAddress, buyerRemark, redPacketId } = req.body
    const userId = req.user?.id
    
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: '请选择商品' })
    if (!shippingAddress || !shippingAddress.receiverName) return res.status(400).json({ success: false, message: '请填写收货地址' })

    let totalAmount = 0
    const orderItems = []

    for (const item of items) {
      if (!item.productId) return res.status(400).json({ success: false, message: '商品ID不能为空' })

      const qty = parseInt(item.quantity)
      if (isNaN(qty) || qty < 1) return res.status(400).json({ success: false, message: '商品数量必须为正整数' })
      if (qty > 999) return res.status(400).json({ success: false, message: '单商品数量不能超过999' })
      const product = await Product.findOne({ _id: item.productId, status: 'active' })
      if (!product) return res.status(400).json({ success: false, message: `商品不存在或已下架` })
      if (product.stock < item.quantity) return res.status(400).json({ success: false, message: `${product.name}库存不足` })
      
      const subtotal = product.price * qty
      orderItems.push({
        productId: product._id,
        productName: product.name,
        productImage: product.coverImage,
        quantity: qty,
        price: product.price,
        variantName: (item.variantName || '').trim(),
        subtotal
      })
      totalAmount += subtotal
    }
    
    let discountAmount = 0
    if (redPacketId) {
      if (!/^[0-9a-fA-F]{24}$/.test(redPacketId)) {
        return res.status(400).json({ success: false, message: '红包ID格式无效' })
      }
      discountAmount = Math.min(100, totalAmount)
    }

    const finalAmount = totalAmount - discountAmount

    console.log(`[Order] 创建订单: userId=${userId} items=${items.length} totalAmount=${totalAmount} discount=${discountAmount}`)

    const order = await Order.create({
      userId,
      userName: req.user?.name || '',
      userPhone: req.user?.phone || '',
      items: orderItems,
      totalAmount,
      discountAmount,
      finalAmount,
      shippingFee: 0,
      shippingAddress,
      buyerRemark: buyerRemark || '',
      status: 'pending_payment'
    })
    
    await Cart.deleteMany({ userId })
    
    res.status(201).json({
      success: true,
      data: { order },
      message: '订单创建成功'
    })
  } catch (error) {
    console.error('创建订单错误:', error)
    res.status(500).json({ success: false, message: '创建订单失败: ' + error.message })
  }
})

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status = 'all' } = req.query
    const userId = req.user?.id
    const query = { userId }
    
    if (status !== 'all') query.status = status
    
    const orders = await Order.find(query)
      .select('-buyerRemark -sellerRemark -__v') // 排除备注和版本字段，减少响应体积
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize))
    
    const total = await Order.countDocuments(query)
    
    res.json({
      success: true,
      data: {
        list: orders,
        pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total, totalPages: Math.ceil(total / pageSize) }
      }
    })
  } catch (error) {
    console.error('获取订单列表失败:', error)
    res.status(500).json({ success: false, message: '获取订单列表失败: ' + error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' })
    res.json({ success: true, data: { order } })
  } catch (error) {
    console.error('获取订单详情失败:', error)
    res.status(500).json({ success: false, message: '获取订单详情失败: ' + error.message })
  }
})

router.post('/:id/pay', async (req, res) => {
  try {
    const { paymentMethod = 'mock' } = req.body
    const allowedMethods = ['mock', 'wechat', 'alipay', 'bank_transfer']
    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: '不支持的支付方式' })
    }

    const order = await Order.findById(req.params.id)
    
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' })
    if (order.status !== 'pending_payment') return res.status(400).json({ success: false, message: '订单状态不允许支付' })
    
    const transactionId = `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const payment = await Payment.create({
      orderId: order._id,
      orderNo: order.orderNo,
      userId: order.userId,
      amount: order.finalAmount,
      method: paymentMethod,
      transactionId,
      status: 'success',
      paidAt: new Date()
    })
    
    order.paymentStatus = 'paid'
    order.status = 'paid'
    order.paidAt = new Date()
    order.transactionId = transactionId
    await order.save()
    
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { salesCount: item.quantity } })
    }
    
    res.json({
      success: true,
      message: '支付成功',
      data: { payment, order }
    })
  } catch (error) {
    console.error('支付错误:', error)
    res.status(500).json({ success: false, message: '支付失败: ' + error.message })
  }
})

router.post('/:id/cancel', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' })
    if (order.status !== 'pending_payment') return res.status(400).json({ success: false, message: '仅待支付的订单可取消' })
    
    order.status = 'cancelled'
    await order.save()
    
    res.json({ success: true, message: '订单已取消' })
  } catch (error) {
    console.error('取消订单错误:', error)
    res.status(500).json({ success: false, message: '取消失败: ' + error.message })
  }
})

router.post('/:id/confirm', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' })
    if (order.status !== 'delivered') return res.status(400).json({ success: false, message: '仅已送达的订单可确认收货' })
    
    order.status = 'completed'
    order.deliveredAt = new Date()
    await order.save()
    
    res.json({ success: true, message: '确认收货成功' })
  } catch (error) {
    console.error('确认收货错误:', error)
    res.status(500).json({ success: false, message: '操作失败: ' + error.message })
  }
})

module.exports = router
