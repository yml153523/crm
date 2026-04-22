const mongoose = require('mongoose')

const recommendationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  
  // 关联内容类型
  contentType: {
    type: String,
    enum: ['video', 'course', 'product', 'link', 'custom'],
    default: 'custom'
  },
  
  // 关联的内容ID（视频/课程/商品的ID）
  contentId: { type: mongoose.Schema.Types.ObjectId },
  
  // 外部链接（如果是link类型）
  link: { type: String },
  
  // 封面图
  image: { type: String },
  
  // 价格信息
  price: { type: Number, default: 0 },
  
  // 排序权重（数字越大越靠前）
  priority: {
    type: Number,
    default: 0
  },
  
  // 状态
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  
  // 创建者（管理员）
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // 统计数据
  viewCount: { type: Number, default: 0 },
  clickCount: { type: Number, default: 0 },
  
  // 标签
  tags: [{ type: String }],
  
  // 元数据
  metadata: { type: mongoose.Schema.Types.Mixed },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// 更新时间中间件
recommendationSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model('Recommendation', recommendationSchema)
