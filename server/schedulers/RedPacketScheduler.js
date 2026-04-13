const cron = require('node-cron');
const RedPacket = require('../models/RedPacket');
const RedPacketRecord = require('../models/RedPacketRecord');
const ExportService = require('../services/ExportService');
const WebSocketService = require('../services/WebSocketService');

class RedPacketScheduler {
  constructor() {
    this.scheduledTasks = new Map();
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.warn('定时任务调度器已在运行');
      return;
    }

    this.scheduleExpiredPacketHandler();
    this.scheduleStatsCacheRefresh();
    this.scheduleExportCleanup();

    this.isRunning = true;
    console.log('✅ 红包定时任务调度器已启动');
  }

  stop() {
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      console.log(`⏹ 停止任务: ${name}`);
    });
    this.scheduledTasks.clear();
    this.isRunning = false;
    console.log('⏹ 红包定时任务调度器已停止');
  }

  scheduleExpiredPacketHandler() {
    const task = cron.schedule('0 * * * *', async () => {
      await this.handleExpiredPackets();
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });

    this.scheduledTasks.set('expired_packet_handler', task);
    console.log('📅 已注册: 过期红包处理 (每小时执行)');
  }

  async handleExpiredPackets() {
    try {
      const now = new Date();
      console.log(`🔄 开始处理过期红包... (${now.toLocaleString('zh-CN')})`);

      const expiredPackets = await RedPacket.find({
        status: { $in: ['active', 'paused'] },
        endTime: { $lte: now }
      }).select('_id title status remainingCount remainingAmount');

      if (expiredPackets.length === 0) {
        console.log('✅ 没有过期红包需要处理');
        return;
      }

      console.log(`📋 发现 ${expiredPackets.length} 个过期红包`);

      for (const packet of expiredPackets) {
        try {
          await this.processSingleExpiredPacket(packet);
        } catch (error) {
          console.error(`处理过期红包失败 (${packet._id}):`, error.message);
        }
      }

      console.log(`✅ 过期红包处理完成，共处理 ${expiredPackets.length} 个`);
    } catch (error) {
      console.error('批量处理过期红包失败:', error);
    }
  }

  async processSingleExpiredPacket(packet) {
    const session = await RedPacket.startSession();
    session.startTransaction();

    try {
      const oldStatus = packet.status;

      await RedPacket.updateOne(
        { _id: packet._id, status: { $in: ['active', 'paused'] } },
        {
          $set: {
            status: 'expired',
            updatedAt: new Date()
          },
          $inc: {
            'stats.expiredCount': 1
          }
        },
        { session }
      );

      await RedPacketRecord.updateMany(
        {
          redPacketId: packet._id,
          status: 'available'
        },
        {
          $set: {
            status: 'expired',
            expiresAt: new Date()
          }
        },
        { session }
      );

      if (packet.remainingCount > 0 && packet.remainingAmount > 0) {
        await RedPacket.updateOne(
          { _id: packet._id },
          {
            $inc: {
              totalAmountRefunded: packet.remainingAmount
            }
          },
          { session }
        );
      }

      await session.commitTransaction();

      console.log(`📦 红包已过期: ${packet.title} (${packet._id})`);

      if (WebSocketService.wss) {
        await WebSocketService.broadcastRedPacketStatusChange(
          packet._id,
          oldStatus,
          'expired'
        );
      }

      return true;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  scheduleStatsCacheRefresh() {
    const task = cron.schedule('*/5 * * * *', async () => {
      await this.refreshStatsCache();
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });

    this.scheduledTasks.set('stats_cache_refresh', task);
    console.log('📊 已注册: 统计缓存刷新 (每5分钟)');
  }

  async refreshStatsCache() {
    try {
      const cacheKey = 'red_packet_dashboard_stats';
      const [dashboardData, activeCount] = await Promise.all([
        RedPacket.aggregate([
          {
            $group: {
              _id: null,
              totalCount: { $sum: 1 },
              totalBudget: { $sum: '$totalAmount' },
              totalSent: { $sum: '$claimedCount' },
              totalRemaining: { $sum: '$remainingCount' },
              activePackets: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }
            }
          }
        ]),
        RedPacket.countDocuments({ status: 'active' })
      ]);

      const stats = dashboardData[0] || {};
      const cachedData = {
        ...stats,
        activeCount,
        cachedAt: new Date(),
        ttl: 300
      };

      if (global.redisClient) {
        await global.redisClient.setex(cacheKey, 300, JSON.stringify(cachedData));
      }

      global.redPacketStatsCache = cachedData;
    } catch (error) {
      console.error('刷新统计缓存失败:', error);
    }
  }

  scheduleExportCleanup() {
    const task = cron.schedule('0 2 * * *', async () => {
      await ExportService.cleanupExpiredExports();
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });

    this.scheduledTasks.set('export_cleanup', task);
    console.log('🧹 已注册: 过期导出清理 (每天凌晨2点)');
  }

  getScheduledTasksInfo() {
    const tasks = [];
    this.scheduledTasks.forEach((task, name) => {
      tasks.push({
        name,
        status: task.getStatus ? 'running' : 'unknown',
        registered: true
      });
    });
    return tasks;
  }

  async runTaskNow(taskName) {
    switch (taskName) {
      case 'expired_packet_handler':
        await this.handleExpiredPackets();
        break;
      case 'stats_cache_refresh':
        await this.refreshStatsCache();
        break;
      case 'export_cleanup':
        await ExportService.cleanupExpiredExports();
        break;
      default:
        throw new Error(`未知任务: ${taskName}`);
    }
  }
}

module.exports = new RedPacketScheduler();
