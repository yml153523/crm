interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  loading?: boolean
  skipAuthRedirect?: boolean  // 新增：跳过401自动跳转（用于游客模式）
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function getToken(): string {
  return uni.getStorageSync('token') || ''
}

export function request<T = any>(options: RequestOptions): Promise<T> {
  if (options.loading !== false) {
    uni.showLoading({ title: '加载中...', mask: true })
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
        ...options.header
      },
      success: (res) => {
        const data = res.data as any
        
        if (data.success) {
          resolve(data)
        } else if (data.code === 401) {
          // 清除过期的认证信息
          uni.removeStorageSync('token')
          uni.removeStorageSync('userInfo')
          
          // 如果不是游客模式（skipAuthRedirect=false），则跳转到登录页
          if (!options.skipAuthRedirect) {
            console.log('[Request] 401未授权 - 跳转到登录页')
            uni.reLaunch({ url: '/pages/login/index' })
          } else {
            console.log('[Request] 401未授权 - 游客模式,不跳转')
          }
          
          reject(new Error('登录已过期或未登录'))
        } else {
          uni.showToast({
            title: data.message || '请求失败',
            icon: 'none'
          })
          reject(new Error(data.message || '请求失败'))
        }
      },
      fail: (err) => {
        uni.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        })
        reject(err)
      },
      complete: () => {
        if (options.loading !== false) {
          uni.hideLoading()
        }
      }
    })
  })
}

export function get<T = any>(url: string, data?: any): Promise<T> {
  return request<T>({ url, method: 'GET', data })
}

export function post<T = any>(url: string, data?: any): Promise<T> {
  return request<T>({ url, method: 'POST', data })
}

export function put<T = any>(url: string, data?: any): Promise<T> {
  return request<T>({ url, method: 'PUT', data })
}

export function del<T = any>(url: string, data?: any): Promise<T> {
  return request<T>({ url, method: 'DELETE', data })
}
