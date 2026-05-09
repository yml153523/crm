<template>
  <view class="home-page">
    <!-- 头部区域 - 优化渐变背景 -->
    <view class="header-area">
      <view class="header-bg"></view>
      <view class="header-content">
        <!-- 品牌区域 -->
        <view class="brand-row">
          <view class="brand-section">
            <text class="brand-name">宜宁</text>
            <text class="brand-separator">·</text>
            <text class="brand-sub">品质生活</text>
          </view>
          <view class="header-actions">
            <view class="icon-btn" @click="toggleNotifications">
              <text class="icon">🔔</text>
              <view class="badge-dot" v-if="hasUnread"></view>
            </view>
          </view>
        </view>

        <!-- 用户信息卡片 -->
        <view class="user-card" @click="handleUserClick">
          <view class="avatar-wrap">
            <image v-if="isLoggedIn && userInfo?.avatar" :src="userInfo.avatar" mode="aspectFill" class="avatar-img" />
            <view v-else class="avatar-placeholder">
              <text class="avatar-icon">👤</text>
            </view>
          </view>
          <view class="user-info">
            <text class="greeting">{{ isLoggedIn ? 'Hi，' + (userInfo?.nickname || userInfo?.name || '用户') : '你好，请登录' }}</text>
            <text class="balance" v-if="isLoggedIn && balance && balance !== '0.00'">余额 ¥{{ balance }}</text>
            <text class="login-hint" v-else>登录解锁更多功能</text>
          </view>
          <text class="arrow" v-if="isLoggedIn">›</text>
        </view>

        <!-- 搜索框 -->
        <view class="search-box" @click="goSearch">
          <text class="search-icon">🔍</text>
          <text class="search-placeholder">{{ MESSAGES.USER.SEARCH_PLACEHOLDER }}</text>
        </view>
      </view>
    </view>

    <!-- 快捷入口 - 优化网格布局 -->
    <view class="quick-actions">
      <view class="quick-grid">
        <view class="quick-item" @click="goPage('/pages/user/recharge')">
          <view class="quick-icon-wrap icon-recharge">
            <text class="quick-icon">💰</text>
          </view>
          <text class="quick-label">{{ MESSAGES.USER.RECHARGE_CENTER }}</text>
        </view>
        <view class="quick-item" @click="goPage('/pages/user/order/list')">
          <view class="quick-icon-wrap icon-order">
            <text class="quick-icon">📋</text>
          </view>
          <text class="quick-label">{{ MESSAGES.USER.MY_ORDERS }}</text>
        </view>
        <view class="quick-item" @click="goPage('/pages/user/red-packet/center')">
          <view class="quick-icon-wrap icon-redpacket">
            <text class="quick-icon">🧧</text>
          </view>
          <text class="quick-label">{{ MESSAGES.USER.REDPACKET_CENTER }}</text>
        </view>
        <view class="quick-item" @click="goPage('/pages/user/cart/index')">
          <view class="quick-icon-wrap icon-cart">
            <text class="quick-icon">🛒</text>
          </view>
          <text class="quick-label">{{ MESSAGES.USER.MY_CART }}</text>
        </view>
      </view>
    </view>

    <!-- 内容标签页 - 优化触摸区域 -->
    <view class="tab-container">
      <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false" enhanced>
        <view class="tab-list">
          <view
            v-for="tab in contentTabs"
            :key="tab.key"
            class="tab-item"
            :class="{ active: activeTab === tab.key }"
            @click="switchTab(tab.key)"
          >
            <text class="tab-icon">{{ tabIcons[tab.key] }}</text>
            <text class="tab-text">{{ tab.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 内容区域 -->
    <scroll-view
      scroll-y
      class="content-area"
      :style="{ height: contentHeight }"
      @scrolltolower="loadMore"
      enhanced
      :show-scrollbar="false"
    >
      <!-- 推荐内容 -->
      <view class="section" v-if="activeTab === 'recommend'">
        <view class="section-header">
          <text class="section-title">✨ 为你推荐</text>
          <text class="section-sub">精选优质内容</text>
        </view>
        <view class="waterfall-grid">
          <view
            class="card"
            v-for="(item, index) in recommendList"
            :key="item._id || index"
            @click="handleContentClick(item, 'recommend')"
          >
            <view class="card-cover" :style="{ background: getGradient(index) }">
              <text class="card-emoji">{{ item.emoji }}</text>
              <view class="type-tag">{{ item.typeLabel }}</view>
              <view class="play-btn" v-if="item.type === 'video'">
                <text>▶</text>
              </view>
            </view>
            <view class="card-body">
              <text class="card-title">{{ item.title }}</text>
              <view class="card-footer">
                <text class="card-stats">{{ item.stats }}</text>
                <text class="card-price" v-if="item.price">¥{{ item.price }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 课程列表 -->
      <view class="section" v-if="activeTab === 'course'">
        <view class="section-header">
          <text class="section-title">📚 {{ MESSAGES.USER.COURSE }}</text>
          <text class="section-sub">系统化学习</text>
        </view>
        <view class="list-cards">
          <view
            class="list-card"
            v-for="(item, index) in courseList"
            :key="item._id || index"
            @click="handleContentClick(item, 'course')"
          >
            <view class="list-cover" :style="{ background: getGradient(index + 10) }">
              <text class="list-emoji">📖</text>
            </view>
            <view class="list-content">
              <text class="list-title">{{ item.title }}</text>
              <text class="list-desc" v-if="item.desc">{{ item.desc }}</text>
              <view class="list-footer">
                <text class="list-stats">{{ MESSAGES.USER.STUDENTS_COUNT(item.students || 0) }}</text>
                <text class="list-price" v-if="item.price">¥{{ item.price }}</text>
                <text class="list-free" v-else>{{ MESSAGES.USER.FREE }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 视频列表 -->
      <view class="section" v-if="activeTab === 'video'">
        <view class="section-header">
          <text class="section-title">🎬 {{ MESSAGES.USER.VIDEO }}</text>
          <text class="section-sub">精彩视频内容</text>
        </view>
        <view class="video-grid">
          <view
            class="video-card"
            v-for="(item, index) in videoList"
            :key="item._id || index"
            @click="handleContentClick(item, 'video')"
          >
            <view class="video-cover" :style="{ background: getGradient(index + 20) }">
              <text class="video-emoji">🎬</text>
              <view class="play-overlay">
                <view class="play-circle"><text>▶</text></view>
              </view>
              <view class="duration-tag" v-if="item.duration">{{ item.duration }}</view>
            </view>
            <text class="video-title">{{ item.title }}</text>
            <text class="video-views">{{ MESSAGES.USER.VIEWS_COUNT(item.views || 0) }}</text>
          </view>
        </view>
      </view>

      <!-- 商品列表 -->
      <view class="section" v-if="activeTab === 'product'">
        <view class="section-header">
          <text class="section-title">🛍️ {{ MESSAGES.USER.PRODUCT }}</text>
          <text class="section-sub">发现好物</text>
        </view>
        <view class="product-grid">
          <view
            class="product-card"
            v-for="(item, index) in productList"
            :key="item._id || index"
            @click="handleContentClick(item, 'product')"
          >
            <view class="product-cover" :style="{ background: getGradient(index + 30) }">
              <text class="product-emoji">🛍️</text>
              <view class="price-tag">¥{{ item.price }}</view>
              <view class="stock-tag" v-if="item.stock && item.stock <= 10">{{ MESSAGES.USER.STOCK_WARN(item.stock) }}</view>
            </view>
            <view class="product-body">
              <text class="product-title">{{ item.title || item.name }}</text>
              <view class="product-footer">
                <text class="product-sales">{{ MESSAGES.USER.SALES_COUNT(item.sales || 0) }}</text>
                <view class="buy-btn">抢购</view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-if="currentList.length === 0 && !loading">
        <text class="empty-icon">{{ currentTabEmoji }}</text>
        <text class="empty-text">{{ MESSAGES.USER.NO_CONTENT }}</text>
      </view>

      <!-- 加载状态 -->
      <view class="loading-state" v-if="loading">
        <view class="spinner"></view>
        <text class="loading-text">{{ MESSAGES.COMMON.LOADING }}</text>
      </view>

      <view class="bottom-safe"></view>
    </scroll-view>

    <!-- 用户面板 -->
    <view class="panel-mask" v-if="showUserPanel" @click="showUserPanel = false">
      <view class="user-panel" @click.stop>
        <view class="panel-header">
          <image v-if="isLoggedIn && userInfo?.avatar" :src="userInfo.avatar" class="panel-avatar" />
          <view v-else class="panel-avatar-placeholder">
            <text>👤</text>
          </view>
          <view class="panel-info">
            <text class="panel-name">{{ isLoggedIn ? userInfo?.nickname || userInfo?.name || '用户' : '未登录' }}</text>
            <text class="panel-balance" v-if="isLoggedIn && balance && balance !== '0.00'">余额 ¥{{ balance }}</text>
          </view>
          <view class="vip-badge" v-if="isLoggedIn && userInfo?.isVIP">VIP</view>
        </view>
        
        <view class="panel-menu" v-if="!isLoggedIn" @click="goLogin">
          <text class="panel-login-btn">点击登录 / 注册</text>
        </view>

        <view class="panel-menu-list">
          <view class="menu-item" @click="goPage('/pages/user/recharge')">
            <text class="menu-icon">💰</text>
            <text class="menu-text">{{ MESSAGES.USER.RECHARGE_CENTER }}</text>
            <text class="menu-arrow">›</text>
          </view>
          <view class="menu-item" @click="goPage('/pages/user/order/list')">
            <text class="menu-icon">📋</text>
            <text class="menu-text">{{ MESSAGES.USER.MY_ORDERS }}</text>
            <text class="menu-arrow">›</text>
          </view>
          <view class="menu-item" @click="goPage('/pages/user/red-packet/center')">
            <text class="menu-icon">🧧</text>
            <text class="menu-text">{{ MESSAGES.USER.REDPACKET_CENTER }}</text>
            <text class="menu-arrow">›</text>
          </view>
        </view>

        <view class="panel-logout" v-if="isLoggedIn" @click="handleLogout">
          <text class="logout-text">{{ MESSAGES.USER.LOGOUT }}</text>
        </view>
      </view>
    </view>

    <!-- 通知面板 -->
    <view class="panel-mask" v-if="showNotifications" @click="showNotifications = false">
      <view class="notify-panel" @click.stop>
        <view class="notify-header">
          <text class="notify-title">通知消息</text>
          <text class="notify-close" @click="showNotifications = false">✕</text>
        </view>
        <scroll-view scroll-y class="notify-list">
          <view
            class="notify-item"
            v-for="item in notifications"
            :key="item._id"
            @click="markRemindRead(item)"
          >
            <view class="notify-left">
              <view class="unread-dot" v-if="!item.read"></view>
              <text class="notify-icon">{{ getNotifyIcon(item.type) }}</text>
            </view>
            <view class="notify-content">
              <text class="notify-item-title">{{ item.title }}</text>
              <text class="notify-item-content">{{ item.content }}</text>
              <text class="notify-time">{{ formatNotifyTime(item.sentAt) }}</text>
            </view>
          </view>
          <view class="notify-empty" v-if="notifications.length === 0">
            <text class="notify-empty-icon">📭</text>
            <text>暂无通知</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { MESSAGES, API_PATHS } from '@/config/constants'

// TypeScript 类型
interface ContentItem {
  _id?: string
  title: string
  name?: string
  price?: number
  students?: number
  views?: number
  duration?: string
  stock?: number
  sales?: number
  desc?: string
  author?: string
}

interface RecommendItem extends ContentItem {
  emoji: string
  type: 'course' | 'video' | 'product'
  typeLabel: string
  stats: string
}

interface NotificationItem {
  _id: string
  title: string
  content: string
  type: string
  status: string
  sentAt: string
  read: boolean
}

type TabKey = 'recommend' | 'course' | 'video' | 'product'

// 响应式数据
const windowHeight = ref(667)
const isLoggedIn = ref(false)
const userInfo = ref<Record<string, any> | null>(null)
const balance = ref('0.00')
const loading = ref(true)
const activeTab = ref<TabKey>('recommend')
const showUserPanel = ref(false)
const showNotifications = ref(false)
const hasUnread = ref(false)
const notifications = ref<NotificationItem[]>([])

const courseList = ref<ContentItem[]>([])
const videoList = ref<ContentItem[]>([])
const productList = ref<ContentItem[]>([])
const recommendList = ref<RecommendItem[]>([])

// 计算属性
const contentTabs = [
  { key: 'recommend' as TabKey, name: MESSAGES.USER.RECOMMEND },
  { key: 'course' as TabKey, name: MESSAGES.USER.COURSE },
  { key: 'video' as TabKey, name: MESSAGES.USER.VIDEO },
  { key: 'product' as TabKey, name: MESSAGES.USER.PRODUCT }
]

const tabIcons: Record<string, string> = {
  recommend: '✨',
  course: '📚',
  video: '🎬',
  product: '🛍️'
}

const currentList = computed(() => {
  const map: Record<string, any[]> = {
    recommend: recommendList.value,
    course: courseList.value,
    video: videoList.value,
    product: productList.value
  }
  return map[activeTab.value] || []
})

const currentTabEmoji = computed(() => {
  const map: Record<string, string> = { recommend: '✨', course: '📚', video: '🎬', product: '🛍️' }
  return map[activeTab.value] || '📭'
})

const contentHeight = computed(() => {
  return `calc(100vh - ${isMobile.value ? '380px' : '400px'})`
})

const isMobile = computed(() => {
  return typeof window !== 'undefined' ? window.innerWidth < 768 : false
})

// 渐变色数组
const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
]

function getGradient(index: number): string {
  return gradients[index % gradients.length]
}

// 生命周期
onMounted(() => {
  hideNativeNavBar()
  initData()
  if (typeof window !== 'undefined') {
    windowHeight.value = window.innerHeight
  }
})

onShow(() => {
  hideNativeNavBar()
  checkLoginStatus()
  refreshData()
  if (isLoggedIn.value) {
    fetchNotificationUnreadCount()
  }
})

// 核心方法
function hideNativeNavBar() {
  // #ifdef H5
  setTimeout(() => {
    const selectors = ['.uni-navbar', '.uni-page-head', '.uni-page-head-hd']
    selectors.forEach(s => {
      document.querySelectorAll(s).forEach(el => {
        ;(el as HTMLElement).style.display = 'none'
      })
    })
    document.querySelectorAll('.uni-page-wrapper').forEach(el => {
      ;(el as HTMLElement).style.paddingTop = '0'
    })
  }, 0)
  // #endif
}

async function checkLoginStatus() {
  try {
    const token = uni.getStorageSync('token')
    if (!token) {
      isLoggedIn.value = false
      userInfo.value = null
      balance.value = '0.00'
      return
    }

    let apiVerified = false
    try {
      const res: any = await new Promise((resolve, reject) => {
        uni.request({
          url: `${API_PATHS.USERS}/profile?t=${Date.now()}`,
          method: 'GET',
          header: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
          success: resolve, fail: reject
        })
      })
      if (res.data?.success && res.data.data) {
        isLoggedIn.value = true
        userInfo.value = res.data.data
        balance.value = (res.data.data.balance || 0).toFixed(2)
        uni.setStorageSync('userInfo', res.data.data)
        apiVerified = true
        return
      }
    } catch { /* network error, try fallback */ }

    if (!apiVerified) {
      const storedInfo = uni.getStorageSync('userInfo')
      if (storedInfo && storedInfo.phone) {
        isLoggedIn.value = true
        userInfo.value = storedInfo
        balance.value = (storedInfo.balance || 0).toFixed(2)
        return
      }
      isLoggedIn.value = false
      userInfo.value = null
      balance.value = '0.00'
    }
  } catch {
    isLoggedIn.value = false
  }
}

async function initData() {
  loading.value = true
  try {
    await loadAllContent()
  } catch (e) {
    console.error('[Home] 初始化失败:', e)
  } finally {
    loading.value = false
  }
}

async function refreshData() {
  await loadAllContent()
}

async function loadAllContent() {
  try {
    const ts = Date.now()
    const token = uni.getStorageSync('token')
    const authHeader: Record<string, string> = {}
    if (token && !token.startsWith('demo-')) {
      authHeader['Authorization'] = `Bearer ${token}`
    }

    const [courseRes, videoRes, productRes] = await Promise.allSettled([
      authHeader.Authorization
        ? uni.request({ url: `${API_PATHS.COURSES}?limit=12&_t=${ts}`, method: 'GET', header: authHeader })
        : Promise.resolve({ data: { success: false } }),
      uni.request({ url: `${API_PATHS.VIDEOS}?limit=12&_t=${ts}`, method: 'GET' }),
      authHeader.Authorization
        ? uni.request({ url: `${API_PATHS.PRODUCTS}?limit=12&_t=${ts}`, method: 'GET', header: authHeader })
        : Promise.resolve({ data: { success: false } })
    ])

    courseList.value = extractList(courseRes)
    videoList.value = extractList(videoRes)
    productList.value = extractList(productRes)
    buildRecommendList()
  } catch (e) {
    console.error('[Home] 内容加载失败:', e)
  }
}

function extractList(res: any): ContentItem[] {
  return res.status === 'fulfilled' && res.value.data?.success
    ? res.value.data.data?.list || []
    : []
}

function buildRecommendList() {
  const list: RecommendItem[] = []
  courseList.value.slice(0, 3).forEach(item => {
    list.push({ ...item, emoji: '📖', type: 'course', typeLabel: MESSAGES.USER.COURSE_LABEL, stats: MESSAGES.USER.STUDENTS_COUNT(item.students || 0) })
  })
  videoList.value.slice(0, 3).forEach(item => {
    list.push({ ...item, emoji: '🎬', type: 'video', typeLabel: MESSAGES.USER.VIDEO_LABEL, stats: MESSAGES.USER.VIEWS_COUNT(item.views || 0) })
  })
  productList.value.slice(0, 2).forEach(item => {
    list.push({ ...item, emoji: '🛍️', type: 'product', typeLabel: MESSAGES.USER.PRODUCT_LABEL, stats: MESSAGES.USER.SALES_COUNT(item.sales || 0) })
  })
  recommendList.value = list
}

// 事件处理
function switchTab(key: TabKey) {
  activeTab.value = key
}

function handleUserClick() {
  showUserPanel.value = !showUserPanel.value
}

function handleContentClick(item: ContentItem | RecommendItem, type: string) {
  const actualType = (item as RecommendItem).type || type
  if (!item._id) {
    uni.showModal({ title: String(item.title || ''), content: MESSAGES.USER.DETAIL_DEV, showCancel: false })
    return
  }
  const routeMap: Record<string, string> = {
    course: `/pages/user/course/detail?id=${item._id}`,
    video: `/pages/user/video/player?id=${item._id}`,
    product: `/pages/user/product/detail?id=${item._id}`
  }
  uni.navigateTo({ url: routeMap[actualType] }).catch(() => {
    uni.showModal({ title: String(item.title || ''), content: MESSAGES.USER.DETAIL_DEV, showCancel: false })
  })
}

function goLogin() {
  showUserPanel.value = false
  uni.navigateTo({ url: '/pages/login/index' })
}

async function toggleNotifications() {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) {
    await fetchNotifications()
  }
}

async function fetchNotifications() {
  const token = uni.getStorageSync('token')
  if (!token || token.startsWith('demo-')) return
  try {
    const res: any = await new Promise((resolve, reject) => {
      uni.request({
        url: `${API_PATHS.REMINDS}/my-reminds?page=1&pageSize=50`,
        method: 'GET',
        header: { Authorization: `Bearer ${token}` },
        success: resolve, fail: reject
      })
    })
    if (res.data?.success) {
      notifications.value = res.data.data?.list || []
      hasUnread.value = (res.data.data?.unreadCount || 0) > 0
    }
  } catch (e) {
    console.error('[Home] 获取通知失败:', e)
  }
}

async function markRemindRead(item: NotificationItem) {
  if (item.read) return
  const token = uni.getStorageSync('token')
  if (!token) return
  try {
    const res: any = await new Promise((resolve, reject) => {
      uni.request({
        url: `${API_PATHS.REMINDS}/my-reminds/${item._id}/read`,
        method: 'POST',
        header: { Authorization: `Bearer ${token}` },
        success: resolve, fail: reject
      })
    })
    if (res.data?.success) {
      item.read = true
      hasUnread.value = notifications.value.some(n => !n.read)
    }
  } catch (e) {
    console.error('[Home] 标记已读失败:', e)
  }
}

function formatNotifyTime(sentAt: string): string {
  if (!sentAt) return ''
  const diff = Date.now() - new Date(sentAt).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return new Date(sentAt).toLocaleDateString()
}

function getNotifyIcon(type: string): string {
  const map: Record<string, string> = {
    redPacket: '🧧',
    classReminder: '📅',
    system: '📢',
    custom: '💬'
  }
  return map[type] || '🔔'
}

function goSearch() {
  uni.showToast({ title: MESSAGES.USER.SEARCH_DEV, icon: 'none' })
}

function goPage(path: string) {
  showUserPanel.value = false
  uni.navigateTo({ url: path }).catch(() => {
    uni.showToast({ title: MESSAGES.COMMON.DEV_IN_PROGRESS, icon: 'none' })
  })
}

function handleLogout() {
  uni.showModal({
    title: MESSAGES.USER.CONFIRM_LOGOUT,
    content: MESSAGES.USER.CONFIRM_LOGOUT_CONTENT,
    confirmText: MESSAGES.USER.LOGOUT_CONFIRM_BTN,
    success: (res) => {
      if (res.confirm) {
        showUserPanel.value = false
        uni.removeStorageSync('token')
        uni.removeStorageSync('userInfo')
        isLoggedIn.value = false
        userInfo.value = null
        balance.value = '0.00'
        notifications.value = []
        hasUnread.value = false
        uni.showToast({ title: MESSAGES.COMMON.LOGGED_OUT, icon: 'success' })
      }
    }
  })
}

function loadMore() { }

async function fetchNotificationUnreadCount() {
  const token = uni.getStorageSync('token')
  if (!token || token.startsWith('demo-')) return
  try {
    const res: any = await new Promise((resolve, reject) => {
      uni.request({
        url: `${API_PATHS.REMINDS}/my-reminds?page=1&pageSize=1&unreadOnly=1`,
        method: 'GET',
        header: { Authorization: `Bearer ${token}` },
        success: resolve, fail: reject
      })
    })
    if (res.data?.success) {
      hasUnread.value = (res.data.data?.unreadCount || 0) > 0
    }
  } catch (e) { /* silent */ }
}
</script>

<style scoped lang="scss">
// 响应式断点
$breakpoint-lg: 768px;
$breakpoint-md: 414px;
$breakpoint-sm: 375px;

// 通用样式
.home-page {
  min-height: 100vh;
  background: #F5F6FA;
  position: relative;
}

// 头部区域
.header-area {
  position: relative;
  overflow: hidden;
  padding-bottom: 16px;
}

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 220px;
  background: linear-gradient(160deg, #5B4FCF 0%, #7C6FF7 30%, #9B8FFF 60%, #C4B5FF 100%);
  border-radius: 0 0 28px 28px;
  
  &::after, &::before {
    content: '';
    position: absolute;
    background: rgba(255,255,255,0.08);
    border-radius: 50%;
  }
  
  &::after {
    top: -50px;
    right: -30px;
    width: 160px;
    height: 160px;
  }
  
  &::before {
    bottom: -25px;
    left: -15px;
    width: 100px;
    height: 100px;
  }
}

.header-content {
  position: relative;
  z-index: 1;
  padding: 16px 16px 0;
}

// 品牌行
.brand-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
}

.brand-section {
  display: flex;
  align-items: baseline;
}

.brand-name {
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 2px;
}

.brand-separator {
  font-size: 20px;
  font-weight: 800;
  color: rgba(255,255,255,0.6);
  margin: 0 4px;
}

.brand-sub {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255,255,255,0.7);
  letter-spacing: 2px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.18);
  border-radius: 50%;
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all 0.2s;
  
  &:active {
    background: rgba(255,255,255,0.3);
    transform: scale(0.93);
  }
}

