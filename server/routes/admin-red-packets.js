const express = require('express');
const router = express.Router();
const RedPacket = require('../models/RedPacket');
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      code: 400,
      success: false,
      message: '参数验证失败',
      error: {
        type: 'VALIDATION_ERROR',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value,
        })),
      },
    });
  }
  next();
};

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const [list, total] = await Promise.all([
      RedPacket.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(pageSize))
        .lean(),
      RedPacket.countDocuments(query)
    ]);

    res.json({
      code: 200,
      success: true,
      data: {
        list,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize))
        }
      }
    });
  } catch (error) {
    console.error('获取红包列表失败:', error);
    res.status(500).json({ code: 500, success: false, message: '获取红包列表失败: ' + error.message });
  }
});

router.post('/', [
    body('title').trim().notEmpty().withMessage('红包名称不能为空'),
    body('type').isIn(['fixed', 'random']).withMessage('红包类型无效'),
    body('totalAmount').isFloat({ min: 0.01 }).withMessage('总金额必须大于0'),
    body('totalCount').isInt({ min: 1 }).withMessage('总数量必须大于0'),
  ],
  validate,
  async (req, res) => {
    try {
      const { title, description, type, totalAmount, totalCount, validityType } = req.body;

      let endTime;
      const now = new Date();
      switch (validityType) {
        case '24h':
          endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case '7d':
          endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          endTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      const redPacket = await RedPacket.create({
        title,
        description: description || '',
        type: type || 'random',
        totalAmount: parseFloat(totalAmount),
        totalCount: parseInt(totalCount),
        minAmount: 1,
        remainingCount: parseInt(totalCount),
        remainingAmount: parseFloat(totalAmount),
        status: 'draft',
        taskType: 'manual',
        taskConfig: {},
        startTime: now,
        endTime,
        createdBy: req.user?.id || null,
        createdAt: now,
        updatedAt: now,
      });

      res.status(201).json({
        code: 201,
        success: true,
        message: '红包草稿创建成功',
        data: redPacket
      });
    } catch (error) {
      console.error('创建红包失败:', error);
      res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
    }
});

router.get('/:id', async (req, res) => {
  try {
    const redPacket = await RedPacket.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!redPacket) {
      return res.status(404).json({ code: 404, success: false, message: '红包不存在' });
    }

    res.json({
      code: 200,
      success: true,
      data: redPacket
    });
  } catch (error) {
    console.error('获取红包详情失败:', error);
    res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description, type } = req.body;
    const updateData = {};

    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type) updateData.type = type;
    updateData.updatedAt = new Date();

    const updated = await RedPacket.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ code: 404, success: false, message: '红包不存在' });
    }

    res.json({
      code: 200,
      success: true,
      message: '更新成功',
      data: updated
    });
  } catch (error) {
    console.error('更新红包失败:', error);
    res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
  }
});

router.put('/:id/rules', [
  body('triggerType').isIn(['watch_video', 'complete_task', 'user_level', 'combination']),
  body('requiredDuration').optional().isInt({ min: 1, max: 480 }),
  validate,
],
async (req, res) => {
  try {
    const redPacket = await RedPacket.findById(req.params.id);

    if (!redPacket) {
      return res.status(404).json({ code: 404, success: false, message: '红包不存在' });
    }

    if (redPacket.status === 'active') {
      return res.status(403).json({ code: 403, success: false, message: '活动进行中无法修改触发规则' });
    }

    const { triggerType, requiredDuration, ...rest } = req.body;

    const triggerConfigUpdate = {
      'triggerConfig.triggerType': triggerType,
    };

    switch (triggerType) {
      case 'watch_video':
        triggerConfigUpdate['triggerConfig.watchVideoConfig'] = {
          targetType: rest.targetType || 'all',
          requiredDuration: requiredDuration || 30,
          category: rest.category,
        };
        break;
      case 'complete_task':
        triggerConfigUpdate['triggerConfig.taskConfig'] = {
          taskTypes: rest.taskTypes || [],
          requiredCount: rest.requiredCount || 1,
        };
        break;
      case 'combination':
        triggerConfigUpdate['triggerConfig.combinationLogic'] = rest.logicOperator || 'and';
        triggerConfigUpdate['triggerConfig.conditions'] = rest.conditions || [];
        break;
    }

    const updated = await RedPacket.findByIdAndUpdate(
      req.params.id,
      { $set: triggerConfigUpdate },
      { new: true }
    );

    res.json({
      code: 200,
      success: true,
      message: '触发规则配置成功',
      data: {
        summary: _generateRuleSummary(triggerType, req.body),
        config: updated.triggerConfig,
      },
    });
  } catch (error) {
    console.error('配置触发规则失败:', error);
    res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
  }
});

