<template>
  <AdminLayout title="系统设置" :showBack="true">
  <view class="settings-page">
    <!-- 个人信息卡片 -->
    <view class="section card">
      <view class="section-header">
        <text class="section-title">👤 个人信息</text>
      </view>
      <view class="setting-item" @click="showEditProfile">
        <view class="item-left">
          <text class="item-icon">📝</text>
          <text class="item-label">修改昵称/姓名</text>
        </view>
        <view class="item-right">
          <text class="item-value">{{ userInfo.name || '未设置' }}</text>
          <text class="arrow">›</text>
        </view>
      </view>

      <view class="setting-item" @click="showChangePassword">
        <view class="item-left">
          <text class="item-icon">🔒</text>
          <text class="item-label">修改密码</text>
        </view>
        <view class="item-right">
          <text class="item-desc">定期更换密码更安全</text>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 系统配置 -->
    <view class="section card" v-if="isSuperAdmin">
      <view class="section-header">
        <text class="section-title">⚙️ 系统配置</text>
      </view>
      <view class="setting-item" @click="goToAdminManagement">
        <view class="item-left">
          <text class="item-icon">👥</text>
          <text class="item-label">管理员管理</text>
        </view>
        <view class="item-right">
          <text class="item-desc">管理系统员账号和权限</text>
          <text class="arrow">›</text>
        </view>
      </view>

      <view class="setting-item" @click="goToLogSettings">
        <view class="item-left">
          <text class="item-icon">📋</text>
          <text class="item-label">日志配置</text>
        </view>
        <view class="item-right">
          <text class="item-desc">审计日志保留策略</text>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 显示设置 -->
    <view class="section card">
      <view class="section-header">
        <text class="section-title">🎨 显示设置</text>
      </view>
      <view class="setting-item switch-item">
        <view class="item-left">
          <text class="item-icon">🌙</text>
          <text class="item-label">深色模式</text>
        </view>
        <switch :checked="darkMode" @change="toggleDarkMode" color="#667eea" />
      </view>

      <view class="setting-item switch-item">
        <view class="item-left">
          <text class="item-icon">📱</text>
          <text class="item-label">紧凑布局</text>
        </view>
        <switch :checked="compactMode" @change="toggleCompactMode" color="#667eea" />
      </view>
    </view>

    <!-- 关于 -->
    <view class="section card">
      <view class="section-header">
        <text class="section-title">ℹ️ 关于</text>
      </view>
      <view class="setting-item">
        <view class="item-left">
          <text class="item-icon">📦</text>
          <text class="item-label">版本号</text>
        </view>
        <view class="item-right">
          <text class="item-value">v1.0.0</text>
        </view>
      </view>

      <view class="setting-item">
        <view class="item-left">
          <text class="item-icon">🖥️</text>
          <text class="item-label">运行环境</text>
        </view>
        <view class="item-right">
          <text class="item-value">{{ envInfo }}</text>
        </view>
      </view>
    </view>

    <!-- 危险操作区域 -->
    <view class="section card danger-zone">
      <view class="setting-item danger" @click="handleLogout">
        <view class="item-left">
          <text class="item-icon">🚪</text>
          <text class="item-label">退出登录</text>
        </view>
        <view class="item-right">
          <text class="arrow">›</text>
        </view>
      </view>

      <view class="setting-item danger" v-if="isSuperAdmin" @click="clearCache">
        <view class="item-left">
          <text class="item-icon">🗑️</text>
          <text class="item-label">清除缓存</text>
        </view>
        <view class="item-right">
          <text class="item-desc">清理浏览器缓存数据</text>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>
  </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { MESSAGES, TOAST_ICON } from '@/config/constants'
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import { apiPost } from '@/utils/request'

const userInfo = ref<any>({})
const darkMode = ref(false)
const compactMode = ref(false)
const isSuperAdmin = ref(false)

const envInfo = computed(() => {
  const isDev = import.meta.env.DEV
  return isDev ? '开发环境' : '生产环境'
})

onMounted(() => {
  loadUserInfo()
})

