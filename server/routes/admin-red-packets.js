const express = require('express');
const router = express.Router();
const RedPacket = require('../models/RedPacket');
const { body, validationResult } = require('express-validator');

// 中间件：验证结果
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

// ==================== 接口 1: 创建红包草稿 (POST /api/admin/red-packets) ====================
router.post('/',
  [
    body('title')
      .trim()
      .notEmpty().withMessage('红包名称不能为空')
      .isLength({ min: 1, max: 50 }).withMessage('红包名称长度必须在1-50个字符之间'),
    
    body('type')
      .isIn(['fixed', 'random']).withMessage('红包类型必须是 fixed 或 random'),
    
    body('totalAmount')
      .isInt({ min: 100, max: 10000000 }).withMessage('总金额必须在1-10000000分之间'),
    
    body('totalCount')
      .isInt({ min: 1, max: 10000 }).withMessage('数量必须在1-10000之间'),
    
    // 可选字段
    body('description').optional().trim(),
    body('minAmount').optional().isInt({ min: 1 }),
    body('validityType').optional().isIn(['24h', '7d', '30d', 'custom']),
    body('validityDays').optional().isInt({ min: 1, max: 365 }),
    body('taskType').optional(),
  ],
  validate,
  async (req, res) => {
    try {
      const {
        title,
        description = '',
        type,
        totalAmount,
        totalCount,
        minAmount = 1,
        validityType = '7d',
        validityDays = 7,
        taskType = 'manual',
        ...rest
      } = req.body;

      const redPacket = await RedPacket.create({
        title,
        description,
        type,
        totalAmount: Number(totalAmount),
        totalCount: Number(totalCount),
        remainingCount: Number(totalCount),
        remainingAmount: Number(totalAmount),
        minAmount: Number(minAmount),
        validityType,
        validityDays: Number(validityDays),
        startTime: new Date(),
        status: 'draft',
        taskType,
        createdBy: req.user?._id || req.adminId,
        ...rest,
      });

      res.status(201).json({
        code: 201,
        success: true,
        message: '红包草稿创建成功',
        data: redPacket,
      });
    } catch (error) {
      console.error('创建红包失败:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          code: 400,
          success: false,
          message: error.message,
        });
      }
      
      res.status(500).json({
        code: 500,
        success: false,
        message: '服务器内部错误',
      });
    }
  }
);

// ==================== 接口 2: 获取红包详情 (GET /api/admin/red-packets/:id) ====================
router.get('/:id', async (req, res) => {
  try {
    const redPacket = await RedPacket.findById(req.params.id)
      .populate('createdBy', 'name phone');

    if (!redPacket) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: '红包不存在',
      });
    }

    res.json({
      code: 200,
      success: true,
      data: redPacket,
    });
  } catch (error) {
    console.error('获取红包详情失败:', error);
    res.status(500).json({
      code: 500,
      success: false,
      message: '服务器内部错误',
    });
  }
});

// ==================== 接口 3: 更新基本信息 (PUT /api/admin/red-packets/:id) ====================
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 1, max: 50 }),
  body('description').optional().trim(),
  body('type').optional().isIn(['fixed', 'random']),
  body('totalAmount').optional().isInt({ min: 100, max: 10000000 }),
  body('totalCount').optional().isInt({ min: 1, max: 10000 }),
  body('minAmount').optional().isInt({ min: 1 }),
], validate,
async (req, res) => {
  try {
    const redPacket = await RedPacket.findById(req.params.id);

    if (!redPacket) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: '红包不存在',
      });
    }

    // 进行中的活动不允许修改基础信息
    if (redPacket.status === 'active') {
      return res.status(403).json({
        code: 403,
        success: false,
        message: '活动进行中无法修改基础信息，仅可调整结束时间或暂停',
      });
    }

    // 只允许更新特定字段
    const allowedFields = ['title', 'description', 'type', 'totalAmount', 'totalCount', 'minAmount'];
    const updateData = {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // 如果更新了总金额或数量，同步更新剩余值
    if (updateData.totalAmount || updateData.totalCount) {
      const newTotal = updateData.totalAmount || redPacket.totalAmount;
      const newCount = updateData.totalCount || redPacket.totalCount;
      
      // 计算已领取的金额和数量
      const claimedCount = redPacket.stats?.claimedCount || 0;
      const claimedAmount = redPacket.stats?.totalAmountSent || 0;
      
      updateData.remainingCount = Math.max(0, newCount - claimedCount);
      updateData.remainingAmount = Math.max(0, newTotal - claimedAmount);
    }

    const updated = await RedPacket.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    res.json({
      code: 200,
      success: true,
      message: '更新成功',
      data: updated,
    });
  } catch (error) {
    console.error('更新红包失败:', error);
    res.status(500).json({
      code: 500,
      success: false,
      message: '服务器内部错误',
    });
  }
}
);

