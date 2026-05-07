export interface Permission {
  code: string
  name: string
  description?: string
  url?: string
  icon?: string
  level: number
  permissionCode?: string
  apiPath?: string
  method?: string | string[]
  isPublic?: boolean
  hasAccess: boolean
  children?: Permission[]
}

export interface RoleInfo {
  name: string
  code: string
  permissionCount: number
}

export interface PermissionTree {
  [code: string]: Permission
}

export interface MenuPermission {
  code: string
  name: string
  url: string
  icon?: string
  level: number
  parent?: string
  children: Array<{
    code: string
    name: string
    url?: string
    permissionCode?: string
  }>
}

export interface PermissionData {
  version: string
  userRole: string
  userPermissions: string[]
  userPermissionsCount: number
  permissionTree: PermissionTree
  roles: Record<string, RoleInfo>
}

const PERMISSION_CACHE_KEY = 'crm_permissions'
const MENU_CACHE_KEY = 'crm_menu'
const CACHE_TTL = 30 * 60 * 1000

interface CacheItem<T> {
  data: T
  timestamp: number
}

function getFromCache<T>(key: string): T | null {
  try {
    const cached = uni.getStorageSync(key) as CacheItem<T> | undefined
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
  } catch {}
  return null
}

function setToCache<T>(key: string, data: T): void {
  try {
    uni.setStorageSync(key, { data, timestamp: Date.now() } as CacheItem<T>)
  } catch {}
}

function clearCache(): void {
  try {
    uni.removeStorageSync(PERMISSION_CACHE_KEY)
    uni.removeStorageSync(MENU_CACHE_KEY)
  } catch {}
}

async function fetchWithAuth(url: string): Promise<any> {
  const token = uni.getStorageSync('token')
  
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      success: (res: any) => {
        if (res.statusCode === 200 && res.data?.success) {
          resolve(res.data.data)
        } else if (res.statusCode === 401) {
          clearCache()
          reject(new Error('UNAUTHORIZED'))
        } else {
          reject(new Error(res.data?.message || `HTTP ${res.statusCode}`))
        }
      },
      fail: (err: any) => {
        reject(new Error(err.errMsg || 'Network error'))
      }
    })
  })
}

export async function getPermissions(forceRefresh = false): Promise<PermissionData> {
  if (!forceRefresh) {
    const cached = getFromCache<PermissionData>(PERMISSION_CACHE_KEY)
    if (cached) return cached
  }

  const BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://123.56.107.111:5011'
  const data = await fetchWithAuth(`${BASE_URL}/api/permissions`)
  
  setToCache(PERMISSION_CACHE_KEY, data)
  return data
}

export async function getMenuForRole(role: string, forceRefresh = false): Promise<MenuPermission[]> {
  const cacheKey = `${MENU_CACHE_KEY}_${role}`
  
  if (!forceRefresh) {
    const cached = getFromCache<MenuPermission[]>(cacheKey)
    if (cached) return cached
  }

  const BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://123.56.107.111:5011'
  const data = await fetchWithAuth(`${BASE_URL}/api/permissions/menu/${role}`)
  
  setToCache(cacheKey, data.menu || [])
  return data.menu || []
}

export async function checkPermission(code: string, forceRefresh = false): Promise<boolean> {
  const permData = await getPermissions(forceRefresh)
  return permData.userPermissions.includes(code) || 
         permData.userPermissions.includes('*')
}

export async function checkMultiplePermissions(codes: string[]): Promise<Record<string, boolean>> {
  const permData = await getPermissions()
  const results: Record<string, boolean> = {}
  
  for (const code of codes) {
    results[code] = permData.userPermissions.includes(code) || 
                     permData.userPermissions.includes('*')
  }
  
  return results
}

export function canAccessPage(pageUrl: string, menuItems: MenuPermission[]): boolean {
  if (!menuItems || menuItems.length === 0) return true
  
  const normalizedUrl = pageUrl.replace(/^\//, '').replace(/\/$/, '')
  
  for (const item of menuItems) {
    const itemUrl = (item.url || '').replace(/^\//, '').replace(/\/$/, '')
    
    if (itemUrl && (normalizedUrl === itemUrl || normalizedUrl.startsWith(itemUrl))) {
      return true
    }
    
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        const childUrl = (child.url || '').replace(/^\//, '').replace(/\/$/, '')
        if (childUrl && (normalizedUrl === childUrl || normalizedUrl.startsWith(childUrl))) {
          return true
        }
      }
    }
  }
  
  return false
}

export function filterMenuByPermission(menuItems: MenuPermission[], userPermissions: string[]): MenuPermission[] {
  return menuItems.filter(item => {
    const hasItemAccess = userPermissions.includes(item.code) || 
                          userPermissions.includes('*') ||
                          userPermissions.some(p => item.code.startsWith(p))
    
    if (!hasItemAccess) return false
    
    if (item.children && item.children.length > 0) {
      item.children = item.children.filter(child =>
        userPermissions.includes(child.permissionCode || child.code) ||
        userPermissions.includes('*')
      )
    }
    
    return true
  })
}

export function usePermissions() {
  const permissions = ref<PermissionData | null>(null)
  const menu = ref<MenuPermission[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadPermissions() {
    loading.value = true
    error.value = null
    
    try {
      permissions.value = await getPermissions()
      const role = permissions.value?.userRole || 'user'
      menu.value = await getMenuForRole(role)
    } catch (e: any) {
      error.value = e.message
      console.error('[PermissionService] 加载失败:', e.message)
      
      if (e.message === 'UNAUTHORIZED') {
        uni.removeStorageSync('token')
        uni.reLaunch({ url: '/pages/login' })
      }
    } finally {
      loading.value = false
    }
  }

  function hasPerm(code: string): boolean {
    if (!permissions.value) return false
    return permissions.value.userPermissions.includes(code) || 
           permissions.value.userPermissions.includes('*')
  }

  function hasAnyPerm(codes: string[]): boolean {
    if (!permissions.value) return false
    return codes.some(code => hasPerm(code))
  }

  function canAccess(url: string): boolean {
    return canAccessPage(url, menu.value)
  }

  onMounted(() => {
    loadPermissions()
  })

  return {
    permissions,
    menu,
    loading,
    error,
    loadPermissions,
    hasPerm,
    hasAnyPerm,
    canAccess,
    refresh: () => loadPermissions(),
    clearCache
  }
}

export default {
  getPermissions,
  getMenuForRole,
  checkPermission,
  checkMultiplePermissions,
  canAccessPage,
  filterMenuByPermission,
  usePermissions,
  clearCache
}
