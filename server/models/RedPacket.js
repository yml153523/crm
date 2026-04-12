const mongoose = require('mongoose')

const redPacketSchema = new mongoose.Schema({
  // ===== 基本信息 =====
  title: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 50 
  },
  description: { 
    type: String, 
    default: '', 
    maxlength: 500 
  },
  
  type: {
    type: String,
    enum: ['fixed', 'random'],
    required: true
  },
  
  totalAmount: { 
    type: Number, 
    required: true,
    min: 100,
    max: 10000000
  },
  
  totalCount: { 
    type: Number, 
    required: true,
    min: 1,
    max: 10000
  },
  
  minAmount: { 
    type: Number, 
    required: true,
    default: 1,
    min: 1
  },
  
  remainingCount: { 
    type: Number, 
    required: true 
  },
  
  remainingAmount: { 
    type: Number, 
    required: true 
  },
  
  // ===== 有效期配置 =====
  validityType: {
    type: String,
    enum: ['24h', '7d', '30d', 'custom'],
    default: '7d'
  },
  
  validityDays: { 
    type: Number, 
    default: 7 
  },
  
  startTime: { 
    type: Date, 
    default: Date.now 
  },
  
  endTime: { 
    type: Date 
  },
  
  // ===== 触发条件（Step 2）=====
  triggerConfig: {
    triggerType: {
      type: String,
      enum: ['watch_video', 'complete_task', 'user_level', 'combination'],
      required: false
    },
    
    watchVideoConfig: {
      targetType: { 
        type: String, 
        enum: ['all', 'category', 'specific'] 
      },
      targetIds: [{ 
        type: mongoose.Schema.Types.ObjectId 
      }],
      category: { 
        type: String 
      },
      requiredDuration: { 
        type: Number,
        min: 1,
        max: 480
      }
    },
    
    taskConfig: {
      taskTypes: [{
        type: String,
        enum: ['register', 'first_purchase', 'invite_friend', 'checkin']
      }],
      requiredCount: { 
        type: Number, 
        default: 1 
      }
    },
    
    combinationLogic: { 
      type: String, 
      enum: ['and', 'or'], 
      default: 'and' 
    },
    
    conditions: [{
      type: { 
        type: String 
      },
      operator: { 
        type: String, 
        enum: ['>=', '<=', '==', '!='] 
      },
      value: mongoose.Schema.Types.Mixed
    }]
  },
  
  // ===== 兼容旧字段（保持向后兼容）=====
  taskType: {
    type: String,
    enum: ['watch_video', 'purchase_product', 'register', 'share', 'checkin', 'manual'],
    required: true
  },
  
  taskConfig: {
    targetId: { 
      type: mongoose.Schema.Types.ObjectId 
    },
    targetType: { 
      type: String, 
      enum: ['Video', 'Product'] 
    },
    requiredDuration: { 
      type: Number 
    },
    minPurchaseAmount: { 
      type: Number 
    },
    shareCount: { 
      type: Number 
    },
    checkinDays: { 
      type: Number 
    }
  },
  
  // ===== 领取限制（Step 3）=====
  claimRules: {
    maxClaimsPerUser: { 
      type: Number, 
      default: 1, 
      min: 1 
    },
    
    frequencyLimits: {
      daily: { 
        type: Number, 
        default: 3 
      },
      weekly: { 
        type: Number, 
        default: 10 
      },
      monthly: { 
        type: Number, 
        default: 30 
      }
    },
    
    levelRestrictions: {
      enabled: { 
        type: Boolean, 
        default: false 
      },
      allowedLevels: [{ 
        type: Number 
      }],
      vipOnly: { 
        type: Boolean, 
        default: false 
      }
    },
    
    antiAbuse: {
      ipDailyLimit: { 
        type: Number, 
        default: 50 
      },
      requireDeviceFingerprint: { 
        type: Boolean, 
        default: false 
      },
      cooldownMinutes: { 
        type: Number, 
        default: 0 
      }
    },
    
    // 兼容旧字段
    levelRequired: { 
      type: Number 
    },
    newUserOnly: { 
      type: Boolean, 
      default: false 
    },
    vipOnly: { 
      type: Boolean, 
      default: false 
    },
    claimStartTime: { 
      type: Date 
    },
    claimEndTime: { 
      type: Date 
    }
  },
  
  // ===== 使用规则 =====
  usageRules: {
    minOrderAmount: { 
      type: Number, 
      default: 0 
    },
    applicableCategories: [{ 
      type: String 
    }],
    expireAfterClaim: { 
      type: Number, 
      default: 30 
    },
    canStack: { 
      type: Boolean, 
      default: false 
    }
  },
  
  // ===== 高级设置（Step 4）=====
  advancedSettings: {
    notificationChannels: [{
      type: String,
      enum: ['app_push', 'sms', 'email', 'wechat_template']
    }],
    displayStyle: { 
      type: String, 
      default: 'standard' 
    },
    distributionStrategy: { 
      type: String, 
      enum: ['even', 'weighted', 'lucky_last'], 
      default: 'even' 
    },
    maxConcurrentClaims: { 
      type: Number, 
      default: 100 
    }
  },
  
  // ===== 状态机（7种状态）=====
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'expired', 'finished', 'cancelled', 'depleted'],
    default: 'draft'
  },
  
  // ===== 统计数据 =====
  stats: {
    sentCount: { 
      type: Number, 
      default: 0 
    },
    claimedCount: { 
      type: Number, 
      default: 0 
    },
    usedCount: { 
      type: Number, 
      default: 0 
    },
    expiredCount: { 
      type: Number, 
      default: 0 
    },
    rejectedCount: { 
      type: Number, 
      default: 0 
    },
    totalAmountSent: { 
      type: Number, 
      default: 0 
    },
    totalAmountUsed: { 
      type: Number, 
      default: 0 
    },
    totalAmountRefunded: { 
      type: Number, 
      default: 0 
    }
  },
  
  // ===== 元数据 =====
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  publishedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  publishedAt: { 
    type: Date 
  },
  expiredProcessedAt: { 
    type: Date 
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
})

// ===== 复合索引 =====
redPacketSchema.index({ status: 1, startTime: 1, endTime: 1 })
redPacketSchema.index({ createdBy: 1, createdAt: -1 })
redPacketSchema.index({ 'triggerConfig.triggerType': 1, status: 1 })

// 更新时间中间件
redPacketSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('RedPacket', redPacketSchema)
