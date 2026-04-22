const AuditLog = require('../models/AuditLog');

/**
 * 查询审计日志列表
 * GET /api/audit-logs
 */
const getLogs = async (req, res) => {
  try {
    const {
      startTime,
      endTime,
      userId,
      actionType,
      resource,
      success,
      keyword,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    if (startTime || endTime) {
      query.timestamp = {};
      if (startTime) query.timestamp.$gte = new Date(startTime);
      if (endTime) query.timestamp.$lte = new Date(endTime);
    }

    if (userId) query.userId = userId;
    if (actionType) {
      query.action = { $regex: actionType, $options: 'i' };
    }
    if (resource) query.resource = resource;
    if (success !== undefined) query.success = success === 'true';

    if (keyword) {
      query.$or = [
        { action: { $regex: keyword, $options: 'i' } },
        { resource: { $regex: keyword, $options: 'i' } },
        { errorMessage: { $regex: keyword, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('查询审计日志失败:', error);
    res.status(500).json({
      success: false,
      message: '查询审计日志失败'
    });
  }
};

/**
 * 获取单条日志详情
 * GET /api/audit-logs/:id
 */
const getLogById = async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id).lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        message: '日志不存在'
      });
    }

    res.json({
      success: true,
      data: { log }
    });
  } catch (error) {
    console.error('获取日志详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取日志详情失败'
    });
  }
};

module.exports = {
  getLogs,
  getLogById
};
