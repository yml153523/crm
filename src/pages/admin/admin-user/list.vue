<template>
  <AdminLayout title="管理员" :showBack="true">
  <view class="admin-user-page">
    <view class="filter-bar card">
      <view class="filter-tabs">
        <view 
          class="filter-tab" 
          :class="{ active: currentFilter === 'all' }" 
          @tap="currentFilter = 'all'"
        >全部</view>
        <view 
          class="filter-tab" 
          :class="{ active: currentFilter === 'active' }" 
          @tap="currentFilter = 'active'"
        >启用中</view>
        <view 
          class="filter-tab" 
          :class="{ active: currentFilter === 'disabled' }" 
          @tap="currentFilter = 'disabled'"
        >已禁用</view>
      </view>
    </view>

    <view class="user-list">
      <view class="user-card card" v-for="(user, index) in filteredUsers" :key="index">
        <view class="card-header">
          <view class="user-avatar">
            <text class="avatar-text">{{ user.name?.charAt(0) || '?' }}</text>
          </view>
          <view class="user-info">
            <view class="info-row">
              <text class="user-name">{{ user.name || '未设置姓名' }}</text>
              <view class="role-badge" :class="getRoleClass(user.role)">
                {{ getRoleLabel(user.role) }}
              </view>
            </view>
            <text class="user-phone">{{ maskPhone(user.phone) }}</text>
          </view>
          <view class="status-badge" :class="user.status">
            {{ user.status === 'active' ? '🟢 启用中' : '🔴 已禁用' }}
          </view>
        </view>

        <view class="card-meta">
          <text class="meta-item">📅 创建时间: {{ formatDate(user.createdAt) }}</text>
          <text class="meta-item" v-if="user.lastLoginAt">🕐 最后登录: {{ formatTime(user.lastLoginAt) }}</text>
        </view>

        <view class="card-actions">
          <u-button size="mini" type="primary" plain @click="editUser(user)">编辑</u-button>
          <u-button 
            size="mini" 
            :type="user.status === 'active' ? 'warning' : 'success'" 
            plain
            @click="toggleStatus(user)"
          >
            {{ user.status === 'active' ? '禁用' : '启用' }}
          </u-button>
          <u-button size="mini" type="error" plain @click="resetPassword(user)">重置密码</u-button>
          <u-button 
            size="mini" 
            type="error" 
            plain 
            @click="deleteUser(user)"
            :disabled="user.role === 'super_admin'"
          >
            删除
          </u-button>
        </view>
      </view>

      <u-empty v-if="!filteredUsers.length && !loading" text="暂无管理员数据"></u-empty>
      <u-loadmore v-if="filteredUsers.length" :status="loadStatus" @loadmore="loadMore"></u-loadmore>
    </view>

    <!-- 创建/编辑弹窗 -->
    <u-popup :show="showModal" mode="center" round="16" @close="closeModal">
      <view class="modal-content">
        <view class="modal-header">
          <text class="modal-title">{{ isEditing ? '编辑管理员' : '创建管理员' }}</text>
          <u-icon name="close" @click="closeModal"></u-icon>
        </view>
        
        <scroll-view scroll-y class="modal-body">
          <view class="form-group">
            <text class="form-label">用户名 *</text>
            <input 
              class="form-input" 
              v-model="formData.name" 
              placeholder="请输入用户名"
              :disabled="isEditing"
            />
          </view>

          <view class="form-group" v-if="!isEditing">
            <text class="form-label">手机号 *</text>
            <input 
              class="form-input" 
              v-model="formData.phone" 
              placeholder="请输入11位手机号"
              type="number"
              maxlength="11"
            />
          </view>

          <view class="form-group" v-if="!isEditing">
            <text class="form-label">密码 *</text>
            <input 
              class="form-input" 
              v-model="formData.password" 
              placeholder="请输入密码（至少6位）"
              type="password"
            />
          </view>

          <view class="form-group" v-if="!isEditing">
            <text class="form-label">确认密码 *</text>
            <input 
              class="form-input" 
              v-model="formData.confirmPassword" 
              placeholder="请再次输入密码"
              type="password"
            />
          </view>

          <view class="form-group">
            <text class="form-label">角色 *</text>
            <picker :range="roleOptions" range-key="label" :value="selectedRoleIndex" @change="onRoleChange">
              <view class="picker-value">{{ roleOptions[selectedRoleIndex].label }}</view>
            </picker>
          </view>

          <view class="form-group">
            <text class="form-label">备注</text>
            <textarea 
              class="form-textarea" 
              v-model="formData.note" 
              placeholder="可选，最多200字"
              maxlength="200"
            ></textarea>
          </view>
        </scroll-view>

        <view class="modal-footer">
          <u-button type="default" @click="closeModal">取消</u-button>
          <u-button type="primary" @click="submitForm" :loading="submitting">
            {{ isEditing ? '保存' : '创建' }}
          </u-button>
        </view>
      </view>
    </u-popup>

    <!-- 重置密码弹窗 -->
    <u-popup :show="showPasswordModal" mode="center" round="16" @close="showPasswordModal = false">
      <view class="modal-content password-modal">
        <view class="modal-header">
          <text class="modal-title">重置密码</text>
          <u-icon name="close" @click="showPasswordModal = false"></u-icon>
        </view>
        
        <view class="modal-body">
          <view class="warning-text">
            ⚠️ 重置后该管理员需要使用新密码登录，请务必通知对方。
          </view>
          
          <view class="form-group">
            <text class="form-label">新密码 *</text>
            <input 
              class="form-input" 
              v-model="newPassword" 
              placeholder="请输入新密码（至少6位）"
              type="password"
            />
          </view>

          <view class="form-group">
            <text class="form-label">确认新密码 *</text>
            <input 
              class="form-input" 
              v-model="confirmNewPassword" 
              placeholder="请再次输入新密码"
              type="password"
            />
          </view>
        </view>

        <view class="modal-footer">
          <u-button type="default" @click="showPasswordModal = false">取消</u-button>
          <u-button type="warning" @click="confirmResetPassword" :loading="resetting">确认重置</u-button>
        </view>
      </view>
    </u-popup>
  </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import adminUserApi from '@/services/adminUserApi'

