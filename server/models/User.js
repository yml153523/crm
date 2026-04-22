const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'super_admin'], 
    default: 'user' 
  },
  status: { 
    type: String, 
    enum: ['active', 'disabled', 'deleted'], 
    default: 'active' 
  },
  permissions: [{ type: String }],
  isVIP: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  balance: { type: Number, default: 0 },
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null 
  },
  lastLoginAt: { type: Date, default: null },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

userSchema.index({ role: 1, status: 1 })
userSchema.index({ phone: 1 })

module.exports = mongoose.model('User', userSchema)