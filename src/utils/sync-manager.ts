import {
  getToken, getRefreshToken, setTokens, setUserInfo, clearAuth,
  isTokenExpiringSoon, isTokenExpired, getDataVersions, setDataVersions,
  getLastSyncTime, setLastSyncTime, getOfflineQueue, clearOfflineQueue,
  setLastHeartbeat, getLastHeartbeat
} from './storage'

const API_BASE = ''

let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach(cb => cb(newToken))
  refreshSubscribers = []
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

export async function refreshTokenSilently(): Promise<string | null> {
  const token = getToken()
  if (!token) return null
  if (token.startsWith('demo-')) return token

  if (!isTokenExpiringSoon()) return token

  if (isRefreshing) {
    return new Promise<string | null>((resolve) => {
      addRefreshSubscriber((newToken: string) => {
        resolve(newToken)
      })
    })
  }

  isRefreshing = true
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    isRefreshing = false
    return null
  }

  try {
    const res = await new Promise<any>((resolve, reject) => {
      uni.request({
        url: `${API_BASE}/api/auth/refresh`,
        method: 'POST',
        data: { refreshToken },
        header: { 'Content-Type': 'application/json' },
        success: (res) => resolve(res),
        fail: (err) => reject(err)
      })
    })

    if (res.statusCode === 200 && res.data?.success) {
      const { token: newToken, refreshToken: newRefreshToken, expiresIn, user } = res.data.data
      setTokens(newToken, newRefreshToken, expiresIn)
      if (user) setUserInfo(user)
      onTokenRefreshed(newToken)
      isRefreshing = false
      return newToken
    } else {
      clearAuth()
      isRefreshing = false
      return null
    }
  } catch {
    isRefreshing = false
    return null
  }
}

export async function ensureValidToken(): Promise<boolean> {
  const token = getToken()
  if (!token) return false
  if (token.startsWith('demo-')) return true

  if (!isTokenExpired()) return true

  const newToken = await refreshTokenSilently()
  return !!newToken
}

export async function checkHeartbeat(): Promise<{
  online: boolean
  dataVersions: Record<string, number>
  serverTime: number
}> {
  try {
    const token = getToken()
    const res = await new Promise<any>((resolve, reject) => {
      uni.request({
        url: `${API_BASE}/api/auth/heartbeat`,
        method: 'GET',
        header: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        success: (res) => resolve(res),
        fail: (err) => reject(err),
        timeout: 10000
      })
    })

    if (res.statusCode === 200 && res.data?.success) {
      setLastHeartbeat(Date.now())
      return {
        online: true,
        dataVersions: res.data.data.dataVersions || {},
        serverTime: res.data.data.serverTime
      }
    }
    return { online: false, dataVersions: {}, serverTime: 0 }
  } catch {
    return { online: false, dataVersions: {}, serverTime: 0 }
  }
}

export async function syncModelData(
  model: string,
  since?: number
): Promise<{ items: any[]; latestVersion: number } | null> {
  const token = getToken()
  if (!token) return null

  const syncSince = since || getLastSyncTime()

  try {
    const res = await new Promise<any>((resolve, reject) => {
      uni.request({
        url: `${API_BASE}/api/auth/sync/${model}?since=${syncSince}&pageSize=50`,
        method: 'GET',
        header: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        success: (res) => resolve(res),
        fail: (err) => reject(err),
        timeout: 30000
      })
    })

    if (res.statusCode === 200 && res.data?.success) {
      const { items, latestVersion } = res.data.data
      const versions = getDataVersions()
      versions[model] = latestVersion
      setDataVersions(versions)
      setLastSyncTime(Date.now())
      return { items, latestVersion }
    }
    return null
  } catch {
    return null
  }
}

export async function incrementalSync(): Promise<{
  synced: string[]
  failed: string[]
}> {
  const isValid = await ensureValidToken()
  if (!isValid) return { synced: [], failed: [] }

  const heartbeat = await checkHeartbeat()
  if (!heartbeat.online) return { synced: [], failed: [] }

  const localVersions = getDataVersions()
  const serverVersions = heartbeat.dataVersions
  const synced: string[] = []
  const failed: string[] = []

  const modelMap: Record<string, string> = {
    User: 'users',
    Course: 'courses',
    Video: 'videos',
    Product: 'products',
    RedPacket: 'redPackets',
    Order: 'orders'
  }

  for (const [serverModel, apiName] of Object.entries(modelMap)) {
    const serverVersion = serverVersions[serverModel] || 0
    const localVersion = localVersions[serverModel] || 0

    if (serverVersion > localVersion) {
      const result = await syncModelData(apiName, localVersion)
      if (result) {
        synced.push(serverModel)
      } else {
        failed.push(serverModel)
      }
    }
  }

  return { synced, failed }
}

