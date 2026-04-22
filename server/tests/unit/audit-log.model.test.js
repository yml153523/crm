const mongoose = require('mongoose');
const AuditLog = require('../../models/AuditLog');

describe('AuditLog 模型单元测试', () => {

  beforeEach(async () => {
    await AuditLog.deleteMany({});
  });

  describe('Schema 验证', () => {

    it('应成功创建完整的审计日志', async () => {
      const log = await AuditLog.create({
        action: 'POST /api/test',
        resource: 'test',
        method: 'POST',
        path: '/api/test',
        userId: new mongoose.Types.ObjectId(),
        userRole: 'admin',
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent/1.0',
        requestBody: { key: 'value' },
        statusCode: 201,
        responseTime: 45,
        success: true,
        errorMessage: null
      });

      expect(log).toBeDefined();
      expect(log.action).toBe('POST /api/test');
      expect(log.resource).toBe('test');
      expect(log.success).toBe(true);
      expect(log.statusCode).toBe(201);
      expect(log.responseTime).toBe(45);
    });

    it('应自动设置默认值', async () => {
      const log = await AuditLog.create({
        action: 'TEST',
        path: '/test',
        resource: 'test'
      });

      expect(log.timestamp).toBeDefined();
      expect(log.success).toBe(false); // 默认值
    });
  });

  describe('查询功能', () => {

    beforeEach(async () => {
      const now = new Date();
      
      await AuditLog.insertMany([
        { action: 'LOGIN', path: '/login', resource: 'auth', success: true, timestamp: now },
        { action: 'LOGIN', path: '/login', resource: 'auth', success: false, timestamp: now },
        { action: 'CREATE', path: '/create', resource: 'data', success: true, timestamp: now },
        { action: 'DELETE', path: '/delete', resource: 'data', success: false, timestamp: now }
      ]);
    });

    it('应正确统计成功/失败数量', async () => {
      const successCount = await AuditLog.countDocuments({ success: true });
      const failCount = await AuditLog.countDocuments({ success: false });

      expect(successCount).toBe(2);
      expect(failCount).toBe(2);
    });

    it('应按操作类型筛选', async () => {
      const loginLogs = await AuditLog.find({ action: 'LOGIN' });

      expect(loginLogs.length).toBe(2);
    });

    it('应按时间范围查询', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const todayLogs = await AuditLog.find({
        timestamp: { $gte: yesterday }
      });

      expect(todayLogs.length).toBe(4);
    });
  });

  describe('静态方法', () => {

    it('getStats() 应返回正确的统计信息', async () => {
      const now = new Date();
      
      await AuditLog.insertMany([
        { action: 'TEST', path: '/test', resource: 'test', success: true, responseTime: 10, timestamp: now },
        { action: 'TEST', path: '/test', resource: 'test', success: false, responseTime: 50, timestamp: now },
        { action: 'TEST', path: '/test', resource: 'test', success: true, responseTime: 20, timestamp: now }
      ]);

      const stats = await AuditLog.getStats();
      const stat = stats[0]; // aggregate returns array

      expect(stat.totalRequests).toBe(3);
      expect(stat.successfulRequests).toBe(2);
      expect(stat.failedRequests).toBe(1);
    });
  });
});
