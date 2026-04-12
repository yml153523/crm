const mongoose = require('mongoose')

const remindSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Remind', remindSchema)
