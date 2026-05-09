/**
 * 分页逻辑 composable
 */
import { ref, computed } from 'vue'

export function usePagination(fetchFn: Function, options?: { pageSize?: number }) {
  const page = ref(1)
  const pageSize = ref(options?.pageSize || 10)
  const total = ref(0)
  const loading = ref(false)
  const list = ref<any[]>([])

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
  const hasMore = computed(() => page.value < totalPages.value)

  async function loadMore() {
    if (loading.value || !hasMore.value) return
    
    loading.value = true
    try {
      const res = await fetchFn(page.value, pageSize.value)
      if (page.value === 1) {
        list.value = res.data?.list || []
      } else {
        list.value.push(...(res.data?.list || []))
      }
      total.value = res.data?.total || 0
    } finally {
      loading.value = false
    }
  }

  function refresh() {
    page.value = 1
    list.value = []
    return loadMore()
  }

  function reset() {
    page.value = 1
    total.value = 0
    list.value = []
  }

  return {
    page,
    pageSize,
    total,
    loading,
    list,
    totalPages,
    hasMore,
    loadMore,
    refresh,
    reset
  }
}
