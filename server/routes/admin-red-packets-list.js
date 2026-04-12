const express = require('express');
const router = express.Router();
const RedPacket = require('../models/RedPacket');

// ==================== 接口 1: 红包列表查询 (GET /api/admin/red-packets) ====================
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      status = '',
      type = '',
      dateRange = '', // 格式: "2026-04-01,2026-04-30"
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minAmount,
      maxAmount,
    } = req.query;

    const query = {};

    // 关键词搜索
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    }

    // 状态筛选
    if (status && status !== 'all') {
      query.status = status;
    }

    // 类型筛选
    if (type && type !== 'all') {
      query.type = type;
    }

    // 时间范围筛选
    if (dateRange) {
      const [start, end] = dateRange.split(',');
      if (start) {
        query.createdAt = { ...query.createdAt, $gte: new Date(start) };
      }
      if (end) {
        query.createdAt = { ...query.createdAt, $lte: new Date(end + 'T23:59:59') };
      }
    }

    // 金额范围筛选
    if (minAmount || maxAmount) {
      query.totalAmount = {};
      if (minAmount) query.totalAmount.$gte = Number(minAmount);
      if (maxAmount) query.totalAmount.$lte = Number(maxAmount);
    }

    // 排序
    const sortField = ['createdAt', 'totalAmount', 'claimedCount'].includes(sortBy)
      ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // 分页计算
    const skip = (Number(page) - 1) * Number(pageSize);
    const limit = Math.min(Number(pageSize), 100);

    // 并行执行：总数查询和数据查询
    const [total, list] = await Promise.all([
      RedPacket.countDocuments(query),
      RedPacket.find(query)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name phone')
        .lean(),
    ]);

    // 统计摘要
    const summary = await RedPacket.aggregate([
      { $match: {} },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      code: 200,
      success: true,
      data: {
        list,
        pagination: {
          page: Number(page),
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        summary: {
          totalCount: total,
          activeCount: summary.find(s => s._id === 'active')?.count || 0,
          draftCount: summary.find(s => s._id === 'draft')?.count || 0,
          expiredCount: summary.find(s => s._id === 'expired')?.count || 0,
        },
      },
    });
  } catch (error) {
    console.error('获取红包列表失败:', error);
    res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
  }
});

// ==================== 接口 2: 批量启用 (PATCH /api/admin/red-packets/batch/activate) ====================
router.patch('/batch/activate', async (req, res) => {
  try {
    const { ids = [] } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, success: false, message: '请提供要操作的红包ID数组' });
    }

    if (ids.length > 50) {
      return res.status(400).json({ code: 400, success: false, message: '单次最多操作50个红包' });
    }

    const result = await RedPacket.updateMany(
      { 
        _id: { $in: ids }, 
        status: { $in: ['draft', 'paused'] } 
      },
      { $set: { status: 'active' } }
    );

    res.json({
      code: 200,
      success: true,
      message: `成功启用 ${result.modifiedCount} 个红包`,
      data: { affectedCount: result.modifiedCount },
    });
  } catch (error) {
    console.error('批量启用失败:', error);
    res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
  }
});

// ==================== 接口 3: 批量禁用 (PATCH /api/admin/red-packets/batch/deactivate) ====================
router.patch('/batch/deactivate', async (req, res) => {
  try {
    const { ids = [] } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, success: false, message: '请提供要操作的红包ID数组' });
    }

    if (ids.length > 50) {
      return res.status(400).json({ code: 400, success: false, message: '单次最多操作50个红包' });
    }

    const result = await RedPacket.updateMany(
      { _id: { $in: ids }, status: 'active' },
      { $set: { status: 'paused' } }
    );

    res.json({
      code: 200,
      success: true,
      message: `成功暂停 ${result.modifiedCount} 个红包`,
      data: { affectedCount: result.modifiedCount },
    });
  } catch (error) {
    console.error('批量禁用失败:', error);
    res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
  }
});

// ==================== 接口 4: 批量删除 (DELETE /api/admin/red-packets/batch) ====================
router.delete('/batch', async (req, res) => {
  try {
    const { ids = [], confirm = false } = req.body;

    if (!confirm) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '请确认删除操作（设置 confirm: true）',
      });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, success: false, message: '请提供要删除的红包ID数组' });
    }

    // 检查是否有进行中的活动
    const activeCount = await RedPacket.countDocuments({
      _id: { $in: ids },
      status: 'active',
    });

    if (activeCount > 0) {
      return res.status(403).json({
        code: 403,
        success: false,
        message: `无法删除：其中 ${activeCount} 个红包正在进行中`,
      });
    }

    const result = await RedPacket.deleteMany({
      _id: { $in: ids },
      status: { $ne: 'active' }, // 只删除非进行中的
    });

    res.json({
      code: 200,
      success: true,
      message: `成功删除 ${result.deletedCount} 个红包`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    console.error('批量删除失败:', error);
    res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
  }
});

module.exports = router;
