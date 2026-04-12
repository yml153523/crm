const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const RedPacket = require('../models/RedPacket');
const RedPacketRecord = require('../models/RedPacketRecord');

router.get('/dashboard', [
  query('redPacketId').optional().isMongoId().withMessage('红包ID格式错误')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array()
      });
    }

    const { redPacketId } = req.query;
    const matchStage = redPacketId ? { _id: redPacketId } : {};

    const [stats, activeCount, totalAmount] = await Promise.all([
      RedPacket.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            totalBudget: { $sum: '$totalAmount' },
            totalSent: { $sum: '$claimedCount' },
            totalRemaining: { $sum: '$remainingCount' },
            totalRemainingAmount: { $sum: '$remainingAmount' },
            activePackets: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            depletedPackets: { $sum: { $cond: [{ $eq: ['$status', 'depleted'] }, 1, 0] } },
            expiredPackets: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } }
          }
        }
      ]),
      RedPacket.countDocuments({ status: 'active', ...matchStage }),
      RedPacket.aggregate([
        { $match: matchStage },
        { $group: { _id: null, sum: { $sum: '$totalAmount' } } }
      ])
    ]);

    const dashboardData = stats[0] || {
      totalCount: 0,
      totalBudget: 0,
      totalSent: 0,
      totalRemaining: 0,
      totalRemainingAmount: 0,
      activePackets: 0,
      depletedPackets: 0,
      expiredPackets: 0
    };

    const claimedRate = dashboardData.totalBudget > 0
      ? ((dashboardData.totalSent / (dashboardData.totalSent + dashboardData.totalRemaining)) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        kpiCards: [
          {
            title: '总预算',
            value: dashboardData.totalBudget || 0,
            unit: '元',
            icon: '💰',
            color: '#007AFF'
          },
          {
            title: '已发放',
            value: dashboardData.totalSent || 0,
            unit: '个',
            icon: '📤',
            color: '#34C759'
          },
          {
            title: '剩余',
            value: dashboardData.totalRemaining || 0,
            unit: '个',
            icon: '📦',
            color: '#FF9500'
          },
          {
            title: '发放率',
            value: parseFloat(claimedRate),
            unit: '%',
            icon: '📊',
            color: '#5856D6'
          }
        ],
        summary: {
          totalRedPackets: dashboardData.totalCount || 0,
          activeRedPackets: activeCount,
          depletedRedPackets: dashboardData.depletedPackets || 0,
          expiredRedPackets: dashboardData.expiredPackets || 0,
          totalBudget: dashboardData.totalBudget || 0,
          totalClaimed: dashboardData.totalSent || 0,
          totalRemaining: dashboardData.totalRemaining || 0,
          remainingAmount: dashboardData.totalRemainingAmount || 0,
          claimRate: parseFloat(claimedRate)
        }
      }
    });
  } catch (error) {
    console.error('获取Dashboard统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/trends', [
  query('redPacketId').optional().isMongoId(),
  query('range').optional().isIn(['today', '7d', '30d', '90d']).withMessage('时间范围参数错误'),
  query('granularity').optional().isIn(['hour', 'day', 'week', 'month']).withMessage('粒度参数错误')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { redPacketId, range = '7d', granularity = 'day' } = req.query;

    let startDate = new Date();
    switch (range) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    const matchQuery = {
      createdAt: { $gte: startDate }
    };
    if (redPacketId) matchQuery.redPacketId = redPacketId;

    let groupId;
    switch (granularity) {
      case 'hour':
        groupId = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' }, hour: { $hour: '$createdAt' } };
        break;
      case 'day':
        groupId = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };
        break;
      case 'week':
        groupId = { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } };
        break;
      case 'month':
        groupId = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
        break;
    }

    const trends = await RedPacketRecord.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: groupId,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const formattedTrends = trends.map(item => ({
      timestamp: formatGroupId(item._id, granularity),
      count: item.count,
      totalAmount: item.totalAmount,
      avgAmount: Math.round(item.avgAmount * 100) / 100
    }));

    res.json({
      success: true,
      data: {
        range,
        granularity,
        trends: formattedTrends,
        summary: {
          periodTotal: trends.reduce((sum, item) => sum + item.count, 0),
          periodAmount: trends.reduce((sum, item) => sum + item.totalAmount, 0),
          peakDay: trends.length > 0 ? trends.reduce((max, item) => item.count > max.count ? item : max, trends[0]) : null
        }
      }
    });
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    res.status(500).json({ success: false, message: '获取趋势数据失败' });
  }
});

