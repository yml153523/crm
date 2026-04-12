/**
 * 自动发放引擎
 * 
 * 核心流程：
 * 1. 接收触发事件（用户行为达标）
 * 2. 调用 ClaimValidator 校验资格
 * 3. 调用 RandomAmountAlgorithm 生成金额
 * 4. 执行数据库事务（创建记录 + 更新统计）
 * 5. 更新频率日志
 * 6. 发送通知
 * 7. WebSocket 广播
 */

const randomAmount = require('./RandomAmountAlgorithm');
const claimValidator = require('./ClaimValidator');
const RedPacket = require('../models/RedPacket');
const RedPacketRecord = require('../models/RedPacketRecord');

class AutoClaimEngine {
  /**
   * 处理用户触发事件 - 核心入口方法
   * @param {string} userId - 用户ID
   * @param {string} eventType - 事件类型 (video_watch_complete / task_completed)
   * @param {Object} eventData - 事件数据（视频ID、观看时长等）
   * @returns {Promise<{ success: boolean, recordId?: string, amount?: number, reason?: string }>}
   */
  async handleTriggerEvent(userId, eventType, eventData) {
    console.log(`[AutoClaimEngine] 处理事件: userId=${userId}, type=${eventType}`);

    try {
      // Step 1: 查找匹配的活跃红包活动
      const matchingRedPackets = await this._findMatchingRedPackets(eventType, eventData);

      if (matchingRedPackets.length === 0) {
        return { success: false, reason: '未找到匹配的红包活动' };
      }

      // Step 2-6: 对每个匹配的红包尝试发放
      const results = [];
      
      for (const redPacket of matchingRedPackets) {
        const result = await this._processSingleRedPacket(userId, redPacket, eventData);
        results.push(result);
      }

      // 返回第一个成功的结果
      const successResult = results.find(r => r.success);
      if (successResult) {
        return successResult;
      }

      // 所有都失败，返回最后一个失败原因
      return {
        success: false,
        reason: results[results.length - 1]?.reason || '所有红包均无法领取'
      };

    } catch (error) {
      console.error('[AutoClaimEngine] 处理事件失败:', error);
      return { success: false, reason: '系统内部错误' };
    }
  }

  /**
   * 查找匹配的活跃红包
   * @private
   */
  async _findMatchingRedPackets(eventType, eventData) {
    const now = new Date();
    const query = {
      status: 'active',
      startTime: { $lte: now },
      endTime: { $gte: now },
      remainingCount: { $gt: 0 },
      remainingAmount: { $gt: 0 },
    };

    switch (eventType) {
      case 'video_watch_complete':
        query['triggerConfig.triggerType'] = 'watch_video';
        
        // 如果有具体时长数据，可以过滤出满足条件的红包
        if (eventData?.duration || eventData?.videoWatchDuration) {
          const duration = eventData.duration || eventData.videoWatchDuration;
          query['triggerConfig.watchVideoConfig.requiredDuration'] = { $lte: duration };
        }
        break;

      case 'task_completed':
        query['triggerConfig.triggerType'] = 'complete_task';
        break;

      default:
        // 对于未知事件类型，返回所有进行中的红包
        break;
    }

    return await RedPacket.find(query).lean();
  }

