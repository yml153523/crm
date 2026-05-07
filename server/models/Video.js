const mongoose = require('mongoose')

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  cover: { type: String, default: '' },
  videoUrl: { type: String, required: true },
  duration: { type: Number, default: 0 },
  size: { type: Number, default: 0 },
  category: { type: String, default: '其他' },
  categoryPath: { type: String, default: '' },
  tags: [{ type: String }],
  status: {
    type: String,
    enum: ['draft', 'reviewing', 'published', 'rejected'],
    default: 'draft'
  },
  isRecommended: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 },
  completionCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  likeCount: { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  isMarketing: { type: Boolean, default: false },
  marketingType: {
    type: String,
    enum: ['product_intro', 'tutorial', 'testimonial', 'live'],
    default: null
  },
  ctaText: { type: String, default: '' },
  ctaLink: { type: String, default: '' },
  conversionRate: { type: Number, default: 0 },
  viewToOrderCount: { type: Number, default: 0 },
  
  seoTitle: { type: String, default: '' },
  seoDescription: { type: String, default: '' },
  seoKeywords: [{ type: String }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

videoSchema.index({ categoryPath: 1, status: 1, createdAt: -1 })
videoSchema.index({ productId: 1, isMarketing: 1 })
videoSchema.index({ courseId: 1, status: 1 }) // 课程视频查询优化
videoSchema.index({ uploadedBy: 1, createdAt: -1 }) // 用户视频列表优化
videoSchema.index({ status: 1, isRecommended: -1, createdAt: -1 }) // 推荐列表优化

module.exports = mongoose.model('Video', videoSchema)
