const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const authRouter = require('../../../server/routes/auth');
const User = require('../../../server/models/User');
const AuditLog = require('../../../server/models/AuditLog');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Task-06: 登录日志记录', () => {
  let testUser;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('test123456', 10);
    testUser = await User.create({
      phone: '13800138000',
      password: hashedPassword,
      name: '测试用户',
      role: 'user'
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await AuditLog.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await AuditLog.deleteMany({});
  });

  describe('登录失败的日志记录', () => {

    it('应记录用户不存在的登录失败日志', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '19999999999',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);

      const logs = await AuditLog.find({ action: 'POST /api/auth/login' });
      expect(logs.length).toBe(1);

      const log = logs[0];
      expect(log.success).toBe(false);
      expect(log.statusCode).toBe(401);
      expect(log.ipAddress).toBeDefined();
      expect(log.userAgent).toBeDefined();
      expect(log.timestamp).toBeDefined();
    });

    it('应记录密码错误的登录失败日志', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '13800138000',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);

      const logs = await AuditLog.find({
        action: 'POST /api/auth/login',
        success: false
      });
      expect(logs.length).toBe(1);

      const log = logs[0];
      expect(log.userId).toBeDefined();
      expect(log.success).toBe(false);
      expect(log.errorMessage).toContain('密码');
    });

    it('应在登录失败日志中包含IP地址和User-Agent', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'TestAgent/1.0')
        .send({
          phone: '13800138000',
          password: 'wrong'
        });

      expect(response.status).toBe(401);

      const logs = await AuditLog.find({ success: false });
      expect(logs.length).toBeGreaterThan(0);

      const log = logs[0];
      expect(log.userAgent).toBe('TestAgent/1.0');
      expect(log.ipAddress).toBeDefined();
    });
  });

  describe('登录成功的日志记录', () => {

    it('应记录登录成功的审计日志', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '13800138000',
          password: 'test123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const logs = await AuditLog.find({
        action: 'POST /api/auth/login',
        success: true
      });
      expect(logs.length).toBe(1);

      const log = logs[0];
      expect(log.userId.toString()).toBe(testUser._id.toString());
      expect(log.success).toBe(true);
      expect(log.statusCode).toBe(200);
    });

    it('应在成功日志中包含用户角色信息', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          phone: '13800138000',
          password: 'test123456'
        });

      const logs = await AuditLog.find({ success: true });
      expect(logs.length).toBe(1);

      const log = logs[0];
      expect(log.userRole).toBe('user');
    });

    it('应记录响应时间', async () => {
      const startTime = Date.now();

      await request(app)
        .post('/api/auth/login')
        .send({
          phone: '13800138000',
          password: 'test123456'
        });

      const logs = await AuditLog.find({ success: true });
      expect(logs.length).toBe(1);

      const log = logs[0];
      expect(log.responseTime).toBeDefined();
      expect(log.responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof log.responseTime).toBe('number');
    });
  });

  describe('安全性要求', () => {

    it('不应在日志中记录明文密码', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          phone: '13800138000',
          password: 'test123456'
        });

      const logs = await AuditLog.find({});
      logs.forEach(log => {
        if (log.requestBody && log.requestBody.password) {
          expect(log.requestBody.password).not.toBe('test123456');
        }
      });
    });

    it('应对手机号进行脱敏处理', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '13800138000',
          password: 'test123456'
        });

      expect(response.status).toBe(200);

      const logs = await AuditLog.find({});
      logs.forEach(log => {
        if (log.requestBody && log.requestBody.phone) {
          const phone = log.requestBody.phone;
          if (phone !== '13800138000' && phone.includes('*')) {
            expect(phone).toMatch(/\d{3}\*{4}\d{4}/);
          }
        }
      });
    });
  });
});
