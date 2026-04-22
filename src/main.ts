import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// 清理缓存和旧数据，确保每次启动都是最新状态
function clearAppCache() {
  const CACHE_VERSION = '20260416-v2'
  const storedVersion = uni.getStorageSync('app_cache_version')
  
  // 版本不一致时清除所有本地存储
  if (storedVersion !== CACHE_VERSION) {
    console.log('🧹 清理旧版本缓存:', storedVersion, '→', CACHE_VERSION)
    
    // 清除所有本地存储（保留登录信息）
    const token = uni.getStorageSync('token')
    const userInfo = uni.getStorageSync('userInfo')
    
    try {
      uni.clearStorageSync()
      
      // 恢复登录信息
      if (token) {
        uni.setStorageSync('token', token)
      }
      if (userInfo) {
        uni.setStorageSync('userInfo', userInfo)
      }
      
      console.log('✅ 缓存已清理完成')
    } catch (e) {
      console.error('❌ 清理缓存失败:', e)
    }
    
    // 写入新版本号
    uni.setStorageSync('app_cache_version', CACHE_VERSION)
  }
}

export function createApp() {
  // 启动时立即清理缓存
  clearAppCache()
  
  const app = createSSRApp(App)
  const pinia = createPinia()
  
  app.use(pinia)
  
  return {
    app,
    pinia
  }
}