const loading = ref(false)
const loadStatus = ref('loadmore')
const userList = ref<any[]>([])
const currentFilter = ref('all')
const pagination = ref({ page: 1, limit: 20, total: 0 })

// 弹窗相关
const showModal = ref(false)
const showPasswordModal = ref(false)
const isEditing = ref(false)
const editingUser = ref<any>(null)
const submitting = ref(false)
const resetting = ref(false)

// 表单数据
const formData = ref({
  name: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'admin',
  note: ''
})

const newPassword = ref('')
const confirmNewPassword = ref('')
const selectedUserForPassword = ref<any>(null)

const roleOptions = [
  { label: '管理员 (admin)', value: 'admin' },
  { label: '超级管理员 (super_admin)', value: 'super_admin' }
]

const selectedRoleIndex = computed(() => {
  return formData.value.role === 'super_admin' ? 1 : 0
})

const filteredUsers = computed(() => {
  if (currentFilter.value === 'all') return userList.value
  return userList.value.filter(u => u.status === currentFilter.value)
})

onMounted(() => {
  fetchUsers()
})

async function fetchUsers(isLoadMore = false) {
  if (loading.value) return
  
  try {
    loading.value = true
    loadStatus.value = isLoadMore ? 'loading' : 'loading'

    const params: any = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      role: 'admin' // 默认只查admin，不查super_admin（除了当前用户）
    }

    if (currentFilter.value !== 'all') {
      params.status = currentFilter.value
    }

    const response = await adminUserApi.getAdminUsers(params)

    if (isLoadMore) {
      userList.value = [...userList.value, ...(response.data?.users || [])]
    } else {
      userList.value = response.data?.users || []
    }

    pagination.value = {
      page: response.data?.pagination?.page || 1,
      limit: response.data?.pagination?.limit || 20,
      total: response.data?.pagination?.total || 0
    }

    loadStatus.value = userList.value.length >= pagination.value.total ? 'nomore' : 'loadmore'
  } catch (error: any) {
    console.error('获取管理员列表失败:', error)
    uni.showToast({ title: error.message || '获取失败', icon: 'none' })
    loadStatus.value = 'error'
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (loadStatus.value !== 'loadmore') return
  pagination.value.page++
  fetchUsers(true)
}

