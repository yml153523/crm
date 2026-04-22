/**
 * 搜索与筛选 composable
 */
import { ref, watch } from 'vue'

export function useSearch(options?: { debounceMs?: number }) {
  const searchText = ref('')
  const searchParams = ref<Record<string, any>>({})
  const filters = ref<Record<string, any>>({})
  
  const debounceMs = options?.debounceMs || 300
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  // 防抖搜索
  function onSearchInput(value: string) {
    searchText.value = value
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      searchParams.value = { ...searchParams.value, keyword: value }
    }, debounceMs)
  }

  // 更新筛选条件
  function updateFilter(key: string, value: any) {
    filters.value = { ...filters.value, [key]: value }
    searchParams.value = { ...searchParams.value, [key]: value }
  }

  // 重置所有筛选
  function resetFilters() {
    searchText.value = ''
    searchParams.value = {}
    filters.value = {}
  }

  // 清除单个筛选
  function clearFilter(key: string) {
    const newFilters = { ...filters.value }
    delete newFilters[key]
    filters.value = newFilters
    
    const newParams = { ...searchParams.value }
    delete newParams[key]
    searchParams.value = newParams
  }

  return {
    searchText,
    searchParams,
    filters,
    onSearchInput,
    updateFilter,
    resetFilters,
    clearFilter
  }
}
