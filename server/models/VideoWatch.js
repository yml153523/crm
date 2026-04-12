const mongoose = require('mongoose')

const VideoWatchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userPhone: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    default: ''
  },
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
    index: true
  },
  videoTitle: {
    type: String,
    required: true
  },
  watchedDuration: {
    type: Number,
    default: 0
  },
  totalDuration: {
    type: Number,
    default: 0
  },
  watchProgress: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  deviceInfo: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
})

// 复合索引，防止重复记录（同一用户同一视频同一天只记一条）
VideoWatchSchema.index({ userId: 1, videoId: 1, createdAt: 1 })

module.exports = mongoose.model('VideoWatch', VideoWatchSchema)
