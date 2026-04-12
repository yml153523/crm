const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const AuditLog = require('../models/AuditLog');

const createRateLimiter = (options = {}) => {
  const config = {
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: options.message || '操作过于频繁，请稍后再试',
        retryAfter: Math.ceil(options.windowMs / 1000)
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json(config.message);
    }
  };

  if (global.redisClient && global.cacheService?.isEnabled) {
    config.store = new RedisStore({
      sendCommand: (...args) => global.redisClient.call(...args),
      prefix: 'rl:'
    });
  }

  return rateLimit(config);
};

const limiters = {
  general: createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  apiLimiter: createRateLimiter({ windowMs: 15 * 60 * 1000, max: 50 }),
  strictLimiter: createRateLimiter({ windowMs: 60 * 1000, max: 5 }),
  claimLimiter: createRateLimiter({ windowMs: 60 * 1000, max: 3, message: '领取过于频繁，请稍后再试' }),
  exportLimiter: createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: '导出次数已达上限，每小时最多5次' }),
  loginLimiter: createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, message: '登录尝试过于频繁，请15分钟后再试' })
};

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  crossOriginEmbedderPolicy: false
});

const sanitizeInput = [
  mongoSanitize(),
  xss(),
  hpp(),
  (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      sanitizeObject(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      sanitizeObject(req.params);
    }
    next();
  }
];

function sanitizeObject(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key].trim();
      if (obj[key].includes('$') || obj[key].includes('{')) {
        delete obj[key];
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

const auditLogger = (options = {}) => async (req, res, next) => {
  const startTime = Date.now();

  const logData = {
    userId: req.user?.id || null,
    userRole: req.user?.role || null,
    action: `${req.method} ${req.path}`,
    resource: options.resource || extractResource(req.path),
    method: req.method,
    path: req.originalUrl,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    requestBody: shouldLogBody(req) ? sanitizeForLogging(req.body) : null,
    statusCode: null,
    responseTime: null,
    success: null,
    errorMessage: null,
    timestamp: new Date()
  };

  res.on('finish', () => {
    logData.statusCode = res.statusCode;
    logData.responseTime = Date.now() - startTime;
    logData.success = res.statusCode >= 200 && res.statusCode < 400;

    if (!logData.success && res.locals?.errorMessage) {
      logData.errorMessage = res.locals.errorMessage;
    }

    saveAuditLog(logData).catch(err => {
      console.error('保存审计日志失败:', err.message);
    });
  });

  next();
};

function extractResource(path) {
  const match = path.match(/^\/api\/(admin|user)\/([\w-]+)/);
  return match ? match[2] : 'unknown';
}

function shouldLogBody(req) {
  const sensitivePaths = ['/login', '/register', '/auth'];
  return !sensitivePaths.some(p => req.path.includes(p));
}

function sanitizeForLogging(body) {
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'cvv'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***';
    }
  });

  if (sanitized.data && typeof sanitized.data === 'string' && sanitized.data.length > 1000) {
    sanitized.data = sanitized.data.substring(0, 1000) + '... [truncated]';
  }

  return sanitized;
}

async function saveAuditLog(logData) {
  try {
    if (global.AuditLogModel) {
      await global.AuditLogModel.create(logData);
    } else {
      console.log('📋 审计日志:', JSON.stringify(logData, null, 2));
    }
  } catch (error) {
    console.error('保存审计日志失败:', error.message);
  }
}

const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '请先登录' }
    });
  }

  if (!req.user.permissions || !req.user.permissions.includes(permission)) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: '您没有权限执行此操作' }
    });
  }

  next();
};

const validateAdminRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '请先登录' }
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: '需要管理员权限' }
    });
  }

  next();
};

module.exports = {
  limiters,
  securityHeaders,
  sanitizeInput,
  auditLogger,
  requirePermission,
  validateAdminRole,
  createRateLimiter
};
