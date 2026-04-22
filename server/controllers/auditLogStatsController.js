const AuditLog = require('../models/AuditLog');

/**
 * 获取日志统计数据
 * GET /api/audit-logs/statistics/overview
 */
const getStatistics = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const todayLoginCount = await AuditLog.countDocuments({
      action: { $regex: /login/i },
      timestamp: { $gte: todayStart }
    });

    const todayOperationCount = await AuditLog.countDocuments({
      action: { $regex: /(POST|PUT|PATCH|DELETE)/i },
      timestamp: { $gte: todayStart }
    });

    const todayErrorCount = await AuditLog.countDocuments({
      success: false,
      timestamp: { $gte: todayStart }
    });

    const last7DaysStats = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            isSuccess: "$success"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          successCount: {
            $sum: { $cond: [{ $eq: ["$_id.isSuccess", true] }, "$count", 0] }
          },
          failCount: {
            $sum: { $cond: [{ $eq: ["$_id.isSuccess", false] }, "$count", 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const topUsers = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: sevenDaysAgo },
          userId: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$userId",
          userRole: { $first: "$userRole" },
          operationCount: { $sum: 1 }
        }
      },
      { $sort: { operationCount: -1 } },
      { $limit: 10 }
    ]);

    const actionTypeDistribution = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        today: {
          loginCount: todayLoginCount,
          operationCount: todayOperationCount,
          errorCount: todayErrorCount
        },
        last7Days: {
          dates: last7DaysStats.map(s => s._id),
          successCounts: last7DaysStats.map(s => s.successCount || 0),
          failCounts: last7DaysStats.map(s => s.failCount || 0)
        },
        topUsers,
        actionTypeDistribution: actionTypeDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
};

module.exports = {
  getStatistics
};
