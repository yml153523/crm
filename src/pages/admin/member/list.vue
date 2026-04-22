<template>
  <AdminLayout title="会员管理" :showBack="true">
  <view class="member-page">
    <view class="search-bar">
      <view class="search-input">
        <text class="search-icon">🔍</text>
        <input type="text" placeholder="搜索会员姓名/手机号..." v-model="keyword" @confirm="handleSearch" />
      </view>
      <view class="add-btn" @tap="showAddDialog">
        <text>＋ 添加</text>
      </view>
      <view class="filter-btn" :class="{ active: showFilter }" @tap="showFilter = !showFilter">
        <text>筛选</text>
      </view>
    </view>

    <view class="filter-panel" v-if="showFilter">
      <view class="filter-row">
        <view
          class="filter-tag"
          :class="{ active: statusFilter === 'all' }"
          @tap="statusFilter = 'all'; loadMembers()"
        >全部</view>
        <view
          class="filter-tag"
          :class="{ active: statusFilter === 'active' }"
          @tap="statusFilter = 'active'; loadMembers()"
        >正常</view>
        <view
          class="filter-tag"
          :class="{ active: statusFilter === 'inactive' }"
          @tap="statusFilter = 'inactive'; loadMembers()"
        >禁用</view>
      </view>
    </view>

    <view class="stats-bar card">
      <view class="stat-item">
        <text class="stat-value">{{ total }}</text>
        <text class="stat-label">总会员数</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-value">{{ activeCount }}</text>
        <text class="stat-label">正常</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-value">{{ inactiveCount }}</text>
        <text class="stat-label">禁用</text>
      </view>
    </view>

    <view class="member-list">
      <view class="member-card card" v-for="(item, index) in memberList" :key="item._id || index">
        <view class="avatar">
          <text class="avatar-text">{{ (item.name || item.phone || '?').charAt(0) }}</text>
        </view>
        <view class="member-info">
          <view class="info-header">
            <text class="member-name">{{ item.name || '未设置姓名' }}</text>
            <view class="status-badge" :class="item.isActive ? 'active' : 'inactive'">
              {{ item.isActive ? '✓ 正常' : '✕ 禁用' }}
            </view>
          </view>
          <text class="member-phone">📱 {{ item.phone || '未绑定手机' }}</text>
          <text class="member-meta">角色: {{ roleLabels[item.role] || item.role }} · VIP: {{ item.isVIP ? '是' : '否' }}</text>
          <text class="member-time">注册时间: {{ formatTime(item.createdAt) }}</text>
        </view>
        <view class="member-actions">
          <view class="action-btn btn-edit" @tap="editMember(item)">
            <text>编辑</text>
          </view>
          <view class="action-btn" :class="item.isActive ? 'btn-disable' : 'btn-enable'" @tap="toggleStatus(item)">
            <text>{{ item.isActive ? '禁用' : '启用' }}</text>
          </view>
          <view class="action-btn btn-delete" @tap="deleteMember(item)">
            <text>删除</text>
          </view>
        </view>
      </view>

      <view class="empty-state" v-if="!memberList.length && !loading">
        <text class="empty-icon">👥</text>
        <text class="empty-text">暂无会员数据</text>
        <view class="empty-desc">会员通过小程序注册后会显示在这里</view>
      </view>

      <view class="load-more" v-if="memberList.length > 0 && hasMore">
        <text @tap="loadMore">{{ loading ? '加载中...' : '加载更多' }}</text>
      </view>

      <view class="no-more" v-if="memberList.length > 0 && !hasMore">
        <text>— 已经到底了 —</text>
      </view>
    </view>

    <view class="float-btn" @tap="showAddDialog">
      <text class="float-icon">+</text>
    </view>
  </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/request'

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

onMounted(() => {
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

    const res = await apiGet('/api/users', params)

    const data = res.data
    if (data?.list) {
      if (page.value === 1) {
        memberList.value = data.list
      } else {
        memberList.value.push(...data.list)
      }

      total.value = data.pagination?.total || 0
      hasMore.value = memberList.value.length < total.value
    }
  } catch (error) {
    console.error('加载会员列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
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
          const result = await apiPost('/api/users', {
              phone: res.content.trim(),
              name: `用户${res.content.slice(-4)}`,
              isActive: true,
              isVIP: false,
              role: 'user'
            })

          if (result.success) {
            uni.showToast({ title: '添加成功', icon: 'success' })
            loadMembers()
          } else {
            uni.showToast({ title: (result.data as any)?.error?.message || '添加失败', icon: 'none' })
          }
        } catch (error) {
          console.error('添加会员失败:', error)
          uni.showToast({ title: '添加失败', icon: 'none' })
        }
      }
    }
  })
}

function editMember(item: any) {
  uni.showModal({
    title: '编辑会员信息',
    content: '请输入新的姓名',
    editable: true,
    placeholderText: item.name || '',
    success: async (res) => {
      if (res.confirm && res.content) {
        try {
          await apiPut(`/api/users/${item._id}`, { name: res.content })

          item.name = res.content
          uni.showToast({ title: '修改成功', icon: 'success' })
        } catch (error) {
          console.error('修改会员失败:', error)
          uni.showToast({ title: '修改失败', icon: 'none' })
        }
      }
    }
  })
}

async function toggleStatus(item: any) {
  const action = item.isActive ? '禁用' : '启用'
  uni.showModal({
    title: `确认${action}`,
    content: `确定要${action}会员"${item.name || item.phone}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await apiPut(`/api/users/${item._id}`, { isActive: !item.isActive })

          item.isActive = !item.isActive
          uni.showToast({ title: `${action}成功`, icon: 'success' })
        } catch (error) {
          console.error(`${action}会员失败:`, error)
          uni.showToast({ title: `${action}失败`, icon: 'none' })
        }
      }
    }
  })
}

function deleteMember(item: any) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除会员"${item.name || item.phone}"吗？此操作不可恢复！`,
    confirmColor: '#FF3B30',
    success: async (res) => {
      if (res.confirm) {
        try {
          await apiDelete(`/api/users/${item._id}`)

          memberList.value = memberList.value.filter(m => m._id !== item._id)
          total.value--
          uni.showToast({ title: '删除成功', icon: 'success' })
        } catch (error) {
          console.error('删除会员失败:', error)
          uni.showToast({ title: '删除失败', icon: 'none' })
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
