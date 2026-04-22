<template>
  <view class="home-page">
    <!-- 顶部固定区域 -->
    <view class="header-fixed">
      <!-- 顶部栏：头像 + 搜索 + 消息 -->
      <view class="top-row">
        <view class="avatar-wrap" @click="handleUserClick">
          <image
            v-if="isLoggedIn && userInfo?.avatar"
            :src="userInfo.avatar"
            mode="aspectFill"
            class="avatar-img"
          />
          <view v-else class="avatar-placeholder">
            <text class="avatar-icon">👤</text>
          </view>
        </view>

        <view class="search-bar" @click="goSearch">
          <text class="search-icon">🔍</text>
          <text class="search-placeholder">搜索课程、视频、商品...</text>
        </view>

        <view class="msg-icon" @click="goMessages">
          <text>🔔</text>
          <view class="msg-dot" v-if="hasUnread"></view>
        </view>
      </view>

      <!-- 顶部标签导航 -->
      <view class="tab-nav">
        <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
          <view class="tab-list">
            <view
              class="tab-item"
              :class="{ active: activeTab === tab.key }"
              v-for="tab in contentTabs"
              :key="tab.key"
              @tap="switchTab(tab.key)"
            >
              <text class="tab-text">{{ tab.name }}</text>
              <view class="tab-indicator" v-if="activeTab === tab.key"></view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 内容区域 -->
    <scroll-view
      scroll-y
      class="content-area"
      :style="{ paddingTop: '110px' }"
      @scrolltolower="loadMore"
    >
      <!-- 推荐Tab -->
      <view class="feed-grid" v-if="activeTab === 'recommend'">
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
          <view class="feed-info">
            <text class="feed-title">{{ item.title }}</text>
            <view class="feed-meta">
              <text class="feed-author" v-if="item.author">{{ item.author }}</text>
              <text class="feed-stats">{{ item.stats }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 课程Tab -->
      <view class="feed-grid" v-if="activeTab === 'course'">
        <view
          class="feed-card"
          v-for="(item, index) in courseList"
          :key="item._id || index"
          @click="handleContentClick(item, 'course')"
        >
          <view class="feed-cover" :style="{ background: getFeedBg(index) }">
            <text class="feed-emoji">📖</text>
            <view class="feed-type-tag tag-course">课程</view>
            <view class="feed-price-tag" v-if="item.price">¥{{ item.price }}</view>
            <view class="feed-free-tag" v-else>免费</view>
          </view>
          <view class="feed-info">
            <text class="feed-title">{{ item.title }}</text>
            <view class="feed-meta">
              <text class="feed-stats">{{ item.students || 0 }}人学习</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 视频Tab -->
      <view class="feed-grid" v-if="activeTab === 'video'">
        <view
          class="feed-card"
          v-for="(item, index) in videoList"
          :key="item._id || index"
          @click="handleContentClick(item, 'video')"
        >
          <view class="feed-cover video-type" :style="{ background: getFeedBg(index + 3) }">
            <text class="feed-emoji">🎬</text>
            <view class="feed-type-tag tag-video">视频</view>
            <view class="play-btn-overlay">
              <text class="play-triangle">▶</text>
            </view>
            <view class="duration-label" v-if="item.duration">{{ item.duration }}</view>
          </view>
          <view class="feed-info">
            <text class="feed-title">{{ item.title }}</text>
            <view class="feed-meta">
              <text class="feed-stats">{{ item.views || 0 }}次播放</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 商品Tab -->
      <view class="feed-grid" v-if="activeTab === 'product'">
        <view
          class="feed-card"
          v-for="(item, index) in productList"
          :key="item._id || index"
          @click="handleContentClick(item, 'product')"
        >
          <view class="feed-cover product-type" :style="{ background: getFeedBg(index + 6) }">
            <text class="feed-emoji">🛍️</text>
            <view class="feed-type-tag tag-product">商品</view>
            <view class="feed-price-tag">¥{{ item.price }}</view>
            <view class="stock-warn" v-if="item.stock && item.stock <= 10">仅剩{{ item.stock }}件</view>
          </view>
          <view class="feed-info">
            <text class="feed-title">{{ item.title || item.name }}</text>
            <view class="feed-meta">
              <text class="feed-stats">已售{{ item.sales || 0 }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-if="currentList.length === 0 && !loading">
        <text class="empty-emoji">{{ currentTabEmoji }}</text>
        <text class="empty-text">暂无内容，敬请期待</text>
      </view>

      <!-- 加载状态 -->
      <view class="load-more" v-if="loading">
        <view class="load-spinner"></view>
        <text class="load-text">加载中...</text>
      </view>
    </scroll-view>

    <!-- 用户面板（点击头像弹出） -->
    <view class="user-panel-mask" v-if="showUserPanel" @click="showUserPanel = false">
      <view class="user-panel" @click.stop>
        <view class="panel-header" v-if="isLoggedIn">
          <image :src="userInfo?.avatar || ''" mode="aspectFill" class="panel-avatar" />
          <view class="panel-user-info">
            <text class="panel-name">{{ userInfo?.nickname || userInfo?.name || '用户' }}</text>
            <text class="panel-balance" v-if="balance && balance !== '0.00'">余额: ¥{{ balance }}</text>
          </view>
        </view>
        <view class="panel-login" v-else @click="goLogin">
          <text class="panel-login-text">点击登录</text>
        </view>
        <view class="panel-menu">
          <view class="panel-item" @click="goPage('/pages/user/recharge')">
            <text>💰</text><text class="panel-item-text">充值中心</text>
          </view>
          <view class="panel-item" @click="goPage('/pages/user/order/list')">
            <text>📋</text><text class="panel-item-text">我的订单</text>
          </view>
          <view class="panel-item" @click="goPage('/pages/user/red-packet/center')">
            <text>🧧</text><text class="panel-item-text">红包中心</text>
          </view>
          <view class="panel-item" @click="goSettings">
            <text>⚙️</text><text class="panel-item-text">设置</text>
          </view>
        </view>
        <view class="panel-logout" v-if="isLoggedIn" @click="handleLogout">
          <text class="logout-text">退出登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
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

interface ContentTab {
  key: 'recommend' | 'course' | 'video' | 'product'
  name: string
}

const isLoggedIn = ref(false)
const userInfo = ref<Record<string, any> | null>(null)
const balance = ref('0.00')
const loading = ref(true)
const activeTab = ref<ContentTab['key']>('recommend')
const showUserPanel = ref(false)
const hasUnread = ref(false)

const courseList = ref<ContentItem[]>([])
const videoList = ref<ContentItem[]>([])
const productList = ref<ContentItem[]>([])
const recommendList = ref<RecommendItem[]>([])

const contentTabs = ref<ContentTab[]>([
  { key: 'recommend', name: '推荐' },
  { key: 'course', name: '课程' },
  { key: 'video', name: '视频' },
  { key: 'product', name: '商品' }
])

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
})

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

    const storedInfo = uni.getStorageSync('userInfo')
    if (storedInfo) {
      isLoggedIn.value = true
      userInfo.value = storedInfo
    }

    const isDemoMode = typeof token === 'string' && token.startsWith('demo-')
    if (isDemoMode) {
      balance.value = '888.00'
      return
    }

    try {
      const res: any = await uni.request({
        url: `/api/user/profile?t=${Date.now()}`,
        method: 'GET',
        header: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
        skipAuthRedirect: true
      })
      if (res.data?.success && res.data.data) {
        isLoggedIn.value = true
        userInfo.value = res.data.data
        balance.value = (res.data.data.balance || 0).toFixed(2)
        uni.setStorageSync('userInfo', res.data.data)
      }
    } catch {
      // API请求失败，但本地有token和userInfo，保持登录状态
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
    const [courseRes, videoRes, productRes] = await Promise.allSettled([
      uni.request({ url: `/api/courses/public?limit=12&_t=${Date.now()}`, method: 'GET', skipAuthRedirect: true }),
      uni.request({ url: `/api/videos/public?limit=12&_t=${Date.now()}`, method: 'GET', skipAuthRedirect: true }),
      uni.request({ url: `/api/products/public?limit=12&_t=${Date.now()}`, method: 'GET', skipAuthRedirect: true })
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
    list.push({ ...item, emoji: '📖', type: 'course', typeLabel: '课程', stats: `${item.students || 0}人学习` })
  })
  videoList.value.slice(0, 3).forEach(item => {
    list.push({ ...item, emoji: '🎬', type: 'video', typeLabel: '视频', stats: `${item.views || 0}次播放` })
  })
  productList.value.slice(0, 2).forEach(item => {
    list.push({ ...item, emoji: '🛍️', type: 'product', typeLabel: '商品', stats: `已售${item.sales || 0}` })
  })
  recommendList.value = list
}

