/**
 * 统一API请求工具函数
 * 
 * 解决的问题：
 * - 防止uni.request异步处理不当导致的BUG
 * - 统一错误处理、认证、loading状态
 * - 提供类型安全的请求方法
 * 
 * 使用示例：
 * import { apiRequest } from '@/utils/request'
 * 
 * const result = await apiRequest({
 *   url: '/api/courses',
 *   method: 'POST',
 *   data: { title: '新课程' }
 * })
 */

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  showLoading?: boolean
  loadingText?: string
  showError?: boolean
  timeout?: number
}

interface ApiResponse<T = any> {
  success: boolean
  status: number
  data: T
  message?: string
}

/**
 * 获取当前认证Token
 */
function getToken(): string {
  return uni.getStorageSync('token') || ''
}

/**
 * 检查Token是否有效且未过期
 */
function isTokenValid(token: string): boolean {
  if (!token) return false

  // 演示模式token直接放行（以demo-开头的token）
  if (token.startsWith('demo-')) {
    return true
  }

  try {
    // 简单检查JWT格式（不验证签名）
    const parts = token.split('.')
    if (parts.length !== 3) return false

    const payload = JSON.parse(atob(parts[1]))
    const now = Math.floor(Date.now() / 1000)

    // 检查是否过期（提前5分钟判断）
    return payload.exp > (now + 300)
  } catch {
    return false
  }
}

/**
 * 统一API请求函数
 * 
 * @param options - 请求配置
 * @returns Promise<ApiResponse> - 标准化的响应对象
 * 
 * @example
 * // GET请求
 * const courses = await apiRequest({ url: '/api/courses' })
 * 
 * // POST请求
 * const result = await apiRequest({
 *   url: '/api/courses',
 *   method: 'POST',
 *   data: { title: '新课程', price: 99 },
 *   showLoading: true,
 *   loadingText: '创建中...'
 * })
 * 
 * if (result.success) {
 *   console.log('成功:', result.data)
 * } else if (result.status === 401) {
 *   // 自动跳转登录页
 *   uni.navigateTo({ url: '/pages/login' })
 * }
 */
