/**
 * 性能优化使用指南
 * 展示如何使用缓存系统提升性能
 */

// ========== 基础使用 ==========

import { cache } from '@/utils/cache'

// 内存缓存（快速，页面关闭即清除）
cache.memory.set('user', userData, 5 * 60 * 1000) // 5分钟
const user = cache.memory.get('user')

// 本地存储（持久化，跨页面保留）
cache.storage.set('settings', settings, 30 * 60 * 1000) // 30分钟
const settings = cache.storage.get('settings')

// ========== 在组件中使用 ==========

import { cache } from '@/utils/cache'

export default {
  data() {
    return {
      courseList: [],
      loading: false
    }
  },
  
  onLoad() {
    this.loadCourses()
  },
  
  methods: {
    async loadCourses(forceRefresh = false) {
      // 检查缓存
      if (!forceRefresh) {
        const cached = cache.memory.get('courseList')
        if (cached) {
          console.log('使用缓存数据')
          this.courseList = cached
          return
        }
      }
      
      // 加载数据
      this.loading = true
      try {
        const res = await api.get('/courses')
        if (res.success) {
          this.courseList = res.data
          // 存入缓存
          cache.memory.set('courseList', res.data, 5 * 60 * 1000)
        }
      } finally {
        this.loading = false
      }
    },
    
    // 下拉刷新
    async onPullDownRefresh() {
      await this.loadCourses(true)
      uni.stopPullDownRefresh()
    }
  }
}

// ========== 用户数据缓存 ==========

// 登录后缓存用户信息
async function login(phone: string) {
  const res = await api.post('/auth/login', { phone })
  
  if (res.success) {
    // 缓存用户数据（持久化）
    cache.storage.set('userInfo', res.data.user, 7 * 24 * 60 * 60 * 1000) // 7天
    cache.storage.set('token', res.data.token)
    
    // 缓存用户偏好设置（持久化）
    cache.storage.set('userSettings', {
      theme: 'light',
      notifications: true
    })
  }
}

// 获取用户信息（优先从缓存读取）
async function getUserInfo() {
  // 先从缓存读取
  let userInfo = cache.storage.get('userInfo')
  
  if (!userInfo) {
    // 缓存没有，从 API 获取
    const res = await api.get('/users/profile')
    if (res.success) {
      userInfo = res.data
      // 存入缓存
      cache.storage.set('userInfo', userInfo, 7 * 24 * 60 * 60 * 1000)
    }
  }
  
  return userInfo
}

// ========== 列表数据缓存 ==========

// 课程列表缓存
async function getCourseList(page = 1, pageSize = 20) {
  const cacheKey = `courses_page${page}_size${pageSize}`
  
  // 5 分钟缓存
  const cached = cache.memory.get(cacheKey)
  if (cached) {
    return cached
  }
  
  const res = await api.get('/courses', { page, pageSize })
  if (res.success) {
    // 存入内存缓存
    cache.memory.set(cacheKey, res.data, 5 * 60 * 1000)
  }
  
  return res.data
}

// 视频列表缓存
async function getVideoList() {
  const cacheKey = 'videoList'
  
  // 10 分钟缓存
  const cached = cache.storage.get(cacheKey)
  if (cached) {
    return cached
  }
  
  const res = await api.get('/videos')
  if (res.success) {
    cache.storage.set(cacheKey, res.data, 10 * 60 * 1000)
  }
  
  return res.data
}

// ========== 统计数据缓存 ==========

// 仪表盘统计数据（5 分钟缓存）
async function getDashboardStats() {
  const cacheKey = 'dashboardStats'
  
  // 优先从内存读取（快速）
  let stats = cache.memory.get(cacheKey)
  
  if (!stats) {
    // 内存没有，从存储读取
    stats = cache.storage.get(cacheKey)
  }
  
  if (!stats) {
    // 都没有，从 API 获取
    const res = await api.get('/statistics/dashboard')
    if (res.success) {
      stats = res.data
      // 存入缓存（内存 5 分钟，存储 30 分钟）
      cache.memory.set(cacheKey, stats, 5 * 60 * 1000)
      cache.storage.set(cacheKey, stats, 30 * 60 * 1000)
    }
  }
  
  return stats
}

// ========== 缓存管理 ==========

// 查看缓存统计
function showCacheStats() {
  const stats = cache.stats()
  console.log('缓存统计:', stats)
  
  // 输出示例：
  // {
  //   memory: { size: 5, maxSize: 100, keys: ['user', 'courseList', ...] },
  //   storage: { size: 10, keys: ['userInfo', 'token', ...] }
  // }
}

// 清理所有过期缓存
function cleanExpired() {
  cache.clean()
  uni.showToast({ title: '缓存已清理', icon: 'success' })
}

// 清理指定缓存
function clearUserCache() {
  cache.memory.remove('user')
  cache.storage.remove('userInfo')
  uni.showToast({ title: '用户缓存已清除', icon: 'success' })
}

// ========== 缓存策略建议 ==========

/*
 * 缓存策略：
 * 
 * 1. 用户信息 - 存储（7天）
 *    - 变化频率低
 *    - 需要跨页面共享
 * 
 * 2. 列表数据 - 内存（5分钟）
 *    - 变化频率中等
 *    - 单页面使用
 * 
 * 3. 统计数据 - 内存+存储（5分钟/30分钟）
 *    - 变化频率高
 *    - 需要快速响应
 * 
 * 4. 临时数据 - 不缓存
 *    - 验证码等一次性数据
 */

// ========== 在首页优化中的使用 ==========

import { cache } from '@/utils/cache'

export default {
  async onShow() {
    // 检查登录状态
    const userInfo = cache.storage.get('userInfo')
    if (userInfo) {
      this.userInfo = userInfo
      this.isLoggedIn = true
    }
    
    // 加载内容（使用缓存优化）
    await this.loadContent()
  },
  
  methods: {
    async loadContent() {
      // 尝试从缓存读取
      const cachedCourses = cache.memory.get('homeCourses')
      const cachedVideos = cache.memory.get('homeVideos')
      
      if (cachedCourses && cachedVideos) {
        this.courseList = cachedCourses
        this.videoList = cachedVideos
        return
      }
      
      // 缓存没有，加载数据
      const [coursesRes, videosRes] = await Promise.all([
        api.get('/courses', { limit: 12 }),
        api.get('/videos', { limit: 12 })
      ])
      
      if (coursesRes.success) {
        this.courseList = coursesRes.data.list
        cache.memory.set('homeCourses', coursesRes.data.list, 5 * 60 * 1000)
      }
      
      if (videosRes.success) {
        this.videoList = videosRes.data.list
        cache.memory.set('homeVideos', videosRes.data.list, 5 * 60 * 1000)
      }
    },
    
    // 内容更新时清除缓存
    async onContentUpdate() {
      // 清除首页缓存
      cache.memory.remove('homeCourses')
      cache.memory.remove('homeVideos')
      
      // 重新加载
      await this.loadContent()
      
      uni.showToast({ title: '内容已更新', icon: 'success' })
    }
  }
}
