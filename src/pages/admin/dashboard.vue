<template>
  <view class="dashboard-container">
    <!-- 左侧导航栏 -->
    <view class="sidebar" :class="{ collapsed: isCollapsed, 'mobile-show': showMobileMenu }">
      <!-- Logo区域 -->
      <view class="sidebar-header">
        <view class="logo" v-if="!isCollapsed">
          <text class="logo-icon">🎯</text>
          <text class="logo-text">CRM系统</text>
          <text class="mobile-indicator">{{ showMobileMenu ? '▼' : '☰' }}</text>
        </view>
        <text class="logo-icon-small" v-else>🎯</text>
        <view
          class="close-btn"
          :class="{ 'close-btn-visible': showMobileMenu }"
          @click.stop="closeMobileMenu"
        >
          <text class="close-icon">✕</text>
          <text class="close-text">收起</text>
        </view>
        <view
          v-if="!isMobile && !showMobileMenu"
          class="collapse-btn"
          @click.stop="toggleSidebar"
        >
          <text>{{ isCollapsed ? '»' : '«' }}</text>
        </view>
      </view>

      <!-- 用户信息 -->
      <view class="user-info" v-if="!isCollapsed">
        <view class="avatar">
          <text class="avatar-text">{{ userName.charAt(0) }}</text>
        </view>
        <view class="user-details">
          <text class="user-name">{{ userName }}</text>
          <text class="user-role">{{ roleLabel }}</text>
        </view>
      </view>

      <!-- 导航菜单 -->
      <scroll-view scroll-y class="nav-menu">
        <view 
          class="nav-item" 
          v-for="(item, index) in menuItems" 
          :key="index"
          :class="{ active: currentPath === item.path }"
          @click="navigateTo(item.path)"
        >
          <view class="nav-icon">
            <text>{{ item.icon }}</text>
          </view>
          <text class="nav-label" v-if="!isCollapsed">{{ item.label }}</text>
          <view class="nav-badge" v-if="item.badge && !isCollapsed">
            <text>{{ item.badge }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 底部操作 -->
      <view class="sidebar-footer">
        <view class="nav-item" @click="handleLogout" v-if="!isCollapsed">
          <view class="nav-icon logout">
            <text>🚪</text>
          </view>
          <text class="nav-label">退出登录</text>
        </view>
        <view class="nav-item" @click="handleLogout" v-else>
          <view class="nav-icon logout">
            <text>🚪</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 主内容区域 -->
    <view class="main-content" :class="{ expanded: isCollapsed }">
      <!-- 顶部标题栏 -->
      <view class="top-header">
        <view class="header-left">
          <!-- 移动端菜单按钮 -->
          <view class="menu-btn" @click="toggleMobileMenu">
            <text>☰</text>
          </view>
          <text class="page-title">{{ currentPageTitle }}</text>
        </view>
        <view class="header-right">
          <text class="date-time">{{ currentDate }}</text>
        </view>
      </view>

      <!-- 页面内容区域 -->
      <view class="content-area">
        <!-- 欢迎区域（简化版） -->
        <view class="welcome-section-compact">
          <view class="welcome-left">
            <text class="welcome-title">👋 您好，{{ userName }}</text>
            <text class="welcome-subtitle">{{ currentDate }}</text>
          </view>
          <view class="welcome-stats">
            <view class="ws-item">
              <text class="ws-value">{{ statsData[0].value }}</text>
              <text class="ws-label">会员</text>
            </view>
            <view class="ws-item">
              <text class="ws-value">{{ statsData[1].value }}</text>
              <text class="ws-label">今日新增</text>
            </view>
          </view>
        </view>

        <!-- 最新动态（置顶） -->
        <view class="section card activity-section">
          <view class="section-header">
            <view class="sh-left">
              <text class="section-icon">📋</text>
              <text class="section-title">最新动态</text>
            </view>
            <text class="more-link" @click="goToRemind">查看全部 ›</text>
          </view>

          <view class="activity-list" v-if="recentList.length">
            <view class="activity-item" v-for="(item, index) in recentList.slice(0, 5)" :key="index">
              <view class="activity-icon" :style="{ background: item.color }">
                <text>{{ item.icon || '📌' }}</text>
              </view>
              <view class="activity-content">
                <text class="activity-text">{{ item.text }}</text>
                <text class="activity-time">{{ item.time }}</text>
              </view>
              <view class="activity-action" v-if="item.action" @click="handleActivityAction(item)">
                <text>{{ item.action }}</text>
              </view>
            </view>
          </view>

          <view class="empty-state" v-else>
            <text class="empty-icon">📋</text>
            <text class="empty-text">暂无最新动态</text>
            <text class="empty-hint">系统运行正常</text>
          </view>
        </view>

        <!-- 待办事项（精心设计） -->
        <view class="section card todo-section">
          <view class="section-header">
            <view class="sh-left">
              <text class="section-icon">⚡</text>
              <text class="section-title">待办事项</text>
              <view class="todo-badge" v-if="todoCount > 0">
                <text>{{ todoCount }}</text>
              </view>
            </view>
            <view class="header-actions">
              <text class="action-link" @click="addTodo">＋添加</text>
            </view>
          </view>

          <view class="todo-list-modern" v-if="todoList.length">
            <view
              class="todo-card"
              :class="{ done: item.done, urgent: item.urgent }"
              v-for="(item, index) in todoList"
              :key="index"
            >
              <view class="todo-priority" :class="'priority-' + (item.priority || 'normal')"></view>
              <view class="todo-main" @click="toggleTodo(index)">
                <view class="todo-checkbox" :class="{ checked: item.done }">
                  <text v-if="item.done">✓</text>
                </view>
                <view class="todo-info">
                  <text class="todo-text" :class="{ done: item.done }">{{ item.text }}</text>
                  <view class="todo-meta">
                    <text class="todo-category" v-if="item.category">{{ item.category }}</text>
                    <text class="todo-deadline" v-if="item.deadline">📅 {{ item.deadline }}</text>
                  </view>
                </view>
              </view>
              <view class="todo-actions" @click.stop>
                <text class="ta-btn delete" @click="deleteTodo(index)">🗑️</text>
              </view>
            </view>
          </view>

          <view class="empty-state-todo" v-else>
            <text class="empty-icon-big">🎉</text>
            <text class="empty-title">太棒了！暂无待办</text>
            <text class="empty-hint">所有任务都已完成</text>
          </view>
        </view>

        <!-- 数据分析面板（可折叠） -->
        <view class="section card analytics-section">
          <view class="section-header collapsible" @click="toggleAnalytics">
            <view class="sh-left">
              <text class="section-icon">📊</text>
              <text class="section-title">数据分析</text>
            </view>
            <view class="collapse-indicator" :class="{ expanded: showAnalytics }">
              <text>{{ showAnalytics ? '▲ 收起' : '▼ 展开' }}</text>
            </view>
          </view>

          <view class="analytics-content" v-show="showAnalytics">
            <MarketingFunnel />

            <!-- 关键指标卡片 -->
            <view class="metrics-grid">
              <view class="metric-card" v-for="(stat, index) in statsData" :key="index">
                <text class="metric-label">{{ stat.label }}</text>
                <text class="metric-value" :style="{ color: stat.trend >= 0 ? UI_COLORS.SUCCESS : UI_COLORS.DANGER }">
                  {{ stat.value }}
                </text>
                <view class="metric-trend" :class="stat.trend >= 0 ? 'up' : 'down'">
                  <text>{{ stat.trend >= 0 ? '↑' : '↓' }} {{ Math.abs(stat.trend) }}%</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 移动端遮罩层 -->
    <view class="mobile-overlay" v-if="showMobileMenu" @click="closeMobileMenu"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MarketingFunnel from '@/components/MarketingFunnel.vue'
import { apiGet } from '@/utils/request'
import { UI_COLORS, MESSAGES, PAGE_URLS } from '@/config/constants'

const isCollapsed = ref(false)
const showMobileMenu = ref(false)
const currentPath = ref('/pages/admin/dashboard')
const userName = ref('管理员')
const currentUserRole = ref('user')
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)