function loadUserInfo() {
  const stored = uni.getStorageSync('userInfo')
  if (stored) {
    userInfo.value = stored
    isSuperAdmin.value = stored.role === 'super_admin'
  }

  // 加载本地存储的偏好设置
  darkMode.value = uni.getStorageSync('darkMode') || false
  compactMode.value = uni.getStorageSync('compactMode') || false
}

function showEditProfile() {
  uni.showModal({
    title: '修改个人信息',
    content: '请输入新的姓名',
    editable: true,
    placeholderText: userInfo.value.name || '',
    success: async (res) => {
      if (res.confirm && res.content) {
        try {
          await apiPut(`/api/users/${userInfo.value._id}`, { name: res.content })

          userInfo.value.name = res.content
          uni.setStorageSync('userInfo', { ...userInfo.value, name: res.content })
          uni.showToast({ title: MESSAGES.COMMON.SAVE_SUCCESS, icon: TOAST_ICON.SUCCESS })
        } catch (error) {
          console.error('修改个人信息失败:', error)
          uni.showToast({ title: '修改失败', icon: 'none' })
        }
      }
    }
  })
}

function showChangePassword() {
  uni.showModal({
    title: '修改密码',
    content: '此功能需要联系超级管理员重置密码\n\n或使用忘记密码功能',
    showCancel: true,
    confirmText: '我知道了'
  })
}

function toggleDarkMode(e: any) {
  darkMode.value = e.detail.value
  uni.setStorageSync('darkMode', e.detail.value)
  uni.showToast({ title: e.detail.value ? '已开启深色模式' : '已关闭深色模式', icon: 'none' })
}

function toggleCompactMode(e: any) {
  compactMode.value = e.detail.value
  uni.setStorageSync('compactMode', e.detail.value)
  uni.showToast({ title: e.detail.value ? '已启用紧凑布局' : '已恢复标准布局', icon: 'none' })
}

function goToAdminManagement() {
  uni.navigateTo({
    url: '/pages/admin/admin-user/list',
    fail: () => {
      uni.showToast({ title: '页面跳转失败', icon: 'none' })
    }
  })
}

function goToLogSettings() {
  uni.navigateTo({
    url: '/pages/admin/audit-log/index',
    fail: () => {
      uni.showToast({ title: '页面跳转失败', icon: 'none' })
    }
  })
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

function clearCache() {
  uni.showModal({
    title: '确认清除缓存',
    content: '这将清除所有本地缓存数据，包括登录状态。\n确定要继续吗？',
    confirmColor: '#FF3B30',
    success: (res) => {
      if (res.confirm) {
        try {
          uni.clearStorageSync()
          uni.showToast({ title: '缓存已清除', icon: TOAST_ICON.SUCCESS })

          setTimeout(() => {
            uni.reLaunch({ url: '/pages/admin/login' })
          }, 1500)
        } catch (error) {
          console.error('清除缓存失败:', error)
          uni.showToast({ title: '清除失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 40px;
}

.section {
  margin: 16px;
  border-radius: 12px;
  overflow: hidden;
  background: #FFFFFF;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  &.danger-zone {
    .setting-item.danger {
      .item-icon,
      .item-label {
        color: #FF3B30;
      }
    }
  }

  .section-header {
    padding: 16px 16px 8px;

    .section-title {
      font-size: 15px;
      font-weight: 600;
      color: #1A1A1A;
    }
  }
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1rpx solid #F0F0F0;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background-color: #F8F8F8;
  }

  &.switch-item:active {
    background-color: transparent;
  }

  .item-left {
    display: flex;
    align-items: center;
    gap: 10px;

    .item-icon {
      font-size: 18px;
    }

    .item-label {
      font-size: 15px;
      color: #333333;
    }
  }

  .item-right {
    display: flex;
    align-items: center;
    gap: 6px;

    .item-value {
      font-size: 14px;
      color: #999999;
    }

    .item-desc {
      font-size: 12px;
      color: #CCCCCC;
    }

    .arrow {
      font-size: 20px;
      color: #CCCCCC;
    }
  }
}
</style>
