const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userRole: {
    type: String,
    enum: ['admin', 'user', 'system'],
    default: 'user'
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  resource: {
    type: String,
    required: true,
    index: true
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  },
  path: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  requestBody: {
    type: mongoose.Schema.Types.Mixed
  },
  statusCode: {
    type: Number
  },
  responseTime: {
    type: Number
  },
  success: {
    type: Boolean,
    default: false,
    index: true
  },
  errorMessage: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false,
  versionKey: false
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, action: 1 });

auditLogSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  if (options.action) query.action = options.action;
  if (options.success !== undefined) query.success = options.success;

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 50)
    .lean();
};

auditLogSchema.statics.findByResource = function(resource, options = {}) {
  const query = { resource };
  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) query.timestamp.$gte = new Date(options.startDate);
    if (options.endDate) query.timestamp.$lte = new Date(options.endDate);
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100)
    .lean();
};

auditLogSchema.statics.getErrorLogs = function(options = {}) {
  const query = { success: false };

  return this.find(query)
    .populate('userId', 'name email')
    .sort({ timestamp: -1 })
    .limit(options.limit || 20)
    .lean();
};

auditLogSchema.statics.getStats = async function(startDate, endDate) {
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = new Date(startDate);
    if (endDate) matchStage.timestamp.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        successfulRequests: { $sum: { $cond: ['$success', 1, 0] } },
        failedRequests: { $sum: { $cond: [{ $not: '$success' }, 1, 0] } },
        avgResponseTime: { $avg: '$responseTime' },
        maxResponseTime: { $max: '$responseTime' },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        _id: 0,
        totalRequests: 1,
        successfulRequests: 1,
        failedRequests: 1,
        successRate: {
          $cond: [
            { $gt: ['$totalRequests', 0] },
            { $multiply: [{ $divide: ['$successfulRequests', '$totalRequests'] }, 100] },
            0
          ]
        },
        avgResponseTime: { $round: ['$avgResponseTime', 0] },
        maxResponseTime: 1,
        uniqueUsersCount: { $size: '$uniqueUsers' }
      }
    }
  ]);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
