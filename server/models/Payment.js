const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderNo: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  amount: { type: Number, required: true },
  method: {
    type: String,
    enum: ['mock', 'wechat', 'alipay'],
    default: 'mock'
  },
  
  transactionId: { type: String },
  prepayId: { type: String },
  
  status: {
    type: String,
    enum: ['created', 'processing', 'success', 'failed', 'closed'],
    default: 'created'
  },
  
  callbackData: mongoose.Schema.Types.Mixed,
  
  createdAt: { type: Date, default: Date.now },
  paidAt: { type: Date }
})

module.exports = mongoose.model('Payment', paymentSchema)
