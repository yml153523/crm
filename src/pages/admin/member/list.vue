<template>
  <AdminLayout title="会员管理" :showBack="true">
  <view class="member-page">
    <view class="search-bar">
      <view class="search-input">
        <text class="search-icon">🔍</text>
        <input type="text" :placeholder="MESSAGES.ADMIN.SEARCH_MEMBER" v-model="keyword" @confirm="handleSearch" />
      </view>
      <view class="add-btn" @click="showAddDialog">
        <text>＋ {{ MESSAGES.ADMIN.ADD_MEMBER }}</text>
      </view>
      <view class="filter-btn" :class="{ active: showFilter }" @click="showFilter = !showFilter">
        <text>{{ MESSAGES.ADMIN.FILTER }}</text>
      </view>
    </view>

    <view class="filter-panel" v-if="showFilter">
      <view class="filter-row">
        <view
          class="filter-tag"
          :class="{ active: statusFilter === 'all' }"
          @click="statusFilter = 'all'; loadMembers()"
        >{{ MESSAGES.ADMIN.ALL }}</view>
        <view
          class="filter-tag"
          :class="{ active: statusFilter === 'active' }"
          @click="statusFilter = 'active'; loadMembers()"
        >{{ MESSAGES.ADMIN.NORMAL }}</view>
        <view
          class="filter-tag"
          :class="{ active: statusFilter === 'inactive' }"
          @click="statusFilter = 'inactive'; loadMembers()"
        >{{ MESSAGES.ADMIN.DISABLED }}</view>
      </view>
    </view>

    <view class="stats-bar card">
      <view class="stat-item">
        <text class="stat-value">{{ total }}</text>
        <text class="stat-label">{{ MESSAGES.ADMIN.TOTAL_MEMBERS }}</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-value">{{ activeCount }}</text>
        <text class="stat-label">{{ MESSAGES.ADMIN.NORMAL }}</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-value">{{ inactiveCount }}</text>
        <text class="stat-label">{{ MESSAGES.ADMIN.DISABLED }}</text>
      </view>
    </view>

    <view class="member-list">
      <view class="member-card card" v-for="(item, index) in memberList" :key="item._id || index">
        <view class="avatar">
          <text class="avatar-text">{{ (item.name || item.phone || '?').charAt(0) }}</text>
        </view>
        <view class="member-info">
          <view class="info-header">
            <text class="member-name">{{ item.name || MESSAGES.ADMIN.NO_NAME }}</text>
            <view class="status-badge" :class="item.isActive ? 'active' : 'inactive'">
              {{ item.isActive ? MESSAGES.ADMIN.NORMAL_STATUS : MESSAGES.ADMIN.DISABLED_STATUS }}
            </view>
          </view>
          <text class="member-phone">📱 {{ item.phone || MESSAGES.ADMIN.NO_PHONE }}</text>
          <text class="member-meta">角色: {{ roleLabels[item.role] || item.role }} · VIP: {{ item.isVIP ? '是' : '否' }}</text>
          <text class="member-time">{{ MESSAGES.ADMIN.REGISTRATION_TIME }}: {{ formatTime(item.createdAt) }}</text>
        </view>
        <view class="member-actions">
          <view class="action-btn btn-edit" @click="editMember(item)">
            <text>{{ MESSAGES.ADMIN.EDIT }}</text>
          </view>
          <view class="action-btn" :class="item.isActive ? 'btn-disable' : 'btn-enable'" @click="toggleStatus(item)">
            <text>{{ item.isActive ? MESSAGES.ADMIN.DISABLE : MESSAGES.ADMIN.ENABLE }}</text>
          </view>
          <view class="action-btn btn-delete" @click="deleteMember(item)">
            <text>{{ MESSAGES.ADMIN.DELETE }}</text>
          </view>
        </view>
      </view>

      <view class="empty-state" v-if="!memberList.length && !loading">
        <text class="empty-icon">👥</text>
        <text class="empty-text">{{ MESSAGES.ADMIN.NO_MEMBER_DATA }}</text>
        <view class="empty-desc">{{ MESSAGES.ADMIN.MEMBER_REGISTER_HINT }}</view>
      </view>

      <view class="load-more" v-if="memberList.length > 0 && hasMore">
        <text @click="loadMore">{{ loading ? MESSAGES.COMMON.LOADING : MESSAGES.COMMON.LOAD_MORE }}</text>
      </view>

      <view class="no-more" v-if="memberList.length > 0 && !hasMore">
        <text>{{ MESSAGES.COMMON.NO_MORE }}</text>
      </view>
    </view>
  </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/request'
