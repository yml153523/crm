const mongoose = require('mongoose')

const exportTaskSchema = new mongoose.Schema({
  taskId: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  config: {
    format: { 
      type: String, 
      enum: ['excel', 'pdf'], 
      required: true 
    },
    
    redPacketIds: [{ 
      type: mongoose.Schema.Types.ObjectId 
    }],
    
    dateRange: {
      start: { 
        type: Date 
      },
      end: { 
        type: Date 
      }
    },
    
    fields: [{ 
      type: String 
    }],
    
    includeCharts: { 
      type: Boolean, 
      default: false 
    }
  },
  
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  progress: {
    current: { 
      type: Number, 
      default: 0 
    },
    total: { 
      type: Number, 
      default: 0 
    },
    percentage: { 
      type: Number, 
      default: 0 
    }
  },
  
  result: {
    filePath: { 
      type: String 
    },
    
    fileSize: { 
      type: Number 
    },
    
    recordCount: { 
      type: Number 
    },
    
    error: { 
      type: String 
    }
  },
  
  startedAt: { 
    type: Date 
  },
  
  completedAt: { 
    type: Date 
  },
  
  expiresAt: { 
    type: Date 
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
})

exportTaskSchema.index({ createdBy: 1, createdAt: -1 })
exportTaskSchema.index({ status: 1 })

module.exports = mongoose.model('ExportTask', exportTaskSchema)
