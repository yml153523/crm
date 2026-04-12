const mongoose = require('mongoose')

const redPacketRecordSchema = new mongoose.Schema({
  redPacketId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'RedPacket', 
    required: true,
    index: true 
  },
  
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  userPhone: { 
    type: String, 
    default: '' 
  },
  
  userName: { 
    type: String, 
    default: '' 
  },
  
  userLevel: { 
    type: Number, 
    default: 1 
  },
  
  amount: { 
    type: Number, 
    required: true 
  },
  
  status: {
    type: String,
    enum: ['available', 'used', 'expired', 'refunded', 'rejected'],
    default: 'available'
  },
  
  rejectReason: { 
    type: String 
  },
  
  taskCompletedAt: { 
    type: Date 
  },
  
  taskEvidence: {
    videoWatchDuration: { 
      type: Number 
    },
    videoId: { 
      type: mongoose.Schema.Types.ObjectId 
    },
    orderId: { 
      type: mongoose.Schema.Types.ObjectId 
    },
    shareTargetUserId: { 
      type: mongoose.Schema.Types.ObjectId 
    },
    completedTasks: [{ 
      type: String 
    }]
  },
  
  antiAbuseInfo: {
    ipAddress: { 
      type: String 
    },
    deviceFingerprint: { 
      type: String 
    },
    userAgent: { 
      type: String 
    },
    claimLatency: { 
      type: Number 
    }
  },
  
  usedAt: { 
    type: Date 
  },
  
  usedOrderId: { 
    type: mongoose.Schema.Types.ObjectId 
  },
  
  usedAmount: { 
    type: Number, 
    default: 0 
  },
  
  expiresAt: { 
    type: Date 
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
})

// ===== 唯一索引（防重复领取）=====
redPacketRecordSchema.index(
  { 
    redPacketId: 1, 
    userId: 1 
  }, 
  { 
    unique: true, 
    partialFilterExpression: { 
      status: { $in: ['available', 'used'] } 
    } 
  }
)

// ===== 频率查询索引 =====
redPacketRecordSchema.index(
  { 
    userId: 1, 
    createdAt: -1 
  }
)

// ===== 监控面板查询索引 =====
redPacketRecordSchema.index(
  { 
    redPacketId: 1, 
    status: 1, 
    createdAt: -1 
  }
)

module.exports = mongoose.model('RedPacketRecord', redPacketRecordSchema)
