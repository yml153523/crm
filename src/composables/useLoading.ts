/**
 * 加载状态管理 composable
 */
import { ref } from 'vue'

export function useLoading(initialState: boolean = false) {
  const loading = ref(initialState)
  const error = ref<string | null>(null)

  function startLoading(message?: string) {
    loading.value = true
    error.value = null
    if (message) {
      uni.showLoading({ title: message, mask: true })
    }
  }

  function stopLoading(err?: string) {
    loading.value = false
    if (err) {
      error.value = err
      uni.showToast({ title: err, icon: 'none' })
    }
    uni.hideLoading()
  }

  function clearError() {
    error.value = null
  }

  async function withLoading<T>(fn: () => Promise<T>, message?: string): Promise<T | null> {
    startLoading(message)
    try {
      const result = await fn()
      stopLoading()
      return result
    } catch (err: any) {
      stopLoading(err.message || '操作失败')
      return null
    }
  }

  return {
    loading,
    error,
    startLoading,
    stopLoading,
    clearError,
    withLoading
  }
}