function switchTab(key: ContentTab['key']) {
  activeTab.value = key
}

function handleUserClick() {
  showUserPanel.value = !showUserPanel.value
}

function handleContentClick(item: ContentItem | RecommendItem, type: string) {
  const actualType = (item as RecommendItem).type || type
  if (!item._id) {
    uni.showModal({ title: item.title, content: '详情开发中', showCancel: false })
    return
  }
  const routeMap: Record<string, string> = {
    course: `/pages/user/course/detail?id=${item._id}`,
    video: `/pages/user/video/player?id=${item._id}`,
    product: `/pages/user/product/detail?id=${item._id}`
  }
  uni.navigateTo({ url: routeMap[actualType] }).catch(() => {
    uni.showModal({ title: item.title, content: '详情开发中', showCancel: false })
  })
}

function goLogin() {
  showUserPanel.value = false
  uni.navigateTo({ url: '/pages/login/index' })
}

function goSettings() {
  showUserPanel.value = false
  uni.showToast({ title: '设置开发中', icon: 'none' })
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    confirmText: '退出',
    confirmColor: '#FF3B30',
    success: (res) => {
      if (res.confirm) {
        showUserPanel.value = false
        uni.removeStorageSync('token')
        uni.removeStorageSync('userInfo')
        isLoggedIn.value = false
        userInfo.value = null
        balance.value = '0.00'
        uni.showToast({ title: '已退出登录', icon: 'success' })
      }
    }
  })
}