// ==================== 接口 4: 配置触发规则 (PUT /api/admin/red-packets/:id/rules) ====================
router.put('/:id/rules', [
  body('triggerType').isIn(['watch_video', 'complete_task', 'user_level', 'combination']),
  body('requiredDuration').optional().isInt({ min: 1, max: 480 }),
], validate,
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

    // 根据触发类型构建具体配置
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
        summary: this._generateRuleSummary(triggerType, req.body),
        config: updated.triggerConfig,
      },
    });
  } catch (error) {
    console.error('配置触发规则失败:', error);
    res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
  }
}

/**
 * 生成规则摘要文本
 */
_generateRuleSummary(triggerType, data) {
  switch (triggerType) {
    case 'watch_video':
      return `观看商品推荐视频 ≥ ${data.requiredDuration || 30} 分钟`;
    case 'complete_task':
      return `完成任务 (${data.taskTypes?.join(', ') || '全部'})`;
    default:
      return `自定义条件`;
  }
}

// ==================== 接口 5: 配置领取限制 (PUT /api/admin/red-packets/:id/limits) ====================
router.put('/:id/limits', async (req, res) => {
  try {
    const redPacket = await RedPacket.findById(req.params.id);

    if (!redPacket) {
      return res.status(404).json({ code: 404, success: false, message: '红包不存在' });
    }

    if (redPacket.status === 'active') {
      return res.status(403).json({ code: 403, success: false, message: '活动进行中无法修改领取限制' });
    }

    const {
      maxClaimsPerUser = 1,
      dailyLimit = 3,
      weeklyLimit = 10,
      monthlyLimit = 30,
      levelRestrictionEnabled = false,
      vipOnly = false,
      allowedLevels = [],
    } = req.body;

    const claimRulesUpdate = {
      'claimRules.maxClaimsPerUser': maxClaimsPerUser,
      'claimRules.frequencyLimits': {
        daily: dailyLimit,
        weekly: weeklyLimit,
        monthly: monthlyLimit,
      },
      'claimRules.levelRestrictions': {
        enabled: levelRestrictionEnabled,
        allowedLevels: allowedLevels.map(Number),
        vipOnly: vipOnly,
      },
    };

    const updated = await RedPacket.findByIdAndUpdate(
      req.params.id,
      { $set: claimRulesUpdate },
      { new: true }
    );

    const limitParts = [`每人限领 ${maxClaimsPerUser} 次`];
    if (dailyLimit > 0) limitParts.push(`日限 ${dailyLimit}`);
    if (weeklyLimit > 0) limitParts.push(`周限 ${weeklyLimit}`);
    if (monthlyLimit > 0) limitParts.push(`月限 ${monthlyLimit}`);
    if (vipOnly) limitParts.push('仅 VIP');
    if (levelRestrictionEnabled && allowedLevels.length > 0) {
      limitParts.push(`等级限制: ${allowedLevels.join('/')}`);
    }

    res.json({
      code: 200,
      success: true,
      message: '领取限制配置成功',
      data: {
        summary: limitParts.join(' · ') || '无限制',
        rules: updated.claimRules,
      },
    });
  } catch (error) {
    console.error('配置领取限制失败:', error);
    res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
  }
}

// ==================== 接口 6: 发布活动 (PUT /api/admin/red-packets/:id/publish) ====================
router.put('/:id/publish', async (req, res) => {
  try {
    const redPacket = await RedPacket.findById(req.params.id);

    if (!redPacket) {
      return res.status(404).json({ code: 404, success: false, message: '红包不存在' });
    }

    if (redPacket.status !== 'draft') {
      const messages = {
        active: '该红包已经在运行中',
        paused: '该红包已暂停，请先恢复',
        expired: '该红包已过期，无法发布',
        finished: '该红包已结束',
        cancelled: '该红包已取消',
        depleted: '该红包已被抢完',
      };
      return res.status(400).json({
        code: 400,
        success: false,
        message: messages[redPacket.status] || '当前状态无法发布',
      });
    }

    // 验证必要字段是否完整
    if (!redPacket.title || !redPacket.type || !redPacket.totalAmount || !redPacket.totalCount) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '请先完善基本信息后再发布',
      });
    }

    // 设置结束时间
    let endTime = redPacket.endTime;
    if (!endTime && redPacket.validityType) {
      const validityHours = {
        '24h': 24,
        '7d': 168,
        '30d': 720,
        custom: (redPacket.validityDays || 7) * 24,
      };
      endTime = new Date(Date.now() + (validityHours[redPacket.validityType] || 168) * 60 * 60 * 1000);
    }

    // 更新高级设置（如果有）
    const advancedSettings = req.body.advancedSettings || {};

    const updated = await RedPacket.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'active',
          endTime,
          publishedAt: new Date(),
          publishedBy: req.user?._id || req.adminId,
          'advancedSettings.notificationChannels': 
            advancedSettings.notificationChannels || [],
          'advancedSettings.displayStyle': 
            advancedSettings.displayStyle || 'standard',
          'advancedSettings.distributionStrategy': 
            advancedSettings.distributionStrategy || 'even',
          'advancedSettings.maxConcurrentClaims': 
            advancedSettings.maxConcurrentClaims || 100,
        },
      },
      { new: true }
    );

    res.json({
      code: 200,
      success: true,
      message: '红包活动已发布并激活',
      data: {
        _id: updated._id,
        status: updated.status,
        activatedAt: updated.publishedAt,
        endTime: updated.endTime,
      },
    });
  } catch (error) {
    console.error('发布红包失败:', error);
    res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
  }
}

