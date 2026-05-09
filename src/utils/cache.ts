/**
 * 数据缓存管理器
 * 支持：内存缓存、本地存储、过期时间、自动清理
 */

// 缓存配置
const CACHE_CONFIG = {
  // 内存缓存
  memory: {
    maxSize: 100,           // 最大缓存数量
    defaultTTL: 5 * 60 * 1000,  // 默认 5 分钟
  },
  
  // 本地存储
  storage: {
    prefix: 'crm_cache_',  // 键前缀
    defaultTTL: 30 * 60 * 1000, // 默认 30 分钟
  }
}

// 内存缓存
const memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>()

/**
 * 内存缓存 - 存入
 */
export function setMemoryCache(key: string, data: any, ttl?: number): void {
  // 检查是否超过最大缓存数
  if (memoryCache.size >= CACHE_CONFIG.memory.maxSize) {
    // 删除最老的缓存
    const firstKey = memoryCache.keys().next().value
    if (firstKey) {
      memoryCache.delete(firstKey)
    }
  }
  
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttl || CACHE_CONFIG.memory.defaultTTL
  })
}

/**
 * 内存缓存 - 读取
 */
export function getMemoryCache<T = any>(key: string): T | null {
  const item = memoryCache.get(key)
  
  if (!item) return null
  
  // 检查是否过期
  if (Date.now() - item.timestamp > item.ttl) {
    memoryCache.delete(key)
    return null
  }
  
  return item.data as T
}

/**
 * 内存缓存 - 删除
 */
export function removeMemoryCache(key: string): void {
  memoryCache.delete(key)
}

/**
 * 内存缓存 - 清空
 */
export function clearMemoryCache(): void {
  memoryCache.clear()
}

/**
 * 本地存储缓存 - 存入
 */
export function setStorageCache(key: string, data: any, ttl?: number): void {
  const storageKey = CACHE_CONFIG.storage.prefix + key
  
  uni.setStorageSync(storageKey, JSON.stringify({
    data,
    timestamp: Date.now(),
    ttl: ttl || CACHE_CONFIG.storage.defaultTTL
  }))
}

/**
 * 本地存储缓存 - 读取
 */
export function getStorageCache<T = any>(key: string): T | null {
  const storageKey = CACHE_CONFIG.storage.prefix + key
  
  try {
    const cached = uni.getStorageSync(storageKey)
    if (!cached) return null
    
    const item = typeof cached === 'string' ? JSON.parse(cached) : cached
    
    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      uni.removeStorageSync(storageKey)
      return null
    }
    
    return item.data as T
  } catch {
    return null
  }
}

/**
 * 本地存储缓存 - 删除
 */
export function removeStorageCache(key: string): void {
  const storageKey = CACHE_CONFIG.storage.prefix + key
  uni.removeStorageSync(storageKey)
}

/**
 * 本地存储缓存 - 清空所有
 */
export function clearStorageCache(): void {
  const info = uni.getStorageInfoSync()
  info.keys.forEach(key => {
    if (key.startsWith(CACHE_CONFIG.storage.prefix)) {
      uni.removeStorageSync(key)
    }
  })
}

/**
 * 智能缓存 - 自动选择存储方式
 */
export function setCache(
  key: string, 
  data: any, 
  options?: {
    useStorage?: boolean,  // 是否使用本地存储
    ttl?: number,          // 过期时间（毫秒）
  }
): void {
  const { useStorage = false, ttl } = options || {}
  
  if (useStorage) {
    setStorageCache(key, data, ttl)
  } else {
    setMemoryCache(key, data, ttl)
  }
}

/**
 * 智能缓存 - 读取
 */
export function getCache<T = any>(
  key: string,
  options?: {
    useStorage?: boolean,
  }
): T | null {
  const { useStorage = false } = options || {}
  
  if (useStorage) {
    return getStorageCache<T>(key)
  } else {
    return getMemoryCache<T>(key)
  }
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats() {
  return {
    memory: {
      size: memoryCache.size,
      maxSize: CACHE_CONFIG.memory.maxSize,
      keys: Array.from(memoryCache.keys())
    },
    storage: (() => {
      const info = uni.getStorageInfoSync()
      const cacheKeys = info.keys.filter(k => k.startsWith(CACHE_CONFIG.storage.prefix))
      return {
        size: cacheKeys.length,
        keys: cacheKeys.map(k => k.replace(CACHE_CONFIG.storage.prefix, ''))
      }
    })()
  }
}

/**
 * 清理过期缓存
 */
export function cleanExpiredCache(): void {
  const now = Date.now()
  
  // 清理内存缓存
  for (const [key, item] of memoryCache.entries()) {
    if (now - item.timestamp > item.ttl) {
      memoryCache.delete(key)
    }
  }
  
  // 清理本地存储
  const info = uni.getStorageInfoSync()
  info.keys.forEach(storageKey => {
    if (!storageKey.startsWith(CACHE_CONFIG.storage.prefix)) return
    
    try {
      const cached = uni.getStorageSync(storageKey)
      const item = typeof cached === 'string' ? JSON.parse(cached) : cached
      
      if (now - item.timestamp > item.ttl) {
        uni.removeStorageSync(storageKey)
      }
    } catch {
      uni.removeStorageSync(storageKey)
    }
  })
}

// 导出缓存管理器
export const cache = {
  memory: {
    set: setMemoryCache,
    get: getMemoryCache,
    remove: removeMemoryCache,
    clear: clearMemoryCache
  },
  storage: {
    set: setStorageCache,
    get: getStorageCache,
    remove: removeStorageCache,
    clear: clearStorageCache
  },
  set: setCache,
  get: getCache,
  stats: getCacheStats,
  clean: cleanExpiredCache
}

// 启动时清理过期缓存
cleanExpiredCache()
