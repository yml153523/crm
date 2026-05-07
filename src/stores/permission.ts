import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getPermissions, getMenuForRole } from '../services/permission'
import type { PermissionData, MenuPermission } from '../services/permission'

export const usePermissionStore = defineStore('permission', () => {
  const permissionData = ref<PermissionData | null>(null)
  const menuItems = ref<MenuPermission[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastLoadTime = ref<number>(0)
  
  const isLoaded = computed(() => !!permissionData.value)
  const userRole = computed(() => permissionData.value?.userRole || 'user')
  const userPermissions = computed(() => permissionData.value?.userPermissions || [])
  const version = computed(() => permissionData.value?.version || '')
  const roleList = computed(() => permissionData.value?.roles || {})
  
  const adminMenu = computed(() => 
    menuItems.value.filter(item => item.url?.includes('/admin/'))
  )
  
  const userMenu = computed(() =>
    menuItems.value.filter(item => item.url?.includes('/user/'))
  )

  async function loadPermissions(forceRefresh = false) {
    if (!forceRefresh && isLoaded.value && (Date.now() - lastLoadTime.value < 30 * 60 * 1000)) {
      return
    }
    
    loading.value = true
    error.value = null
    
    try {
      permissionData.value = await getPermissions(forceRefresh)
      
      const role = permissionData.value.userRole || 'user'
      menuItems.value = await getMenuForRole(role, forceRefresh)
      lastLoadTime.value = Date.now()
      
      uni.setStorageSync('userRole', role)
      uni.setStorageSync('permissions', userPermissions.value)
      
      console.log(`[PermissionStore] 权限加载完成: 角色=${role}, 权限数=${userPermissions.value.length}, 菜单项=${menuItems.value.length}`)
      
    } catch (e: any) {
      error.value = e.message || '加载失败'
      console.error('[PermissionStore] 加载失败:', e.message)
      
      if (e.message === 'UNAUTHORIZED') {
        clearAll()
        uni.removeStorageSync('token')
        uni.reLaunch({ url: '/pages/login' })
      }
    } finally {
      loading.value = false
    }
  }

  function hasPermission(code: string): boolean {
    if (!permissionData.value) return false
    
    if (userPermissions.value.includes('*')) return true
    if (userPermissions.value.includes(code)) return true
    
    for (const perm of userPermissions.value) {
      if (code.startsWith(perm)) return true
    }
    
    return false
  }

  function hasAnyPermission(codes: string[]): boolean {
    return codes.some(code => hasPermission(code))
  }

  function hasAllPermissions(codes: string[]): boolean {
    return codes.every(code => hasPermission(code))
  }

  function canAccessPage(pageUrl: string): boolean {
    if (!menuItems.value || menuItems.value.length === 0) return true
    
    const normalizedUrl = pageUrl.replace(/^\//, '').replace(/\/$/, '')
    
    for (const item of menuItems.value) {
      const itemUrl = (item.url || '').replace(/^\//, '').replace(/\/$/, '')
      
      if (itemUrl && (normalizedUrl === itemUrl || normalizedUrl.startsWith(itemUrl))) {
        return true
      }
      
      if (item.children?.length) {
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

  function getAccessibleMenu(): MenuPermission[] {
    return menuItems.value.filter(item => hasPermission(item.code))
  }

  function getAdminMenuItems(): MenuPermission[] {
    return menuItems.value.filter(item => 
      item.url?.startsWith('/admin') && hasPermission(item.code)
    )
  }

  function getUserMenuItems(): MenuPermission[] {
    return menuItems.value.filter(item =>
      item.url?.startsWith('/user') && hasPermission(item.code)
    )
  }

  function clearAll() {
    permissionData.value = null
    menuItems.value = []
    error.value = null
    lastLoadTime.value = 0
    try {
      uni.removeStorageSync('userRole')
      uni.removeStorageSync('permissions')
    } catch {}
  }

  async function refresh() {
    return loadPermissions(true)
  }

  function getPermissionInfo(code: string): any {
    if (!permissionData.value?.permissionTree) return null
    
    const tree = permissionData.value.permissionTree
    
    for (const [moduleKey, module] of Object.entries(tree)) {
      if (module.code === code) return module
      
      if (module.children) {
        for (const child of module.children) {
          if (child.code === code || child.permissionCode === code) return child
          
          if (child.children) {
            for (const grandChild of child.children) {
              if (grandChild.code === code || grandChild.permissionCode === code) return grandChild
            }
          }
        }
      }
    }
    
    return null
  }

  return {
    permissionData,
    menuItems,
    loading,
    error,
    isLoaded,
    userRole,
    userPermissions,
    version,
    roleList,
    adminMenu,
    userMenu,
    loadPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessPage,
    getAccessibleMenu,
    getAdminMenuItems,
    getUserMenuItems,
    clearAll,
    refresh,
    getPermissionInfo
  }
}, {
  persist: {
    key: 'crm-permission-store',
    paths: ['userRole', 'lastLoadTime']
  }
})