// ==================== 接口 7: 保存草稿 (PUT /api/admin/red-packets/:id/draft) ====================
router.put('/:id/draft', async (req, res) => {
  try {
    const redPacket = await RedPacket.findById(req.params.id);

    if (!redPacket) {
      return res.status(404).json({ code: 404, success: false, message: '红包不存在' });
    }

    // 允许在任何非 active 状态下保存草稿
    if (redPacket.status === 'active') {
      return res.status(403).json({
        code: 403,
        success: false,
        message: '活动进行中无法保存草稿，请先暂停',
      });
    }

    // 合并所有传入的字段
    const allowedFields = [
      'title', 'description', 'type', 'totalAmount', 'totalCount', 'minAmount',
      'validityType', 'validityDays', 'taskType', 'taskConfig',
      'triggerConfig', 'claimRules', 'usageRules', 'advancedSettings'
    ];
    
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
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
      data: updated,
    });
  } catch (error) {
    console.error('保存草稿失败:', error);
    res.status(500).json({ code: 500, success: false, message: '服务器内部错误' });
  }
}

// ==================== 接口 8: 删除红包 (DELETE /api/admin/red-packets/:id) ====================
router.delete('/:id', async (req, res) => {
  try {
    const redPacket = await RedPacket.findById(req.params.id);

    if (!redPacket) {
      return res.status(404).json({ code: 404, success: false, message: '红包不存在' });
    }

    // 进行中和已过期的活动不允许删除
    if (['active', 'paused'].includes(redPacket.status)) {
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
