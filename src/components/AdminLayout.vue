<template>
  <view class="admin-layout">
    <view
      class="mobile-overlay"
      :class="{ 'overlay-visible': showMobileMenu }"
      @click="closeMobileMenu"
      @touchmove.stop.prevent
    ></view>

    <view
      class="sidebar"
      :class="{
        'sidebar-open': showMobileMenu,
        'sidebar-closed': !showMobileMenu
      }"
    >
      <view class="sidebar-header">
        <view class="sidebar-title-row" @click="toggleMobileMenu">
          <view class="sidebar-left">
            <text class="sidebar-logo">🎯</text>
            <text class="sidebar-brand">CRM系统</text>
            <text class="sidebar-indicator">{{ showMobileMenu ? '▼' : '☰' }}</text>
          </view>

          <view
            v-if="!isMobile && !showMobileMenu"
            class="collapse-btn"
            @click.stop="toggleSidebar"
          >
            <text class="collapse-icon">{{ isCollapsed ? '»' : '«' }}</text>
          </view>

          <view
            class="close-btn"
            :class="{ 'close-btn-visible': showMobileMenu }"
            @click.stop="closeMobileMenu"
          >
            <text class="close-icon">✕</text>
            <text class="close-text">收起</text>
          </view>
        </view>
      </view>

      <view class="user-info" v-if="!isCollapsed">
        <view class="user-avatar">
          <text class="avatar-text">{{ userName.charAt(0) }}</text>
        </view>
        <view class="user-detail">
          <text class="user-name">{{ userName }}</text>
          <text class="user-role">{{ roleLabel }}</text>
        </view>
      </view>

      <scroll-view scroll-y class="menu-scroll">
        <view class="menu-item" :class="{ 'menu-active': isDashboard }" @click="goDashboard">
          <view class="menu-icon-wrap" style="background: rgba(102,126,234,0.2);">
            <text class="menu-icon">🏠</text>
          </view>
          <text class="menu-label">工作台</text>
        </view>

        <view v-if="normalMenuItems.length > 0" class="menu-section-title">
          <text class="section-label">主要功能</text>
        </view>

        <view
          v-for="(item, index) in normalMenuItems"
          :key="'normal-' + index"
          :class="['menu-item', { 'menu-active': isActive(item.path), 'menu-highlight': item.highlight }]"
          @click.stop="navigateTo(item.path)"
        >
          <view class="menu-icon-wrap">
            <text class="menu-icon">{{ item.icon }}</text>
          </view>
          <text class="menu-label" v-if="!isCollapsed">{{ item.label }}</text>
          <view v-if="item.highlight" class="menu-badge">NEW</view>
        </view>

        <view v-if="superAdminItems.length > 0" class="menu-section-title">
          <text class="section-label">系统管理</text>
        </view>

        <view
          v-for="(item, index) in superAdminItems"
          :key="'admin-' + index"
          class="menu-item menu-admin-item"
          @click.stop="navigateTo(item.path)"
        >
          <view class="menu-icon-wrap admin-icon-wrap">
            <text class="menu-icon">{{ item.icon }}</text>
          </view>
          <text class="menu-label" v-if="!isCollapsed">{{ item.label }}</text>
        </view>
      </scroll-view>

      <view class="sidebar-footer">
        <view class="menu-item logout-item" @click.stop="handleLogout">
          <view class="menu-icon-wrap logout-icon-wrap">
            <text class="menu-icon">🚪</text>
          </view>
          <text class="menu-label" v-if="!isCollapsed">退出登录</text>
        </view>
      </view>
    </view>

    <view
      class="main-content"
      :class="{ 'main-shifted': !isMobile && !showMobileMenu && !isCollapsed }"
    >
      <view class="top-bar">
        <view class="top-bar-left">
          <view class="menu-toggle-btn" @click="toggleMobileMenu">
            <text class="toggle-icon">☰</text>
          </view>
          <text class="page-title">{{ title }}</text>
        </view>
        <view class="top-bar-right">
          <view v-if="syncStatus !== 'idle'" class="sync-indicator" :class="'sync-' + syncStatus">
            <text class="sync-text">{{ syncStatusText }}</text>
          </view>
          <text class="current-date">{{ currentDate }}</text>
        </view>
      </view>

      <view class="content-area">
        <slot></slot>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { checkHeartbeat, incrementalSync } from '@/utils/sync-manager'

const props = defineProps<{
  title?: string
  showBack?: boolean
}>()

const isCollapsed = ref(false)
const showMobileMenu = ref(false)
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const syncStatus = ref<'idle' | 'syncing' | 'success' | 'error'>('idle')

