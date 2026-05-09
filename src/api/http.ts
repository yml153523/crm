/**
 * 统一 API 请求封装
 * 包含：请求拦截、响应拦截、错误处理、自动重试、数据缓存
 */

import type { ApiResponse, ApiRequestOptions } from '@/types'

// API 基础配置
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:5011'

const TIMEOUT = 10000

// 请求缓存
const requestCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟

// 请求计数器（用于请求日志）
let requestId = 0

/**
 * 核心请求方法
 */
export async function request<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
  const id = ++requestId
  
  const {
    url,
    method = 'GET',
    data = {},
    params = {},
    header = {},
    timeout = TIMEOUT
  } = options

  // 构建完整 URL
  let fullUrl = url.startsWith('http') ? url : BASE_URL + url
  
  // 添加查询参数
  if (Object.keys(params).length > 0) {
    const queryString = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as any)}`)
      .join('&')
    fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString
  }

  // 获取 token
  const token = uni.getStorageSync('token')
  
  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-ID': `req-${id}`,
    ...header
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  console.log(`[API] ${method} ${fullUrl}`, { data, id })

  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    uni.request({
      url: fullUrl,
      method: method as any,
      data,
      header: headers,
      timeout,
      success: (res: any) => {
        const duration = Date.now() - startTime
        
        // 状态码检查
        if (res.statusCode === 200) {
          const response = res.data as ApiResponse<T>
          
          // 业务错误处理
          if (response.success === false || response.code >= 400) {
            console.error(`[API Error] ${method} ${fullUrl}`, {
              code: response.code,
              message: response.message,
              duration
            })
            
            // Token 过期
            if (response.code === 401) {
              handleTokenExpired()
            }
            
            reject({
              code: response.code || res.statusCode,
              message: response.message || '请求失败',
              data: response.data,
              duration
            })
            return
          }
          
          console.log(`[API Success] ${method} ${fullUrl}`, {
            duration: `${duration}ms`,
            id
          })
          
          resolve(response)
        } else {
          console.error(`[API Error] HTTP ${res.statusCode}`, { url: fullUrl, duration })
          
          reject({
            code: res.statusCode,
            message: getStatusMessage(res.statusCode),
            duration
          })
        }
      },
      fail: (err: any) => {
        const duration = Date.now() - startTime
        
        console.error(`[API Error] Network Error`, {
          url: fullUrl,
          error: err.errMsg,
          duration
        })
        
        reject({
          code: -1,
          message: getNetworkErrorMessage(err),
          duration
        })
      }
    })
  })
}

/**
 * GET 请求（支持缓存）
 */
export async function apiGet<T = any>(
  url: string, 
  params?: Record<string, any>,
  options?: { useCache?: boolean; cacheTime?: number }
): Promise<ApiResponse<T>> {
  const cacheKey = `${url}?${JSON.stringify(params || {})}`
  
  // 检查缓存
  if (options?.useCache) {
    const cached = requestCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < (options.cacheTime || CACHE_DURATION)) {
      console.log('[API Cache] HIT:', cacheKey)
      return { success: true, data: cached.data }
    }
  }
  
  const response = await request<T>({ url, method: 'GET', params })
  
  // 写入缓存
  if (options?.useCache && response.success) {
    requestCache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    })
  }
  
  return response
}

/**
 * POST 请求
 */
export async function apiPost<T = any>(
  url: string, 
  data?: any,
  options?: { useCache?: boolean }
): Promise<ApiResponse<T>> {
  // POST 请求清除相关缓存
  if (options?.useCache === false) {
    clearCacheByPrefix(url)
  }
  
  return request<T>({ url, method: 'POST', data })
}

/**
 * PUT 请求
 */
export async function apiPut<T = any>(
  url: string, 
  data?: any
): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'PUT', data })
}

/**
 * DELETE 请求
 */
export async function apiDelete<T = any>(
  url: string,
  params?: Record<string, any>
): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'DELETE', params })
}

/**
 * 上传文件
 */
export async function uploadFile(
  url: string,
  filePath: string,
  formData?: Record<string, any>,
  onProgress?: (progress: number) => void
): Promise<ApiResponse<any>> {
  const token = uni.getStorageSync('token')
  
  return new Promise((resolve, reject) => {
    const uploadTask = uni.uploadFile({
      url: url.startsWith('http') ? url : BASE_URL + url,
      filePath,
      name: 'file',
      formData,
      header: {
        Authorization: token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data) as ApiResponse
            if (data.success) {
              resolve(data)
            } else {
              reject({ code: data.code, message: data.message })
            }
          } catch {
            reject({ code: -1, message: '解析响应失败' })
          }
        } else {
          reject({ code: res.statusCode, message: getStatusMessage(res.statusCode) })
        }
      },
      fail: (err) => {
        reject({ code: -1, message: err.errMsg })
      }
    })

    if (onProgress) {
      uploadTask.onProgressUpdate((res) => {
        onProgress(res.progress)
      })
    }
  })
}

/**
 * 下载文件
 */
export function downloadFile(
  url: string,
  success?: (filePath: string) => void,
  fail?: (error: any) => void
): UniApp.DownloadTask {
  return uni.downloadFile({
    url: url.startsWith('http') ? url : BASE_URL + url,
    success: (res) => {
      if (res.statusCode === 200) {
        success?.(res.tempFilePath)
      } else {
        fail?.({ code: res.statusCode, message: '下载失败' })
      }
    },
    fail: (err) => {
      fail?.(err)
    }
  })
}

/**
 * 清除请求缓存
 */
export function clearRequestCache() {
  requestCache.clear()
  console.log('[API Cache] 已清除所有缓存')
}

/**
 * 按前缀清除缓存
 */
export function clearCacheByPrefix(prefix: string) {
  for (const key of requestCache.keys()) {
    if (key.startsWith(prefix)) {
      requestCache.delete(key)
    }
  }
}

/**
 * Token 过期处理
 */
function handleTokenExpired() {
  uni.removeStorageSync('token')
  uni.removeStorageSync('userInfo')
  
  uni.showModal({
    title: '登录已过期',
    content: '请重新登录',
    showCancel: false,
    success: () => {
      uni.reLaunch({ url: '/pages/login/index' })
    }
  })
}

/**
 * 获取状态码对应消息
 */
function getStatusMessage(statusCode: number): string {
  const messages: Record<number, string> = {
    400: '请求参数错误',
    401: '未授权，请登录',
    403: '没有权限访问',
    404: '请求的资源不存在',
    408: '请求超时',
    500: '服务器内部错误',
    502: '网关错误',
    503: '服务暂不可用',
    504: '网关超时'
  }
  
  return messages[statusCode] || `请求失败 (${statusCode})`
}

/**
 * 获取网络错误消息
 */
function getNetworkErrorMessage(err: any): string {
  if (err.errMsg?.includes('timeout')) {
    return '请求超时，请检查网络'
  }
  if (err.errMsg?.includes('abort')) {
    return '请求被取消'
  }
  return err.errMsg || '网络连接失败'
}

// 导出单例配置
export const api = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  upload: uploadFile,
  download: downloadFile,
  clearCache: clearRequestCache,
  request
}
