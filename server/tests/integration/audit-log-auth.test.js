const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const AuditLog = require('../../models/AuditLog');

let app;

beforeAll(() => {
  const express = require('express');
  app = express();
  app.use(express.json());

  const auditLogRouter = require('../../routes/auditLog');
  app.use('/api/audit-logs', auditLogRouter);
});

describe('审计日志 API 权限控制测试', () => {
  
  let adminToken;
  let userToken;

  beforeEach(async () => {
    await AuditLog.deleteMany({});
    await User.deleteMany({});

    const bcrypt = require('bcryptjs');
    
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      phone: 'admin',
      password: adminPassword,
      name: '管理员',
      role: 'admin',
      isActive: true
    });

    const userPassword = await bcrypt.hash('user123', 10);
    const user = await User.create({
      phone: 'user',
      password: userPassword,
      name: '普通用户',
      role: 'user',
      isActive: true
    });

    const JWT_SECRET = process.env.JWT_SECRET || 'crm-secret-key-2026';
    adminToken = jwt.sign({ id: admin._id, phone: admin.phone, role: admin.role }, JWT_SECRET, { expiresIn: '7d' });
    userToken = jwt.sign({ id: user._id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  });

  describe('未认证访问 (应返回401)', () => {

    it('GET / - 无Token应返回401', async () => {
      const res = await request(app).get('/api/audit-logs');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('POST /export - 无Token应返回401', async () => {
      const res = await request(app)
        .post('/api/audit-logs/export')
        .send({});
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('DELETE /cleanup - 无Token应返回401', async () => {
      const res = await request(app)
        .delete('/api/audit-logs/cleanup')
        .send({ beforeDate: '2020-01-01' });
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('无效Token测试', () => {

    it('使用伪造Token应返回401', async () => {
      const fakeToken = 'fake.token.here';
      
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${fakeToken}`);
      
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('普通用户权限测试', () => {

    it('普通用户可以查询日志列表', async () => {
      await AuditLog.create({
        action: 'TEST',
        path: '/test',
        resource: 'test',
        success: true
      });

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logs).toBeDefined();
    });

    it('普通用户导出日志应返回403', async () => {
      const res = await request(app)
        .post('/api/audit-logs/export')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});
      
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('普通用户清理日志应返回403', async () => {
      const res = await request(app)
        .delete('/api/audit-logs/cleanup')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ beforeDate: '2020-01-01' });
      
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('管理员权限测试', () => {

    it('管理员可以导出日志', async () => {
      await AuditLog.create({
        action: 'TEST EXPORT',
        path: '/export',
        resource: 'test',
        success: true
      });

      const res = await request(app)
        .post('/api/audit-logs/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });

    it('管理员清理日志应返回403（非超级管理员）', async () => {
      const res = await request(app)
        .delete('/api/audit-logs/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ beforeDate: '2020-01-01' });
      
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
