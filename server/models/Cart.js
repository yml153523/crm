const mongoose = require('mongoose')

const cartItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  variantName: { type: String, default: '' },
  price: { type: Number, required: true },
  addedAt: { type: Date, default: Date.now }
})

cartItemSchema.index({ userId: 1, productId: 1 }, { unique: true })

module.exports = mongoose.model('Cart', cartItemSchema)
