<template>
  <AdminLayout title="个人中心" :showBack="true">
  <view class="profile-page">
    <!-- 用户信息卡片 -->
    <view class="user-card card">
      <view class="avatar-section">
        <view class="avatar-large">
          <text class="avatar-text">{{ (userInfo.name || userInfo.username || '?').charAt(0) }}</text>
        </view>
        <view class="user-info">
          <text class="user-name">{{ userInfo.name || '未设置姓名' }}</text>
          <text class="user-role">{{ roleLabels[userInfo.role] || userInfo.role }}</text>
        </view>
      </view>

      <view class="info-grid">
        <view class="info-item">
          <text class="info-label">账号</text>
          <text class="info-value">{{ userInfo.username || '-' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">手机号</text>
          <text class="info-value">{{ userInfo.phone || '未绑定' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">角色</text>
          <text class="info-value">{{ roleLabels[userInfo.role] || userInfo.role }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">状态</text>
          <text class="info-value status-active">正常</text>
        </view>
      </view>
    </view>

    <!-- 个人设置 -->
    <view class="section card">
      <view class="section-header">
        <text class="section-title">📝 个人设置</text>
      </view>

      <view class="setting-item" @tap="showEditName">
        <view class="item-left">
          <text class="item-icon">👤</text>
          <text class="item-label">修改姓名</text>
        </view>
        <view class="item-right">
          <text class="item-value">{{ userInfo.name || '点击设置' }}</text>
          <text class="arrow">›</text>
        </view>
      </view>

      <view class="setting-item" @tap="showChangePasswordHint">
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

    <!-- 显示偏好 -->
    <view class="section card">
      <view class="section-header">
        <text class="section-title">🎨 显示偏好</text>
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
        <text class="section-title">ℹ️ 关于系统</text>
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

    <!-- 退出登录 -->
    <view class="section card danger-zone">
      <view class="setting-item danger" @tap="handleLogout">
        <view class="item-left">
          <text class="item-icon">🚪</text>
          <text class="item-label">退出登录</text>
        </view>
        <view class="item-right">
          <text class="arrow">›</text>
        </view>
      </view>
    </view>
  </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import { apiPost } from '@/utils/request'

const userInfo = ref<any>({})
const darkMode = ref(false)
const compactMode = ref(false)

const roleLabels: Record<string, string> = {
  admin: '管理员',
  super_admin: '超级管理员',
  user: '普通用户'
}

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
  }

  darkMode.value = uni.getStorageSync('darkMode') || false
  compactMode.value = uni.getStorageSync('compactMode') || false
}

function showEditName() {
  uni.showModal({
    title: '修改姓名',
    content: '请输入新的姓名',
    editable: true,
    placeholderText: userInfo.value.name || '',
    success: async (res) => {
      if (res.confirm && res.content) {
        try {
          await apiPut(`/api/users/${userInfo.value._id}`, { name: res.content })

          userInfo.value.name = res.content
          uni.setStorageSync('userInfo', { ...userInfo.value, name: res.content })
          uni.showToast({ title: '修改成功', icon: 'success' })
        } catch (error) {
          console.error('修改姓名失败:', error)
          uni.showToast({ title: '修改失败', icon: 'none' })
        }
      }
    }
  })
}

function showChangePasswordHint() {
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
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 40px;
}

.user-card {
  margin: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: #FFFFFF;

  .avatar-section {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;

    .avatar-large {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;

      .avatar-text {
        font-size: 28px;
        font-weight: bold;
        color: #FFFFFF;
      }
    }

    .user-info {
      .user-name {
        font-size: 20px;
        font-weight: bold;
        color: #FFFFFF;
        display: block;
        margin-bottom: 4px;
      }

      .user-role {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    .info-item {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      padding: 12px;

      .info-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        display: block;
        margin-bottom: 4px;
      }

      .info-value {
        font-size: 15px;
        font-weight: 600;
        color: #FFFFFF;
        display: block;

        &.status-active {
          color: #34C759;
        }
      }
    }
  }
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