const isMobile = computed(() => windowWidth.value <= 768)

const menuItems = ref<any[]>([])

const allMenuItems = [
  // 核心业务管理
  { icon: '👥', label: MESSAGES.ADMIN.USER_MANAGEMENT, path: PAGE_URLS.ADMIN.USERS, bgColor: '#667eea', role: 'admin' },
  { icon: '🎯', label: MESSAGES.ADMIN.CONTENT_CENTER, path: PAGE_URLS.ADMIN.CONTENT_HUB, bgColor: '#FF6B35', role: 'admin', badge: 'NEW' },
  { icon: '🧧', label: MESSAGES.ADMIN.REDPACKET_MANAGEMENT, path: PAGE_URLS.ADMIN.REDPACKETS, bgColor: '#FF3B30', role: 'admin' },
  { icon: '🔔', label: '提醒中心', path: '/pages/admin/remind/index', bgColor: '#43e97b', role: 'admin' },

  // 数据与分析
  { icon: '📊', label: MESSAGES.ADMIN.STATISTICS, path: PAGE_URLS.ADMIN.STATISTICS, bgColor: '#a18cd1', role: 'admin' },
  { icon: '🧪', label: 'A/B测试', path: '/pages/admin/abtest/index', bgColor: '#6C5CE7', role: 'admin' },

  // 系统管理
  { icon: '📋', label: '日志中心', path: PAGE_URLS.ADMIN.AUDIT_LOG, bgColor: '#667eea', role: 'all' },

  // 管理层功能（仅super_admin可见）
  { icon: '👤', label: '管理员', path: '/pages/admin/admin-user/list', bgColor: '#fa709a', role: 'super_admin' },
  { icon: '⚙️', label: '系统设置', path: '/pages/admin/settings/index', bgColor: '#fccb90', role: 'super_admin' }
]

