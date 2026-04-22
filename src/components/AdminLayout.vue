<template>
  <view class="admin-layout">
    <!-- 遮罩层 -->
    <view
      class="mobile-overlay"
      v-if="showMobileMenu"
      @tap.stop.prevent="closeMobileMenu"
      @touchmove.stop.prevent
      style="
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        z-index: 99999;
      "
    ></view>

    <!-- 导航栏 - 默认85%宽度，可切换显示/隐藏 -->
    <view
      class="sidebar"
      :class="{ 
        'mobile-show': showMobileMenu,
        'mobile-hide': !showMobileMenu && windowWidth <= 768
      }"
      style="
        position: fixed;
        left: 0; top: 0; bottom: 0;
        width: 260px;
        z-index: 100;
        transition: all 0.3s ease;
      "
      :style="
        windowWidth <= 768 
          ? (showMobileMenu 
            ? 'width: 85% !important; max-width: 320px !important; transform: translateX(0) !important;' 
            : 'transform: translateX(-105%) !important;')
          : ''
      "
    >
      <!-- Logo + 收起按钮 -->
      <view 
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          cursor: pointer;
        "
        @tap="toggleMobileMenu"
      >
        <!-- CRM系统标题（始终显示状态指示） -->
        <view style="display: flex; align-items: center; gap: 8px;">
          <text style="font-size: 28px;">🎯</text>
          <text style="font-size: 20px; font-weight: 700; color: #FFFFFF;">CRM系统</text>
          <!-- 状态指示符（所有设备都显示）-->
          <text style="font-size: 14px; color: rgba(255,255,255,0.7); margin-left: 4px;">
            {{ showMobileMenu ? '▼' : '☰' }}
          </text>
        </view>

        <!-- 桌面端折叠按钮（仅大屏） -->
        <view
          v-if="windowWidth > 768 && !showMobileMenu"
          @tap.stop="toggleSidebar"
          style="
            width: 28px; height: 28px;
            background: rgba(255,255,255,0.1);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
          "
        >
          <text style="color: #fff; font-size: 16px;">{{ isCollapsed ? '»' : '«' }}</text>
        </view>

        <!-- 收起按钮（展开时显示） -->
        <view
          v-if="showMobileMenu"
          @tap.stop="closeMobileMenu"
          style="
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: linear-gradient(135deg, #FF3B30, #FF6B6B);
            border-radius: 20px;
            box-shadow: 0 2px 8px rgba(255, 59, 48, 0.4);
          "
        >
          <text style="color: #FFFFFF; font-size: 16px; font-weight: bold;">✕</text>
          <text style="color: #FFFFFF; font-size: 13px; font-weight: 600;">收起</text>
        </view>
      </view>

      <!-- 用户信息 -->
      <view style="padding: 20px; display: flex; align-items: center; gap: 12px;" v-if="!isCollapsed">
        <view style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center;">
          <text style="color: #FFFFFF; font-size: 20px; font-weight: 700;">{{ userName.charAt(0) }}</text>
        </view>
        <view style="flex: 1;">
          <text style="display: block; font-size: 16px; font-weight: 600; color: #FFFFFF;">{{ userName }}</text>
          <text style="display: block; font-size: 13px; color: rgba(255,255,255,0.6);">{{ roleLabel }}</text>
        </view>
      </view>

      <!-- 菜单列表 -->
      <scroll-view scroll-y style="flex: 1; overflow-y: auto;">
        <view v-if="superAdminItems.length > 0" style="padding: 16px 24px 8px;">
          <text style="font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">主要功能</text>
        </view>
        
        <view
          v-for="(item, index) in normalMenuItems"
          :key="'normal-' + index"
          :class="{ 'nav-active': isActive(item.path), 'nav-highlight': item.highlight }"
          style="
            display: flex; align-items: center;
            padding: 14px 24px; margin: 4px 12px;
            border-radius: 10px; cursor: pointer;
          "
          @tap="navigateTo(item.path)"
        >
          <view style="width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px; background: rgba(255,255,255,0.1);">
            <text style="font-size: 18px;">{{ item.icon }}</text>
          </view>
          <text style="flex: 1; font-size: 15px; color: rgba(255,255,255,0.85);" v-if="!isCollapsed">{{ item.label }}</text>
          <view v-if="item.highlight" style="position: absolute; top: 6px; right: 8px; background: #FF3B30; color: #FFF; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 8px;">NEW</view>
        </view>

        <view v-if="superAdminItems.length > 0" style="padding: 16px 24px 8px;">
          <text style="font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">系统管理</text>
        </view>
        
        <view
          v-for="(item, index) in superAdminItems"
          :key="'admin-' + index"
          style="
            display: flex; align-items: center;
            padding: 14px 24px; margin: 4px 12px;
            border-radius: 10px; cursor: pointer;
            background: rgba(102,126,234,0.1);
            border-left: 3px solid #667eea;
          "
          @tap="navigateTo(item.path)"
        >
          <view style="width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px; background: linear-gradient(135deg, #667eea, #764ba2);">
            <text style="font-size: 18px;">{{ item.icon }}</text>
          </view>
          <text style="flex: 1; font-size: 15px; color: rgba(255,255,255,0.85);" v-if="!isCollapsed">{{ item.label }}</text>
        </view>
      </scroll-view>

      <!-- 底部退出按钮 -->
      <view style="padding: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
        <view
          style="display: flex; align-items: center; padding: 14px 24px; cursor: pointer;"
          @tap="handleLogout"
        >
          <view style="width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px; background: rgba(255,59,48,0.2);">
            <text style="font-size: 18px;">🚪</text>
          </view>
          <text style="flex: 1; font-size: 15px; color: rgba(255,255,255,0.85);" v-if="!isCollapsed">退出登录</text>
        </view>
      </view>
    </view>

    <!-- 主内容区 -->
    <view
      class="main-content"
      :style="{ marginLeft: (windowWidth > 768 && !showMobileMenu) ? (isCollapsed ? '80px' : '260px') : '0' }"
    >
      <!-- 顶部栏 -->
      <view style="background: #FFF; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); position: sticky; top: 0; z-index: 100;">
        <view style="display: flex; align-items: center; gap: 12px;">
          <view
            v-if="windowWidth <= 768 || showMobileMenu"
            @tap="toggleMobileMenu"
            style="width: 36px; height: 36px; border-radius: 8px; background: #F5F5F5; display: flex; align-items: center; justify-content: center;"
          >
            <text style="font-size: 20px; color: #333;">☰</text>
          </view>
          <text style="font-size: 20px; font-weight: 700; color: #1A1A1A;">{{ title }}</text>
        </view>
        <text style="font-size: 14px; color: #666;">{{ currentDate }}</text>
      </view>

      <!-- 内容插槽 -->
      <view style="flex: 1; padding: 24px 32px; overflow-y: auto;">
        <slot></slot>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  title?: string
  showBack?: boolean
}>()