export async function flushOfflineQueue(): Promise<{
  flushed: number
  failed: number
}> {
  const queue = getOfflineQueue()
  if (queue.length === 0) return { flushed: 0, failed: 0 }

  const isValid = await ensureValidToken()
  if (!isValid) return { flushed: 0, failed: queue.length }

  let flushed = 0
  let failed = 0
  const remaining: any[] = []

  for (const action of queue) {
    try {
      const token = getToken()
      await new Promise<any>((resolve, reject) => {
        uni.request({
          url: `${API_BASE}${action.url}`,
          method: action.method || 'POST',
          data: action.data,
          header: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(res)
            } else {
              reject(new Error(`HTTP ${res.statusCode}`))
            }
          },
          fail: reject,
          timeout: 15000
        })
      })
      flushed++
    } catch {
      if (Date.now() - action.timestamp < 24 * 60 * 60 * 1000) {
        remaining.push(action)
      }
      failed++
    }
  }

  if (remaining.length > 0) {
    const { setStorage } = await import('./storage')
    setStorage('crm_offline_queue', remaining)
  } else {
    clearOfflineQueue()
  }

  return { flushed, failed }
}

let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let syncTimer: ReturnType<typeof setInterval> | null = null

export function startBackgroundSync(intervalMs: number = 60000): void {
  stopBackgroundSync()

  heartbeatTimer = setInterval(async () => {
    const heartbeat = await checkHeartbeat()
    if (heartbeat.online) {
      const localVersions = getDataVersions()
      const serverVersions = heartbeat.dataVersions
      let needsSync = false

      for (const [model, version] of Object.entries(serverVersions)) {
        if ((localVersions[model] || 0) < (version as number)) {
          needsSync = true
          break
        }
      }

      if (needsSync) {
        await incrementalSync()
      }

      await flushOfflineQueue()
    }
  }, intervalMs)

  syncTimer = setInterval(async () => {
    if (isTokenExpiringSoon()) {
      await refreshTokenSilently()
    }
  }, 5 * 60 * 1000)
}

export function stopBackgroundSync(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
}

export async function onAppShow(): Promise<void> {
  const token = uni.getStorageSync('token') || ''
  if (token.startsWith('demo-')) return

  const lastHb = getLastHeartbeat()
  const timeSinceLastHb = Date.now() - lastHb

  if (timeSinceLastHb > 30 * 60 * 1000) {
    const isValid = await ensureValidToken()
    if (!isValid) {
      clearAuth()
      uni.showModal({
        title: '登录已过期',
        content: '您的登录已过期，请重新登录',
        showCancel: false,
        success: () => {
          const currentPages = getCurrentPages()
          const currentPage = currentPages[currentPages.length - 1]
          if (currentPage && !currentPage.route?.includes('login')) {
            uni.reLaunch({ url: '/pages/login/index' })
          }
        }
      })
      return
    }
  }

  if (timeSinceLastHb > 5 * 60 * 1000) {
    const heartbeat = await checkHeartbeat()
    if (heartbeat.online) {
      await incrementalSync()
      await flushOfflineQueue()
    }
  }

  startBackgroundSync()
}

export function onAppHide(): void {
  setLastHeartbeat(Date.now())
  stopBackgroundSync()
}

export async function onAppLaunch(): Promise<void> {
  const token = getToken()
  if (!token) return

  const isValid = await ensureValidToken()
  if (!isValid) {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      const newToken = await refreshTokenSilently()
      if (!newToken) {
        clearAuth()
      }
    } else {
      clearAuth()
    }
  }

  const heartbeat = await checkHeartbeat()
  if (heartbeat.online) {
    await incrementalSync()
    await flushOfflineQueue()
  }

  startBackgroundSync()
}
