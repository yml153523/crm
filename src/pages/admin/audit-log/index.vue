<template>
  <AdminLayout title="日志中心" :showBack="true">
  <view class="log-center">
    <view class="tabs-wrapper card">
      <u-tabs 
        :list="tabList" 
        :current="currentTab" 
        @change="onTabChange"
        lineColor="#007AFF"
        :activeStyle="{ color: '#007AFF', fontWeight: 'bold' }"
        :inactiveStyle="{ color: '#666666' }"
      ></u-tabs>
    </view>

    <!-- Tab1: 日志列表 -->
    <view v-if="currentTab === 0" class="tab-content">
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
        </view>
      </view>

      <view class="log-list">
        <view class="log-card card" v-for="(log, index) in logList" :key="index" @click="showLogDetail(log)">
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

    <!-- Tab2: 数据统计 -->
    <view v-if="currentTab === 1" class="tab-content stats-tab">
      <view class="today-overview card">
        <view class="section-title">📊 今日概览</view>
        <view class="stats-grid">
          <view class="stat-card" v-for="(stat, index) in todayStats" :key="index">
            <view class="stat-icon" :style="{ background: stat.bgColor }">
              <text class="icon-text">{{ stat.icon }}</text>
            </view>
            <view class="stat-info">
              <text class="stat-value">{{ stat.value }}</text>
              <text class="stat-label">{{ stat.label }}</text>
            </view>
            <view class="stat-trend" :class="stat.trend >= 0 ? 'up' : 'down'">
              {{ stat.trend > 0 ? '↑' : stat.trend < 0 ? '↓' : '' }}{{ Math.abs(stat.trend) }}%
            </view>
          </view>
        </view>
      </view>

      <view class="trend-section card">
        <view class="section-header">
          <text class="section-title">📈 近7天操作趋势</text>
          <view class="legend">
            <view class="legend-item"><view class="legend-dot login"></view><text>登录</text></view>
            <view class="legend-item"><view class="legend-dot operation"></view><text>操作</text></view>
          </view>
        </view>
        <view class="chart-container" v-if="trendData.dates.length">
          <view class="chart-bars">
            <view class="bar-group" v-for="(date, index) in trendData.dates" :key="index">
              <view class="bars">
                <view class="bar bar-login" :style="{ height: getBarHeight(trendData.loginCounts[index], maxLoginCount) }"></view>
                <view class="bar bar-operation" :style="{ height: getBarHeight(trendData.operationCounts[index], maxOperationCount) }"></view>
              </view>
              <text class="bar-label">{{ formatDate(date) }}</text>
            </view>
          </view>
        </view>
        <u-empty v-else text="暂无趋势数据"></u-empty>
      </view>

      <view class="distribution-section card">
        <view class="section-title">🥧 操作类型分布</view>
        <view class="distribution-list" v-if="actionDistribution.length">
          <view class="distribution-item" v-for="(item, index) in actionDistribution" :key="index" @click="filterByActionType(item.type)">
            <view class="dist-info">
              <view class="dist-type-badge" :class="getActionTypeClass(item.type)">
                <text>{{ getActionTypeIcon(item.type) }}</text>
              </view>
              <text class="dist-label">{{ getActionTypeLabel(item.type) }}</text>
            </view>
            <view class="dist-bar-container">
              <view class="dist-bar" :style="{ width: getDistributionWidth(item.count), background: getActionColor(item.type) }"></view>
            </view>
            <text class="dist-count">{{ item.count }}</text>
            <text class="dist-percent">{{ getPercent(item.count) }}%</text>
            <text class="arrow">›</text>
          </view>
        </view>
        <u-empty v-else text="暂无分布数据"></u-empty>
      </view>

      <view class="top-users-section card">
        <view class="section-header">
          <text class="section-title">👥 活跃用户 TOP10</text>
          <text class="more-link" @click="goToLogList">查看全部 ›</text>
        </view>
        <view class="user-list" v-if="topUsers.length">
          <view class="user-item" v-for="(user, index) in topUsers" :key="index">
            <view class="user-rank" :class="getRankClass(index)">
              <text>{{ index + 1 }}</text>
            </view>
            <view class="user-info">
              <text class="user-name">{{ user.username || '未知用户' }}</text>
              <text class="user-phone" v-if="user.phone">{{ user.phone }}</text>
            </view>
            <view class="user-count">
              <text class="count-value">{{ user.operationCount }}</text>
              <text class="count-label">次操作</text>
            </view>
          </view>
        </view>
        <u-empty v-else text="暂无活跃用户"></u-empty>
      </view>

      <view class="quick-actions card">
        <view class="section-title">⚡ 快捷操作</view>
        <view class="action-grid">
          <view class="action-btn" @click="goToLogList({ actionType: 'LOGIN' })">
            <text class="action-icon">🔵</text><text class="action-text">登录日志</text>
          </view>
          <view class="action-btn" @click="goToLogList({ success: false })">
            <text class="action-icon">❌</text><text class="action-text">异常日志</text>
          </view>
          <view class="action-btn" @click="goToLogList()">
            <text class="action-icon">📋</text><text class="action-text">全部日志</text>
          </view>
          <view class="action-btn" @click="refreshStatsData">
            <text class="action-icon">🔄</text><text class="action-text">刷新数据</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Tab3: 日志管理 (仅super_admin可见) -->
    <view v-if="currentTab === 2 && isSuperAdmin" class="tab-content management-tab">
      <view class="management-section card">
        <view class="section-title">⚙️ 日志管理</view>
        <view class="warning-box">
          <text class="warning-icon">⚠️</text>
          <text class="warning-text">危险操作区域！清理后的日志将无法恢复，请谨慎操作。</text>
        </view>

        <view class="cleanup-form">
          <view class="form-item">
            <text class="form-label">清理多久之前的日志：</text>
            <picker :range="cleanupPeriods" range-key="label" :value="selectedPeriodIndex" @change="onPeriodChange">
              <view class="picker-value">{{ cleanupPeriods[selectedPeriodIndex].label }}</view>
            </picker>
          </view>

          <view class="preview-info" v-if="cleanupPreview.total !== null">
            <view class="preview-card">
              <text class="preview-title">预览信息</text>
              <view class="preview-items">
                <view class="preview-item">
                  <text class="preview-label">将删除的日志数量:</text>
                  <text class="preview-value highlight">{{ cleanupPreview.total || 0 }} 条</text>
                </view>
                <view class="preview-item">
                  <text class="preview-label">保留的最小日期:</text>
                  <text class="preview-value">{{ cleanupPreview.minDate || '-' }}</text>
                </view>
                <view class="preview-item">
                  <text class="preview-label">当前日期:</text>
                  <text class="preview-value">{{ new Date().toLocaleDateString() }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="form-actions">
            <u-button type="warning" size="medium" @click="previewCleanup" :loading="previewLoading">预览清理范围</u-button>
            <u-button 
              type="error" 
              size="medium" 
              @click="confirmCleanup"
              :disabled="!canCleanup"
              :loading="cleanupLoading"
            >
              确认清理
            </u-button>
          </view>
        </view>

        <view class="policy-note">
          <text class="note-title">📌 保留策略说明：</text>
          <text class="note-content">系统至少保留最近 7 天的日志记录，不能清理 7 天内的日志以确保审计可追溯性。</text>
        </view>
      </view>
    </view>

    <!-- 日志详情弹窗 -->
    <u-popup :show="showDetailPopup" mode="center" round="16" @close="closeDetailPopup">
      <view class="detail-popup">
        <view class="popup-header">
          <text class="popup-title">日志详情</text>
          <u-icon name="close" @click="closeDetailPopup"></u-icon>
        </view>
        <scroll-view scroll-y class="popup-content" v-if="selectedLog">
          <view class="detail-item">
            <text class="detail-label">操作ID</text>
            <text class="detail-value">{{ selectedLog._id }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">操作时间</text>
            <text class="detail-value">{{ formatTime(selectedLog.actionTime) }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">操作类型</text>
            <text class="detail-value">{{ getActionTypeLabel(selectedLog.actionType) }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">操作者</text>
            <text class="detail-value">{{ selectedLog.username || '未知' }} ({{ selectedLog.phone || '-' }})</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">操作描述</text>
            <text class="detail-value">{{ selectedLog.resourceInfo || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">IP地址</text>
            <text class="detail-value">{{ selectedLog.ipAddress || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">设备信息</text>
            <text class="detail-value">{{ selectedLog.deviceInfo?.device || '-' }} / {{ selectedLog.deviceInfo?.browser || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">请求方法</text>
            <text class="detail-value">{{ selectedLog.method || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">请求路径</text>
            <text class="detail-value">{{ selectedLog.path || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">响应状态</text>
            <text class="detail-value" :class="selectedLog.success ? 'success' : 'failed'">
              {{ selectedLog.success ? '✅ 成功' : '❌ 失败' }}
            </text>
          </view>
          <view class="detail-item" v-if="!selectedLog.success && selectedLog.failReason">
            <text class="detail-label">失败原因</text>
            <text class="detail-value error">{{ selectedLog.failReason }}</text>
          </view>
          <view class="detail-item" v-if="selectedLog.responseTime">
            <text class="detail-label">响应时间</text>
            <text class="detail-value">{{ selectedLog.responseTime }}ms</text>
          </view>
        </scroll-view>
      </view>
    </u-popup>

    <!-- 清理确认弹窗 -->
    <u-modal 
      :show="showConfirmModal" 
      title="⚠️ 确认清理日志" 
      content="此操作将永久删除所选时间范围内的日志，且不可恢复！确定要继续吗？" 
      showCancelButton
      @confirm="executeCleanup"
      @cancel="showConfirmModal = false"
    ></u-modal>
  </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { MESSAGES, TOAST_ICON } from '@/config/constants'
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import auditLogApi from '@/services/auditLogApi'

const currentTab = ref(0)
const loading = ref(false)
const loadStatus = ref('loadmore')
const logList = ref<any[]>([])
const statsData = ref<any>({})
const isSuperAdmin = computed(() => {
  const userInfo = uni.getStorageSync('userInfo')
  return userInfo?.role === 'super_admin'
})

const tabList = computed(() => {
  const baseTabs = [
    { name: '📋 日志列表' },
    { name: '📈 数据统计' }
  ]
  if (isSuperAdmin.value) {
    baseTabs.push({ name: '⚙️ 日志管理' })
  }
  return baseTabs
})

// Tab1: 日志列表相关
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

// Tab2: 统计相关
const todayStats = computed(() => {
  const today = statsData.value?.today || {}
  return [
    { icon: '🔵', label: '登录次数', value: today.loginCount || 0, trend: today.loginTrend || 0, bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { icon: '🟢', label: '操作次数', value: today.operationCount || 0, trend: today.operationTrend || 0, bgColor: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
    { icon: '🔴', label: '错误数量', value: today.errorCount || 0, trend: -(today.errorTrend || 0), bgColor: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)' }
  ]
})

const trendData = computed(() => statsData.value?.last7Days || { dates: [], loginCounts: [], operationCounts: [] })
const actionDistribution = computed(() => {
  const dist = statsData.value?.actionTypeDistribution || {}
  return Object.entries(dist).map(([type, count]: [string, any]) => ({ type, count: count || 0 })).sort((a, b) => b.count - a.count)
})
const topUsers = computed(() => statsData.value?.topUsers || [])
const maxLoginCount = computed(() => Math.max(...(trendData.value.loginCounts || []), 1))
const maxOperationCount = computed(() => Math.max(...(trendData.value.operationCounts || []), 1))
const totalCount = computed(() => actionDistribution.value.reduce((sum, item) => sum + item.count, 0) || 1)

// Tab3: 日志管理相关
const cleanupPeriods = [
  { label: '30天前', days: 30 },
  { label: '60天前', days: 60 },
  { label: '90天前', days: 90 },
  { label: '180天前', days: 180 },
  { label: '1年前', days: 365 }
]
const selectedPeriodIndex = ref(0)
const cleanupPreview = ref<any>({ total: null, minDate: null })
const previewLoading = ref(false)
const cleanupLoading = ref(false)
const canCleanup = computed(() => cleanupPreview.value.total !== null && cleanupPreview.value.total > 0)

// 弹窗相关
const showDetailPopup = ref(false)
const selectedLog = ref<any>(null)
const showConfirmModal = ref(false)

onMounted(() => {
  fetchLogs()
})

function onTabChange(e: any) {
  currentTab.value = e.index
  if (e.index === 1) {
    fetchStatistics()
  }
}

async function fetchLogs(isLoadMore = false) {
  if (loading.value) return
  try {
    loading.value = true
    loadStatus.value = isLoadMore ? 'loading' : 'loading'

    const params = { ...filters.value, page: filters.value.page, limit: filters.value.limit }
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
    uni.showToast({ title: error.message || '获取日志失败', icon: 'none' })
    loadStatus.value = 'error'
  } finally {
    loading.value = false
  }
}

async function fetchStatistics() {
  try {
    uni.showLoading({ title: MESSAGES.COMMON.LOADING })
    const response = await auditLogApi.getStatistics()
    statsData.value = response.data || {}
    uni.hideLoading()
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({ title: error.message || '获取统计数据失败', icon: 'none' })
  }
}

function handleSearch() {
  filters.value.page = 1
  fetchLogs()
}

function handleReset() {
  filters.value = { startTime: '', endTime: '', actionType: '', success: undefined, keyword: '', page: 1, limit: 20 }
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
  if (filters.value.page > 1) { filters.value.page--; fetchLogs() }
}

function nextPage() {
  if (filters.value.page < totalPages.value) { filters.value.page++; fetchLogs() }
}

async function handleExport() {
  try {
    uni.showLoading({ title: '正在导出...' })
    const params = { startTime: filters.value.startTime, endTime: filters.value.endTime, actionType: filters.value.actionType, keyword: filters.value.keyword }
    await auditLogApi.exportLogs(params)
    uni.hideLoading()
    uni.showToast({ title: '导出成功', icon: 'success' })
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({ title: error.message || '导出失败', icon: 'none' })
  }
}

function refreshData() {
  if (currentTab.value === 0) {
    handleReset()
  } else if (currentTab.value === 1) {
    fetchStatistics()
  }
}

function refreshStatsData() {
  fetchStatistics()
}

function onStartDateChange(e: any) { filters.value.startTime = e.detail.value }
function onEndDateChange(e: any) { filters.value.endTime = e.detail.value }
function onActionTypeChange(e: any) { filters.value.actionType = actionTypeOptions[parseInt(e.detail.value)].value }
function onStatusChange(e: any) { filters.value.success = statusOptions[parseInt(e.detail.value)].value }

function showLogDetail(log: any) {
  selectedLog.value = log
  showDetailPopup.value = true
}

function closeDetailPopup() {
  showDetailPopup.value = false
  selectedLog.value = null
}

function goToLogList(params?: any) {
  currentTab.value = 0
  if (params) {
    if (params.actionType) filters.value.actionType = params.actionType
    if (params.success !== undefined) filters.value.success = params.success
    handleSearch()
  }
}

function filterByActionType(type: string) {
  goToLogList({ actionType: type })
}

// Tab3: 日志管理功能
function onPeriodChange(e: any) {
  selectedPeriodIndex.value = parseInt(e.detail.value)
  cleanupPreview.value = { total: null, minDate: null }
}

async function previewCleanup() {
  const period = cleanupPeriods[selectedPeriodIndex.value]
  const beforeDate = new Date()
  beforeDate.setDate(beforeDate.getDate() - period.days)

  // 检查是否在7天保护期内
  const minAllowedDate = new Date()
  minAllowedDate.setDate(minAllowedDate.getDate() - 7)

  if (beforeDate >= minAllowedDate) {
    uni.showToast({ title: '不能清理7天内的日志', icon: 'none' })
    return
  }

  try {
    previewLoading.value = true
    const response = await auditLogApi.getLogs({
      endTime: beforeDate.toISOString(),
      limit: 1
    })
    
    cleanupPreview.value = {
      total: response.data?.pagination?.total || 0,
      minDate: beforeDate.toLocaleDateString()
    }
  } catch (error: any) {
    uni.showToast({ title: error.message || '预览失败', icon: 'none' })
  } finally {
    previewLoading.value = false
  }
}

function confirmCleanup() {
  if (!canCleanup.value) return
  showConfirmModal.value = true
}

async function executeCleanup() {
  showConfirmModal.value = false
  
  const period = cleanupPeriods[selectedPeriodIndex.value]
  const beforeDate = new Date()
  beforeDate.setDate(beforeDate.getDate() - period.days)

  try {
    cleanupLoading.value = true
    await auditLogApi.cleanupLogs(beforeDate.toISOString())
    
    uni.showToast({ title: `已清理 ${cleanupPreview.value.total} 条日志`, icon: 'success' })
    cleanupPreview.value = { total: null, minDate: null }
    
    // 刷新列表
    if (currentTab.value === 0) {
      handleReset()
    }
  } catch (error: any) {
    uni.showToast({ title: error.message || '清理失败', icon: 'none' })
  } finally {
    cleanupLoading.value = false
  }
}

// 工具函数
function getActionTypeClass(type: string): string {
  const map: Record<string, string> = { LOGIN: 'type-login', CREATE: 'type-create', UPDATE: 'type-update', DELETE: 'type-delete', QUERY: 'type-query', SYSTEM_EVENT: 'type-system', ERROR: 'type-error' }
  return map[type] || 'type-default'
}

function getActionTypeIcon(type: string): string {
  const map: Record<string, string> = { LOGIN: '🔵', CREATE: '🟢', UPDATE: '🟡', DELETE: '🔴', QUERY: '🟣', SYSTEM_EVENT: '⚪', ERROR: '⚫' }
  return map[type] || '❓'
}

function getActionTypeLabel(type: string): string {
  const map: Record<string, string> = { LOGIN: '登录', CREATE: '创建', UPDATE: '修改', DELETE: '删除', QUERY: '查询', SYSTEM_EVENT: '系统事件', ERROR: '错误' }
  return map[type] || type
}

function getActionColor(type: string): string {
  const map: Record<string, string> = { LOGIN: '#1976D2', CREATE: '#388E3C', UPDATE: '#F57C00', DELETE: '#D32F2F', QUERY: '#7B1FA2', SYSTEM_EVENT: '#546E7A', ERROR: '#F9A825' }
  return map[type] || '#999999'
}

function getDeviceIcon(device: string): string {
  const map: Record<string, string> = { PC: '💻', Mobile: '📱', Tablet: '📲' }
  return map[device] || '🖥️'
}

function getBarHeight(value: number, maxValue: number): string {
  if (!value || !maxValue) return '0%'
  return `${Math.max((value / maxValue) * 100, 5)}%`
}

function getDistributionWidth(count: number): string {
  return `${Math.max((count / totalCount.value) * 100, 5)}%`
}

function getPercent(count: number): number {
  return Math.round((count / totalCount.value) * 100)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatTime(timestamp: string | Date): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function getRankClass(index: number): string {
  if (index === 0) return 'rank-1'
  if (index === 1) return 'rank-2'
  if (index === 2) return 'rank-3'
  return 'rank-default'
}
</script>

<style lang="scss" scoped>
.log-center {
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
  
  .header-title {
    display: flex;
    align-items: center;
    gap: 12rpx;
    
    .title-icon { font-size: 40rpx; }
    .title-text { font-size: 36rpx; font-weight: 700; color: #1A1A1A; }
  }
  
  .header-actions {
    display: flex;
    gap: 16rpx;
  }
}

.tabs-wrapper {
  padding: 12rpx 24rpx;
}

.tab-content {
  padding-top: 8rpx;
}

.filter-section {
  .filter-row {
    display: flex;
    margin-bottom: 16rpx;
    
    .filter-item {
      flex: 1;
      display: flex;
      align-items: center;
      
      &:first-child { margin-right: 16rpx; }
      
      .filter-label { font-size: 26rpx; color: #666; margin-right: 12rpx; white-space: nowrap; }
      
      picker { flex: 1; }
      .picker-value { font-size: 26rpx; color: #333; padding: 8rpx 16rpx; border: 2rpx solid #E0E0E0; border-radius: 8rpx; background: #FAFAFA; }
      .filter-separator { margin: 0 8rpx; color: #999; }
    }
  }
  
  .search-row { margin-bottom: 16rpx; }
  .filter-actions { display: flex; gap: 16rpx; u-button { flex: 1; } }
}

.log-list {
  .log-card {
    margin-bottom: 16rpx;
    
    &:active { transform: scale(0.98); transition: transform 0.1s; }
    
    .log-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx;
      
      .log-type-badge {
        display: inline-flex; align-items: center; padding: 6rpx 16rpx; border-radius: 20rpx; font-size: 24rpx;
        &.type-login { background: #E3F2FD; color: #1976D2; }
        &.type-create { background: #E8F5E9; color: #388E3C; }
        &.type-update { background: #FFF3E0; color: #F57C00; }
        &.type-delete { background: #FFEBEE; color: #D32F2F; }
        &.type-query { background: #F3E5F5; color: #7B1FA2; }
        &.type-system { background: #ECEFF1; color: #546E7A; }
        &.type-error { background: #FFF8E1; color: #F9A825; }
        
        .type-icon { margin-right: 6rpx; }
        .type-text { font-weight: 500; }
      }
      
      .log-status { font-size: 32rpx; &.success { color: #4CAF50; } &.failed { color: #F44336; } }
    }
    
    .log-content {
      margin-bottom: 12rpx;
      .log-main-info { display: flex; align-items: baseline; margin-bottom: 8rpx;
        .log-username { font-size: 30rpx; font-weight: 600; color: #1A1A1A; margin-right: 12rpx; }
        .log-phone { font-size: 24rpx; color: #999; }
      }
      .log-description { font-size: 26rpx; color: #666; line-height: 1.5; display: block; margin-bottom: 6rpx; }
      .log-fail-reason { font-size: 24rpx; color: #F44336; line-height: 1.5; display: block; }
    }
    
    .log-meta { display: flex; flex-wrap: wrap; gap: 16rpx; font-size: 22rpx; color: #999;
      .log-time { color: #666; }
    }
  }
}

.pagination {
  position: fixed; bottom: 0; left: 0; right: 0; background: #FFF; padding: 20rpx 32rpx; box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;
  .page-info { font-size: 24rpx; color: #666; }
  .page-buttons { display: flex; gap: 16rpx; }
}

/* 统计页样式 */
.section-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 20rpx; display: block; }

.today-overview {
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx;
    .stat-card { padding: 20rpx; display: flex; flex-direction: column; align-items: center;
      .stat-icon { width: 80rpx; height: 80rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12rpx;
        .icon-text { font-size: 36rpx; }
      }
      .stat-info { text-align: center;
        .stat-value { font-size: 40rpx; font-weight: 700; color: #1A1A1A; display: block; }
        .stat-label { font-size: 22rpx; color: #666; margin-top: 4rpx; display: block; }
      }
      .stat-trend { font-size: 24rpx; margin-top: 8rpx; &.up { color: #4CAF50; } &.down { color: #F44336; } }
    }
  }
}

.trend-section {
  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx;
    .legend { display: flex; gap: 16rpx;
      .legend-item { display: flex; align-items: center; gap: 6rpx; font-size: 22rpx; color: #666;
        .legend-dot { width: 16rpx; height: 16rpx; border-radius: 50%; &.login { background: #1976D2; } &.operation { background: #388E3C; } }
      }
    }
  }
  
  .chart-container { .chart-bars { display: flex; justify-content: space-between; align-items: flex-end; height: 400rpx; padding: 0 10rpx;
    .bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%;
      .bars { flex: 1; width: 100%; display: flex; justify-content: center; align-items: flex-end; gap: 8rpx;
        .bar { width: 24rpx; min-height: 4rpx; border-radius: 4rpx 4rpx 0 0; transition: height 0.3s;
          &.bar-login { background: #1976D2; }
          &.bar-operation { background: #388E3C; }
        }
      }
      .bar-label { font-size: 20rpx; color: #999; margin-top: 12rpx; }
    }
  }}
}

.distribution-section {
  .distribution-list {
    .distribution-item { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #F0F0F0;
      &:last-child { border-bottom: none; }
      &:active { background: #FAFAFA; }
      
      .dist-info { display: flex; align-items: center; width: 160rpx;
        .dist-type-badge { width: 48rpx; height: 48rpx; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; margin-right: 12rpx; font-size: 24rpx;
          &.type-login { background: #E3F2FD; }
          &.type-create { background: #E8F5E9; }
          &.type-update { background: #FFF3E0; }
          &.type-delete { background: #FFEBEE; }
          &.type-query { background: #F3E5F5; }
          &.type-system { background: #ECEFF1; }
          &.type-error { background: #FFF8E1; }
        }
        .dist-label { font-size: 26rpx; color: #333; }
      }
      
      .dist-bar-container { flex: 1; height: 16rpx; background: #F0F0F0; border-radius: 8rpx; overflow: hidden; margin: 0 16rpx;
        .dist-bar { height: 100%; border-radius: 8rpx; transition: width 0.3s; }
      }
      
      .dist-count { font-size: 28rpx; font-weight: 600; color: #1A1A1A; width: 80rpx; text-align: right; }
      .dist-percent { font-size: 24rpx; color: #999; width: 80rpx; text-align: right; }
      .arrow { font-size: 32rpx; color: #CCC; margin-left: 8rpx; }
    }
  }
}

.top-users-section {
  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx;
    .more-link { font-size: 26rpx; color: #007AFF; }
  }
  
  .user-list {
    .user-item { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #F0F0F0;
      &:last-child { border-bottom: none; }
      
      .user-rank { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 700; margin-right: 16rpx;
        &.rank-1 { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #FFF; }
        &.rank-2 { background: linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%); color: #FFF; }
        &.rank-3 { background: linear-gradient(135deg, #CD7F32 0%, #A0522D 100%); color: #FFF; }
        &.rank-default { background: #F0F0F0; color: #666; }
      }
      
      .user-info { flex: 1;
        .user-name { font-size: 28rpx; font-weight: 500; color: #1A1A1A; display: block; }
        .user-phone { font-size: 24rpx; color: #999; margin-top: 4rpx; display: block; }
      }
      
      .user-count { text-align: right;
        .count-value { font-size: 36rpx; font-weight: 700; color: #007AFF; display: block; }
        .count-label { font-size: 22rpx; color: #999; }
      }
    }
  }
}

.quick-actions {
  .action-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20rpx;
    .action-btn { display: flex; flex-direction: column; align-items: center; padding: 24rpx 16rpx; background: #FAFAFA; border-radius: 12rpx;
      &:active { transform: scale(0.95); }
      .action-icon { font-size: 48rpx; margin-bottom: 12rpx; }
      .action-text { font-size: 24rpx; color: #666; }
    }
  }
}

/* 日志管理Tab样式 */
.management-tab {
  .management-section {
    .warning-box {
      display: flex; align-items: flex-start; gap: 12rpx; padding: 20rpx; background: #FFF3E0; border-radius: 12rpx; margin-bottom: 24rpx;
      .warning-icon { font-size: 36rpx; }
      .warning-text { font-size: 26rpx; color: #E65100; line-height: 1.5; flex: 1; }
    }
    
    .cleanup-form {
      .form-item { margin-bottom: 20rpx;
        .form-label { font-size: 28rpx; color: #333; margin-bottom: 12rpx; display: block; }
        picker { width: 100%; }
        .picker-value { font-size: 28rpx; color: #333; padding: 16rpx; border: 2rpx solid #E0E0E0; border-radius: 8rpx; background: #FAFAFA; }
      }
      
      .preview-info { margin: 20rpx 0;
        .preview-card { padding: 20rpx; background: #F5F5F5; border-radius: 12rpx;
          .preview-title { font-size: 28rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 16rpx; display: block; }
          .preview-items {
            .preview-item { display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 1rpx solid #E0E0E0;
              &:last-child { border-bottom: none; }
              .preview-label { font-size: 26rpx; color: #666; }
              .preview-value { font-size: 28rpx; font-weight: 600; color: #1A1A1A; &.highlight { color: #F44336; font-size: 36rpx; } }
            }
          }
        }
      }
      
      .form-actions { display: flex; gap: 20rpx; margin-top: 24rpx; u-button { flex: 1; } }
    }
    
    .policy-note { margin-top: 24rpx; padding: 16rpx; background: #E3F2FD; border-radius: 8rpx;
      .note-title { font-size: 26rpx; font-weight: 600; color: #1976D2; display: block; margin-bottom: 8rpx; }
      .note-content { font-size: 24rpx; color: #0D47A1; line-height: 1.5; }
    }
  }
}

/* 详情弹窗 */
.detail-popup {
  width: 90vw;
  max-height: 80vh;
  background: #FFF;
  border-radius: 16rpx;
  overflow: hidden;
  
  .popup-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; border-bottom: 1rpx solid #F0F0F0;
    .popup-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; }
  }
  
  .popup-content { max-height: 60vh; padding: 24rpx;
    .detail-item { margin-bottom: 20rpx;
      .detail-label { font-size: 24rpx; color: #999; display: block; margin-bottom: 8rpx; }
      .detail-value { font-size: 28rpx; color: #333; word-break: break-all; &.success { color: #4CAF50; } &.failed { color: #F44336; } &.error { color: #F44336; } }
    }
  }
}
</style>