.icon {
  font-size: 18px;
}

.badge-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: #FF3B30;
  border-radius: 50%;
  border: 2px solid rgba(123,111,247,0.8);
}

// 用户卡片
.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  padding: 12px;
  background: rgba(255,255,255,0.15);
  border-radius: 16px;
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all 0.2s;
  
  &:active {
    background: rgba(255,255,255,0.25);
  }
}

.avatar-wrap {
  flex-shrink: 0;
}

.avatar-img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.4);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.avatar-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  border: 2px solid rgba(255,255,255,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  font-size: 24px;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.greeting {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
}

.balance {
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  font-weight: 400;
}

.login-hint {
  font-size: 12px;
  color: rgba(255,255,255,0.6);
}

.arrow {
  font-size: 26px;
  color: rgba(255,255,255,0.5);
  font-weight: 300;
}

// 搜索框
.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  margin-top: 16px;
  background: #fff;
  border-radius: 28px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: all 0.2s;
  
  &:active {
    transform: scale(0.985);
    box-shadow: 0 1px 6px rgba(0,0,0,0.1);
  }
}

.search-icon {
  font-size: 16px;
  opacity: 0.5;
}

.search-placeholder {
  font-size: 14px;
  color: #B0B0B0;
}

// 快捷入口
.quick-actions {
  margin: -4px 12px 0;
  padding: 12px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  position: relative;
  z-index: 2;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:active {
    transform: scale(0.92);
  }
}

