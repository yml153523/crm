import { usePermissionStore } from '../stores/permission'
import { PAGE_URLS, PERMISSION_CODES } from './constants'

interface RouteMeta {
  requiresAuth?: boolean
  permissionCode?: string
  role?: string
}

interface UniRouterMethods {
  navigateTo: (options: any) => void
  switchTab: (options: any) => void
  reLaunch: (options: any) => void
  redirectTo: (options: any) => void
}

const PUBLIC_PAGES = [
  '/pages/login',
  '/pages/register',
  '/pages/index'
]

const ADMIN_PREFIX = '/pages/admin/'
const USER_PREFIX = '/pages/user/'

function isAdminPage(url: string): boolean {
  return url.startsWith(ADMIN_PREFIX)
}

function isUserPage(url: string): boolean {
  return url.startsWith(USER_PREFIX)
}

function isPublicPage(url: string): boolean {
  const normalizedUrl = url.split('?')[0].replace(/\/$/, '')
  return PUBLIC_PAGES.some(publicUrl => normalizedUrl === publicUrl || normalizedUrl.startsWith(publicUrl + '/'))
}

async function checkRouteAccess(to: string, from?: string): Promise<boolean> {
  const token = uni.getStorageSync('token')
  
  if (isPublicPage(to)) {
    if (token && to.includes('/login')) {
      const role = uni.getStorageSync('userRole') || 'user'
      const homeUrl = role === 'admin' ? PAGE_URLS.ADMIN.DASHBOARD : PAGE_URLS.USER.HOME
      uni.switchTab({ url: homeUrl })
      return false
    }
    return true
  }
  
  if (!token) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/login' })
    }, 1500)
    return false
  }
  
  try {
    const permissionStore = usePermissionStore()
    
    if (!permissionStore.isLoaded) {
      await permissionStore.loadPermissions()
    }
    
    const userRole = permissionStore.userRole || 'user'
    const userPermissions = permissionStore.permissions
    
    if (isAdminPage(to)) {
      if (userRole !== 'admin' && userRole !== 'super_admin') {
        uni.showToast({ title: '需要管理员权限', icon: 'none' })
        uni.navigateBack()
        return false
      }
      
      const requiredPerm = getRequiredPermissionForPage(to)
      if (requiredPerm && !hasPermission(userPermissions, requiredPerm)) {
        uni.showToast({ title: '无权限访问此页面', icon: 'none' })
        uni.navigateBack()
        return false
      }
    }
    
    if (isUserPage(to)) {
      if (!['user', 'vip_user', 'admin', 'super_admin'].includes(userRole)) {
        uni.showToast({ title: '账号异常', icon: 'none' })
        uni.reLaunch({ url: '/pages/login' })
        return false
      }
      
      const requiredPerm = getRequiredPermissionForPage(to)
      if (requiredPerm && !hasPermission(userPermissions, requiredPerm)) {
        uni.showToast({ title: '功能暂未开放', icon: 'none' })
        uni.navigateBack()
        return false
      }
    }
    
    return true
    
  } catch (error) {
    console.error('[RouteGuard] 权限检查失败:', error)
    return true
  }
}

function getRequiredPermissionForPage(pageUrl: string): string | null {
  const pageMap: Record<string, string> = {
    [PAGE_URLS.ADMIN.USERS]: PERMISSION_CODES.ADMIN_USER.MODULE,
    [PAGE_URLS.ADMIN.COURSES]: PERMISSION_CODES.ADMIN_COURSE.MODULE,
    [PAGE_URLS.ADMIN.VIDEOS]: PERMISSION_CODES.ADMIN_VIDEO.MODULE,
    [PAGE_URLS.ADMIN.PRODUCTS]: PERMISSION_CODES.ADMIN_PRODUCT.MODULE,
    [PAGE_URLS.ADMIN.REDPACKETS]: PERMISSION_CODES.ADMIN_REDPACKET.MODULE,
    [PAGE_URLS.ADMIN.STATISTICS]: PERMISSION_CODES.ADMIN_STATISTICS.MODULE,
    [PAGE_URLS.ADMIN.CONTENT_HUB]: PERMISSION_CODES.ADMIN_CONTENT.MODULE,
    [PAGE_URLS.ADMIN.AUDIT_LOG]: PERMISSION_CODES.ADMIN_STATISTICS.AUDIT_LOG,
    [PAGE_URLS.USER.PROFILE]: PERMISSION_CODES.USER_PROFILE,
    [PAGE_URLS.USER.VIDEOS]: PERMISSION_CODES.USER_VIDEO,
    [PAGE_URLS.USER.COURSES]: PERMISSION_CODES.USER_COURSE,
    [PAGE_URLS.USER.PRODUCTS]: PERMISSION_CODES.USER_PRODUCT,
    [PAGE_URLS.USER.CART]: PERMISSION_CODES.USER_CART,
    [PAGE_URLS.USER.ORDERS]: PERMISSION_CODES.USER_ORDER,
    [PAGE_URLS.USER.REDPACKETS]: PERMISSION_CODES.USER_REDPACKET
  }
  
  const normalizedUrl = pageUrl.split('?')[0]
  return pageMap[normalizedUrl] || null
}

function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  if (!userPermissions || userPermissions.length === 0) return false
  
  if (userPermissions.includes('*')) return true
  if (userPermissions.includes(requiredPermission)) return true
  
  for (const perm of userPermissions) {
    if (requiredPermission.startsWith(perm)) return true
    if (perm.startsWith(requiredPermission.substring(0, Math.min(perm.length, requiredPermission.length)))) {
      return true
    }
  }
  
  return false
}

export function setupRouterGuard() {
  const originalNavigateTo = uni.navigateTo
  const originalSwitchTab = uni.switchTab
  const originalReLaunch = uni.reLaunch
  const originalRedirectTo = uni.redirectTo

  const uniRouter = uni as unknown as UniRouterMethods
  uniRouter.navigateTo = async function(options: any) {
    const canAccess = await checkRouteAccess(options.url)
    if (canAccess) {
      originalNavigateTo.call(uni, options)
    }
  }

  uniRouter.switchTab = async function(options: any) {
    const canAccess = await checkRouteAccess(options.url)
    if (canAccess) {
      originalSwitchTab.call(uni, options)
    }
  }

  uniRouter.reLaunch = async function(options: any) {
    const canAccess = await checkRouteAccess(options.url)
    if (canAccess) {
      originalReLaunch.call(uni, options)
    }
  }

  uniRouter.redirectTo = async function(options: any) {
    const canAccess = await checkRouteAccess(options.url)
    if (canAccess) {
      originalRedirectTo.call(uni, options)
    }
  }

  console.log('[RouteGuard] 路由守卫已安装')
}

export { checkRouteAccess, hasPermission, isPublicPage, isAdminPage, isUserPage }
export type { RouteMeta }