export function apiRequest<T = any>(options: RequestOptions): Promise<ApiResponse<T>> {
  const {
    url,
    method = 'GET',
    data,
    header = {},
    showLoading = false,
    loadingText = method === 'POST' ? '提交中...' : '加载中...',
    showError = true,
    timeout = 30000
  } = options

  return new Promise((resolve, reject) => {
    // 显示Loading
    if (showLoading) {
      uni.showLoading({ title: loadingText, mask: true })
    }

    // 构建完整headers
    const token = getToken()
    const requestHeader: Record<string, string> = {
      'Content-Type': 'application/json',
      ...header
    }

    if (token) {
      requestHeader['Authorization'] = `Bearer ${token}`
    }

    // 发起请求
    const requestTask = uni.request({
      url,
      method: method as UniApp.RequestOptions['method'],
      data,
      header: requestHeader,
      timeout,
      
      success: (res: UniApp.RequestSuccessCallbackResult) => {
        // 隐藏Loading
        if (showLoading) {
          uni.hideLoading()
        }

        let responseData: any
        
        try {
          // 尝试解析JSON
          if (typeof res.data === 'string') {
            responseData = JSON.parse(res.data)
          } else {
            responseData = res.data
          }
        } catch (parseError) {
          // JSON解析失败，可能是HTML或其他格式
          console.warn('[apiRequest] 响应非JSON格式:', typeof res.data, res.statusCode)
          
          resolve({
            success: false,
            status: res.statusCode,
            data: null as T,
            message: `服务器返回异常 (${res.statusCode})`
          })
          return
        }

        // 处理HTTP状态码
        if (res.statusCode === 200 || res.statusCode === 201) {
          // 业务成功或数据正常返回
          resolve({
            success: responseData.success !== false,  // 兼容旧接口
            status: res.statusCode,
            data: responseData.data ?? responseData,
            message: responseData.message
          })
        } else if (res.statusCode === 401) {
          // 认证失败/过期
          console.warn('[apiRequest] 认证失效 (401)')

          // 检查是否为演示模式token（如果是则不跳转登录页）
          const currentToken = getToken()
          if (currentToken && currentToken.startsWith('demo-')) {
            console.log('[apiRequest] 演示模式，忽略401错误')
            resolve({
              success: false,
              status: 401,
              data: null as T,
              message: '演示模式：API不可用'
            })
            return
          }

          if (showError) {
            uni.showToast({
              title: '登录已过期，请重新登录',
              icon: 'none'
            })
          }

          // 延迟跳转，让用户看到提示
          setTimeout(() => {
            uni.navigateTo({
              url: '/pages/admin/login',
              fail: () => {
                // 如果navigateTo失败（可能已经在登录页），尝试reLaunch
                uni.reLaunch({ url: '/pages/admin/login' })
              }
            })
          }, 1500)

          resolve({
            success: false,
            status: 401,
            data: null as T,
            message: '登录已过期'
          })
        } else if (res.statusCode === 403) {
          // 权限不足
          console.warn('[apiRequest] 权限不足 (403)')
          
          if (showError) {
            uni.showToast({
              title: '您没有权限执行此操作',
              icon: 'none'
            })
          }
          
          resolve({
            success: false,
            status: 403,
            data: null as T,
            message: '权限不足'
          })
        } else if (res.statusCode === 404) {
          // 资源不存在
          console.warn('[apiRequest] 资源未找到 (404)')
          
          resolve({
            success: false,
            status: 404,
            data: null as T,
            message: '请求的资源不存在'
          })
        } else if (res.statusCode >= 500) {
          // 服务器内部错误
          console.error('[apiRequest] 服务器错误:', res.statusCode, responseData)
          
          if (showError) {
            uni.showToast({
              title: '服务器繁忙，请稍后重试',
              icon: 'none'
            })
          }
          
          resolve({
            success: false,
            status: res.statusCode,
            data: null as T,
            message: responseData?.message || '服务器内部错误'
          })
        } else {
          // 其他客户端错误 (400, 422等)
          const errorMsg = responseData?.message || `请求失败 (${res.statusCode})`
          console.warn('[apiRequest] 客户端错误:', errorMsg)
          
          if (showError) {
            uni.showToast({
              title: errorMsg,
              icon: 'none'
            })
          }
          
          resolve({
            success: false,
            status: res.statusCode,
            data: null as T,
            message: errorMsg
          })
        }
      },
      
      fail: (err: UniApp.GeneralCallbackResult) => {
        // 隐藏Loading
        if (showLoading) {
          uni.hideLoading()
        }

        console.error('[apiRequest] 网络请求失败:', err)

        // 区分网络错误类型
        let errorMessage = '网络错误，请重试'
        
        if (err.errMsg?.includes('timeout')) {
          errorMessage = '请求超时，请检查网络后重试'
        } else if (err.errMsg?.includes('abort')) {
          errorMessage = '请求已取消'
        } else if (!navigator.onLine) {
          errorMessage = '网络连接不可用，请检查网络设置'
        }

        if (showError) {
          uni.showToast({
            title: errorMessage,
            icon: 'none'
          })
        }

        reject({
          success: false,
          status: 0,
          data: null as T,
          message: errorMessage,
          originalError: err
        })
      }
    })

    // 可选：支持手动取消请求
    return {
      abort: () => {
        requestTask.abort()
        if (showLoading) {
          uni.hideLoading()
        }
      }
    }
  })
}

/**
 * 快捷方法：GET请求
 */
export function apiGet<T = any>(url: string, options?: Omit<RequestOptions, 'method' | 'data'>): Promise<ApiResponse<T>> {
  return apiRequest<T>({ ...options, url, method: 'GET' })
}

/**
 * 快捷方法：POST请求
 */
export function apiPost<T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'method' | 'data'>): Promise<ApiResponse<T>> {
  return apiRequest<T>({ ...options, url, method: 'POST', data })
}

/**
 * 快捷方法：PUT请求
 */
export function apiPut<T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'method' | 'data'>): Promise<ApiResponse<T>> {
  return apiRequest<T>({ ...options, url, method: 'PUT', data })
}

/**
 * 快捷方法：DELETE请求
 */
export function apiDelete<T = any>(url: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
  return apiRequest<T>({ ...options, url, method: 'DELETE' })
}

/**
 * 文件上传工具（如果需要）
 */
export function uploadFile(url: string, filePath: string, options?: {
  name?: string
  formData?: Record<string, any>
  onProgress?: (progress: number) => void
}): Promise<any> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url,
      filePath,
      name: options?.name || 'file',
      formData: options?.formData,
      
      success: (uploadRes) => {
        if (uploadRes.statusCode === 200) {
          try {
            const data = typeof uploadRes.data === 'string' 
              ? JSON.parse(uploadRes.data) 
              : uploadRes.data
            resolve(data)
          } catch {
            resolve(uploadRes.data)
          }
        } else {
          reject(new Error(`上传失败: ${uploadRes.statusCode}`))
        }
      },
      
      fail: (err) => {
        console.error('[uploadFile] 上传失败:', err)
        reject(err)
      }
    })
  })
}

export default apiRequest