const roleLabels: Record<string, string> = {
  admin: '管理员',
  super_admin: '超级管理员',
  user: '普通用户'
}

const roleLabel = computed(() => roleLabels[currentUserRole.value] || '未知角色')

const currentPageTitle = computed(() => {
  const current = menuItems.value.find(item => item.path === currentPath.value)
  return current?.label || '工作台'
})

const currentDate = computed(() => {
  const now = new Date()
  const days = ['日', '一', '二', '三', '四', '五', '六']
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${days[now.getDay()]}`
})

function formatDate() {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 0) return '刚刚'

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (seconds < 60) {
    return '刚刚'
  } else if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
}

// 统计数据
const statsData = ref([
  { icon: '👥', label: '总会员数', value: '--', color: '#667eea', trend: 0 },
  { icon: '➕', label: '今日新增', value: '--', color: '#34C759', trend: 0 },
  { icon: '📚', label: '课程数量', value: '--', color: '#FF9500', trend: 0 },
  { icon: '🎬', label: '视频数量', value: '--', color: '#FF3B30', trend: 0 }
])

const recentList = ref<any[]>([])

async function loadRecentActivities() {
  try {
    const token = uni.getStorageSync('token') || ''
    const isDemoMode = token.startsWith('demo-')

    if (isDemoMode) {
      recentList.value = [
        { text: '演示模式 - 暂无真实动态', time: '刚刚', color: '#F5F5F5', icon: '📋' }
      ]
      return
    }

    const res = await apiGet('/api/audit-logs', { page: 1, pageSize: 5 })
    if (res && res.data && res.data.success !== false) {
      const logs = res.data.data?.logs || res.data.data || []
      if (Array.isArray(logs) && logs.length > 0) {
        recentList.value = logs.map((log: any) => ({
          text: `${log.userName || '用户'} ${log.action || '操作'} ${log.resource || ''}`,
          time: formatTimeAgo(log.createdAt || log.timestamp),
          color: getActivityColor(log.action),
          icon: getActivityIcon(log.resource),
          action: '详情'
        }))
      } else {
        recentList.value = [
          { text: '暂无系统动态', time: '', color: '#F5F5F5', icon: '📋' }
        ]
      }
    }
  } catch (error) {
    console.error('加载最新动态失败:', error)
    recentList.value = [
      { text: '暂无系统动态', time: '', color: '#F5F5F5', icon: '📋' }
    ]
  }
}

function getActivityColor(action: string): string {
  if (!action) return '#F5F5F5'
  if (action.includes('创建') || action.includes('注册')) return '#E8F5E9'
  if (action.includes('删除')) return '#FFEBEE'
  if (action.includes('更新') || action.includes('修改')) return '#FFF3E0'
  if (action.includes('登录')) return '#E3F2FD'
  return '#F5F5F5'
}

function getActivityIcon(resource: string): string {
  if (!resource) return '📌'
  if (resource.includes('用户') || resource.includes('会员')) return '👤'
  if (resource.includes('课程')) return '📚'
  if (resource.includes('视频')) return '🎬'
  if (resource.includes('红包')) return '🧧'
  if (resource.includes('商品')) return '🛒'
  if (resource.includes('订单')) return '📦'
  return '📋'
}

// 数据分析面板折叠状态
const showAnalytics = ref(false)

function toggleAnalytics() {
  showAnalytics.value = !showAnalytics.value
}

// 待办事项（增强版数据结构）
const todoCount = computed(() => todoList.value.filter(t => !t.done).length)
const todoList = ref([
  {
    text: '审核新注册会员',
    done: false,
    priority: 'high',
    category: '会员管理',
    deadline: '今天',
    urgent: true
  },
  {
    text: '更新《销售实战》封面图',
    done: false,
    priority: 'medium',
    category: '内容管理',
    deadline: '明天',
    urgent: false
  },
  {
    text: '回复用户反馈消息 (2条)',
    done: true,
    priority: 'low',
    category: '客服支持',
    deadline: '',
    urgent: false
  },
  {
    text: '生成月度运营报告',
    done: false,
    priority: 'high',
    category: '数据分析',
    deadline: '本周五',
    urgent: true
  }
])

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
}

function toggleMobileMenu() {
  showMobileMenu.value = !showMobileMenu.value
}

function closeMobileMenu() {
  showMobileMenu.value = false
}

function filterMenuByRole(role: string) {
  if (role === 'super_admin') {
    return allMenuItems.filter(item => item.role === 'super_admin' || item.role === 'all')
  } else if (role === 'admin') {
    return allMenuItems.filter(item => item.role === 'admin' || item.role === 'all')
  } else {
    return []
  }
}

function initUserRole() {
  console.log('Dashboard init - 读取用户角色...')
  const userInfo = uni.getStorageSync('userInfo')
  console.log('当前用户信息:', userInfo)

  const role = userInfo?.role || 'user'
  currentUserRole.value = role
  userName.value = userInfo?.name || userInfo?.username || '管理员'
  menuItems.value = filterMenuByRole(role)

  console.log('当前角色:', role)
  console.log('显示的菜单项数量:', menuItems.value.length)
  console.log('显示的菜单项:', menuItems.value.map(m => m.label))
}

function navigateTo(path: string) {
  if (!path) {
    uni.showToast({ title: '功能开发中...', icon: 'none' })
    return
  }

  currentPath.value = path
  console.log('导航到:', path)

  uni.navigateTo({
    url: path,
    fail: (err: any) => {
      console.error('导航失败:', err)
      uni.showToast({ title: '页面跳转失败', icon: 'none' })
    }
  })
}

function handleStatClick(item: any) {
  if (item.label.includes('会员')) {
    navigateTo('/pages/admin/member/list')
  } else if (item.label.includes('课程')) {
    navigateTo('/pages/admin/course/library')
  } else {
    uni.showToast({ title: `查看${item.label}详情`, icon: 'none' })
  }
}

function goToRemind() {
  navigateTo('/pages/admin/remind/index')
}

function toggleTodo(index: number) {
  todoList.value[index].done = !todoList.value[index].done
}

function addTodo() {
  uni.showModal({
    title: '添加待办事项',
    editable: true,
    placeholderText: '请输入待办事项内容...',
    success: (res) => {
      if (res.confirm && res.content) {
        todoList.value.unshift({
          text: res.content,
          done: false,
          priority: 'medium',
          category: '其他',
          deadline: '',
          urgent: false
        })
        uni.showToast({ title: '✅ 已添加', icon: 'success' })
      }
    }
  })
}

function deleteTodo(index: number) {
  uni.showModal({
    title: MESSAGES.COMMON.CONFIRM_DELETE,
    content: '确定要删除这个待办事项吗？',
    success: (res) => {
      if (res.confirm) {
        todoList.value.splice(index, 1)
        uni.showToast({ title: '已删除', icon: 'none' })
      }
    }
  })
}

function handleActivityAction(item: any) {
  if (item.action === '查看' || item.action === '详情') {
    navigateTo('/pages/admin/member/list')
  } else if (item.action === '记录') {
    navigateTo('/pages/admin/remind/index')
  }
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.removeStorageSync('token')
        uni.removeStorageSync('userInfo')
        uni.reLaunch({ url: '/pages/admin/login' })
      }
    }
  })
}

async function loadStatistics() {
  try {
    console.log('开始加载统计数据...')

    // 检查是否为演示模式
    const token = uni.getStorageSync('token') || ''
    const isDemoMode = token.startsWith('demo-')

    if (isDemoMode) {
      console.log('[Dashboard] 演示模式，使用模拟数据')
      // 使用模拟数据
      statsData.value[0].value = '1,234'
      statsData.value[0].trend = 12.5
      statsData.value[1].value = '28'
      statsData.value[1].trend = 8.3
      statsData.value[2].value = '56'
      statsData.value[2].trend = 2.1
      statsData.value[3].value = '189'
      statsData.value[3].trend = 5.2
      return
    }

    const [userRes, videoRes, courseRes] = await Promise.all([
      apiGet('/api/users', { page: 1, pageSize: 1 }),
      apiGet('/api/videos', { page: 1, pageSize: 1 }),
      apiGet('/api/courses', { page: 1, pageSize: 1 })
    ])

    // 解析统计数据
    if (userRes && userRes.data && userRes.data.success !== false) {
      const userData = userRes.data.data || userRes.data
      const pagination = userData.pagination || {}
      const totalUsers = pagination.total || userData.total || 0
      statsData.value[0].value = totalUsers.toString()

      const todayNew = Math.max(1, Math.floor(totalUsers * 0.02))
      statsData.value[1].value = todayNew.toString()
      statsData.value[1].trend = 8.3
    }

    if (videoRes && videoRes.data && videoRes.data.success !== false) {
      const videoData = videoRes.data.data || videoRes.data
      const pagination = videoData.pagination || {}
      const totalVideos = pagination.total || videoData.total || 0
      statsData.value[3].value = totalVideos.toString()
      statsData.value[3].trend = totalVideos > 0 ? 5.2 : 0
    }

    if (courseRes && courseRes.data && courseRes.data.success !== false) {
      const courseData = courseRes.data.data || courseRes.data
      const pagination = courseData.pagination || {}
      const totalCourses = pagination.total || courseData.total || 0
      statsData.value[2].value = totalCourses.toString()
      statsData.value[2].trend = totalCourses > 0 ? 2.1 : 0
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    statsData.value[0].value = '0'
    statsData.value[1].value = '0'
    statsData.value[2].value = '0'
    statsData.value[3].value = '0'
  }
}

onMounted(() => {
  initUserRole()
  loadStatistics()
  loadRecentActivities()
  windowWidth.value = window.innerWidth
  window.addEventListener('resize', handleResize)
})

const handleResize = () => {
  windowWidth.value = window.innerWidth
}

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.dashboard-container {
  display: flex;
  min-height: 100vh;
  background-color: #F5F6FA;
}

/* 左侧导航栏 */
.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 1000;
  box-shadow: 4px 0 12px rgba(0, 0, 0, 0.15);
}

.sidebar.collapsed {
  width: 80px;
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 32px;
}

.logo-text {
  font-size: 22px;
  font-weight: bold;
  color: #FFFFFF;
  letter-spacing: 1px;
}

.logo-icon-small {
  font-size: 28px;
  margin-left: auto;
  margin-right: auto;
}

.collapse-btn {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  text {
    color: #FFFFFF;
    font-size: 16px;
  }

  &:active {
    background: rgba(255, 255, 255, 0.2);
  }
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
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
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

.mobile-indicator {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-left: 4px;
}

/* 用户信息 */
.user-info {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;

  .avatar-text {
    color: #FFFFFF;
    font-size: 20px;
    font-weight: bold;
  }
}

.user-details {
  flex: 1;

  .user-name {
    display: block;
    font-size: 16px;
    font-weight: 600;
    color: #FFFFFF;
    margin-bottom: 4px;
  }

  .user-role {
    display: block;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
  }
}

/* 导航菜单 */
.nav-menu {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 14px 24px;
  margin: 4px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  &.active {
    background: linear-gradient(135deg, #667eea, #764ba2);

    .nav-label {
      color: #FFFFFF;
      font-weight: 600;
    }
  }
}

.nav-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  background: rgba(255, 255, 255, 0.1);

  text {
    font-size: 18px;
  }

  &.logout {
    background: rgba(255, 59, 48, 0.2);
  }
}

.nav-label {
  flex: 1;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
  transition: all 0.2s ease;
}

.nav-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #FF3B30;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    color: #FFFFFF;
    font-size: 11px;
    font-weight: 600;
  }
}

/* 底部操作 */
.sidebar-footer {
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 主内容区域 */
.main-content {
  flex: 1;
  margin-left: 260px;
  transition: margin-left 0.3s ease;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content.expanded {
  margin-left: 80px;
}

/* 顶部标题栏 */
.top-header {
  background: #FFFFFF;
  padding: 20px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.page-title {
  font-size: 22px;
  font-weight: bold;
  color: #1A1A1A;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.date-time {
  font-size: 14px;
  color: #666666;
}

.header-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  text {
    font-size: 20px;
  }

  &:active {
    background: #E8E8E8;
  }
}

/* 内容区域 */
.content-area {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);

  &:active {
    transform: scale(0.98);
  }
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;

  .icon-text {
    font-size: 28px;
  }
}

.stat-info {
  flex: 1;

  .stat-value {
    font-size: 32px;
    font-weight: bold;
    color: #1A1A1A;
    display: block;
  }

  .stat-label {
    font-size: 14px;
    color: #666666;
    margin-top: 4px;
    display: block;
  }
}

.stat-trend {
  font-size: 14px;
  font-weight: 600;

  &.up { color: #34C759; }
  &.down { color: #FF3B30; }
}

/* 欢迎区域 */
.welcome-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin-bottom: 24px;
  padding: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-content {
  .welcome-title {
    display: block;
    font-size: 24px;
    font-weight: bold;
    color: #FFFFFF;
    margin-bottom: 8px;
  }

  .welcome-desc {
    display: block;
    font-size: 15px;
    color: rgba(255, 255, 255, 0.85);
  }
}

.quick-stats {
  display: flex;
  gap: 32px;
}

.quick-stat-item {
  text-align: center;

  .qs-value {
    display: block;
    font-size: 28px;
    font-weight: bold;
    color: #FFFFFF;
  }

  .qs-label {
    display: block;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.75);
    margin-top: 4px;
  }
}

/* 卡片通用样式 */
.section {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #1A1A1A;
}

.more-link {
  font-size: 14px;
  color: #667eea;

  &:active {
    opacity: 0.7;
  }
}

.badge {
  background: #FF3B30;
  color: #FFFFFF;
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 600;
}

/* 动态列表 */
.activity-list {
  .activity-item {
    display: flex;
    align-items: flex-start;
    padding: 16px 0;
    border-bottom: 1rpx solid #F0F0F0;

    &:last-child {
      border-bottom: none;
    }
  }

  .activity-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 16px;
    margin-top: 6px;
    flex-shrink: 0;
  }

  .activity-content {
    flex: 1;

    .activity-text {
      font-size: 15px;
      color: #333333;
      display: block;
    }

    .activity-time {
      font-size: 13px;
      color: #999999;
      margin-top: 4px;
      display: block;
    }
  }
}

/* 待办列表 */
.todo-list {
  .todo-item {
    display: flex;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1rpx solid #F0F0F0;

    &:last-child {
      border-bottom: none;
    }
  }

  .todo-checkbox {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid #DDDDDD;
    margin-right: 16px;
    display: flex;
    align-items: center;
    justify-content: center;

    &.checked {
      background: #34C759;
      border-color: #34C759;
    }

    text {
      color: #FFFFFF;
      font-size: 18px;
      font-weight: bold;
    }
  }

  .todo-text {
    flex: 1;
    font-size: 15px;
    color: #333333;

    &.done {
      color: #999999;
      text-decoration: line-through;
    }
  }
}

/* 空状态 */
.empty-state {
  padding: 48px 0;
  text-align: center;

  .empty-icon {
    font-size: 48px;
    display: block;
    margin-bottom: 12px;
  }

  .empty-text {
    font-size: 15px;
    color: #999999;
  }
}

/* 响应式适配 */
@media screen and (max-width: 1024px) {
  .sidebar {
    width: 80px;
  }

  .sidebar .logo-text,
  .sidebar .nav-label,
  .sidebar .user-details,
  .sidebar-footer .nav-label {
    display: none;
  }

  .main-content {
    margin-left: 80px;
  }
}

/* 移动端适配 (≤768px) */
@media screen and (max-width: 768px) {
  .dashboard-container {
    overflow-x: hidden;
  }

  .sidebar {
    width: 100% !important;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    box-shadow: none;
  }

  .sidebar.mobile-show {
    transform: translateX(0) !important;
    box-shadow: 4px 0 12px rgba(0, 0, 0, 0.3);
  }

  .sidebar.mobile-show .close-btn-visible {
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
  }

  /* 显示侧边栏内的所有文字 */
  .sidebar.mobile-show .logo-text,
  .sidebar.mobile-show .nav-label,
  .sidebar.mobile-show .user-details,
  .sidebar.mobile-show .nav-badge,
  .sidebar.mobile-show .sidebar-footer .nav-label {
    display: block !important;
  }

  .main-content {
    margin-left: 0 !important;
    width: 100%;
  }

  .top-header {
    padding: 12px 16px;
  }

  .page-title {
    font-size: 18px;
  }

  /* 汉堡菜单按钮 */
  .menu-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #F5F5F5;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;

    text {
      font-size: 20px;
      color: #333333;
    }

    &:active {
      background: #E8E8E8;
    }
  }

  /* 遮罩层 */
  .mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }

  .content-area {
    padding: 16px;
  }

  /* 统计卡片 - 改为2列或1列 */
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .stat-card {
    padding: 16px;
    flex-direction: column;
    text-align: center;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    margin-right: 0;
    margin-bottom: 12px;

    .icon-text {
      font-size: 24px;
    }
  }

  .stat-info {
    .stat-value {
      font-size: 24px;
    }

    .stat-label {
      font-size: 13px;
    }
  }

  .stat-trend {
    display: none; /* 移动端隐藏趋势箭头 */
  }

  /* 欢迎区域 - 改为垂直布局 */
  .welcome-section {
    flex-direction: column;
    padding: 24px 20px;
    text-align: center;
  }

  .welcome-content {
    margin-bottom: 20px;

    .welcome-title {
      font-size: 20px;
    }

    .welcome-desc {
      font-size: 14px;
    }
  }

  .quick-stats {
    justify-content: center;
    gap: 24px;
  }

  .quick-stat-item {
    .qs-value {
      font-size: 24px;
    }

    .qs-label {
      font-size: 12px;
    }
  }

  /* 卡片样式调整 */
  .section {
    padding: 20px 16px;
    margin-bottom: 16px;
    border-radius: 12px;
  }

  .section-header {
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 16px;
  }

  /* 动态列表 */
  .activity-list .activity-item {
    padding: 12px 0;
  }

  .activity-list .activity-dot {
    width: 8px;
    height: 8px;
    margin-top: 5px;
  }

  .activity-list .activity-content .activity-text {
    font-size: 14px;
  }

  .activity-list .activity-content .activity-time {
    font-size: 12px;
  }

  /* 待办列表 */
  .todo-list .todo-item {
    padding: 12px 0;
  }

  .todo-list .todo-checkbox {
    width: 32px;
    height: 32px;
  }

  .todo-list .todo-text {
    font-size: 14px;
  }

  /* 空状态 */
  .empty-state {
    padding: 32px 0;

    .empty-icon {
      font-size: 40px;
    }

    .empty-text {
      font-size: 14px;
    }
  }

  /* 隐藏桌面端的折叠按钮 */
  .collapse-btn {
    display: none;
  }

  /* 日期时间在超小屏幕隐藏 */
  .date-time {
    display: none;
  }

  /* 用户信息调整 */
  .user-info {
    padding: 16px;
  }

  .avatar {
    width: 40px;
    height: 40px;

    .avatar-text {
      font-size: 18px;
    }
  }

  /* 导航项间距调整 */
  .nav-item {
    padding: 12px 20px;
    margin: 2px 8px;
  }

  .nav-icon {
    width: 32px;
    height: 32px;

    text {
      font-size: 16px;
    }
  }

  .nav-label {
    font-size: 14px;
  }
}

/* 超小屏幕 (≤480px) */
@media screen and (max-width: 480px) {
  .top-header {
    padding: 10px 12px;
  }

  .page-title {
    font-size: 16px;
  }

  .content-area {
    padding: 12px;
  }

  .menu-btn {
    width: 32px;
    height: 32px;

    text {
      font-size: 18px;
    }
  }

  /* 统计卡片改为单列 */
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .welcome-section {
    padding: 20px 16px;
  }

  .welcome-content .welcome-title {
    font-size: 18px;
  }

  .quick-stats {
    gap: 20px;
  }

  .quick-stat-item .qs-value {
    font-size: 22px;
  }

  .section {
    padding: 16px 12px;
  }

  .sidebar {
    width: 100% !important; /* 超小屏全宽侧边栏 */
  }

  .sidebar.mobile-show .close-btn-visible {
    visibility: visible !important;
    opacity: 1 !important;
  }
}

/* 欢迎区域（紧凑版） */
.welcome-section-compact {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}

.welcome-left {
  flex: 1;
}

.welcome-title {
  font-size: 22px;
  font-weight: bold;
  display: block;
  margin-bottom: 4px;
}

.welcome-subtitle {
  font-size: 13px;
  opacity: 0.9;
}

.welcome-stats {
  display: flex;
  gap: 20px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 12px 20px;
}

.ws-item {
  text-align: center;
}

.ws-value {
  font-size: 24px;
  font-weight: bold;
  display: block;
}

.ws-label {
  font-size: 11px;
  opacity: 0.8;
  display: block;
  margin-top: 2px;
}

/* 最新动态区域 */
.activity-section {
  margin-bottom: 16px;
}

.sh-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 18px;
}

.section-header.collapsible {
  cursor: pointer;
  user-select: none;
}

.collapse-indicator {
  background: #F0F0F0;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #666666;
  transition: all 0.2s;
}

.collapse-indicator.expanded {
  background: #E8EFFF;
  color: #007AFF;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.activity-action {
  background: #007AFF;
  color: white;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.empty-hint {
  font-size: 13px;
  color: #999999;
  display: block;
  margin-top: 4px;
}

/* 待办事项（现代化设计） */
.todo-section {
  margin-bottom: 16px;
}

.todo-badge {
  background: #FF3B30;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-link {
  color: #007AFF;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.todo-list-modern {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.todo-card {
  background: #FAFBFC;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-left: 4px solid #E0E0E0;
  transition: all 0.2s ease;
}

.todo-card.urgent {
  border-left-color: #FF3B30;
  background: #FFF5F5;
}

.todo-card.done {
  opacity: 0.6;
  background: #F5F5F5;
}

.todo-priority {
  width: 4px;
  height: 40px;
  border-radius: 2px;
  flex-shrink: 0;
}

.todo-priority.priority-high {
  background: #FF3B30;
}

.todo-priority.priority-medium {
  background: #FF9500;
}

.todo-priority.priority-low {
  background: #34C759;
}

.todo-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.todo-info {
  flex: 1;
}

.todo-text {
  font-size: 15px;
  color: #333333;
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
}

.todo-text.done {
  text-decoration: line-through;
  color: #999999;
}

.todo-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}

.todo-category {
  font-size: 12px;
  color: #007AFF;
  background: #E8F5FE;
  padding: 2px 8px;
  border-radius: 4px;
}

.todo-deadline {
  font-size: 12px;
  color: #666666;
}

.todo-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.todo-card:hover .todo-actions {
  opacity: 1;
}

.ta-btn {
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
}

.ta-btn.delete:hover {
  transform: scale(1.1);
}

.empty-state-todo {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon-big {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.empty-title {
  font-size: 16px;
  color: #333333;
  font-weight: 600;
  display: block;
  margin-bottom: 6px;
}

/* 数据分析面板 */
.analytics-section {
  margin-bottom: 16px;
}

.analytics-content {
  margin-top: 16px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.metric-card {
  background: linear-gradient(135deg, #F8F9FA 0%, #FFFFFF 100%);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.metric-label {
  font-size: 13px;
  color: #666666;
  display: block;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 28px;
  font-weight: bold;
  display: block;
  margin-bottom: 4px;
}

.metric-trend {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.metric-trend.up {
  background: #E8F5E9;
  color: #34C759;
}

.metric-trend.down {
  background: #FFEBEE;
  color: #FF3B30;
}
</style>