.quick-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-recharge { background: linear-gradient(135deg, #FFF3E0, #FFE0B2); }
.icon-order { background: linear-gradient(135deg, #E3F2FD, #BBDEFB); }
.icon-redpacket { background: linear-gradient(135deg, #FCE4EC, #F8BBD0); }
.icon-cart { background: linear-gradient(135deg, #E8F5E9, #C8E6C9); }

.quick-icon {
  font-size: 22px;
}

.quick-label {
  font-size: 11px;
  color: #666;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
}

// 标签页
.tab-container {
  position: sticky;
  top: 0;
  z-index: 99;
  background: #F5F6FA;
  padding: 10px 12px 0;
}

.tab-scroll {
  white-space: nowrap;
}

.tab-list {
  display: flex;
  gap: 0;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  overflow: hidden;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 8px;
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
  
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 1px;
    height: 60%;
    background: #F0F0F0;
  }
  
  &.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    
    .tab-text {
      color: #fff;
      font-weight: 700;
    }
  }
}

.tab-icon {
  font-size: 14px;
}

.tab-text {
  font-size: 13px;
  color: #888;
  font-weight: 500;
}

// 内容区域
.content-area {
  padding: 12px 12px 0;
}

.section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 4px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
}

.section-sub {
  font-size: 12px;
  color: #B0B0B0;
}

// 瀑布流网格
.waterfall-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  
  @media (max-width: #{$breakpoint-sm}) {
    gap: 8px;
  }
}

.card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:active {
    transform: scale(0.97);
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  }
}

.card-cover {
  position: relative;
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  @media (max-width: #{$breakpoint-sm}) {
    height: 120px;
  }
}

.card-emoji {
  font-size: 36px;
  opacity: 0.7;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.2));
}

.type-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  backdrop-filter: blur(6px);
  background: rgba(52,199,89,0.85);
}

