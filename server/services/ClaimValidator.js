/**
 * 领取资格校验引擎
 * 
 * 6步校验流程：
 * 1. 基础状态检查（红包是否存在、状态是否正确、是否还有余额）
 * 2. 幂等性检查（是否已领取）
 * 3. 频率限制检查（日/周/月限领次数）
 * 4. 用户等级检查（VIP限制等）
 * 5. 触发条件验证（观看时长、任务完成等）
 * 6. 并发控制（分布式锁）
 */

const RedPacket = require('../models/RedPacket');
const RedPacketRecord = require('../models/RedPacketRecord');
const ClaimFrequencyLog = require('../models/ClaimFrequencyLog');
const User = require('../models/User');

class ClaimValidator {
  /**
   * 校验用户是否有资格领取指定红包
   * @param {string} userId - 用户ID
   * @param {string} redPacketId - 红包ID
   * @param {Object} taskEvidence - 任务证据（如观看时长等）
   * @returns {Promise<{ eligible: boolean, reason?: string, lockKey?: string }>}
   */
  async validate(userId, redPacketId, taskEvidence = {}) {
    // Step 1: 基础状态检查
    const statusCheck = await this._checkBasicStatus(redPacketId);
    if (!statusCheck.eligible) return statusCheck;

    // Step 2: 幂等性检查（是否已领取）
    const duplicateCheck = await this._checkDuplicateClaim(userId, redPacketId);
    if (!duplicateCheck.eligible) return duplicateCheck;

    // 获取红包详情用于后续校验
    const redPacket = statusCheck.redPacket;

    // Step 3: 频率限制检查
    const frequencyCheck = await this._checkFrequencyLimit(userId, redPacket);
    if (!frequencyCheck.eligible) return frequencyCheck;

    // Step 4: 用户等级检查
    const levelCheck = await this._checkUserLevel(userId, redPacket);
    if (!levelCheck.eligible) return levelCheck;

    // Step 5: 触发条件验证
    const triggerCheck = await this._validateTriggerCondition(userId, redPacket, taskEvidence);
    if (!triggerCheck.eligible) return triggerCheck;

    // Step 6: 并发控制（返回锁信息，由调用方处理）
    return {
      eligible: true,
      lockKey: `lock:redpacket:${redPacketId}`,
      redPacket,
    };
  }

  /**
   * Step 1: 基础状态检查
   * @private
   */
  async _checkBasicStatus(redPacketId) {
    try {
      const redPacket = await RedPacket.findById(redPacketId);

      if (!redPacket) {
        return { eligible: false, reason: '红包活动不存在' };
      }

      // 检查状态
      if (redPacket.status !== 'active') {
        const statusMessages = {
          draft: '该红包尚未开始',
          paused: '该红包已暂停发放',
          expired: '该红包已过期',
          finished: '该红包已结束',
          cancelled: '该红包已取消',
          depleted: '抱歉，该红包已被抢完',
        };
        return {
          eligible: false,
          reason: statusMessages[redPacket.status] || '该红包当前不可领取'
        };
      }

      // 检查时间范围
      const now = new Date();
      if (redPacket.startTime && now < new Date(redPacket.startTime)) {
        return { eligible: false, reason: '该红包尚未开始' };
      }
      if (redPacket.endTime && now > new Date(redPacket.endTime)) {
        return { eligible: false, reason: '该红包已过期' };
      }

      // 检查剩余名额和金额
      if (redPacket.remainingCount <= 0 || redPacket.remainingAmount <= 0) {
        // 更新状态为 depleted
        await RedPacket.findByIdAndUpdate(redPacketId, { status: 'depleted' });
        return { eligible: false, reason: '抱歉，该红包已被抢完' };
      }

      return { eligible: true, redPacket };

    } catch (error) {
      console.error('基础状态检查失败:', error);
      return { eligible: false, reason: '系统错误，请稍后重试' };
    }
  }

  /**
   * Step 2: 幂等性检查 - 是否已领取同一红包
   * @private
   */
  async _checkDuplicateClaim(userId, redPacketId) {
    try {
      const existingRecord = await RedPacketRecord.findOne({
        redPacketId,
        userId,
        status: { $in: ['available', 'used'] },
      });

      if (existingRecord) {
        return { eligible: false, reason: '您已领取过该红包' };
      }

      return { eligible: true };

    } catch (error) {
      console.error('重复领取检查失败:', error);
      return { eligible: false, reason: '系统错误，请稍后重试' };
    }
  }

  /**
   * Step 3: 频率限制检查
   * @private
   */
  async _checkFrequencyLimit(userId, redPacket) {
    try {
      const rules = redPacket.claimRules;
      
      // 如果没有配置频率限制规则，直接通过
      if (!rules || !rules.frequencyLimits) {
        return { eligible: true };
      }

      const { daily, weekly, monthly } = rules.frequencyLimits;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      let log = await ClaimFrequencyLog.findOne(
        { userId, date: { $lte: today } },
        {},
        { sort: { date: -1 } }
      );

      // 如果没有日志记录，创建一个
      if (!log) {
        log = await this._createOrUpdateFrequencyLog(userId, today);
      }

      // 日限领检查
      if (daily && log.dailyCount >= daily) {
        return {
          eligible: false,
          reason: `您今日领取次数已达上限（${daily}次），明天再来吧！`
        };
      }

      // 周限领检查
      if (weekly && log.weeklyCount >= weekly) {
        return {
          eligible: false,
          reason: `您本周领取次数已达上限（${weekly}次）`
        };
      }

      // 月限领检查
      if (monthly && log.monthlyCount >= monthly) {
        return {
          eligible: false,
          reason: `您本月领取次数已达上限（${monthly}次）`
        };
      }

      return { eligible: true };

    } catch (error) {
      console.error('频率限制检查失败:', error);
      // 检查失败时允许继续（降级策略）
      return { eligible: true };
    }
  }

