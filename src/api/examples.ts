/**
 * API 使用示例
 * 展示如何在新旧代码中使用统一的 API 请求封装
 */

// ========== 基础使用 ==========

// GET 请求（自动缓存）
const { data } = await api.get<User[]>('/users', { page: 1 }, { useCache: true })

// POST 请求
const { data } = await api.post<User>('/users', { name: '张三', phone: '13800138000' })

// 带错误处理
try {
  const res = await api.post<Order>('/orders', orderData)
  if (res.success) {
    console.log('创建成功:', res.data)
  }
} catch (error: any) {
  console.error('请求失败:', error.message)
  uni.showToast({ title: error.message, icon: 'none' })
}

// ========== 高级用法 ==========

// 上传文件（带进度）
const { data } = await api.upload(
  '/upload',
  filePath,
  { type: 'avatar' },
  (progress) => {
    console.log('上传进度:', progress + '%')
  }
)

// 下载文件
api.download('/files/xxx.pdf', 
  (filePath) => {
    console.log('下载成功:', filePath)
  },
  (error) => {
    console.error('下载失败:', error)
  }
)

// ========== 与现有代码对比 ==========

/* 
 * 旧代码：
 */
const res: any = await new Promise((resolve, reject) => {
  uni.request({
    url: `${API_PATHS.USERS}`,
    method: 'GET',
    header: { Authorization: `Bearer ${token}` },
    success: resolve,
    fail: reject
  })
})
if (res.data?.success) {
  const users = res.data.data
}

// 新代码：
const res = await api.get<User[]>('/users')
if (res.success) {
  const users = res.data
}

/* 
 * 旧代码（POST）：
 */
uni.request({
  url: `${API_PATHS.ORDERS}`,
  method: 'POST',
  data: orderData,
  success: (res: any) => {
    if (res.data.success) {
      console.log('成功')
    }
  }
})

// 新代码：
const res = await api.post<Order>('/orders', orderData)
if (res.success) {
  console.log('成功')
}

// ========== 在组件中使用 ==========

import { api } from '@/api/http'

export default {
  async fetchUsers() {
    try {
      uni.showLoading({ title: '加载中...' })
      
      const res = await api.get<User[]>('/users', { page: 1, pageSize: 20 }, { useCache: true })
      
      if (res.success) {
        this.users = res.data || []
      }
    } catch (error: any) {
      uni.showToast({ title: error.message, icon: 'none' })
    } finally {
      uni.hideLoading()
    }
  },
  
  async createUser(userData: any) {
    try {
      const res = await api.post<User>('/users', userData)
      
      if (res.success) {
        uni.showToast({ title: '创建成功', icon: 'success' })
        // 清除用户列表缓存
        api.clearCache()
        // 刷新列表
        this.fetchUsers()
      }
    } catch (error: any) {
      uni.showToast({ title: error.message, icon: 'none' })
    }
  },
  
  async uploadAvatar(filePath: string) {
    try {
      const res = await api.upload('/upload', filePath, { type: 'avatar' }, (progress) => {
        console.log('上传进度:', progress)
      })
      
      if (res.success) {
        return res.data.url
      }
    } catch (error: any) {
      uni.showToast({ title: error.message, icon: 'none' })
    }
  }
}
