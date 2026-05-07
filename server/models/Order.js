const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  orderNo: { type: String, required: true, unique: true },
  
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, default: '' },
  userPhone: { type: String, default: '' },
  
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
    productImage: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    variantName: { type: String },
    subtotal: { type: Number }
  }],
  
  totalAmount: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },
  shippingFee: { type: Number, default: 0 },
  
  paymentMethod: {
    type: String,
    enum: ['mock', 'wechat', 'alipay'],
    default: 'mock'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paidAt: { type: Date },
  transactionId: { type: String },
  
  shippingAddress: {
    receiverName: { type: String, required: true },
    receiverPhone: { type: String, required: true },
    province: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    detailAddress: { type: String, required: true },
    postalCode: { type: String }
  },
  
  logisticsCompany: { type: String, default: '' },
  trackingNo: { type: String, default: '' },
  shippedAt: { type: Date },
  deliveredAt: { type: Date },
  
  status: {
    type: String,
    enum: ['pending_payment', 'paid', 'shipping', 'delivered', 'completed', 'cancelled', 'refunded'],
    default: 'pending_payment'
  },
  
  buyerRemark: { type: String, default: '' },
  sellerRemark: { type: String, default: '' },
  
  redPacketUsed: { type: mongoose.Schema.Types.ObjectId, ref: 'RedPacketRecord' },
  redPacketDiscount: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

orderSchema.index({ userId: 1, createdAt: -1 })
orderSchema.index({ orderNo: 1 }, { unique: true })
orderSchema.index({ status: 1, createdAt: -1 })
orderSchema.index({ paymentStatus: 1, paidAt: -1 }) // 支付状态查询优化

orderSchema.pre('save', function(next) {
  if (!this.orderNo) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    this.orderNo = `${date}${random}`
  }
  next()
})

module.exports = mongoose.model('Order', orderSchema)
