const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'crm-secret-key-2026';

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '缺少认证令牌' }
      });
    }

    // 开发模式：支持 demo-token 格式（前端演示模式使用）
    if (token.startsWith('demo-token-')) {
      const demoRole = token.includes('admin') ? 'admin' : 'user';
      req.user = {
        _id: 'demo-user-id',
        phone: 'demo',
        username: 'demo',
        role: demoRole,
        name: '演示用户',
        isActive: true
      };
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password').lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '用户不存在或令牌无效' }
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '账户已被禁用' }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: '认证令牌已过期' }
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: '无效的认证令牌' }
      });
    }

    console.error('认证中间件错误:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: '认证服务异常' }
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password').lean();
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // 忽略错误，继续作为未登录用户处理
      }
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};