const isMobile = computed(() => windowWidth.value <= 768)

const syncStatusText = computed(() => {
  const map: Record<string, string> = { syncing: '🔄 同步中...', success: '✅ 已同步', error: '⚠️ 同步失败' }
  return map[syncStatus.value] || ''
})

const userName = ref('系统管理员')
const currentUserRole = ref('admin')
const isLoggedIn = ref(true)
const userInfo = ref<any>(null)

const roleLabel = computed(() => {
  const map: Record<string, string> = { admin: '管理员', super_admin: '超级管理员', editor: '编辑者', viewer: '访客' }
  return map[currentUserRole.value] || '用户'
})

const currentDate = computed(() => {
  const now = new Date()
  return now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
})

const menuItems = ref<any[]>([])
const allMenuItems = [
  { icon: '👥', label: '会员管理', path: '/pages/admin/member/list', role: 'admin' },
  { icon: '🎯', label: '内容管理中心', path: '/pages/admin/content-hub', role: 'admin', highlight: true },
  { icon: '🧧', label: '红包管理', path: '/pages/admin/red-packet/list', role: 'admin' },
  { icon: '🔔', label: '提醒中心', path: '/pages/admin/remind/index', role: 'admin' },
  { icon: '📊', label: '数据统计', path: '/pages/admin/statistics/index', role: 'admin' },
  { icon: '📋', label: '日志中心', path: '/pages/admin/audit-log/list', role: 'all' },
  { icon: '👤', label: '管理员', path: '/pages/admin/admin-user/list', role: 'super_admin' },
  { icon: '⚙️', label: '系统设置', path: '/pages/admin/settings/index', role: 'super_admin' }
]

const normalMenuItems = computed(() => menuItems.value.filter(i => i.role !== 'super_admin'))
const superAdminItems = computed(() => currentUserRole.value === 'super_admin' ? allMenuItems.filter(i => i.role === 'super_admin') : [])

const isDashboard = computed(() => {
  try {
    const pages = getCurrentPages()
    if (!pages?.length) return false
    const route = pages[pages.length - 1]?.route || ''
    return route === 'pages/admin/dashboard'
  } catch { return false }
})

function toggleSidebar() { isCollapsed.value = !isCollapsed.value }

function toggleMobileMenu() {
  showMobileMenu.value = !showMobileMenu.value
}

function closeMobileMenu() { showMobileMenu.value = false }

function isActive(path: string): boolean {
  try {
    const pages = getCurrentPages()
    if (!pages?.length) return false
    const currentRoute = pages[pages.length - 1]?.route || ''
    const targetRoute = path.replace(/^\//, '')
    return currentRoute === targetRoute
  } catch { return false }
}

function goDashboard() {
  closeMobileMenu()
  if (isDashboard.value) return
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/admin/dashboard', fail: () => {} })
  }, 200)
}

function navigateTo(path: string) {
  if (!path) { uni.showToast({ title: '开发中...', icon: 'none' }); return }
  if (isActive(path)) { closeMobileMenu(); return }

  closeMobileMenu()
  setTimeout(() => {
    uni.reLaunch({ url: path, fail: () => uni.showToast({ title: '跳转失败', icon: 'none' }) })
  }, 200)
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    confirmText: '退出',
    confirmColor: '#FF3B30',
    success: (res) => {
      if (res.confirm) {
        uni.removeStorageSync('token')
        uni.removeStorageSync('refreshToken')
        uni.removeStorageSync('userInfo')
        uni.removeStorageSync('tokenExpires')
        uni.reLaunch({ url: '/pages/admin/login' })
      }
    }
  })
}

function checkLogin() {
  try {
    const token = uni.getStorageSync('token')
    const user = uni.getStorageSync('userInfo')
    if (token && user) {
      isLoggedIn.value = true
      userInfo.value = user
      userName.value = user.username || user.nickname || user.name || '用户'
      currentUserRole.value = user.role || 'admin'
    } else {
      isLoggedIn.value = false
    }
  } catch { isLoggedIn.value = false }
}

function loadMenuItems() {
  menuItems.value = allMenuItems.filter(item => {
    if (item.role === 'all') return true
    if (currentUserRole.value === 'super_admin') return true
    return item.role === currentUserRole.value || item.role === 'admin'
  })
}

function updateWidth() {
  windowWidth.value = window.innerWidth
}

