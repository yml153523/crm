/**
 * 存储工具函数
 */

const STORAGE_PREFIX = 'crm_'

/**
 * 获取存储数据
 * @param key - 键名
 * @param defaultValue - 默认值
 * @returns 存储的数据
 */
export function getStorage<T>(key: string, defaultValue?: T): T | null {
  try {
    const data = uni.getStorageSync(STORAGE_PREFIX + key)
    return data ? JSON.parse(data) : (defaultValue ?? null)
  } catch {
    return defaultValue ?? null
  }
}

/**
 * 设置存储数据
 * @param key - 键名
 * @param value - 值
 */
export function setStorage(key: string, value: any): void {
  try {
    uni.setStorageSync(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch (error) {
    console.error('[Storage] 设置失败:', key, error)
  }
}

/**
 * 移除存储数据
 * @param key - 键名
 */
export function removeStorage(key: string): void {
  try {
    uni.removeStorageSync(STORAGE_PREFIX + key)
  } catch (error) {
    console.error('[Storage] 移除失败:', key, error)
  }
}

/**
 * 清除所有CRM相关存储
 */
export function clearAllStorage(): void {
  try {
    uni.clearStorageSync()
  } catch (error) {
    console.error('[Storage] 清除失败:', error)
  }
}

// 快捷方法
export const getToken = () => getStorage<string>('token')
export const setToken = (token: string) => setStorage('token', token)
export const removeToken = () => removeStorage('token')
export const getUserInfo = () => getStorage<any>('userInfo')
export const setUserInfo = (info: any) => setStorage('userInfo', info)