.card-body {
  padding: 10px 12px 14px;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #222;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.45;
  margin-bottom: 8px;
  
  @media (max-width: #{$breakpoint-sm}) {
    font-size: 12px;
  }
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-stats {
  font-size: 11px;
  color: #AAA;
}

.card-price {
  font-size: 14px;
  font-weight: 700;
  color: #FF3B30;
}

// 列表卡片
.list-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-card {
  display: flex;
  gap: 12px;
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: transform 0.2s;
  
  &:active {
    transform: scale(0.985);
  }
}

.list-cover {
  flex-shrink: 0;
  width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  @media (max-width: #{$breakpoint-sm}) {
    width: 90px;
  }
}

.list-emoji {
  font-size: 32px;
  opacity: 0.6;
}

.list-content {
  flex: 1;
  padding: 12px 12px 12px 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-width: 0;
}

.list-title {
  font-size: 15px;
  font-weight: 600;
  color: #222;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  @media (max-width: #{$breakpoint-sm}) {
    font-size: 14px;
  }
}

.list-desc {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.list-stats {
  font-size: 11px;
  color: #AAA;
}

.list-price {
  font-size: 14px;
  font-weight: 700;
  color: #FF3B30;
}

.list-free {
  font-size: 12px;
  color: #34C759;
  font-weight: 600;
  background: #E8F8ED;
  padding: 2px 8px;
  border-radius: 4px;
}

// 视频网格
.video-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  
  @media (max-width: #{$breakpoint-sm}) {
    gap: 8px;
  }
}