async function performSync() {
  const token = uni.getStorageSync('token') || ''
  if (token.startsWith('demo-')) {
    syncStatus.value = 'idle'
    return
  }

  syncStatus.value = 'syncing'
  try {
    const heartbeat = await checkHeartbeat()
    if (heartbeat.online) {
      const result = await incrementalSync()
      syncStatus.value = result.synced.length > 0 || result.failed.length === 0 ? 'success' : 'error'
    } else {
      syncStatus.value = 'error'
    }
  } catch {
    syncStatus.value = 'error'
  }
  setTimeout(() => { syncStatus.value = 'idle' }, 3000)
}

onMounted(() => {
  checkLogin()
  loadMenuItems()
  updateWidth()
  performSync()
  window.addEventListener('resize', updateWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
})
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #F5F6FA;
}

.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 9998;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.mobile-overlay.overlay-visible {
  opacity: 1;
  pointer-events: auto;
}

.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 260px;
  z-index: 9999;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
  overflow: hidden;
}

.sidebar-open {
  transform: translateX(0);
}

.sidebar-closed {
  transform: translateX(-105%);
}

.sidebar-header {
  padding: 20px;
}

.sidebar-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.sidebar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.sidebar-logo {
  font-size: 28px;
}

.sidebar-brand {
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
}

.sidebar-indicator {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-left: 4px;
}

.collapse-btn {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-icon {
  color: #fff;
  font-size: 16px;
}

.close-btn {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #FF3B30, #FF6B6B);
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(255, 59, 48, 0.4);
  transition: visibility 0s 0.3s, opacity 0.3s ease;
}

.close-btn-visible {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
  transition: opacity 0.3s ease;
}

.close-icon {
  color: #FFFFFF;
  font-size: 16px;
  font-weight: bold;
}

.close-text {
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 600;
}

.user-info {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  color: #FFFFFF;
  font-size: 20px;
  font-weight: 700;
}

.user-detail {
  flex: 1;
}

.user-name {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
}

.user-role {
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.menu-scroll {
  flex: 1;
  overflow-y: auto;
}

.menu-section-title {
  padding: 16px 24px 8px;
}

.section-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 14px 24px;
  margin: 4px 12px;
  border-radius: 10px;
  cursor: pointer;
  position: relative;
}

.menu-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  background: rgba(255, 255, 255, 0.1);
}

.menu-icon {
  font-size: 18px;
}

.menu-label {
  flex: 1;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
}

.menu-badge {
  position: absolute;
  top: 6px;
  right: 8px;
  background: #FF3B30;
  color: #FFF;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 8px;
}

.menu-active {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.menu-active .menu-label {
  color: #fff;
  font-weight: 600;
}

.menu-highlight {
  background: linear-gradient(135deg, #ff6b6b, #ffe66d);
  border: 2px solid #FFD700;
}

.menu-highlight .menu-label {
  color: #1a1a2e;
  font-weight: 700;
}

.menu-admin-item {
  background: rgba(102, 126, 234, 0.1);
  border-left: 3px solid #667eea;
}

.admin-icon-wrap {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.logout-item {
  background: transparent;
}

.logout-icon-wrap {
  background: rgba(255, 59, 48, 0.2);
}

.main-content {
  flex: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;
  margin-left: 0;
}

.main-shifted {
  margin-left: 260px;
}

.top-bar {
  background: #FFF;
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-toggle-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.toggle-icon {
  font-size: 20px;
  color: #333;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sync-indicator {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.sync-syncing {
  background: #E3F2FD;
}

.sync-success {
  background: #E8F5E9;
}

.sync-error {
  background: #FFEBEE;
}

.sync-text {
  font-size: 12px;
  color: #333;
}

.current-date {
  font-size: 14px;
  color: #666;
}

.content-area {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}

@media (min-width: 769px) {
  .sidebar-closed {
    transform: translateX(0);
  }

  .mobile-overlay.overlay-visible {
    opacity: 0;
    pointer-events: none;
  }

  .menu-toggle-btn {
    display: none;
  }

  .close-btn {
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 100% !important;
    max-width: 100% !important;
  }

  .sidebar-open {
    transform: translateX(0) !important;
  }

  .sidebar-closed {
    transform: translateX(-105%) !important;
  }

  .sidebar-open .close-btn-visible {
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
  }

  .main-content {
    margin-left: 0 !important;
  }

  .main-shifted {
    margin-left: 0 !important;
  }

  .top-bar {
    padding: 12px 16px;
  }

  .content-area {
    padding: 16px;
  }

  .page-title {
    font-size: 18px;
  }

  .menu-toggle-btn {
    display: flex;
  }
}
</style>