import { MESSAGES, API_PATHS, TOAST_ICON, UI_COLORS } from '@/config/constants'

const keyword = ref('')
const showFilter = ref(false)
const statusFilter = ref('all')
const loading = ref(false)

const memberList = ref<any[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const hasMore = ref(true)

const roleLabels: Record<string, string> = {
  user: '普通用户',
  admin: '管理员',
  super_admin: '超级管理员'
}

const activeCount = computed(() => memberList.value.filter(m => m.isActive).length)
const inactiveCount = computed(() => memberList.value.filter(m => !m.isActive).length)

// 🔧 P0 FIX: 每次进入页面时重置分页状态，防止数据重复累积
onMounted(() => {
  console.log('[MemberList] onMounted - 重置分页状态')
  page.value = 1
  memberList.value = []
  hasMore.value = true
  total.value = 0
  loadMembers()
})

watch([keyword], () => {
  page.value = 1
  memberList.value = []
  loadMembers()
})

async function loadMembers() {
  if (loading.value) return

  loading.value = true
  try {
    const params: any = {
      page: page.value,
      pageSize: pageSize.value
    }

    if (statusFilter.value !== 'all') {
      params.isActive = statusFilter.value === 'active'
    }

    if (keyword.value.trim()) {
      params.keyword = keyword.value.trim()
    }

    const res = await apiGet(API_PATHS.USERS, params)

    const data = res.data
    if (data?.list) {
      if (page.value === 1) {
        memberList.value = data.list
      } else {
        memberList.value.push(...data.list)
      }

      total.value = data.pagination?.total || 0
      hasMore.value = memberList.value.length < total.value
    } else if (page.value === 1 && memberList.value.length === 0) {
      loadDemoMembers()
    }
  } catch (error) {
    console.error('加载会员列表失败:', error)
    uni.showToast({ title: MESSAGES.COMMON.LOAD_FAILED, icon: TOAST_ICON.NONE })
  } finally {
    loading.value = false
  }
}

function loadDemoMembers() {
  memberList.value = [
    { _id: 'demo-1', phone: '138****8888', name: '张三', role: 'user', isActive: true, balance: 588.00, createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), lastLoginAt: new Date(Date.now() - 86400000).toISOString() },
    { _id: 'demo-2', phone: '139****9999', name: '李四', role: 'user', isActive: true, balance: 1280.50, createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), lastLoginAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { _id: 'demo-3', phone: '136****7777', name: '王五', role: 'user', isActive: false, balance: 0.00, createdAt: new Date(Date.now() - 86400000 * 14).toISOString(), lastLoginAt: new Date(Date.now() - 86400000 * 10).toISOString() },
    { _id: 'demo-4', phone: '137****6666', name: '赵六', role: 'admin', isActive: true, balance: 5000.00, createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), lastLoginAt: new Date(Date.now() - 86400000 * 1).toISOString() },
  ]
  total.value = 4
  hasMore.value = false
}

function handleSearch() {
  page.value = 1
  memberList.value = []
  loadMembers()
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  loadMembers()
}

