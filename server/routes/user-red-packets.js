const express = require('express');
const router = express.Router();
const { param, body, validationResult } = require('express-validator');
const RedPacket = require('../models/RedPacket');
const AutoClaimEngine = require('../services/AutoClaimEngine');

router.post('/:id/claim', [
  param('id').isMongoId().withMessage('红包ID格式错误'),
  body('taskEvidence').optional().isObject(),
  body('clientInfo').optional().isObject()
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

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const redPacketId = req.params.id;
    const taskEvidence = req.body.taskEvidence || {};
    const clientInfo = req.body.clientInfo || {};

    taskEvidence.ipAddress = req.ip || clientInfo.ipAddress;
    taskEvidence.userAgent = req.get('User-Agent') || clientInfo.userAgent;

    const result = await AutoClaimEngine.handleTriggerEvent(
      userId,
      'manual_claim',
      {
        redPacketId,
        taskEvidence,
        clientInfo,
        timestamp: new Date()
      }
    );

    if (!result.success) {
      const statusCode = this.getErrorStatusCode(result.errorCode);
      return res.status(statusCode).json({
        success: false,
        message: result.message || '领取失败',
        errorCode: result.errorCode,
        details: result.details
      });
    }

    res.json({
      success: true,
      message: '领取成功',
      data: {
        recordId: result.record._id,
        amount: result.record.amount,
        redPacketTitle: result.redPacketTitle,
        status: result.record.status,
        claimedAt: result.record.claimedAt,
        expiresAt: result.record.expiresAt
      }
    });
  } catch (error) {
    console.error('用户领取红包失败:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误，请稍后重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/available', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 20 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const now = new Date();
    const [claimedRedPacketIds] = await Promise.all([
      RedPacketRecord.distinct('redPacketId', {
        userId,
        status: { $in: ['available', 'used'] }
      })
    ]);

    const query = {
      _id: { $nin: claimedRedPacketIds },
      status: 'active',
      startTime: { $lte: now },
      endTime: { $gt: now },
      remainingCount: { $gt: 0 }
    };

    const [redPackets, total] = await Promise.all([
      RedPacket.find(query)
        .select('title description type totalAmount remainingAmount claimedCount totalCount validityType triggerConfig')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RedPacket.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        redPackets: redPackets.map(rp => ({
          id: rp._id,
          title: rp.title,
          description: rp.description,
          type: rp.type,
          totalAmount: rp.totalAmount,
          remainingAmount: rp.remainingAmount,
          claimedCount: rp.claimedCount,
          totalCount: rp.totalCount,
          claimRate: rp.totalCount > 0 ? ((rp.claimedCount / rp.totalCount) * 100).toFixed(1) : 0,
          validityType: rp.validityType,
          triggerType: rp.triggerConfig?.triggerType,
          canClaim: true
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取可领取红包列表失败:', error);
    res.status(500).json({ success: false, message: '获取可领取红包列表失败' });
  }
});

router.get('/my-records', [
  query('status').optional().isIn(['available', 'used', 'expired', 'refunded']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = { userId };
    if (status) query.status = status;

    const [records, total] = await Promise.all([
      RedPacketRecord.find(query)
        .populate('redPacketId', 'title type')
        .sort({ createdAt: -1 })
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
          redPacketId: record.redPacketId?._id,
          redPacketTitle: record.redPacketId?.title || '未知红包',
          redPacketType: record.redPacketId?.type,
          amount: record.amount,
          status: record.status,
          claimedAt: record.claimedAt,
          usedAt: record.usedAt,
          expiresAt: record.expiresAt,
          canUse: record.status === 'available' && new Date(record.expiresAt) > new Date()
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
    console.error('获取我的领取记录失败:', error);
    res.status(500).json({ success: false, message: '获取记录失败' });
  }
});

function getErrorStatusCode(errorCode) {
  const statusMap = {
    'RED_PACKET_NOT_FOUND': 404,
    'RED_PACKET_NOT_ACTIVE': 400,
    'RED_PACKET_EXPIRED': 410,
    'RED_PACKET_DEPLETED': 410,
    'DUPLICATE_CLAIM': 409,
    'FREQUENCY_LIMIT_EXCEEDED': 429,
    'USER_LEVEL_RESTRICTED': 403,
    'TRIGGER_CONDITION_NOT_MET': 400,
    'SYSTEM_ERROR': 500
  };
  return statusMap[errorCode] || 500;
}

module.exports = router;