function showCreateModal() {
  isEditing.value = false
  editingUser.value = null
  formData.value = { name: '', phone: '', password: '', confirmPassword: '', role: 'admin', note: '' }
  showModal.value = true
}

function editUser(user: any) {
  if (user._id) {
    isEditing.value = true
    editingUser.value = user
    formData.value = {
      name: user.name || '',
      phone: user.phone || '',
      password: '',
      confirmPassword: '',
      role: user.role || 'admin',
      note: user.note || ''
    }
    showModal.value = true
  }
}

function closeModal() {
  showModal.value = false
  isEditing.value = false
  editingUser.value = null
}

function onRoleChange(e: any) {
  formData.value.role = roleOptions[parseInt(e.detail.value)].value
}

async function submitForm() {
  // 表单验证
  if (!formData.value.name) {
    return uni.showToast({ title: '请输入用户名', icon: 'none' })
  }
  
  if (!isEditing.value) {
    if (!formData.value.phone || formData.value.phone.length !== 11) {
      return uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    }
    
    if (!formData.value.password || formData.value.password.length < 6) {
      return uni.showToast({ title: '密码至少6位', icon: 'none' })
    }
    
    if (formData.value.password !== formData.value.confirmPassword) {
      return uni.showToast({ title: '两次密码不一致', icon: 'none' })
    }
  }

  try {
    submitting.value = true
    
    if (isEditing.value && editingUser.value?._id) {
      await adminUserApi.updateAdminUser(editingUser.value._id, {
        name: formData.value.name,
        role: formData.value.role,
        note: formData.value.note
      })
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await adminUserApi.createAdminUser({
        phone: formData.value.phone,
        password: formData.value.password,
        name: formData.value.name,
        role: formData.value.role,
        note: formData.value.note
      })
      uni.showToast({ title: '创建成功', icon: 'success' })
    }

    closeModal()
    fetchUsers()
  } catch (error: any) {
    uni.showToast({ title: error.message || '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(user: any) {
  if (!user._id) return

  const newStatus = user.status === 'active' ? 'disabled' : 'active'
  const actionText = newStatus === 'disabled' ? '禁用' : '启用'

  uni.showModal({
    title: `确认${actionText}`,
    content: `确定要${actionText}管理员 "${user.name || user.phone}" 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminUserApi.toggleUserStatus(user._id, newStatus)
          uni.showToast({ title: `${actionText}成功`, icon: 'success' })
          fetchUsers()
        } catch (error: any) {
          uni.showToast({ title: error.message || `${actionText}失败`, icon: 'none' })
        }
      }
    }
  })
}

function resetPassword(user: any) {
  if (!user._id) return
  selectedUserForPassword.value = user
  newPassword.value = ''
  confirmNewPassword.value = ''
  showPasswordModal.value = true
}

async function confirmResetPassword() {
  if (!newPassword.value || newPassword.value.length < 6) {
    return uni.showToast({ title: '密码至少6位', icon: 'none' })
  }
  
  if (newPassword.value !== confirmNewPassword.value) {
    return uni.showToast({ title: '两次密码不一致', icon: 'none' })
  }

  try {
    resetting.value = true
    await adminUserApi.resetPassword(selectedUserForPassword.value._id, newPassword.value)
    uni.showToast({ title: '密码重置成功', icon: 'success' })
    showPasswordModal.value = false
  } catch (error: any) {
    uni.showToast({ title: error.message || '重置失败', icon: 'none' })
  } finally {
    resetting.value = false
  }
}

async function deleteUser(user: any) {
  if (!user._id) return
  if (user.role === 'super_admin') {
    return uni.showToast({ title: '不能删除超级管理员', icon: 'none' })
  }

  uni.showModal({
    title: '⚠️ 危险操作',
    content: `确定要删除管理员 "${user.name || user.phone}" 吗？此操作不可恢复！`,
    confirmColor: '#F44336',
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminUserApi.deleteAdminUser(user._id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          fetchUsers()
        } catch (error: any) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
        }
      }
    }
  })
}

// 工具函数
function getRoleClass(role: string): string {
  return role === 'super_admin' ? 'role-super' : 'role-admin'
}

function getRoleLabel(role: string): string {
  return role === 'super_admin' ? '超级管理员' : '管理员'
}

function maskPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone || '-'
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

function formatDate(date: string | Date): string {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatTime(date: string | Date): string {
  if (!date) return '-'
  const d = new Date(date)
  return `${formatDate(d)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
</script>

<style lang="scss" scoped>
.admin-user-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 32rpx;
}

.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    .header-title { font-size: 36rpx; font-weight: 700; color: #1A1A1A; display: block; }
    .header-desc { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; }
  }
}

.filter-bar {
  .filter-tabs {
    display: flex;
    gap: 16rpx;

    .filter-tab {
      padding: 12rpx 32rpx;
      border-radius: 24rpx;
      font-size: 26rpx;
      color: #666;
      background: #F5F5F5;

      &.active {
        color: #FFF;
        background: #007AFF;
      }
    }
  }
}

.user-list {
  .user-card {
    margin-bottom: 16rpx;

    .card-header {
      display: flex;
      align-items: center;
      margin-bottom: 16rpx;

      .user-avatar {
        width: 80rpx;
        height: 80rpx;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea, #764ba2);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 20rpx;

        .avatar-text { font-size: 36rpx; color: #FFF; font-weight: 600; }
      }

      .user-info {
        flex: 1;

        .info-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx;
          .user-name { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
          
          .role-badge {
            padding: 4rpx 12rpx;
            border-radius: 8rpx;
            font-size: 22rpx;
            
            &.role-super { background: #FFF3E0; color: #F57C00; }
            &.role-admin { background: #E3F2FD; color: #1976D2; }
          }
        }

        .user-phone { font-size: 26rpx; color: #666; }
      }

      .status-badge {
        font-size: 24rpx;
        padding: 6rpx 16rpx;
        border-radius: 20rpx;

        &.active { background: #E8F5E9; color: #4CAF50; }
        &.disabled { background: #FFEBEE; color: #F44336; }
      }
    }

    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16rpx;
      margin-bottom: 16rpx;
      padding-top: 16rpx;
      border-top: 1rpx solid #F0F0F0;

      .meta-item { font-size: 24rpx; color: #999; }
    }

    .card-actions {
      display: flex;
      gap: 12rpx;
      flex-wrap: wrap;
    }
  }
}

/* 弹窗样式 */
.modal-content {
  width: 90vw;
  max-height: 85vh;
  background: #FFF;
  border-radius: 16rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx;
    border-bottom: 1rpx solid #F0F0F0;

    .modal-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; }
  }

  .modal-body {
    flex: 1;
    padding: 24rpx;
    overflow-y: auto;

    .form-group {
      margin-bottom: 24rpx;

      .form-label { font-size: 28rpx; color: #333; margin-bottom: 12rpx; display: block; }
      
      .form-input {
        width: 100%;
        height: 88rpx;
        padding: 0 24rpx;
        border: 2rpx solid #E0E0E0;
        border-radius: 12rpx;
        font-size: 28rpx;
        box-sizing: border-box;

        &:focus { border-color: #007AFF; outline: none; }
      }

      .form-textarea {
        width: 100%;
        min-height: 160rpx;
        padding: 20rpx;
        border: 2rpx solid #E0E0E0;
        border-radius: 12rpx;
        font-size: 28rpx;
        box-sizing: border-box;
      }

      .picker-value {
        height: 88rpx;
        line-height: 88rpx;
        padding: 0 24rpx;
        border: 2rpx solid #E0E0E0;
        border-radius: 12rpx;
        font-size: 28rpx;
        color: #333;
        background: #FAFAFA;
      }
    }

    .warning-text {
      padding: 20rpx;
      background: #FFF3E0;
      border-radius: 12rpx;
      font-size: 26rpx;
      color: #E65100;
      line-height: 1.5;
      margin-bottom: 24rpx;
    }
  }

  .modal-footer {
    display: flex;
    gap: 16rpx;
    padding: 24rpx;
    border-top: 1rpx solid #F0F0F0;

    u-button { flex: 1; }
  }
}
</style>