.video-card {
  cursor: pointer;
  transition: transform 0.2s;
  
  &:active {
    transform: scale(0.97);
  }
}

.video-cover {
  position: relative;
  width: 100%;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 8px;
  
  @media (max-width: #{$breakpoint-sm}) {
    height: 100px;
  }
}

.video-emoji {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  opacity: 0.6;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-circle {
  width: 40px;
  height: 40px;
  background: rgba(255,255,255,0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  text {
    color: #333;
    font-size: 14px;
    margin-left: 2px;
  }
}

.duration-tag {
  position: absolute;
  bottom: 6px;
  right: 6px;
  padding: 2px 8px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.video-title {
  font-size: 13px;
  font-weight: 600;
  color: #222;
  display: block;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  @media (max-width: #{$breakpoint-sm}) {
    font-size: 12px;
  }
}

.video-views {
  font-size: 11px;
  color: #AAA;
}

// 商品网格
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  
  @media (max-width: #{$breakpoint-sm}) {
    gap: 8px;
  }
}

.product-card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:active {
    transform: scale(0.97);
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  }
}

.product-cover {
  position: relative;
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  @media (max-width: #{$breakpoint-sm}) {
    height: 120px;
  }
}

.product-emoji {
  font-size: 36px;
  opacity: 0.7;
}

.price-tag {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 4px 10px;
  background: rgba(255,59,48,0.9);
  color: #fff;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}

.stock-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 3px 8px;
  background: #FF3B30;
  color: #fff;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
}

.product-body {
  padding: 10px 12px 14px;
}

.product-title {
  font-size: 13px;
  font-weight: 600;
  color: #222;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.45;
  margin-bottom: 8px;
  
  @media (max-width: #{$breakpoint-sm}) {
    font-size: 12px;
  }
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-sales {
  font-size: 11px;
  color: #AAA;
}

.buy-btn {
  padding: 4px 12px;
  background: linear-gradient(135deg, #FF6B6B, #FF3B30);
  color: #fff;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
}

// 空状态
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 60px;
  display: block;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 15px;
  color: #B0B0B0;
}

// 加载状态
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 30px;
}

.spinner {
  width: 22px;
  height: 22px;
  border: 3px solid #E8E8E8;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-text {
  font-size: 13px;
  color: #AAA;
}

.bottom-safe {
  height: 40px;
}

// 用户面板
.panel-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.35);
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.user-panel {
  position: absolute;
  top: 50px;
  left: 12px;
  right: 12px;
  max-width: 340px;
  animation: panelIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes panelIn {
  from { opacity: 0; transform: translateY(-16px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 18px 18px 0 0;
}

.panel-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.4);
}

.panel-avatar-placeholder {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  border: 2px solid rgba(255,255,255,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  
  text {
    font-size: 24px;
  }
}

.panel-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-name {
  font-size: 17px;
  font-weight: 700;
  color: #fff;
}

.panel-balance {
  font-size: 12px;
  color: rgba(255,255,255,0.75);
}

.vip-badge {
  padding: 4px 10px;
  background: linear-gradient(135deg, #FFD700, #FFA000);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 800;
  color: #5D4037;
}

.panel-login-btn {
  padding: 20px;
  background: #fff;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  cursor: pointer;
  border-radius: 0 0 18px 18px;
}

.panel-menu-list {
  background: #fff;
  border-radius: 0 0 18px 18px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.15s;
  
  &:active {
    background: #F8F8FA;
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid #F5F5F5;
  }
}

.menu-icon {
  font-size: 22px;
  flex-shrink: 0;
}

.menu-text {
  flex: 1;
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.menu-arrow {
  font-size: 20px;
  color: #CCC;
  font-weight: 300;
}

.panel-logout {
  margin-top: 10px;
  padding: 14px;
  background: #fff;
  border-radius: 18px;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  transition: all 0.2s;
  
  &:active {
    background: #FFF0F0;
    transform: scale(0.98);
  }
}

.logout-text {
  font-size: 15px;
  color: #FF3B30;
  font-weight: 600;
}

// 通知面板
.notify-panel {
  position: absolute;
  top: 50px;
  right: 12px;
  width: 300px;
  max-height: 440px;
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0,0,0,0.15);
  animation: panelIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  flex-direction: column;
}

.notify-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid #F0F0F0;
}

.notify-title {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
}

.notify-close {
  font-size: 18px;
  color: #BBB;
  cursor: pointer;
  padding: 4px;
}

.notify-list {
  flex: 1;
  max-height: 380px;
}

.notify-item {
  display: flex;
  gap: 12px;
  padding: 14px 18px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #F5F5F5;
  
  &:active {
    background: #F8F8FA;
  }
}

.notify-left {
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}

.unread-dot {
  position: absolute;
  top: 0;
  left: -4px;
  width: 8px;
  height: 8px;
  background: #FF3B30;
  border-radius: 50%;
}

.notify-icon {
  font-size: 20px;
}

.notify-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.notify-item-title {
  font-size: 14px;
  font-weight: 600;
  color: #222;
}

.notify-item-content {
  font-size: 12px;
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notify-time {
  font-size: 11px;
  color: #BBB;
}

.notify-empty {
  text-align: center;
  padding: 50px 20px;
  color: #BBB;
  font-size: 14px;
}

.notify-empty-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 10px;
}

// 响应式适配
@media screen and (max-width: #{$breakpoint-lg}) {
  .quick-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  
  .quick-icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }
  
  .quick-icon {
    font-size: 18px;
  }
  
  .quick-label {
    font-size: 10px;
  }
  
  .waterfall-grid,
  .video-grid,
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  
  .card-cover,
  .product-cover {
    height: 120px;
  }
  
  .video-cover {
    height: 100px;
  }
}

@media screen and (max-width: #{$breakpoint-md}) {
  .brand-name {
    font-size: 18px;
  }
  
  .greeting {
    font-size: 16px;
  }
  
  .section-title {
    font-size: 15px;
  }
  
  .tab-item {
    padding: 10px 6px;
  }
  
  .tab-text {
    font-size: 12px;
  }
  
  .card-title,
  .product-title {
    font-size: 12px;
  }
}

@media screen and (max-width: #{$breakpoint-sm}) {
  .header-content {
    padding: 12px 12px 0;
  }
  
  .brand-row {
    padding-top: 8px;
  }
  
  .brand-name {
    font-size: 18px;
  }
  
  .user-card {
    margin-top: 16px;
    padding: 10px;
    gap: 10px;
  }
  
  .avatar-img,
  .avatar-placeholder {
    width: 44px;
    height: 44px;
  }
  
  .greeting {
    font-size: 15px;
  }
  
  .quick-actions {
    margin: -4px 8px 0;
    padding: 10px;
  }
  
  .quick-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }
  
  .quick-icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
  
  .quick-icon {
    font-size: 16px;
  }
  
  .quick-label {
    font-size: 9px;
  }
  
  .tab-container {
    padding: 8px 8px 0;
  }
  
  .content-area {
    padding: 8px 8px 0;
  }
  
  .section {
    margin-bottom: 12px;
  }
  
  .list-card {
    gap: 8px;
  }
  
  .list-cover {
    width: 80px;
  }
  
  .list-emoji {
    font-size: 28px;
  }
  
  .user-panel {
    left: 8px;
    right: 8px;
    max-width: none;
  }
  
  .notify-panel {
    right: 8px;
    left: 8px;
    width: auto;
  }
}
</style>

<style>
// 隐藏原生导航栏
.uni-navbar,
.uni-page-head,
.uni-page-head-hd {
  display: none !important;
}

.uni-page-wrapper {
  padding-top: 0 !important;
}
</style>
