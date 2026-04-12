const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isVIP: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  balance: { type: Number, default: 0 },
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('User', userSchema)