function _generateRuleSummary(triggerType, data) {
  switch (triggerType) {
    case 'watch_video':
      return `观看商品推荐视频 ≥ ${data.requiredDuration || 30} 分钟`;
    case 'complete_task':
      return `完成任务 (${data.taskTypes ? data.taskTypes.join(', ') : '全部'})`;
    default:
      return `自定义条件`;
  }
}

router.put('/:id/limits', async (req, res) => {
  try {
    const redPacket = await RedPacket.findById(req.params.id);

    if (!redPacket) {
      return res.status(404).json({ code: 404, success: false, message: '红包不存在' });
    }

    if (redPacket.status === 'active') {
      return res.status(403).json({ code: 403, success: false, message: '活动进行中无法修改领取限制' });
    }

    const { maxClaimsPerUser, dailyLimit, weeklyLimit, monthlyLimit, levelRestrictions } = req.body;

    const limitsUpdate = {};
    if (maxClaimsPerUser) limitsUpdate['claimRules.maxClaimsPerUser'] = parseInt(maxClaimsPerUser);
    if (dailyLimit) limitsUpdate['claimRules.frequencyLimits.daily'] = parseInt(dailyLimit);
    if (weeklyLimit) limitsUpdate['claimRules.frequencyLimits.weekly'] = parseInt(weeklyLimit);
    if (monthlyLimit) limitsUpdate['claimRules.frequencyLimits.monthly'] = parseInt(monthlyLimit);
    if (levelRestrictions) {
      limitsUpdate['claimRules.levelRestrictions'] = levelRestrictions;
    }

    const updated = await RedPacket.findByIdAndUpdate(
      req.params.id,
      { $set: limitsUpdate },
      { new: true }
    );

    res.json({
      code: 200,
      success: true,
      message: '领取限制配置成功',
      data: updated.claimRules
    });
  } catch (error) {
    console.error('配置领取限制失败:', error);
    res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
  }
});

router.put('/:id/publish', async (req, res) => {
  try {
    const redPacket = await RedPacket.findById(req.params.id);

    if (!redPacket) {
      return res.status(404).json({ code: 404, success: false, message: '红包不存在' });
    }

    if (redPacket.status === 'active') {
      return res.status(400).json({ code: 400, success: false, message: '红包已经是活动状态' });
    }

    if (!redPacket.triggerConfig?.triggerType) {
      return res.status(400).json({ code: 400, success: false, message: '请先配置触发规则' });
    }

    const now = new Date();
    const published = await RedPacket.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'active',
          publishedAt: now,
          updatedAt: now
        }
      },
      { new: true }
    );

    res.json({
      code: 200,
      success: true,
      message: '红包活动已发布',
      data: {
        id: published._id,
        status: published.status,
        publishedAt: published.publishedAt,
        startTime: published.startTime,
        endTime: published.endTime
      }
    });
  } catch (error) {
    console.error('发布红包失败:', error);
    res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
  }
});

router.put('/:id/draft', async (req, res) => {
  try {
    const redPacket = await RedPacket.findById(req.params.id);

    if (!redPacket) {
      return res.status(404).json({ code: 404, success: false, message: '红包不存在' });
    }

    if (redPacket.status === 'active') {
      return res.status(403).json({ code: 403, success: false, message: '活动中的红包不能保存为草稿' });
    }

    const { title, description, type, totalAmount, totalCount } = req.body;
    const updateData = { updatedAt: new Date(), status: 'draft' };

    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type) updateData.type = type;
    if (totalAmount) {
      updateData.totalAmount = parseFloat(totalAmount);
      updateData.remainingAmount = parseFloat(totalAmount);
    }
    if (totalCount) {
      updateData.totalCount = parseInt(totalCount);
      updateData.remainingCount = parseInt(totalCount);
    }

    const updated = await RedPacket.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    res.json({
      code: 200,
      success: true,
      message: '草稿保存成功',
      data: updated
    });
  } catch (error) {
    console.error('保存草稿失败:', error);
    res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const redPacket = await RedPacket.findById(req.params.id);

    if (!redPacket) {
      return res.status(404).json({ code: 404, success: false, message: '红包不存在' });
    }

    if (redPacket.status === 'active' || redPacket.status === 'paused') {
      return res.status(403).json({
        code: 403,
        success: false,
        message: `${redPacket.status === 'active' ? '进行中' : '已暂停'}的红包无法删除`,
      });
    }

    await RedPacket.findByIdAndDelete(req.params.id);

    res.json({
      code: 200,
      success: true,
      message: '红包删除成功',
    });
  } catch (error) {
    console.error('删除红包失败:', error);
    res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
  }
});

module.exports = router;