function goSearch() {
  uni.showToast({ title: '搜索开发中', icon: 'none' })
}

function goMessages() {
  uni.showToast({ title: '消息开发中', icon: 'none' })
}

function goPage(path: string) {
  showUserPanel.value = false
  uni.navigateTo({ url: path }).catch(() => {
    uni.showToast({ title: '页面开发中', icon: 'none' })
  })
}

function loadMore() {
  // 预留加载更多
}

function getFeedBg(i: number): string {
  const bgs = [
    'linear-gradient(145deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(145deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(145deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(145deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(145deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(145deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(145deg, #fccb90 0%, #d57eeb 100%)',
    'linear-gradient(145deg, #e0c3fc 0%, #8ec5fc 100%)',
    'linear-gradient(145deg, #f5576c 0%, #ff9a9e 100%)',
    'linear-gradient(145deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(145deg, #89f7fe 0%, #66a6ff 100%)',
    'linear-gradient(145deg, #fddb92 0%, #d1fdff 100%)'
  ]
  return bgs[i % bgs.length]
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #FAFAFA;
  position: relative;
}

/* ===== 顶部固定区域 ===== */
.header-fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 1px 0 rgba(0,0,0,0.06);
}

/* 顶部行 */
.top-row {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  gap: 12px;
}

.avatar-wrap {
  flex-shrink: 0;
  cursor: pointer;
  &:active { opacity: 0.7; }
}
.avatar-img {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
.avatar-placeholder {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(102,126,234,0.3);
}
.avatar-icon { font-size: 18px; }

.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #F2F3F5;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.2s;
  &:active { background: #E8E9EB; }
}
.search-icon { font-size: 14px; }
.search-placeholder {
  font-size: 13px;
  color: #999;
}

.msg-icon {
  position: relative;
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  font-size: 20px;
  &:active { opacity: 0.7; }
}
.msg-dot {
  position: absolute;
  top: 4px; right: 4px;
  width: 8px; height: 8px;
  background: #FF3B30;
  border-radius: 50%;
  border: 2px solid #fff;
}

/* 标签导航 */
.tab-nav {
  padding: 0 16px;
}
.tab-scroll { white-space: nowrap; }
.tab-list {
  display: flex;
  gap: 24px;
}
.tab-item {
  position: relative;
  padding: 10px 0;
  cursor: pointer;
  transition: all 0.2s;
  &:active { opacity: 0.7; }
}
.tab-text {
  font-size: 16px;
  color: #999;
  font-weight: 500;
  transition: all 0.25s;
}
.tab-item.active .tab-text {
  color: #1A1A1A;
  font-weight: 700;
  font-size: 17px;
}
.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 2px;
}

