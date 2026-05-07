<template>
  <view class="audit-log-page">
    <view class="filter-section card">
      <view class="filter-row">
        <view class="filter-item">
          <text class="filter-label">时间范围</text>
          <picker mode="date" :value="filters.startTime" @change="onStartDateChange" fields="date">
            <view class="picker-value">{{ filters.startTime || '开始日期' }}</view>
          </picker>
          <text class="filter-separator">至</text>
          <picker mode="date" :value="filters.endTime" @change="onEndDateChange" fields="date">
            <view class="picker-value">{{ filters.endTime || '结束日期' }}</view>
          </picker>
        </view>
      </view>

      <view class="filter-row">
        <view class="filter-item">
          <text class="filter-label">操作类型</text>
          <picker :range="actionTypeOptions" range-key="label" :value="actionTypeIndex" @change="onActionTypeChange">
            <view class="picker-value">{{ actionTypeOptions[actionTypeIndex].label }}</view>
          </picker>
        </view>

        <view class="filter-item">
          <text class="filter-label">状态</text>
          <picker :range="statusOptions" range-key="label" :value="statusIndex" @change="onStatusChange">
            <view class="picker-value">{{ statusOptions[statusIndex].label }}</view>
          </picker>
        </view>
      </view>

      <view class="search-row">
        <u-search v-model="filters.keyword" placeholder="搜索用户名、IP、操作描述..." @search="handleSearch" @clear="handleClear"></u-search>
      </view>

      <view class="filter-actions">
        <u-button type="primary" size="small" @click="handleSearch">查询</u-button>
        <u-button type="default" size="small" @click="handleReset">重置</u-button>
        <u-button type="warning" size="small" icon="download" @click="handleExport">导出CSV</u-button>
      </view>
    </view>

    <view class="log-list">
      <view class="log-card card" v-for="(log, index) in logList" :key="index" @click="goToDetail(log._id)">
        <view class="log-header">
          <view class="log-type-badge" :class="getActionTypeClass(log.actionType)">
            <text class="type-icon">{{ getActionTypeIcon(log.actionType) }}</text>
            <text class="type-text">{{ getActionTypeLabel(log.actionType) }}</text>
          </view>
          <view class="log-status" :class="log.success ? 'success' : 'failed'">
            {{ log.success ? '✅' : '❌' }}
          </view>
        </view>

        <view class="log-content">
          <view class="log-main-info">
            <text class="log-username">{{ log.username || '未知用户' }}</text>
            <text class="log-phone" v-if="log.phone">{{ log.phone }}</text>
          </view>
          <text class="log-description" v-if="log.resourceInfo">{{ log.resourceInfo }}</text>
          <text class="log-fail-reason" v-if="!log.success && log.failReason">失败原因: {{ log.failReason }}</text>
        </view>

        <view class="log-meta">
          <text class="log-time">{{ formatTime(log.actionTime) }}</text>
          <text class="log-ip" v-if="log.ipAddress">📍 {{ log.ipAddress }}</text>
          <text class="log-device" v-if="log.deviceInfo?.device">{{ getDeviceIcon(log.deviceInfo.device) }} {{ log.deviceInfo.device }}</text>
        </view>
      </view>

      <u-empty v-if="!logList.length && !loading" text="暂无审计日志"></u-empty>
      <u-loadmore v-if="logList.length" :status="loadStatus" @loadmore="loadMore"></u-loadmore>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.limit">
      <text class="page-info">共 {{ pagination.total }} 条记录，第 {{ pagination.page }}/{{ totalPages }} 页</text>
      <view class="page-buttons">
        <u-button size="mini" :disabled="pagination.page <= 1" @click="prevPage">上一页</u-button>
        <u-button size="mini" :disabled="pagination.page >= totalPages" @click="nextPage">下一页</u-button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import auditLogApi from '@/services/auditLogApi'

const loading = ref(false)
const loadStatus = ref('loadmore')
const logList = ref<any[]>([])

const filters = ref({
  startTime: '',
  endTime: '',
  actionType: '',
  success: undefined as boolean | undefined,
  keyword: '',
  page: 1,
  limit: 20
})

const pagination = ref({
  page: 1,
  limit: 20,
  total: 0
})