function formatTime(time: string | Date) {
  if (!time) return '-'
  const date = new Date(time)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function showAddDialog() {
  uni.showModal({
    title: '添加会员',
    content: '',
    editable: true,
    placeholderText: '',
    success: async (res) => {
      if (res.confirm && res.content) {
        try {
          const result = await apiPost(API_PATHS.USERS, {
              phone: res.content.trim(),
              name: MESSAGES.ADMIN.NEW_MEMBER_NAME(res.content.slice(-4)),
              isActive: true,
              isVIP: false,
              role: 'user'
            })

          if (result.success) {
            uni.showToast({ title: MESSAGES.COMMON.ADD_SUCCESS, icon: TOAST_ICON.SUCCESS })
            loadMembers()
          } else {
            uni.showToast({ title: (result.data as any)?.error?.message || MESSAGES.COMMON.ADD_FAILED, icon: TOAST_ICON.NONE })
          }
        } catch (error) {
          console.error('添加会员失败:', error)
          uni.showToast({ title: MESSAGES.COMMON.ADD_FAILED, icon: TOAST_ICON.NONE })
        }
      }
    }
  })
}

function editMember(item: any) {
  uni.showModal({
    title: MESSAGES.ADMIN.EDIT_MEMBER,
    content: MESSAGES.ADMIN.ENTER_NEW_NAME,
    editable: true,
    placeholderText: item.name || '',
    success: async (res) => {
      if (res.confirm && res.content) {
        try {
          await apiPut(`${API_PATHS.USERS}/${item._id}`, { name: res.content })

          item.name = res.content
          uni.showToast({ title: MESSAGES.COMMON.SAVE_SUCCESS, icon: TOAST_ICON.SUCCESS })
        } catch (error) {
          console.error('修改会员失败:', error)
          uni.showToast({ title: MESSAGES.COMMON.MODIFY_FAILED, icon: TOAST_ICON.NONE })
        }
      }
    }
  })
}

async function toggleStatus(item: any) {
  const action = item.isActive ? MESSAGES.ADMIN.DISABLE : MESSAGES.ADMIN.ENABLE
  uni.showModal({
    title: MESSAGES.ADMIN.TOGGLE_STATUS_CONFIRM(action, item.name || item.phone),
    content: MESSAGES.ADMIN.TOGGLE_STATUS_CONTENT(action, item.name || item.phone),
    success: async (res) => {
      if (res.confirm) {
        try {
          await apiPut(`${API_PATHS.USERS}/${item._id}`, { isActive: !item.isActive })
          item.isActive = !item.isActive
          uni.showToast({ title: MESSAGES.COMMON.SAVE_SUCCESS, icon: TOAST_ICON.SUCCESS })
        } catch (error) {
          console.error(`${action}会员失败:`, error)
          uni.showToast({ title: MESSAGES.COMMON.MODIFY_FAILED, icon: TOAST_ICON.NONE })
        }
      }
    }
  })
}

function deleteMember(item: any) {
  uni.showModal({
    title: MESSAGES.COMMON.CONFIRM_DELETE,
    content: MESSAGES.ADMIN.DELETE_MEMBER_CONFIRM,
    confirmColor: UI_COLORS.DANGER,
    success: async (res) => {
      if (res.confirm) {
        try {
          await apiDelete(`${API_PATHS.USERS}/${item._id}`)

          memberList.value = memberList.value.filter(m => m._id !== item._id)
          total.value--
          uni.showToast({ title: MESSAGES.COMMON.DELETE_SUCCESS, icon: TOAST_ICON.SUCCESS })
        } catch (error) {
          console.error('删除会员失败:', error)
          uni.showToast({ title: MESSAGES.COMMON.DELETE_FAILED, icon: TOAST_ICON.NONE })
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.member-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 100px;
}

.search-bar {
  display: flex;
  padding: 12px 16px;
  background-color: #FFFFFF;
  gap: 10px;

  .search-input {
    flex: 1;
    display: flex;
    align-items: center;
    background-color: #F5F5F5;
    padding: 10px 14px;
    border-radius: 8px;

    .search-icon {
      margin-right: 8px;
      font-size: 16px;
    }

    input {
      flex: 1;
      font-size: 14px;
      border: none;
      outline: none;
      background: transparent;
    }
  }

  .filter-btn {
    padding: 10px 16px;
    background-color: #F5F5F5;
    border-radius: 8px;
    font-size: 14px;
    color: #666666;

    &.active {
      background-color: #007AFF;
      color: #FFFFFF;
    }
  }

  .add-btn {
    padding: 10px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    font-size: 14px;
    color: #FFFFFF;
    font-weight: 500;

    &:active {
      opacity: 0.85;
      transform: scale(0.98);
    }
  }
}

.filter-panel {
  padding: 12px 16px;
  background-color: #FFFFFF;
  border-top: 1px solid #E0E0E0;

  .filter-row {
    display: flex;
    gap: 10px;

    .filter-tag {
      padding: 8px 16px;
      background-color: #F5F5F5;
      border-radius: 20px;
      font-size: 13px;
      color: #666666;

      &.active {
        background-color: #007AFF;
        color: #FFFFFF;
      }
    }
  }
}

.stats-bar {
  margin: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-around;

  .stat-item {
    text-align: center;

    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #1A1A1A;
      display: block;
    }

    .stat-label {
      font-size: 13px;
      color: #999999;
      margin-top: 4px;
      display: block;
    }
  }

  .stat-divider {
    width: 1px;
    height: 40px;
    background-color: #E0E0E0;
  }
}

.member-list {
  padding: 0 16px;

  .member-card {
    display: flex;
    align-items: flex-start;
    margin-bottom: 16px;
    padding: 16px;
    position: relative;

    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-right: 14px;

      .avatar-text {
        color: #FFFFFF;
        font-size: 20px;
        font-weight: bold;
      }
    }

    .member-info {
      flex: 1;
      min-width: 0;

      .info-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }

      .member-name {
        font-size: 16px;
        font-weight: 600;
        color: #1A1A1A;
      }

      .status-badge {
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;

        &.active {
          background-color: rgba(52, 199, 89, 0.15);
          color: #34C759;
        }

        &.inactive {
          background-color: rgba(255, 59, 48, 0.15);
          color: #FF3B30;
        }
      }

      .member-phone {
        font-size: 14px;
        color: #333333;
        display: block;
        margin-bottom: 4px;
      }

      .member-meta {
        font-size: 13px;
        color: #666666;
        display: block;
        margin-bottom: 2px;
      }

      .member-time {
        font-size: 12px;
        color: #999999;
        display: block;
      }
    }

    .member-actions {
      position: absolute;
      right: 16px;
      top: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;

      .action-btn {
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        text-align: center;

        &.btn-edit {
          background-color: #007AFF;
          color: #FFFFFF;
        }

        &.btn-disable {
          background-color: #FF9500;
          color: #FFFFFF;
        }

        &.btn-enable {
          background-color: #34C759;
          color: #FFFFFF;
        }

        &.btn-delete {
          background-color: #FF3B30;
          color: #FFFFFF;
        }
      }
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: 16px;
    color: #999999;
    margin-bottom: 8px;
  }

  .empty-desc {
    font-size: 13px;
    color: #CCCCCC;
  }
}

.load-more {
  text-align: center;
  padding: 20px;

  text {
    font-size: 13px;
    color: #007AFF;
  }
}

.no-more {
  text-align: center;
  padding: 20px;

  text {
    font-size: 13px;
    color: #CCCCCC;
  }
}

.float-btn {
  position: fixed;
  right: 24px;
  bottom: 80px;
  width: 52px;
  height: 52px;
  border-radius: 26px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.35);
  z-index: 999;

  .float-icon {
    font-size: 28px;
    color: #FFFFFF;
    font-weight: 300;
    margin-top: -2px;
  }
}
</style>
