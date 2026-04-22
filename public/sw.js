/**
 * CRM系统 Service Worker (PWA离线支持)
 * 版本: 1.0.0
 */

const CACHE_NAME = 'crm-cache-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/icons/icon-192x192.png',
  '/static/icons/icon-512x512.png'
]

// API缓存白名单（只缓存GET请求）
const API_CACHE_WHITELIST = [
  /\/api\/health/,
  /\/api\/videos/,
  /\/api\/courses/,
  /\/api\/products/
]

// 安装事件 - 预缓存核心资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...')
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => self.clients.claim())
  )
})

// 拦截网络请求 - 缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 只处理GET请求
  if (request.method !== 'GET') {
    return
  }

  // 同源请求才处理
  if (url.origin !== location.origin) {
    return
  }

  // API请求: 网络优先 + 缓存降级
  if (url.pathname.startsWith('/api/')) {
    const shouldCache = API_CACHE_WHITELIST.some(regex => regex.test(url.pathname))

    if (shouldCache) {
      event.respondWith(
        fetch(request)
          .then(response => {
            // 成功则更新缓存
            if (response.ok) {
              const responseClone = response.clone()
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseClone)
              })
            }
            return response
          })
          .catch(() => {
            // 网络失败时返回缓存
            return caches.match(request).then(cached => {
              if (cached) {
                return new Response(cached.body, {
                  ...cached,
                  headers: {
                    ...cached.headers,
                    'X-Cache': 'true',
                    'X-From': 'service-worker'
                  }
                })
              }
              // 无缓存时返回离线提示
              return new Response(
                JSON.stringify({
                  code: 0,
                  success: false,
                  message: '网络不可用，请检查连接后重试'
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              )
            })
          })
      )
    }
    return
  }

  // 静态资源: 缓存优先 + 网络更新
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) {
          // 后台更新缓存
          fetch(request).then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, response)
              })
            }
          }).catch(() => {}) // 忽略后台更新错误

          return cached
        }

        // 无缓存时从网络获取
        return fetch(request)
          .then(response => {
            if (response.ok) {
              const responseClone = response.clone()
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseClone)
              })
            }
            return response
          })
      })
  )
})

// 监听消息事件（来自主线程的通信）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.source?.postMessage({ type: 'CACHE_CLEARED' })
    })
  }
})

console.log('[SW] Service Worker loaded')
