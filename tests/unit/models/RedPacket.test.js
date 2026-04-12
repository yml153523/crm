const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const RedPacket = require('../../../server/models/RedPacket');

describe('RedPacket Model', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await RedPacket.deleteMany({});
  });

  describe('Schema 字段验证', () => {
    it('应能创建完整的 RedPacket 记录（所有必填字段）', async () => {
      const packetData = {
        title: '测试红包',
        description: '这是一个测试红包',
        type: 'random',
        totalAmount: 10000,
        totalCount: 100,
        remainingCount: 100,
        remainingAmount: 10000,
        taskType: 'watch_video',
        taskConfig: {
          targetType: 'Video',
          requiredDuration: 30
        },
        status: 'draft'
      };

      const packet = await RedPacket.create(packetData);

      expect(packet).toBeDefined();
      expect(packet.title).toBe('测试红包');
      expect(packet.type).toBe('random');
      expect(packet.totalAmount).toBe(10000);
      expect(packet.totalCount).toBe(100);
      expect(packet.status).toBe('draft');
      expect(packet.createdAt).toBeDefined();
    });

    it('triggerConfig.triggerType 应支持 watch_video/complete_task/user_level/combination 枚举值', async () => {
      const validTypes = ['watch_video', 'complete_task', 'user_level', 'combination'];
      
      for (const triggerType of validTypes) {
        const packet = await RedPacket.create({
          title: `测试-${triggerType}`,
          type: 'random',
          totalAmount: 1000,
          totalCount: 10,
          remainingCount: 10,
          remainingAmount: 1000,
          taskType: 'manual',
          triggerConfig: { triggerType }
        });
        
        expect(packet.triggerConfig.triggerType).toBe(triggerType);
      }
    });

    it('triggerConfig.triggerType 无效值应抛出验证错误', async () => {
      await expect(
        RedPacket.create({
          title: '测试无效触发类型',
          type: 'random',
          totalAmount: 1000,
          totalCount: 10,
          remainingCount: 10,
          remainingAmount: 1000,
          taskType: 'manual',
          triggerConfig: { triggerType: 'invalid_type' }
        })
      ).rejects.toThrow();
    });

    it('claimRules.frequencyLimits 应有正确的默认值 (daily:3, weekly:10, monthly:30)', async () => {
      const packet = await RedPacket.create({
        title: '测试默认频率限制',
        type: 'random',
        totalAmount: 1000,
        totalCount: 10,
        remainingCount: 10,
        remainingAmount: 1000,
        taskType: 'manual',
        claimRules: {}
      });

      expect(packet.claimRules.frequencyLimits.daily).toBe(3);
      expect(packet.claimRules.frequencyLimits.weekly).toBe(10);
      expect(packet.claimRules.frequencyLimits.monthly).toBe(30);
    });
  });

  describe('Status 枚举值验证', () => {
    it('status 应支持 7 种状态（包含 depleted）', async () => {
      const validStatuses = ['draft', 'active', 'paused', 'expired', 'finished', 'cancelled', 'depleted'];
      
      for (const status of validStatuses) {
        const packet = await RedPacket.create({
          title: `测试状态-${status}`,
          type: 'random',
          totalAmount: 1000,
          totalCount: 10,
          remainingCount: 10,
          remainingAmount: 1000,
          taskType: 'manual',
          status
        });
        
        expect(packet.status).toBe(status);
      }
    });

    it('status 无效值应抛出验证错误', async () => {
      await expect(
        RedPacket.create({
          title: '测试无效状态',
          type: 'random',
          totalAmount: 1000,
          totalCount: 10,
          remainingCount: 10,
          remainingAmount: 1000,
          taskType: 'manual',
          status: 'invalid_status'
        })
      ).rejects.toThrow();
    });
  });

  describe('必填字段验证', () => {
    it('缺少 title 字段时应抛出 ValidationError', async () => {
      await expect(
        RedPacket.create({
          type: 'random',
          totalAmount: 1000,
          totalCount: 10,
          remainingCount: 10,
          remainingAmount: 1000,
          taskType: 'manual'
        })
      ).rejects.toThrow();
    });

    it('缺少 type 字段时应抛出 ValidationError', async () => {
      await expect(
        RedPacket.create({
          title: '测试缺少type',
          totalAmount: 1000,
          totalCount: 10,
          remainingCount: 10,
          remainingAmount: 1000,
          taskType: 'manual'
        })
      ).rejects.toThrow();
    });

    it('totalAmount 为负数时应抛出 ValidationError', async () => {
      await expect(
        RedPacket.create({
          title: '测试负金额',
          type: 'random',
          totalAmount: -100,
          totalCount: 10,
          remainingCount: 10,
          remainingAmount: -100,
          taskType: 'manual'
        })
      ).rejects.toThrow();
    });
  });

  describe('新增字段验证', () => {
    it('validityType 应支持 24h/7d/30d/custom 枚举值', async () => {
      const packet = await RedPacket.create({
        title: '测试有效期类型',
        type: 'random',
        totalAmount: 1000,
        totalCount: 10,
        remainingCount: 10,
        remainingAmount: 1000,
        taskType: 'manual',
        validityType: 'custom',
        validityDays: 7
      });

      expect(packet.validityType).toBe('custom');
      expect(packet.validityDays).toBe(7);
    });

    it('minAmount 默认值应为 1（分，即 0.01 元）', async () => {
      const packet = await RedPacket.create({
        title: '测试最小金额默认值',
        type: 'random',
        totalAmount: 1000,
        totalCount: 10,
        remainingCount: 10,
        remainingAmount: 1000,
        taskType: 'manual'
      });

      expect(packet.minAmount).toBe(1);
    });

    it('advancedSettings.notificationChannels 应为数组', async () => {
      const packet = await RedPacket.create({
        title: '测试高级设置',
        type: 'random',
        totalAmount: 1000,
        totalCount: 10,
        remainingCount: 10,
        remainingAmount: 1000,
        taskType: 'manual',
        advancedSettings: {
          notificationChannels: ['app_push', 'sms'],
          displayStyle: 'card_with_animation',
          distributionStrategy: 'even'
        }
      });

      expect(Array.isArray(packet.advancedSettings.notificationChannels)).toBe(true);
      expect(packet.advancedSettings.notificationChannels.length).toBe(2);
    });

    it('stats.rejectedCount 默认值应为 0', async () => {
      const packet = await RedPacket.create({
        title: '测试被拒次数默认值',
        type: 'random',
        totalAmount: 1000,
        totalCount: 10,
        remainingCount: 10,
        remainingAmount: 1000,
        taskType: 'manual'
      });

      expect(packet.stats.rejectedCount).toBeDefined();
      expect(packet.stats.rejectedCount).toBe(0);
    });

    it('stats.totalAmountRefunded 默认值应为 0', async () => {
      const packet = await RedPacket.create({
        title: '测试退款总额默认值',
        type: 'random',
        totalAmount: 1000,
        totalCount: 10,
        remainingCount: 10,
        remainingAmount: 1000,
        taskType: 'manual'
      });

      expect(packet.stats.totalAmountRefunded).toBeDefined();
      expect(packet.stats.totalAmountRefunded).toBe(0);
    });
  });

  describe('索引验证', () => {
    it('应存在复合索引 { status: 1, startTime: 1, endTime: 1 }', async () => {
      const indexes = await RedPacket.collection.getIndexes();
      const indexKeys = Object.keys(indexes);
      
      const hasCompoundIndex = indexKeys.some(key => 
        JSON.stringify(indexes[key].key) === '{"status":1,"startTime":1,"endTime":1}'
      );
      
      expect(hasCompoundIndex).toBe(true);
    });
  });
});
