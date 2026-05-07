const { getPermissionByApiPath, hasPermission, getUserRolePermissions } = require('../config/config-loader')

function requirePermission(permissionCode) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '请先登录'
          }
        })
      }
      
      const userRole = req.user.role || 'user'
      const userPermissions = getUserRolePermissions(userRole)
      
      if (hasPermission(userPermissions, permissionCode)) {
        req.permission = {
          code: permissionCode,
          granted: true
        }
        return next()
      }
      
      console.warn(`[Permission] 权限拒绝: 用户=${req.user.phone || req.user._id}, 角色=${userRole}, 需要=${permissionCode}`)
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '您没有权限执行此操作',
          requiredPermission: permissionCode
        }
      })
      
    } catch (error) {
      console.error('[Permission] 权限检查异常:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'PERMISSION_ERROR',
          message: '权限验证服务异常'
        }
      })
    }
  }
}

function checkApiPermission(req, res, next) {
  try {
    const method = req.method
    const originalUrl = req.originalUrl || req.url
    
    const permission = getPermissionByApiPath(originalUrl.split('?')[0], method)
    
    if (!permission || permission.isPublic) {
      return next()
    }
    
    if (!permission.permissionCode) {
      return next()
    }
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '需要认证'
        }
      })
    }
    
    const userRole = req.user.role || 'user'
    const userPermissions = getUserRolePermissions(userRole)
    
    if (hasPermission(userPermissions, permission.permissionCode)) {
      req.permission = {
        code: permission.permissionCode,
        name: permission.name
      }
      return next()
    }
    
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: `缺少权限: ${permission.description || permission.name}`,
        requiredPermission: permission.permissionCode
      }
    })
    
  } catch (error) {
    next()
  }
}

function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles]
  
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '请先登录'
          }
        })
      }
      
      const userRole = req.user.role || 'user'
      
      if (allowedRoles.includes(userRole) || allowedRoles.includes('*')) {
        return next()
      }
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `角色限制: 需要${allowedRoles.join('或')}权限`,
          allowedRoles
        }
      })
      
    } catch (error) {
      console.error('[Role] 角色检查异常:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'ROLE_CHECK_ERROR',
          message: '角色验证服务异常'
        }
      })
    }
  }
}

module.exports = {
  requirePermission,
  checkApiPermission,
  requireRole
}