const actionTypeOptions = [
  { label: '全部类型', value: '' },
  { label: '🔵 登录', value: 'LOGIN' },
  { label: '🟢 创建', value: 'CREATE' },
  { label: '🟡 修改', value: 'UPDATE' },
  { label: '🔴 删除', value: 'DELETE' },
  { label: '🟣 查询', value: 'QUERY' },
  { label: '⚪ 系统事件', value: 'SYSTEM_EVENT' },
  { label: '⚫ 错误', value: 'ERROR' }
]

const statusOptions = [
  { label: '全部状态', value: undefined },
  { label: '✅ 成功', value: true },
  { label: '❌ 失败', value: false }
]

const actionTypeIndex = computed(() => {
  const index = actionTypeOptions.findIndex(opt => opt.value === filters.value.actionType)
  return index >= 0 ? index : 0
})

const statusIndex = computed(() => {
  if (filters.value.success === true) return 2
  if (filters.value.success === false) return 3
  return 1
})

const totalPages = computed(() => {
  return Math.ceil(pagination.value.total / pagination.value.limit) || 1
})

onMounted(() => {
  fetchLogs()
})

async function fetchLogs(isLoadMore = false) {
  if (loading.value) return

  try {
    loading.value = true
    loadStatus.value = isLoadMore ? 'loading' : 'loading'

    const params = {
      ...filters.value,
      page: filters.value.page,
      limit: filters.value.limit
    }

    const response = await auditLogApi.getLogs(params)

    if (isLoadMore) {
      logList.value = [...logList.value, ...(response.data?.logs || [])]
    } else {
      logList.value = response.data?.logs || []
    }

    pagination.value = {
      page: response.data?.pagination?.page || 1,
      limit: response.data?.pagination?.limit || 20,
      total: response.data?.pagination?.total || 0
    }

    loadStatus.value = logList.value.length >= pagination.value.total ? 'nomore' : 'loadmore'
  } catch (error: any) {
    console.error('获取审计日志失败:', error)
    uni.showToast({
      title: error.message || '获取日志失败',
      icon: 'none'
    })
    loadStatus.value = 'error'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  filters.value.page = 1
  fetchLogs()
}

function handleReset() {
  filters.value = {
    startTime: '',
    endTime: '',
    actionType: '',
    success: undefined,
    keyword: '',
    page: 1,
    limit: 20
  }
  fetchLogs()
}

function handleClear() {
  filters.value.keyword = ''
}

function loadMore() {
  if (loadStatus.value !== 'loadmore') return
  filters.value.page++
  fetchLogs(true)
}

function prevPage() {
  if (filters.value.page > 1) {
    filters.value.page--
    fetchLogs()
  }
}

function nextPage() {
  if (filters.value.page < totalPages.value) {
    filters.value.page++
    fetchLogs()
  }
}

function goToDetail(id: string) {
  uni.navigateTo({
    url: `/pages/admin/audit-log/detail?id=${id}`
  })
}

async function handleExport() {
  try {
    uni.showLoading({ title: '正在导出...' })

    const params = {
      startTime: filters.value.startTime,
      endTime: filters.value.endTime,
      actionType: filters.value.actionType,
      keyword: filters.value.keyword
    }

    const response = await auditLogApi.exportLogs(params)

    uni.hideLoading()

    uni.showToast({
      title: '导出成功',
      icon: 'success'
    })
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({
      title: error.message || '导出失败',
      icon: 'none'
    })
  }
}

function onStartDateChange(e: any) {
  filters.value.startTime = e.detail.value
}

function onEndDateChange(e: any) {
  filters.value.endTime = e.detail.value
}

function onActionTypeChange(e: any) {
  const index = parseInt(e.detail.value)
  filters.value.actionType = actionTypeOptions[index].value
}

function onStatusChange(e: any) {
  const index = parseInt(e.detail.value)
  filters.value.success = statusOptions[index].value
}

function getActionTypeClass(type: string): string {
  const classMap: Record<string, string> = {
    LOGIN: 'type-login',
    CREATE: 'type-create',
    UPDATE: 'type-update',
    DELETE: 'type-delete',
    QUERY: 'type-query',
    SYSTEM_EVENT: 'type-system',
    ERROR: 'type-error'
  }
  return classMap[type] || 'type-default'
}

function getActionTypeIcon(type: string): string {
  const iconMap: Record<string, string> = {
    LOGIN: '🔵',
    CREATE: '🟢',
    UPDATE: '🟡',
    DELETE: '🔴',
    QUERY: '🟣',
    SYSTEM_EVENT: '⚪',
    ERROR: '⚫'
  }
  return iconMap[type] || '❓'
}

function getActionTypeLabel(type: string): string {
  const labelMap: Record<string, string> = {
    LOGIN: '登录',
    CREATE: '创建',
    UPDATE: '修改',
    DELETE: '删除',
    QUERY: '查询',
    SYSTEM_EVENT: '系统事件',
    ERROR: '错误'
  }
  return labelMap[type] || type
}

function getDeviceIcon(device: string): string {
  const iconMap: Record<string, string> = {
    PC: '💻',
    Mobile: '📱',
    Tablet: '📲'
  }
  return iconMap[device] || '🖥️'
}

function formatTime(timestamp: string | Date): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
</script>

<style lang="scss" scoped>
.audit-log-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 120rpx;
}

