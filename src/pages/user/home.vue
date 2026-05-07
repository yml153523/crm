<template>
  <view class="home-page">
    <view class="header-area">
      <view class="header-bg"></view>
      <view class="header-content">
        <view class="header-top-row">
          <view class="brand-section">
            <text class="brand-name">宜宁</text>
            <text class="brand-dot">·</text>
            <text class="brand-sub">品质生活</text>
          </view>
          <view class="header-actions">
            <view class="header-icon-btn" @click="toggleNotifications">
              <text class="header-icon">🔔</text>
              <view class="header-dot" v-if="hasUnread"></view>
            </view>
          </view>
        </view>

        <view class="user-greeting" @click="handleUserClick">
          <view class="greeting-avatar-wrap">
            <image
              v-if="isLoggedIn && userInfo?.avatar"
              :src="userInfo.avatar"
              mode="aspectFill"
              class="greeting-avatar-img"
            />
            <view v-else class="greeting-avatar-placeholder">
              <text class="greeting-avatar-icon">👤</text>
            </view>
          </view>
          <view class="greeting-text">
            <text class="greeting-hi">{{ isLoggedIn ? 'Hi，' + (userInfo?.nickname || userInfo?.name || '用户') : '你好，请登录' }}</text>
            <text class="greeting-sub" v-if="isLoggedIn && balance && balance !== '0.00'">余额 ¥{{ balance }}</text>
            <text class="greeting-sub" v-else-if="!isLoggedIn">登录解锁更多功能</text>
          </view>
          <view class="greeting-arrow" v-if="isLoggedIn">›</view>
        </view>

        <view class="search-row">
          <view class="search-box" @click="goSearch">
            <text class="search-box-icon">🔍</text>
            <text class="search-box-placeholder">{{ MESSAGES.USER.SEARCH_PLACEHOLDER }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="quick-actions">
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

    <view class="fixed-tabs-wrap">
      <view class="tab-nav">
        <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false" enhanced>
          <view class="tab-list">
            <view
              class="tab-item"
              :class="{ active: activeTab === tab.key }"
              v-for="tab in contentTabs"
              :key="tab.key"
              @click="switchTab(tab.key)"
            >
              <text class="tab-icon">{{ tabIcons[tab.key] }}</text>
              <text class="tab-text">{{ tab.name }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="content-scroll"
      :style="{ paddingTop: '0px' }"
      @scrolltolower="loadMore"
      enhanced
      :show-scrollbar="false"
    >
      <view class="section" v-if="activeTab === 'recommend'">
        <view class="section-header">
          <text class="section-title">✨ 为你推荐</text>
          <text class="section-sub">精选优质内容</text>
        </view>
        <view class="feed-waterfall">
          <view
            class="feed-card"
            v-for="(item, index) in recommendList"
            :key="item._id || index"
            @click="handleContentClick(item, 'recommend')"
          >
            <view class="feed-cover" :style="{ background: getFeedBg(index) }">
              <text class="feed-emoji">{{ item.emoji }}</text>
              <view class="feed-type-tag" :class="'tag-' + item.type">{{ item.typeLabel }}</view>
            </view>
            <view class="feed-body">
              <text class="feed-title">{{ item.title }}</text>
              <view class="feed-footer">
                <text class="feed-stats">{{ item.stats }}</text>
                <view class="feed-like">
                  <text class="like-heart">♡</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

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
            <view class="list-card-left" :style="{ background: getFeedBg(index) }">
              <text class="list-card-emoji">📖</text>
            </view>
            <view class="list-card-right">
              <text class="list-card-title">{{ item.title }}</text>
              <text class="list-card-desc" v-if="item.desc" :lines="1">{{ item.desc }}</text>
              <view class="list-card-meta">
                <text class="list-card-stats">{{ MESSAGES.USER.STUDENTS_COUNT(item.students || 0) }}</text>
                <text class="list-card-price" v-if="item.price">¥{{ item.price }}</text>
                <text class="list-card-free" v-else>{{ MESSAGES.USER.FREE }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="section" v-if="activeTab === 'video'">
        <view class="section-header">
          <text class="section-title">🎬 {{ MESSAGES.USER.VIDEO }}</text>
          <text class="section-sub">精彩视频内容</text>
        </view>
        <view class="feed-waterfall">
          <view
            class="feed-card"
            v-for="(item, index) in videoList"
            :key="item._id || index"
            @click="handleContentClick(item, 'video')"
          >
            <view class="feed-cover video-cover" :style="{ background: getFeedBg(index + 3) }">
              <text class="feed-emoji">🎬</text>
              <view class="play-circle">
                <text class="play-icon">▶</text>
              </view>
              <view class="duration-badge" v-if="item.duration">{{ item.duration }}</view>
            </view>
            <view class="feed-body">
              <text class="feed-title">{{ item.title }}</text>
              <view class="feed-footer">
                <text class="feed-stats">{{ MESSAGES.USER.VIEWS_COUNT(item.views || 0) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="section" v-if="activeTab === 'product'">
        <view class="section-header">
          <text class="section-title">🛍️ {{ MESSAGES.USER.PRODUCT }}</text>
          <text class="section-sub">发现好物</text>
        </view>
        <view class="feed-waterfall">
          <view
            class="feed-card product-card"
            v-for="(item, index) in productList"
            :key="item._id || index"
            @click="handleContentClick(item, 'product')"
          >
            <view class="feed-cover product-cover" :style="{ background: getFeedBg(index + 6) }">
              <text class="feed-emoji">🛍️</text>
              <view class="product-price-badge">¥{{ item.price }}</view>
              <view class="stock-badge" v-if="item.stock && item.stock <= 10">{{ MESSAGES.USER.STOCK_WARN(item.stock) }}</view>
            </view>
            <view class="feed-body">
              <text class="feed-title">{{ item.title || item.name }}</text>
              <view class="feed-footer">
                <text class="feed-stats">{{ MESSAGES.USER.SALES_COUNT(item.sales || 0) }}</text>
                <view class="buy-btn">抢购</view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="empty-wrap" v-if="currentList.length === 0 && !loading">
        <text class="empty-emoji">{{ currentTabEmoji }}</text>
        <text class="empty-main">{{ MESSAGES.USER.NO_CONTENT }}</text>
      </view>

      <view class="loading-wrap" v-if="loading">
        <view class="spinner"></view>
        <text class="loading-text">{{ MESSAGES.COMMON.LOADING }}</text>
      </view>

      <view class="bottom-safe"></view>
    </scroll-view>

    <view class="user-panel-mask" v-if="showUserPanel" @click="showUserPanel = false">
      <view class="user-panel" @click.stop>
        <view class="panel-card">
          <view class="panel-card-header">
            <image v-if="isLoggedIn && userInfo?.avatar" :src="userInfo.avatar" mode="aspectFill" class="panel-avatar-img" />
            <view v-else class="panel-avatar-placeholder">
              <text class="panel-avatar-icon">👤</text>
            </view>
            <view class="panel-user-detail">
              <text class="panel-user-name" v-if="isLoggedIn">{{ userInfo?.nickname || userInfo?.name || '用户' }}</text>
              <text class="panel-user-name" v-else>未登录</text>
              <text class="panel-user-balance" v-if="isLoggedIn && balance && balance !== '0.00'">余额 ¥{{ balance }}</text>
            </view>
            <view class="panel-vip-badge" v-if="isLoggedIn && userInfo?.isVIP">VIP</view>
          </view>
          <view class="panel-card-login" v-if="!isLoggedIn" @click="goLogin">
            <text class="panel-login-btn">点击登录 / 注册</text>
          </view>
        </view>
        <view class="panel-menu-list">
          <view class="panel-menu-item" @click="goPage('/pages/user/recharge')">
            <text class="menu-icon">💰</text>
            <text class="menu-text">{{ MESSAGES.USER.RECHARGE_CENTER }}</text>
            <text class="menu-arrow">›</text>
          </view>
          <view class="panel-menu-item" @click="goPage('/pages/user/order/list')">
            <text class="menu-icon">📋</text>
            <text class="menu-text">{{ MESSAGES.USER.MY_ORDERS }}</text>
            <text class="menu-arrow">›</text>
          </view>
          <view class="panel-menu-item" @click="goPage('/pages/user/red-packet/center')">
            <text class="menu-icon">🧧</text>
            <text class="menu-text">{{ MESSAGES.USER.REDPACKET_CENTER }}</text>
            <text class="menu-arrow">›</text>
          </view>
          <view class="panel-menu-item" @click="goSettings">
            <text class="menu-icon">⚙️</text>
            <text class="menu-text">{{ MESSAGES.USER.SETTINGS }}</text>
            <text class="menu-arrow">›</text>
          </view>
        </view>
        <view class="panel-logout-btn" v-if="isLoggedIn" @click="handleLogout">
          <text class="logout-text">{{ MESSAGES.USER.LOGOUT }}</text>
        </view>
      </view>
    </view>

    <view class="user-panel-mask" v-if="showNotifications" @click="showNotifications = false">
      <view class="notify-panel" @click.stop>
        <view class="notify-head">
          <text class="notify-head-title">通知消息</text>
          <text class="notify-head-close" @click="showNotifications = false">✕</text>
        </view>
        <scroll-view scroll-y class="notify-scroll">
          <view class="notify-cell" v-for="item in notifications" :key="item._id" @click="markRemindRead(item)">
            <view class="notify-cell-left">
              <view class="notify-unread-dot" v-if="!item.read"></view>
              <view class="notify-cell-icon">{{ getNotifyIcon(item.type) }}</view>
            </view>
            <view class="notify-cell-body">
              <text class="notify-cell-title">{{ item.title }}</text>
              <text class="notify-cell-desc">{{ item.content }}</text>
              <text class="notify-cell-time">{{ formatNotifyTime(item.sentAt) }}</text>
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
import { MESSAGES, API_PATHS, TOAST_ICON, UI_COLORS } from '@/config/constants'
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'

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

onMounted(() => {
  hideNativeNavBar()
  initData()
})

onShow(() => {
  hideNativeNavBar()
  checkLoginStatus()
  refreshData()
  if (isLoggedIn.value) {
    fetchNotificationUnreadCount()
  }
})

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

function hideNativeNavBar() {
  // #ifdef H5
  setTimeout(() => {
    const sel = ['.uni-navbar', '.uni-page-head', '.uni-page-head-hd']
    sel.forEach(s => {
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
    await Promise.all([loadAllContent()])
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

function goSettings() {
  showUserPanel.value = false
  uni.showToast({ title: MESSAGES.USER.SETTINGS_DEV, icon: TOAST_ICON.NONE as any })
}

function handleLogout() {
  uni.showModal({
    title: MESSAGES.USER.CONFIRM_LOGOUT,
    content: MESSAGES.USER.CONFIRM_LOGOUT_CONTENT,
    confirmText: MESSAGES.USER.LOGOUT_CONFIRM_BTN,
    confirmColor: UI_COLORS.DANGER,
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
        uni.showToast({ title: MESSAGES.COMMON.LOGGED_OUT, icon: TOAST_ICON.SUCCESS as any })
      }
    }
  })
}

function goSearch() {
  uni.showToast({ title: MESSAGES.USER.SEARCH_DEV, icon: TOAST_ICON.NONE as any })
}

function goPage(path: string) {
  showUserPanel.value = false
  uni.navigateTo({ url: path }).catch(() => {
    uni.showToast({ title: MESSAGES.COMMON.DEV_IN_PROGRESS, icon: TOAST_ICON.NONE as any })
  })
}

function loadMore() { }

function getFeedBg(i: number): string {
  const bgs = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
    'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
    'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)'
  ]
  return bgs[i % bgs.length]
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #F5F6FA;
  position: relative;
}

.header-area {
  position: relative;
  overflow: hidden;
  padding-bottom: 20px;
}

.header-bg {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 240px;
  background: linear-gradient(160deg, #5B4FCF 0%, #7C6FF7 30%, #9B8FFF 60%, #C4B5FF 100%);
  border-radius: 0 0 32px 32px;
}

.header-bg::after {
  content: '';
  position: absolute;
  top: -60px; right: -40px;
  width: 180px; height: 180px;
  background: rgba(255,255,255,0.08);
  border-radius: 50%;
}

.header-bg::before {
  content: '';
  position: absolute;
  bottom: -30px; left: -20px;
  width: 120px; height: 120px;
  background: rgba(255,255,255,0.05);
  border-radius: 50%;
}

.header-content {
  position: relative;
  z-index: 1;
  padding: 0 20px;
}

.header-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 18px;
}

.brand-section {
  display: flex;
  align-items: baseline;
}

.brand-name {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 2px;
}

.brand-dot {
  font-size: 22px;
  font-weight: 800;
  color: rgba(255,255,255,0.6);
  margin: 0 6px;
}

.brand-sub {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.7);
  letter-spacing: 3px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-icon-btn {
  position: relative;
  width: 38px; height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.18);
  border-radius: 50%;
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all 0.2s;
}

.header-icon-btn:active {
  background: rgba(255,255,255,0.3);
  transform: scale(0.93);
}

.header-icon {
  font-size: 18px;
}

.header-dot {
  position: absolute;
  top: 6px; right: 6px;
  width: 9px; height: 9px;
  background: #FF3B30;
  border-radius: 50%;
  border: 2px solid rgba(123,111,247,0.8);
}

.user-greeting {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 24px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.user-greeting:active {
  opacity: 0.8;
}

.greeting-avatar-wrap {
  flex-shrink: 0;
}

.greeting-avatar-img {
  width: 52px; height: 52px;
  border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.4);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.greeting-avatar-placeholder {
  width: 52px; height: 52px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  border: 3px solid rgba(255,255,255,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.greeting-avatar-icon {
  font-size: 26px;
}

.greeting-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.greeting-hi {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
}

.greeting-sub {
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  font-weight: 400;
}

.greeting-arrow {
  font-size: 28px;
  color: rgba(255,255,255,0.5);
  font-weight: 300;
}

.search-row {
  margin-top: 18px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  background: #fff;
  border-radius: 28px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: all 0.2s;
}

.search-box:active {
  transform: scale(0.985);
  box-shadow: 0 1px 8px rgba(0,0,0,0.1);
}

.search-box-icon {
  font-size: 16px;
  opacity: 0.5;
}

.search-box-placeholder {
  font-size: 14px;
  color: #B0B0B0;
  font-weight: 400;
}

.quick-actions {
  display: flex;
  justify-content: space-around;
  padding: 14px 16px;
  margin: -6px 12px 0;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  position: relative;
  z-index: 2;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.quick-item:active {
  transform: scale(0.92);
}

.quick-icon-wrap {
  width: 46px; height: 46px;
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
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.fixed-tabs-wrap {
  position: sticky;
  top: 0;
  z-index: 99;
  background: #F5F6FA;
  padding-top: 10px;
}

.tab-nav {
  padding: 6px 16px;
  margin: 0 12px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.tab-scroll {
  white-space: nowrap;
}

.tab-list {
  display: flex;
  gap: 0;
}

.tab-item {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 18px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
}

.tab-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 3px 12px rgba(102,126,234,0.35);
}

.tab-icon {
  font-size: 15px;
}

.tab-text {
  font-size: 14px;
  color: #888;
  font-weight: 500;
  transition: all 0.25s;
}

.tab-item.active .tab-text {
  color: #fff;
  font-weight: 700;
}

.content-scroll {
  min-height: calc(100vh - 380px);
}

.section {
  padding: 16px 16px 8px;
}

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 4px;
}

.section-title {
  font-size: 17px;
  font-weight: 700;
  color: #1A1A1A;
}

.section-sub {
  font-size: 12px;
  color: #B0B0B0;
}

.feed-waterfall {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.feed-card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.feed-card:active {
  transform: scale(0.97);
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}

.feed-cover {
  position: relative;
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feed-emoji {
  font-size: 38px;
  opacity: 0.7;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.2));
}

.feed-type-tag {
  position: absolute;
  top: 8px; left: 8px;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  backdrop-filter: blur(6px);
}

.tag-course { background: rgba(52,199,89,0.85); }
.tag-video { background: rgba(0,122,255,0.85); }
.tag-product { background: rgba(255,149,0,0.85); }

.play-circle {
  position: absolute;
  width: 44px; height: 44px;
  background: rgba(0,0,0,0.35);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.play-icon {
  color: #fff;
  font-size: 16px;
  margin-left: 3px;
}

.duration-badge {
  position: absolute;
  bottom: 8px; right: 8px;
  padding: 2px 8px;
  background: rgba(0,0,0,0.55);
  color: #fff;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.product-price-badge {
  position: absolute;
  bottom: 8px; right: 8px;
  padding: 3px 10px;
  background: rgba(255,59,48,0.9);
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}

.stock-badge {
  position: absolute;
  top: 8px; right: 8px;
  padding: 3px 8px;
  background: #FF3B30;
  color: #fff;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
}

.feed-body {
  padding: 10px 12px 14px;
}

.feed-title {
  font-size: 13px;
  font-weight: 600;
  color: #222;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.45;
  margin-bottom: 10px;
}

.feed-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feed-stats {
  font-size: 11px;
  color: #AAA;
}

.feed-like {
  padding: 2px 6px;
}

.like-heart {
  font-size: 15px;
  color: #DDD;
  transition: color 0.2s;
}

.buy-btn {
  padding: 3px 12px;
  background: linear-gradient(135deg, #FF6B6B, #FF3B30);
  color: #fff;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
}

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
}

.list-card:active {
  transform: scale(0.985);
}

.list-card-left {
  flex-shrink: 0;
  width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-card-emoji {
  font-size: 32px;
  opacity: 0.6;
}

.list-card-right {
  flex: 1;
  padding: 12px 12px 12px 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-width: 0;
}

.list-card-title {
  font-size: 15px;
  font-weight: 600;
  color: #222;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-card-desc {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.list-card-stats {
  font-size: 11px;
  color: #AAA;
}

.list-card-price {
  font-size: 15px;
  font-weight: 700;
  color: #FF3B30;
}

.list-card-free {
  font-size: 12px;
  color: #34C759;
  font-weight: 600;
  background: #E8F8ED;
  padding: 2px 8px;
  border-radius: 4px;
}

.empty-wrap {
  text-align: center;
  padding: 80px 20px;
}

.empty-emoji {
  font-size: 60px;
  display: block;
  margin-bottom: 16px;
}

.empty-main {
  font-size: 15px;
  color: #B0B0B0;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 30px;
}

.spinner {
  width: 22px; height: 22px;
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

.user-panel-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
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

.panel-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 18px 18px 0 0;
  overflow: hidden;
}

.panel-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 20px 18px;
}

.panel-avatar-img {
  width: 50px; height: 50px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.4);
}

.panel-avatar-placeholder {
  width: 50px; height: 50px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  border: 2px solid rgba(255,255,255,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel-avatar-icon {
  font-size: 24px;
}

.panel-user-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-user-name {
  font-size: 17px;
  font-weight: 700;
  color: #fff;
}

.panel-user-balance {
  font-size: 12px;
  color: rgba(255,255,255,0.75);
}

.panel-vip-badge {
  padding: 4px 10px;
  background: linear-gradient(135deg, #FFD700, #FFA000);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 800;
  color: #5D4037;
}

.panel-card-login {
  padding: 0 20px 20px;
}

.panel-login-btn {
  font-size: 16px;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  cursor: pointer;
}

.panel-menu-list {
  background: #fff;
  border-radius: 0 0 18px 18px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
}

.panel-menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.15s;
}

.panel-menu-item:active {
  background: #F8F8FA;
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

.panel-logout-btn {
  margin-top: 10px;
  padding: 14px;
  background: #fff;
  border-radius: 18px;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  transition: all 0.2s;
}

.panel-logout-btn:active {
  background: #FFF0F0;
  transform: scale(0.98);
}

.logout-text {
  font-size: 15px;
  color: #FF3B30;
  font-weight: 600;
}

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

.notify-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid #F0F0F0;
}

.notify-head-title {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
}

.notify-head-close {
  font-size: 18px;
  color: #BBB;
  cursor: pointer;
  padding: 4px;
}

.notify-scroll {
  flex: 1;
  max-height: 380px;
}

.notify-cell {
  display: flex;
  gap: 12px;
  padding: 14px 18px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #F5F5F5;
}

.notify-cell:active {
  background: #F8F8FA;
}

.notify-cell-left {
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}

.notify-unread-dot {
  position: absolute;
  top: 0; left: -4px;
  width: 8px; height: 8px;
  background: #FF3B30;
  border-radius: 50%;
}

.notify-cell-icon {
  font-size: 20px;
}

.notify-cell-body {
  flex: 1; min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.notify-cell-title {
  font-size: 14px;
  font-weight: 600;
  color: #222;
}

.notify-cell-desc {
  font-size: 12px;
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notify-cell-time {
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

@media screen and (max-width: 768px) {
  .feed-waterfall { gap: 8px; }
  .feed-cover { height: 130px; }
  .feed-emoji { font-size: 32px; }
  .feed-title { font-size: 12px; }
  .feed-body { padding: 8px 10px 12px; }
  .quick-icon-wrap { width: 40px; height: 40px; border-radius: 12px; }
  .quick-icon { font-size: 18px; }
  .section-title { font-size: 16px; }
  .tab-item { padding: 10px 14px; }
}

@media screen and (max-width: 375px) {
  .feed-waterfall { gap: 6px; }
  .feed-cover { height: 110px; }
  .feed-emoji { font-size: 26px; }
  .feed-title { font-size: 11px; }
  .quick-icon-wrap { width: 36px; height: 36px; border-radius: 10px; }
  .quick-icon { font-size: 16px; }
  .quick-label { font-size: 10px; }
  .section-title { font-size: 15px; }
  .tab-text { font-size: 13px; }
  .greeting-hi { font-size: 18px; }
  .brand-name { font-size: 20px; }
}
</style>

<style>
.uni-navbar,
.uni-page-head,
.uni-page-head-hd {
  display: none !important;
}
.uni-page-wrapper {
  padding-top: 0 !important;
}
</style>