/* ===== 内容区域 ===== */
.content-area {
  min-height: 100vh;
}

/* 瀑布流网格 */
.feed-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 10px 12px;
}

.feed-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;

  &:active {
    transform: scale(0.97);
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  }
}

.feed-cover {
  position: relative;
  width: 100%;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.feed-emoji {
  font-size: 40px;
  opacity: 0.8;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.feed-type-tag {
  position: absolute;
  top: 8px; left: 8px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  backdrop-filter: blur(4px);
  &.tag-course { background: rgba(52,199,89,0.85); }
  &.tag-video { background: rgba(0,122,255,0.85); }
  &.tag-product { background: rgba(255,149,0,0.85); }
}

.feed-price-tag {
  position: absolute;
  bottom: 8px; right: 8px;
  padding: 3px 8px;
  background: rgba(255,59,48,0.9);
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}
.feed-free-tag {
  position: absolute;
  bottom: 8px; right: 8px;
  padding: 3px 8px;
  background: rgba(52,199,89,0.9);
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}

.play-btn-overlay {
  position: absolute;
  width: 44px; height: 44px;
  background: rgba(0,0,0,0.4);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
}
.play-triangle {
  color: #fff;
  font-size: 16px;
  margin-left: 3px;
}
.duration-label {
  position: absolute;
  bottom: 8px; right: 8px;
  padding: 2px 6px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
}
.stock-warn {
  position: absolute;
  top: 8px; right: 8px;
  padding: 2px 6px;
  background: #FF3B30;
  color: #fff;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
}

.feed-info {
  padding: 10px 10px 12px;
}
.feed-title {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  margin-bottom: 8px;
}
.feed-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.feed-author {
  font-size: 11px;
  color: #666;
}
.feed-stats {
  font-size: 11px;
  color: #999;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
}
.empty-emoji {
  font-size: 56px;
  display: block;
  margin-bottom: 16px;
}
.empty-text {
  font-size: 14px;
  color: #999;
}

/* 加载 */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
}
.load-spinner {
  width: 20px; height: 20px;
  border: 2px solid #E0E0E0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.load-text { font-size: 13px; color: #999; }

/* ===== 用户面板 ===== */
.user-panel-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.user-panel {
  position: absolute;
  top: 56px;
  left: 12px;
  width: 260px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.16);
  overflow: hidden;
  animation: slideDown 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.panel-avatar {
  width: 48px; height: 48px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3);
}
.panel-user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.panel-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}
.panel-balance {
  font-size: 12px;
  color: rgba(255,255,255,0.8);
}

.panel-login {
  padding: 20px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
  &:active { opacity: 0.9; }
}
.panel-login-text {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.panel-menu {
  padding: 8px 0;
}
.panel-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 18px;
  &:active { background: #F5F5F5; }
}
.panel-item-text {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.panel-logout {
  margin: 12px 16px 16px;
  padding: 14px;
  background: #FFF5F5;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  &:active {
    background: #FFE5E5;
    transform: scale(0.98);
  }
}
.logout-text {
  font-size: 15px;
  color: #FF3B30;
  font-weight: 600;
}

/* ===== 移动端适配 ===== */
@media screen and (max-width: 768px) {
  .feed-grid {
    gap: 8px;
    padding: 8px 10px;
  }
  .feed-cover { height: 140px; }
  .feed-emoji { font-size: 34px; }
  .feed-title { font-size: 12px; }
  .feed-info { padding: 8px 8px 10px; }
  .tab-list { gap: 20px; }
  .tab-text { font-size: 15px; }
  .tab-item.active .tab-text { font-size: 16px; }
}

@media screen and (max-width: 375px) {
  .feed-grid { gap: 6px; padding: 6px 8px; }
  .feed-cover { height: 120px; }
  .feed-emoji { font-size: 28px; }
  .feed-title { font-size: 11px; }
  .tab-list { gap: 16px; }
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
