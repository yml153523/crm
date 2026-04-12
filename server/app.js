const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { limiters, securityHeaders, sanitizeInput, auditLogger, validateAdminRole } = require('./middleware/security');
const CacheService = require('./services/CacheService');
const WebSocketService = require('./services/WebSocketService');
const RedPacketScheduler = require('./schedulers/RedPacketScheduler');

const adminRedPacketsRouter = require('./routes/admin-red-packets');
const adminRedPacketsListRouter = require('./routes/admin-red-packets-list');
const adminRedPacketsStatsRouter = require('./routes/admin-red-packets-stats');
const adminRedPacketsExportRouter = require('./routes/admin-red-packets-export');
const userRedPacketsRouter = require('./routes/user-red-packets');

class RedPacketApp {
  constructor() {
    this.app = express();
    this.server = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      console.warn('应用已初始化');
      return;
    }

    console.log('🚀 正在初始化红包管理系统...');

    try {
      await this.connectDatabase();
      await this.initializeCache();
      this.setupMiddleware();
      this.setupRoutes();
      this.setupErrorHandling();
      this.createServer();
      this.initializeWebSocket();
      this.startSchedulers();

      this.isInitialized = true;
      console.log('✅ 红包管理系统初始化完成\n');
    } catch (error) {
      console.error('❌ 应用初始化失败:', error);
      throw error;
    }
  }

  async connectDatabase() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';
    
    try {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      });

      console.log('✅ MongoDB连接成功');
      
      global.AuditLogModel = require('./models/AuditLog');
    } catch (error) {
      console.error('❌ MongoDB连接失败:', error.message);
      throw error;
    }
  }

  async initializeCache() {
    const cacheEnabled = await CacheService.initialize({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD
    });
    
    if (cacheEnabled) {
      console.log('✅ Redis缓存服务已启用');
    } else {
      console.log('⚠️ Redis未连接，将使用无缓存模式');
    }
  }

  setupMiddleware() {
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
    }));

    this.app.use(securityHeaders);
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(sanitizeInput);

    if (process.env.NODE_ENV === 'development') {
      this.app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
        next();
      });
    }

    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'red-packet-management',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
  }

  setupRoutes() {
    this.app.use('/api/admin/red-packets', 
      limiters.apiLimiter,
      auditLogger({ resource: 'red_packet' }),
      adminRedPacketsRouter
    );

    this.app.use('/api/admin/red-packets/list',
      limiters.apiLimiter,
      adminRedPacketsListRouter
    );

    this.app.use('/api/admin/red-packets/stats',
      limiters.apiLimiter,
      adminRedPacketsStatsRouter
    );

    this.app.use('/api/admin/red-packets/export',
      limiters.exportLimiter,
      auditLogger({ resource: 'export' }),
      adminRedPacketsExportRouter
    );

    this.app.use('/api/user/red-packets',
      limiters.claimLimiter,
      userRedPacketsRouter
    );
  }

  setupErrorHandling() {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  createServer() {
    this.server = http.createServer(this.app);
  }

  initializeWebSocket() {
    WebSocketService.initialize(this.server);
  }

  startSchedulers() {
    RedPacketScheduler.start();
  }

  start(port = process.env.PORT || 3001) {
    return new Promise((resolve, reject) => {
      this.server.listen(port, () => {
        console.log(`
╔════════════════════════════════════════════╗
║     🧧 红包管理系统已启动                   ║
║                                            ║
║   本地访问: http://localhost:${port}          ║
║   API文档: /api/admin/red-packets           ║
║   WebSocket: ws://localhost:${port}/ws/red-packets ║
║                                            ║
║   环境: ${process.env.NODE_ENV || 'development'}                        ║
║   时间: ${new Date().toLocaleString('zh-CN')}            ║
╚════════════════════════════════════════════╝
        `);

        resolve(port);
      });

      this.server.on('error', (error) => {
        console.error('❌ 服务器启动失败:', error.message);
        reject(error);
      });
    });
  }

  async shutdown() {
    console.log('\n🛑 正在关闭红包管理系统...');

    RedPacketScheduler.stop();
    WebSocketService.shutdown();

    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }

    await CacheService.shutdown();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    console.log('✅ 红包管理系统已安全关闭');
    this.isInitialized = false;
  }
}

module.exports = new RedPacketApp();
