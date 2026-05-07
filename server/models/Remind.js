const mongoose = require('mongoose')

const remindSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['redPacket', 'classReminder', 'system', 'custom'],
    required: true
  },
  title: { type: String, required: true },
  content: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  sentAt: { type: Date },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  error: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
})

remindSchema.index({ userId: 1, createdAt: -1 })
remindSchema.index({ userId: 1, readAt: 1 })

module.exports = mongoose.model('Remind', remindSchema)
