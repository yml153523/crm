const errorHandler = (err, req, res, next) => {
  console.error('❌ 错误详情:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  let statusCode = err.statusCode || err.status || 500;
  let errorCode = err.errorCode || 'INTERNAL_ERROR';
  let message = err.message || '服务器内部错误';
  let details = null;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    details = err.errors || err.details;
    if (Array.isArray(details)) {
      message = '参数验证失败';
    }
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = 'ID格式错误';
  } else if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue)?.[0] || '未知字段';
    message = `${field}已存在`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = '无效的认证令牌';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = '认证令牌已过期';
  } else if (message.includes('not found') || message.includes('不存在')) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
  }

  const isDevelopment = process.env.NODE_ENV === 'development';

  const response = {
    success: false,
    error: {
      code: errorCode,
      message: isDevelopment ? message : getFriendlyMessage(errorCode),
      ...(details && { details }),
      ...(isDevelopment && { stack: err.stack }),
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || generateRequestId()
    }
  };

  res.status(statusCode).json(response);

  if (statusCode >= 500) {
    logCriticalError(err, req, response);
    logErrorToAudit(err, req, response);
  }
};

async function logErrorToAudit(err, req, response) {
  try {
    const AuditLog = require('../models/AuditLog');
    
    const auditLogData = {
      action: `ERROR ${req.method} ${req.path}`,
      resource: 'system_error',
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.id || null,
      userRole: req.user?.role || null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestBody: shouldLogErrorBody(req) ? sanitizeForAudit(req.body) : null,
      statusCode: response.status || 500,
      responseTime: 0,
      success: false,
      errorMessage: err.message,
      timestamp: new Date()
    };

    await AuditLog.create(auditLogData);
  } catch (error) {
    console.error('保存错误审计日志失败:', error.message);
  }
}

function shouldLogErrorBody(req) {
  const sensitivePaths = ['/login', '/register', '/auth'];
  return !sensitivePaths.some(p => req.path.includes(p));
}

function sanitizeForAudit(body) {
  if (!body || typeof body !== 'object') return undefined;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'cvv'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***';
    }
  });

  return sanitized;
}

function getFriendlyMessage(errorCode) {
  const messages = {
    'VALIDATION_ERROR': '请求参数有误，请检查后重试',
    'INVALID_ID': '请求的资源ID格式不正确',
    'DUPLICATE_KEY': '数据已存在，请勿重复操作',
    'INVALID_TOKEN': '登录状态失效，请重新登录',
    'TOKEN_EXPIRED': '登录已过期，请重新登录',
    'NOT_FOUND': '请求的资源不存在',
    'UNAUTHORIZED': '您没有权限执行此操作',
    'FORBIDDEN': '访问被拒绝',
    'RATE_LIMITED': '操作过于频繁，请稍后再试',
    'INTERNAL_ERROR': '服务器繁忙，请稍后重试',
    'DATABASE_ERROR': '数据库操作失败',
    'SERVICE_UNAVAILABLE': '服务暂时不可用'
  };
  return messages[errorCode] || '操作失败，请稍后重试';
}

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function logCriticalError(err, req, response) {
  console.error('🚨 严重错误报告:', {
    error: err.message,
    stack: err.stack,
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      ip: req.ip
    },
    response: {
      status: response.status || 500,
      errorCode: response.error?.code
    },
    timestamp: new Date().toISOString()
  });
}

const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `接口 ${req.method} ${req.path} 不存在`,
      timestamp: new Date().toISOString()
    }
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const validateRequest = (validations) => async (req, res, next) => {
  for (const validation of validations) {
    const result = await validation.run(req);
    if (!result.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '参数验证失败',
          details: result.array().map(err => ({
            field: err.param,
            value: err.value,
            message: err.msg
          })),
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  next();
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validateRequest
};