  /**
   * Step 4: 用户等级检查
   * @private
   */
  async _checkUserLevel(userId, redPacket) {
    try {
      const restrictions = redPacket.claimRules?.levelRestrictions;

      // 如果未启用等级限制，直接通过
      if (!restrictions || !restrictions.enabled) {
        return { eligible: true };
      }

      const user = await User.findById(userId).select('level isVip').lean();

      if (!user) {
        return { eligible: false, reason: '用户不存在' };
      }

      // VIP-only 检查
      if (restrictions.vipOnly && !user.isVip) {
        return { eligible: false, reason: '该红包仅限 VIP 用户领取' };
      }

      // 等级列表检查
      if (restrictions.allowedLevels && restrictions.allowedLevels.length > 0) {
        const userLevel = user.level || 1;
        if (!restrictions.allowedLevels.includes(userLevel)) {
          return {
            eligible: false,
            reason: `您的用户等级不符合要求（需要等级：${restrictions.allowedLevels.join('/')}）`
          };
        }
      }

      return { eligible: true };

    } catch (error) {
      console.error('用户等级检查失败:', error);
      // 检查失败时允许继续（降级策略）
      return { eligible: true };
    }
  }

  /**
   * Step 5: 触发条件验证
   * @private
   */
  async _validateTriggerCondition(userId, redPacket, evidence) {
    try {
      const triggerConfig = redPacket.triggerConfig;

      // 如果没有配置触发条件（兼容旧数据），直接通过
      if (!triggerConfig || !triggerConfig.triggerType) {
        return { eligible: true };
      }

      switch (triggerConfig.triggerType) {
        case 'watch_video':
          return this._validateWatchVideo(evidence, triggerConfig.watchVideoConfig);

        case 'complete_task':
          return this._validateTaskCompletion(userId, evidence, triggerConfig.taskConfig);

        case 'combination':
          return this._validateCombination(userId, evidence, triggerConfig);

        default:
          return { eligible: true }; // 未知类型默认通过
      }

    } catch (error) {
      console.error('触发条件验证失败:', error);
      return { eligible: false, reason: '触发条件验证失败' };
    }
  }

  /**
   * 验证视频观看条件
   * @private
   */
  _validateWatchVideo(evidence, config) {
    if (!config || !config.requiredDuration) {
      return { eligible: true }; // 未配置则通过
    }

    const duration = Number(evidence?.videoWatchDuration || evidence?.duration || 0);

    if (duration < config.requiredDuration) {
      return {
        eligible: false,
        reason: `未满足触发条件：视频观看时长不足（需要 ${config.requiredDuration} 分钟，实际 ${duration} 分钟）`
      };
    }

    return { eligible: true };
  }

  /**
   * 验证任务完成条件
   * @private
   */
  async _validateTaskCompletion(userId, evidence, config) {
    if (!config || !config.taskTypes || config.taskTypes.length === 0) {
      return { eligible: true };
    }

    // TODO: 根据实际业务逻辑验证任务完成情况
    // 这里简化为检查 evidence 中是否有 completedTasks 字段
    const completedTasks = evidence?.completedTasks || [];
    
    const requiredCount = config.requiredCount || 1;
    const matchedTasks = completedTasks.filter(t => config.taskTypes.includes(t));

    if (matchedTasks.length < requiredCount) {
      return {
        eligible: false,
        reason: `未满足触发条件：需要完成 ${requiredCount} 个指定任务`
      };
    }

    return { eligible: true };
  }

  /**
   * 验证组合条件
   * @private
   */
  async _validateCombination(userId, evidence, config) {
    // TODO: 实现组合条件的 AND/OR 逻辑验证
    // 简化实现：暂时默认通过
    return { eligible: true };
  }

  /**
   * 创建或更新频率日志
   * @private
   */
  async _createOrUpdateFrequencyLog(userId, date) {
    const now = new Date();
    const getWeekNumber = (d) => {
      const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
      const pastDaysOfYear = Math.floor((d - firstDayOfYear) / 86400000);
      return Math.ceil(pastDaysOfYear / 7);
    };

    const week = `${now.getFullYear()}-W${String(getWeekNumber(now)).padStart(2, '0')}`;
    const month = now.toISOString().slice(0, 7); // YYYY-MM

    const log = await ClaimFrequencyLog.findOneAndUpdate(
      { userId, date },
      {
        $setOnInsert: {
          date,
          week,
          month,
          dailyCount: 0,
          weeklyCount: 0,
          monthlyCount: 0,
          lastClaimedAt: now,
        },
        $inc: { dailyCount: 1 },
      },
      { upsert: true, new: true }
    );

    return log;
  }

  /**
   * 更新频率计数（领取成功后调用）
   */
  async incrementFrequencyCount(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();

      await ClaimFrequencyLog.findOneAndUpdate(
        { userId, date: { $lte: today } },
        {
          $inc: {
            dailyCount: 1,
            weeklyCount: 1,
            monthlyCount: 1,
          },
          $set: { lastClaimedAt: now }
        },
        { sort: { date: -1 }, upsert: true }
      );
    } catch (error) {
      console.error('更新频率计数失败:', error);
    }
  }
}

module.exports = new ClaimValidator();
