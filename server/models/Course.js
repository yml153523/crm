const mongoose = require('mongoose')

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  category: { type: String, required: true },
  instructor: { type: String, required: true },
  duration: { type: String, default: '' },
  studentCount: { type: Number, default: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  price: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  isHot: { type: Boolean, default: false },
  videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Course', courseSchema)
