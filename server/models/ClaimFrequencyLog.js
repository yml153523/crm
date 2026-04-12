const mongoose = require('mongoose')

const claimFrequencyLogSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  date: { 
    type: String, 
    required: true  // YYYY-MM-DD
  },
  
  week: { 
    type: String, 
    required: true  // YYYY-WW
  },
  
  month: { 
    type: String, 
    required: true  // YYYY-MM
  },
  
  dailyCount: { 
    type: Number, 
    default: 0 
  },
  
  weeklyCount: { 
    type: Number, 
    default: 0 
  },
  
  monthlyCount: { 
    type: Number, 
    default: 0 
  },
  
  lastClaimedAt: { 
    type: Date 
  },
  
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
})

claimFrequencyLogSchema.index(
  { 
    userId: 1, 
    date: 1 
  }, 
  { 
    unique: true 
  }
)

module.exports = mongoose.model('ClaimFrequencyLog', claimFrequencyLogSchema)
