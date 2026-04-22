const AuditLog = require('../models/AuditLog');
const { Parser } = require('json2csv');

/**
 * 导出日志为CSV
 * POST /api/audit-logs/export
 */
const exportLogs = async (req, res) => {
  try {
    const {
      startTime,
      endTime,
      actionType,
      resource,
      userId,
      success
    } = req.body;

    const query = {};
    
    if (startTime) query.timestamp.$gte = new Date(startTime);
    if (endTime) query.timestamp.$lte = new Date(endTime);
    if (actionType) query.action = { $regex: actionType, $options: 'i' };
    if (resource) query.resource = resource;
    if (userId) query.userId = userId;
    if (success !== undefined) query.success = success;

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .lean();

    const fields = [
      'timestamp',
      'action',
      'resource',
      'method',
      'path',
      'userId',
      'userRole',
      'ipAddress',
      'userAgent',
      'statusCode',
      'responseTime',
      'success',
      'errorMessage'
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(logs);

    const fileName = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const BOM = '\uFEFF';
    res.send(BOM + csv);
  } catch (error) {
    console.error('导出日志失败:', error);
    res.status(500).json({
      success: false,
      message: '导出日志失败: ' + error.message
    });
  }
};

/**
 * 清理指定日期前的日志
 * DELETE /api/audit-logs/cleanup
 */
const cleanupLogs = async (req, res) => {
  try {
    const { beforeDate } = req.body;

    if (!beforeDate) {
      return res.status(400).json({
        success: false,
        message: '请指定清理日期 (beforeDate)'
      });
    }

    const before = new Date(beforeDate);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (before < sevenDaysAgo) {
      return res.status(400).json({
        success: false,
        message: '至少保留最近 7 天的日志'
      });
    }

    const result = await AuditLog.deleteMany({
      timestamp: { $lt: before }
    });

    const AuditLogModel = require('../models/AuditLog');
    await AuditLogModel.create({
      action: 'SYSTEM_EVENT CLEANUP',
      resource: 'system',
      method: 'DELETE',
      path: '/api/audit-logs/cleanup',
      userId: req.user?.id || null,
      userRole: req.user?.role || null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: 200,
      responseTime: 0,
      success: true,
      requestBody: {
        action: 'cleanup',
        deletedCount: result.deletedCount,
        beforeDate: beforeDate
      },
      errorMessage: null,
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        beforeDate: before.toISOString()
      },
      message: `成功删除 ${result.deletedCount} 条日志`
    });
  } catch (error) {
    console.error('清理日志失败:', error);
    res.status(500).json({
      success: false,
      message: '清理日志失败: ' + error.message
    });
  }
};

module.exports = {
  exportLogs,
  cleanupLogs
};