function formatGroupId(groupId, granularity) {
  const { year, month, day, hour, week } = groupId;
  const pad = n => String(n).padStart(2, '0');

  switch (granularity) {
    case 'hour':
      return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:00`;
    case 'day':
      return `${year}-${pad(month)}-${pad(day)}`;
    case 'week':
      return `${year}-W${pad(week)}`;
    case 'month':
      return `${year}-${pad(month)}`;
    default:
      return `${year}-${pad(month)}-${pad(day)}`;
  }
}

router.get('/distribution', [
  query('redPacketId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { redPacketId } = req.query;
    const matchQuery = {};
    if (redPacketId) matchQuery.redPacketId = redPacketId;

    const distribution = await RedPacketRecord.aggregate([
      { $match: matchQuery },
      {
        $bucket: {
          groupBy: '$amount',
          boundaries: [0, 1, 5, 10, 50, 100, Infinity],
          default: 'other',
          output: {
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      }
    ]);

    const formattedDistribution = [
      { range: '0-1元', min: 0, max: 1, count: 0, percentage: 0 },
      { range: '1-5元', min: 1, max: 5, count: 0, percentage: 0 },
      { range: '5-10元', min: 5, max: 10, count: 0, percentage: 0 },
      { range: '10-50元', min: 10, max: 50, count: 0, percentage: 0 },
      { range: '50-100元', min: 50, max: 100, count: 0, percentage: 0 },
      { range: '100元以上', min: 100, max: Infinity, count: 0, percentage: 0 }
    ];

    const totalCount = distribution.reduce((sum, bucket) => sum + bucket.count, 0);

    distribution.forEach(bucket => {
      const index = formattedDistribution.findIndex(item => {
        if (bucket._id === 'other') return item.max === Infinity;
        return bucket._id >= item.min && bucket._id < item.max;
      });

      if (index !== -1) {
        formattedDistribution[index].count = bucket.count;
        formattedDistribution[index].percentage = totalCount > 0
          ? ((bucket.count / totalCount) * 100).toFixed(1)
          : 0;
        formattedDistribution[index].totalAmount = bucket.totalAmount;
      }
    });

    res.json({
      success: true,
      data: {
        distribution: formattedDistribution,
        summary: {
          totalRecords: totalCount,
          averageAmount: totalCount > 0
            ? (distribution.reduce((sum, b) => sum + b.totalAmount, 0) / totalCount).toFixed(2)
            : 0,
          maxRange: formattedDistribution.reduce((max, item) =>
            item.count > max.count ? item : max, formattedDistribution[0])
        }
      }
    });
  } catch (error) {
    console.error('获取分布数据失败:', error);
    res.status(500).json({ success: false, message: '获取分布数据失败' });
  }
});

router.get('/records', [
  query('redPacketId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['available', 'used', 'expired', 'refunded']),
  query('sortBy').optional().isIn(['createdAt', 'amount']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      redPacketId,
      page = 1,
      limit = 20,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    if (redPacketId) query.redPacketId = redPacketId;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const sortObj = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [records, total] = await Promise.all([
      RedPacketRecord.find(query)
        .populate('userId', 'name phone avatar')
        .populate('redPacketId', 'title type')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      RedPacketRecord.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        records: records.map(record => ({
          id: record._id,
          userId: record.userId?._id,
          userName: record.userName || record.userId?.name || '未知用户',
          userPhone: record.userId?.phone,
          userAvatar: record.userId?.avatar,
          redPacketId: record.redPacketId?._id,
          redPacketTitle: record.redPacketId?.title || '未知红包',
          amount: record.amount,
          status: record.status,
          claimedAt: record.claimedAt,
          usedAt: record.usedAt,
          expiresAt: record.expiresAt,
          rejectReason: record.rejectReason
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取领取记录失败:', error);
    res.status(500).json({ success: false, message: '获取领取记录失败' });
  }
});

module.exports = router;
