const express = require('express')
const router = express.Router()
const {
  getConfig,
  getPermissionTree,
  getMenuForRole,
  getUserRolePermissions,
  getRoles,
  hasPermission,
  getPermissionByCode
} = require('../config/config-loader')
const { authenticateToken } = require('../middleware/auth')

router.get('/', authenticateToken, (req, res) => {
  try {
    const userRole = req.user.role || 'user'
    const permissionTree = getPermissionTree(userRole)
    const roles = getRoles()
    const userPermissions = getUserRolePermissions(userRole)
    
    res.json({
      success: true,
      data: {
        version: getConfig().version,
        userRole,
        userPermissions,
        userPermissionsCount: userPermissions.length,
        permissionTree,
        roles: Object.fromEntries(
          Object.entries(roles).map(([key, value]) => [key, {
            name: value.name,
            code: value.code,
            permissionCount: value.permissions.length
          }])
        )
      }
    })
    
  } catch (error) {
    console.error('[Permission API] 获取权限配置失败:', error)
    res.status(500).json({
      success: false,
      message: '获取权限配置失败'
    })
  }
})

router.get('/menu/:role', authenticateToken, (req, res) => {
  try {
    const { role } = req.params
    const menu = getMenuForRole(role)
    
    res.json({
      success: true,
      data: {
        role,
        menuCount: menu.length,
        menu
      }
    })
    
  } catch (error) {
    console.error('[Permission API] 获取菜单失败:', error)
    res.status(500).json({
      success: false,
      message: '获取菜单失败'
    })
  }
})

router.get('/check/:code', authenticateToken, (req, res) => {
  try {
    const { code } = req.params
    const userRole = req.user.role || 'user'
    
    const permitted = hasPermission(getUserRolePermissions(userRole), code)
    const permInfo = getPermissionByCode(code)
    
    if (!permInfo && !code.startsWith('10') && !code.startsWith('101') && !code.startsWith('102') && !code.startsWith('103')) {
      return res.status(404).json({
        success: false,
        message: `权限码 ${code} 不存在`
      })
    }
    
    res.json({
      success: true,
      data: {
        code,
        hasAccess: permitted,
        permission: permInfo ? {
          name: permInfo.name,
          description: permInfo.description,
          apiPath: permInfo.apiPath,
          method: permInfo.method,
          url: permInfo.url,
          parent: permInfo.parent,
          level: permInfo.level
        } : { name: '未知权限' }
      }
    })
    
  } catch (error) {
    console.error('[Permission API] 权限检查失败:', error)
    res.status(500).json({
      success: false,
      message: '权限检查失败'
    })
  }
})

router.get('/debug/:role', authenticateToken, (req, res) => {
  try {
    const { role } = req.params
    const expandedPerms = getUserRolePermissions(role)
    const roleConfig = getRoles()[role]
    
    res.json({
      success: true,
      data: {
        role,
        rawPermissions: roleConfig?.permissions || [],
        expandedPermissions: expandedPerms,
        totalExpandedCount: expandedPerms.length
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
