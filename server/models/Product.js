const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, default: '' },
  category: {
    type: String,
    required: true,
    enum: ['vitamin', 'supplement', 'health_food', 'equipment', 'other']
  },
  subCategory: { type: String, default: '' },
  
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  currency: { type: String, default: 'CNY' },
  
  coverImage: { type: String, default: '' },
  images: [{ type: String }],
  
  stock: { type: Number, default: 0, min: 0 },
  stockStatus: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    default: 'in_stock'
  },
  
  salesCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  rating: { type: Number, min: 0, max: 5, default: 5 },
  reviewCount: { type: Number, default: 0 },
  
  relatedVideoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  tags: [{ type: String }],
  
  variants: [{
    name: { type: String },
    price: { type: Number },
    stock: { type: Number }
  }],
  
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'draft'
  },
  isRecommended: { type: Boolean, default: false },
  isNew: { type: Boolean, default: false },
  isHot: { type: Boolean, default: false },
  
  slug: { type: String, unique: true, sparse: true },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

productSchema.index({ category: 1, status: 1, salesCount: -1 })
productSchema.index({ status: 1, isRecommended: 1, createdAt: -1 })
productSchema.index({ name: 'text', description: 'text' })

module.exports = mongoose.model('Product', productSchema)
