const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER_INFO: 'userInfo',
  TOKEN_EXPIRES: 'tokenExpires',
  DATA_VERSIONS: 'crm_data_versions',
  OFFLINE_QUEUE: 'crm_offline_queue',
  LAST_SYNC: 'crm_last_sync',
  LAST_HEARTBEAT: 'crm_last_heartbeat'
}

function getStorage<T>(key: string): T | null {
  try {
    const val = uni.getStorageSync(key)
    return val || null
  } catch {
    return null
  }
}

function setStorage(key: string, value: any): void {
  try {
    uni.setStorageSync(key, value)
  } catch {}
}

function removeStorage(key: string): void {
  try {
    uni.removeStorageSync(key)
  } catch {}
}

export function getToken(): string {
  return getStorage<string>(STORAGE_KEYS.TOKEN) || ''
}

export function getRefreshToken(): string {
  return getStorage<string>(STORAGE_KEYS.REFRESH_TOKEN) || ''
}

export function setTokens(token: string, refreshToken: string, expiresIn?: number): void {
  setStorage(STORAGE_KEYS.TOKEN, token)
  setStorage(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
  if (expiresIn) {
    setStorage(STORAGE_KEYS.TOKEN_EXPIRES, Date.now() + expiresIn * 1000)
  }
}

export function getUserInfo(): any {
  return getStorage(STORAGE_KEYS.USER_INFO)
}

export function setUserInfo(info: any): void {
  setStorage(STORAGE_KEYS.USER_INFO, info)
}

export function clearAuth(): void {
  removeStorage(STORAGE_KEYS.TOKEN)
  removeStorage(STORAGE_KEYS.REFRESH_TOKEN)
  removeStorage(STORAGE_KEYS.USER_INFO)
  removeStorage(STORAGE_KEYS.TOKEN_EXPIRES)
}

export function isTokenExpired(): boolean {
  const token = getToken()
  if (!token) return true
  if (token.startsWith('demo-')) return false

  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const payload = JSON.parse(atob(parts[1]))
    return payload.exp < Math.floor(Date.now() / 1000) + 300
  } catch {
    return true
  }
}

export function isTokenExpiringSoon(): boolean {
  const expiresAt = getStorage<number>(STORAGE_KEYS.TOKEN_EXPIRES)
  if (!expiresAt) return isTokenExpired()
  return Date.now() > expiresAt - 5 * 60 * 1000
}

export function getDataVersions(): Record<string, number> {
  return getStorage<Record<string, number>>(STORAGE_KEYS.DATA_VERSIONS) || {}
}

export function setDataVersions(versions: Record<string, number>): void {
  setStorage(STORAGE_KEYS.DATA_VERSIONS, versions)
}

export function getLastSyncTime(): number {
  return getStorage<number>(STORAGE_KEYS.LAST_SYNC) || 0
}

export function setLastSyncTime(time: number): void {
  setStorage(STORAGE_KEYS.LAST_SYNC, time)
}

export function getOfflineQueue(): any[] {
  return getStorage<any[]>(STORAGE_KEYS.OFFLINE_QUEUE) || []
}

export function addToOfflineQueue(action: any): void {
  const queue = getOfflineQueue()
  queue.push({ ...action, timestamp: Date.now() })
  if (queue.length > 100) queue.shift()
  setStorage(STORAGE_KEYS.OFFLINE_QUEUE, queue)
}

export function clearOfflineQueue(): void {
  removeStorage(STORAGE_KEYS.OFFLINE_QUEUE)
}

export function setLastHeartbeat(time: number): void {
  setStorage(STORAGE_KEYS.LAST_HEARTBEAT, time)
}

export function getLastHeartbeat(): number {
  return getStorage<number>(STORAGE_KEYS.LAST_HEARTBEAT) || 0
}
