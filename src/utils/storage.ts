export const storage = {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const value = uni.getStorageSync(key)
      return value ? JSON.parse(value) : (defaultValue || null)
    } catch (e) {
      return defaultValue || null
    }
  },
  
  set(key: string, value: any): void {
    try {
      uni.setStorageSync(key, JSON.stringify(value))
    } catch (e) {
      console.error('Storage set error:', e)
    }
  },
  
  remove(key: string): void {
    uni.removeStorageSync(key)
  },
  
  clear(): void {
    uni.clearStorageSync()
  }
}
