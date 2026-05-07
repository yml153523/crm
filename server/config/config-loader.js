const fs = require('fs')
const path = require('path')

let configCache = null
let configLastModified = null

function loadConfig() {
  const configPath = path.join(__dirname, 'permissions.json')
  
  try {
    const stats = fs.statSync(configPath)
    
    if (configCache && configLastModified === stats.mtimeMs) {
      return configCache
    }
    
    const rawData = fs.readFileSync(configPath, 'utf8')
    configCache = JSON.parse(rawData)
    configLastModified = stats.mtimeMs
    
    return configCache
  } catch (error) {
    console.error('[Config] 加载配置失败:', error.message)
    return configCache || {}
  }
}

function getConfig() {
  if (!configCache) {
    loadConfig()
  }
  return configCache
}

function getPermissions() {
  const config = getConfig()
  return config.permissions || {}
}

function getRoles() {
  const config = getConfig()
  return config.roles || {}
}

function getRoutes() {
  const config = getConfig()
  return config.routes || []
}

function getConstants() {
  const config = getConfig()
  return config.constants || {}
}

function getPermissionByCode(code) {
  const permissions = getPermissions()
  
  for (const key of Object.keys(permissions)) {
    if (permissions[key].permissionCode === code) {
      return { code: key, ...permissions[key] }
    }
    
    if (key === code) {
      return { code: key, ...permissions[key] }
    }
  }
  
  return null
}

function getPermissionByApiPath(apiPath, method) {
  const permissions = getPermissions()
  
  for (const key of Object.keys(permissions)) {
    const perm = permissions[key]
    if (perm.apiPath === apiPath) {
      if (!perm.method) return { code: key, ...perm }
      
      const methods = Array.isArray(perm.method) ? perm.method : [perm.method]
      if (methods.includes(method.toUpperCase())) {
        return { code: key, ...perm }
      }
    }
  }
  
  return null
}

function getChildPermissions(parentCode) {
  const permissions = getPermissions()
  const children = []
  
  for (const key of Object.keys(permissions)) {
    const perm = permissions[key]
    if (perm.parent === parentCode) {
      children.push({
        code: key,
        ...perm
      })
    }
  }
  
  return children.sort((a, b) => a.level - b.level)
}

function getAllDescendantPermissions(parentCode) {
  const directChildren = getChildPermissions(parentCode)
  let allDescendants = [...directChildren]
  
  for (const child of directChildren) {
    const grandChildren = getAllDescendantPermissions(child.code)
    allDescendants = allDescendants.concat(grandChildren)
  }
  
  return allDescendants
}

function getUserRolePermissions(role) {
  const roles = getRoles()
  const roleConfig = roles[role]
  
  if (!roleConfig) return []
  
  if (roleConfig.permissions.includes('*')) {
    return ['*', ...Object.keys(getPermissions())]
  }
  
  const expandedPermissions = [...roleConfig.permissions]
  
  for (const permCode of roleConfig.permissions) {
    const descendants = getAllDescendantPermissions(permCode)
    for (const desc of descendants) {
      if (desc.permissionCode && !expandedPermissions.includes(desc.permissionCode)) {
        expandedPermissions.push(desc.permissionCode)
      }
      if (!expandedPermissions.includes(desc.code)) {
        expandedPermissions.push(desc.code)
      }
    }
  }
  
  return [...new Set(expandedPermissions)]
}

function hasPermission(userPermissions, requiredPermission) {
  if (!userPermissions || !Array.isArray(userPermissions)) return false
  if (!requiredPermission) return true
  
  if (userPermissions.includes('*')) return true
  
  if (userPermissions.includes(requiredPermission)) return true
  
  for (const perm of userPermissions) {
    if (!perm) continue
    try {
      if (requiredPermission.startsWith(perm)) return true
      if (perm.length > 0 && requiredPermission.length >= perm.length && 
          requiredPermission.substring(0, perm.length) === perm) {
        return true
      }
    } catch (e) { continue }
  }
  
  const requiredPermInfo = getPermissionByCode(requiredPermission)
  if (requiredPermInfo && requiredPermInfo.parent) {
    if (userPermissions.includes(requiredPermInfo.parent)) {
      return true
    }
  }
  
  for (const perm of userPermissions) {
    if (!perm) continue
    const permInfo = getPermissionByCode(perm)
    if (permInfo) {
      const descendants = getAllDescendantPermissions(perm)
      if (descendants.some(d => d.permissionCode === requiredPermission || d.code === requiredPermission)) {
        return true
      }
    }
  }
  
  return false
}

function checkUserHasPermission(userRole, requiredPermission) {
  const userPermissions = getUserRolePermissions(userRole)
  return hasPermission(userPermissions, requiredPermission)
}

function getPermissionTree(userRole) {
  const permissions = getPermissions()
  const userPermissions = getUserRolePermissions(userRole)
  const tree = {}
  
  const rootNodes = Object.entries(permissions)
    .filter(([code, perm]) => !perm.parent)
    .sort((a, b) => a[1].level - b[1].level)
  
  for (const [code, perm] of rootNodes) {
    const children = buildPermissionNode(code, perm, userPermissions)
    tree[code] = children
  }
  
  return tree
}

function buildPermissionNode(code, perm, userPermissions) {
  const node = {
    code,
    name: perm.name,
    description: perm.description,
    url: perm.url,
    icon: perm.icon,
    level: perm.level,
    permissionCode: perm.permissionCode,
    apiPath: perm.apiPath,
    method: perm.method,
    isPublic: perm.isPublic,
    hasAccess: hasPermission(userPermissions, code) || 
               hasPermission(userPermissions, perm.permissionCode),
    children: []
  }
  
  const childPerms = getChildPermissions(code)
  for (const child of childPerms) {
    node.children.push(buildPermissionNode(child.code, child, userPermissions))
  }
  
  return node
}

function getMenuForRole(role) {
  const permissions = getPermissions()
  const userPermissions = getUserRolePermissions(role)
  const menuItems = []
  
  for (const [code, perm] of Object.entries(permissions)) {
    if (perm.url && perm.level <= 2) {
      const hasAccess = hasPermission(userPermissions, code)
      
      if (hasAccess) {
        menuItems.push({
          code,
          name: perm.name,
          url: perm.url,
          icon: perm.icon,
          level: perm.level,
          parent: perm.parent,
          children: getChildPermissions(code)
            .filter(c => hasPermission(userPermissions, c.code) || hasPermission(userPermissions, c.permissionCode))
            .map(c => ({
              code: c.code,
              name: c.name,
              url: c.url,
              permissionCode: c.permissionCode
            }))
        })
      }
    }
  }
  
  return menuItems.sort((a, b) => a.level - b.level)
}

function reloadConfig() {
  configCache = null
  configLastModified = null
  return loadConfig()
}

module.exports = {
  loadConfig,
  getConfig,
  getPermissions,
  getRoles,
  getRoutes,
  getConstants,
  getPermissionByCode,
  getPermissionByApiPath,
  getChildPermissions,
  getAllDescendantPermissions,
  getUserRolePermissions,
  hasPermission,
  checkUserHasPermission,
  getPermissionTree,
  getMenuForRole,
  buildPermissionNode,
  reloadConfig
}