const isCollapsed = ref(false)
const showMobileMenu = ref(false)
const windowWidth = ref(window.innerWidth)

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
  { icon: '📋', label: '日志中心', path: '/pages/admin/audit-log/index', role: 'all' },
  { icon: '👤', label: '管理员', path: '/pages/admin/admin-user/list', role: 'super_admin' },
  { icon: '⚙️', label: '系统设置', path: '/pages/admin/settings/index', role: 'super_admin' }
]

const normalMenuItems = computed(() => menuItems.value.filter(i => i.role !== 'super_admin'))
const superAdminItems = computed(() => currentUserRole.value === 'super_admin' ? allMenuItems.filter(i => i.role === 'super_admin') : [])

function toggleSidebar() { isCollapsed.value = !isCollapsed.value }

function toggleMobileMenu() {
  if (windowWidth.value <= 768) {
    showMobileMenu.value = !showMobileMenu.value
  } else {
    // PC端点击CRM系统也切换菜单
    showMobileMenu.value = !showMobileMenu.value
  }
}

function closeMobileMenu() { showMobileMenu.value = false }

function isActive(path: string): boolean {
  try {
    const pages = getCurrentPages()
    if (!pages?.length) return false
    return pages[pages.length-1]?.route?.includes(path.replace('/pages/', '').split('/')[0]) || false
  } catch { return false }
}

function navigateTo(path: string) {
  if (!path) { uni.showToast({ title: '开发中...', icon: 'none' }); return }
  if (isActive(path)) { closeMobileMenu(); return }
  
  closeMobileMenu()
  setTimeout(() => {
    uni.reLaunch({ url, fail: () => uni.showToast({ title: '跳转失败', icon: 'none' }) })
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
        uni.removeStorageSync('userInfo')
        uni.reLaunch({ url: '/pages/login/index' })
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
      userName.value = user.username || user.nickname || '用户'
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
  console.log('窗口宽度:', windowWidth.value, windowWidth.value <= 768 ? '移动端' : 'PC端')
}

onMounted(() => {
  checkLogin()
  loadMenuItems()
  updateWidth()
  window.addEventListener('resize', updateWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
})
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; background: #F5F6FA; }

.sidebar {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 12px rgba(0,0,0,0.15);
}

.sidebar.mobile-show { transform: translateX(0); }
.sidebar.mobile-hide { transform: translateX(-105%); }

.nav-active { background: linear-gradient(135deg, #667eea, #764ba2); }
.nav-active text:last-child { color: #fff !important; font-weight: 600; }
.nav-highlight { background: linear-gradient(135deg, #ff6b6b, #ffe66d); border: 2px solid #FFD700; }
.nav-highlight text:last-child { color: #1a1a2e !important; font-weight: 700; }

.main-content { flex: 1; min-height: 100vh; display: flex; flex-direction: column; transition: margin-left 0.3s ease; }
</style>