  /**
   * 处理单个红包的领取逻辑
   * @private
   */
  async _processSingleRedPacket(userId, redPacket, eventData) {
    try {
      // Step 2: 校验资格
      const validation = await claimValidator.validate(userId, redPacket._id, eventData);

      if (!validation.eligible) {
        // 记录被拒次数
        await RedPacket.findByIdAndUpdate(redPacket._id, {
          $inc: { 'stats.rejectedCount': 1 }
        });
        
        return {
          success: false,
          reason: validation.reason,
          redPacketId: redPacket._id,
        };
      }

      // Step 3: 生成随机金额
      let amount;
      try {
        amount = randomAmount.generateSingleAmount(
          redPacket.remainingAmount,
          redPacket.remainingCount,
          redPacket.minAmount || 1
        );
      } catch (error) {
        console.error('随机金额生成失败:', error);
        return {
          success: false,
          reason: '金额分配失败：' + error.message,
          redPacketId: redPacket._id,
        };
      }

      // Step 4: 执行数据库事务
      const session = await RedPacket.startSession();

      try {
        await session.withTransaction(async () => {
          // 4.1 创建领取记录
          const record = await RedPacketRecord.create([{
            redPacketId: redPacket._id,
            userId,
            amount,
            status: 'available',
            taskCompletedAt: new Date(),
            taskEvidence: eventData,
            expiresAt: this._calculateExpiry(redPacket),
            antiAbuseInfo: this._extractAntiAbuseInfo(eventData),
            createdAt: new Date(),
          }], { session });

          // 4.2 更新红包统计
          await RedPacket.findByIdAndUpdate(
            redPacket._id,
            {
              $inc: {
                remainingCount: -1,
                remainingAmount: -amount,
                'stats.sentCount': 1,
                'stats.claimedCount': 1,
                'stats.totalAmountSent': amount,
              }
            },
            { session }
          );

          // 4.3 更新频率日志
          await claimValidator.incrementFrequencyCount(userId);

          // 4.4 检查是否领完
          if (redPacket.remainingCount <= 1) {
            await RedPacket.findByIdAndUpdate(
              redPacket._id,
              { status: 'depleted' },
              { session }
            );
          }
        });

        // Step 5: 发送通知（异步，不阻塞主流程）
        this._sendNotification(userId, amount, redPacket.title).catch(err => 
          console.error('发送通知失败:', err)
        );

        // Step 6: WebSocket 广播（异步）
        this._broadcastClaimEvent({
          redPacketId: redPacket._id,
          userId,
          userName: `用户${userId.slice(-4)}`,
          amount,
          timestamp: new Date().toISOString(),
        }).catch(err =>
          console.error('WebSocket广播失败:', err)
        );

        return {
          success: true,
          recordId: record[0]?._id,
          amount,
          redPacketId: redPacket._id,
        };

      } finally {
        await session.endSession();
      }

    } catch (error) {
      console.error(`[AutoClaimEngine] 处理红包 ${redPacket._id} 失败:`, error);

      // 记录被拒次数
      try {
        await RedPacket.findByIdAndUpdate(redPacket._id, {
          $inc: { 'stats.rejectedCount': 1 }
        });
      } catch (e) {
        // 忽略更新失败
      }

      return {
        success: false,
        reason: '领取处理失败',
        redPacketId: redPacket._id,
        error: error.message,
      };
    }
  }

  /**
   * 计算过期时间
   * @private
   */
  _calculateExpiry(redPacket) {
    const claimExpiryDays = redPacket.usageRules?.expireAfterClaim || 30;
    return new Date(Date.now() + claimExpiryDays * 24 * 60 * 60 * 1000);
  }

  /**
   * 提取反作弊信息
   * @private
   */
  _extractAntiAbuseInfo(requestData) {
    return {
      ipAddress: requestData?.ip || requestData?.ipAddress || '',
      deviceFingerprint: requestData?.deviceFingerprint || '',
      userAgent: requestData?.userAgent || '',
      claimLatency: Date.now() - (requestData?.triggerTime ? new Date(requestData.triggerTime).getTime() : Date.now()),
    };
  }

  /**
   * 发送通知（模拟实现）
   * @private
   */
  async _sendNotification(userId, amount, title) {
    // TODO: 集成实际的通知服务（短信/App推送/邮件等）
    console.log(`[Notification] 用户 ${userId} 领取了红包「${title}」，金额 ¥${(amount / 100).toFixed(2)}`);
    
    // 模拟返回成功
    return true;
  }

  /**
   * WebSocket 广播（模拟实现）
   * @private
   */
  async _broadcastClaimEvent(eventData) {
    // TODO: 集成实际的 WebSocket 服务
    console.log(`[WebSocket Broadcast]`, JSON.stringify(eventData));
    
    // 可以将消息存入 Redis，供 WebSocket 服务消费
    // 或者直接调用 WebSocketService.broadcastClaimEvent()
    return true;
  }

  /**
   * 批量检查并发放（定时任务调用）
   * 用于兜底机制：扫描符合条件的用户自动发放
   * @param {Array} userEvents - 用户事件数组 [{ userId, eventType, eventData }]
   * @returns {Promise<Object>} 处理结果汇总
   */
  async batchProcess(userEvents) {
    const results = {
      total: userEvents.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const event of userEvents) {
      try {
        const result = await this.handleTriggerEvent(
          event.userId,
          event.eventType,
          event.eventData
        );
        
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({ userId: event.userId, reason: result.reason });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ userId: event.userId, reason: error.message });
      }
    }

    return results;
  }
}

module.exports = new AutoClaimEngine();
