import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

function clearAppCache() {
  const CACHE_VERSION = '20260422-v3'
  const storedVersion = uni.getStorageSync('app_cache_version')

  if (storedVersion !== CACHE_VERSION) {
    const preservedKeys = ['token', 'refreshToken', 'userInfo', 'tokenExpires']
    const preserved: Record<string, any> = {}

    for (const key of preservedKeys) {
      const val = uni.getStorageSync(key)
      if (val) preserved[key] = val
    }

    try {
      uni.clearStorageSync()

      for (const [key, val] of Object.entries(preserved)) {
        uni.setStorageSync(key, val)
      }
    } catch {}

    uni.setStorageSync('app_cache_version', CACHE_VERSION)
  }
}

export function createApp() {
  clearAppCache()

  const app = createSSRApp(App)
  const pinia = createPinia()

  app.use(pinia)

  return {
    app,
    pinia
  }
}
