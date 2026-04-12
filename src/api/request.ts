interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  loading?: boolean
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
          uni.removeStorageSync('token')
          uni.removeStorageSync('userInfo')
          uni.reLaunch({ url: '/pages/login/index' })
          reject(new Error('登录已过期'))
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