.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.filter-section {
  .filter-row {
    display: flex;
    align-items: center;
    margin-bottom: 16rpx;

    .filter-item {
      flex: 1;
      display: flex;
      align-items: center;

      &:first-child {
        margin-right: 16rpx;
      }

      .filter-label {
        font-size: 26rpx;
        color: #666666;
        margin-right: 12rpx;
        white-space: nowrap;
      }

      picker {
        flex: 1;
      }

      .picker-value {
        font-size: 26rpx;
        color: #333333;
        padding: 8rpx 16rpx;
        border: 2rpx solid #E0E0E0;
        border-radius: 8rpx;
        background: #FAFAFA;
      }

      .filter-separator {
        margin: 0 8rpx;
        color: #999999;
      }
    }
  }

  .search-row {
    margin-bottom: 16rpx;
  }

  .filter-actions {
    display: flex;
    gap: 16rpx;

    u-button {
      flex: 1;
    }
  }
}

.log-list {
  .log-card {
    margin-bottom: 16rpx;

    &:active {
      transform: scale(0.98);
      transition: transform 0.1s;
    }

    .log-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16rpx;

      .log-type-badge {
        display: inline-flex;
        align-items: center;
        padding: 6rpx 16rpx;
        border-radius: 20rpx;
        font-size: 24rpx;

        &.type-login { background: #E3F2FD; color: #1976D2; }
        &.type-create { background: #E8F5E9; color: #388E3C; }
        &.type-update { background: #FFF3E0; color: #F57C00; }
        &.type-delete { background: #FFEBEE; color: #D32F2F; }
        &.type-query { background: #F3E5F5; color: #7B1FA2; }
        &.type-system { background: #ECEFF1; color: #546E7A; }
        &.type-error { background: #FFF8E1; color: #F9A825; }

        .type-icon {
          margin-right: 6rpx;
        }

        .type-text {
          font-weight: 500;
        }
      }

      .log-status {
        font-size: 32rpx;

        &.success { color: #4CAF50; }
        &.failed { color: #F44336; }
      }
    }

    .log-content {
      margin-bottom: 12rpx;

      .log-main-info {
        display: flex;
        align-items: baseline;
        margin-bottom: 8rpx;

        .log-username {
          font-size: 30rpx;
          font-weight: 600;
          color: #1A1A1A;
          margin-right: 12rpx;
        }

        .log-phone {
          font-size: 24rpx;
          color: #999999;
        }
      }

      .log-description {
        font-size: 26rpx;
        color: #666666;
        line-height: 1.5;
        display: block;
        margin-bottom: 6rpx;
      }

      .log-fail-reason {
        font-size: 24rpx;
        color: #F44336;
        line-height: 1.5;
        display: block;
      }
    }

    .log-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16rpx;
      font-size: 22rpx;
      color: #999999;

      .log-time {
        color: #666666;
      }
    }
  }
}

.pagination {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  padding: 20rpx 32rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;

  .page-info {
    font-size: 24rpx;
    color: #666666;
  }

  .page-buttons {
    display: flex;
    gap: 16rpx;
  }
}
</style>