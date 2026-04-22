<template>
  <view class="audit-stats-page">
    <view class="today-overview">
      <view class="section-title">📊 今日概览</view>
      <view class="stats-grid">
        <view class="stat-card card" v-for="(stat, index) in todayStats" :key="index">
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
          <view class="legend-item">
            <view class="legend-dot login"></view>
            <text>登录</text>
          </view>
          <view class="legend-item">
            <view class="legend-dot operation"></view>
            <text>操作</text>
          </view>
        </view>
      </view>

      <view class="chart-container" v-if="trendData.dates.length">
        <view class="chart-bars">
          <view class="bar-group" v-for="(date, index) in trendData.dates" :key="index">
            <view class="bars">
              <view
                class="bar bar-login"
                :style="{ height: getBarHeight(trendData.loginCounts[index], maxLoginCount) }"
              ></view>
              <view
                class="bar bar-operation"
                :style="{ height: getBarHeight(trendData.operationCounts[index], maxOperationCount) }"
              ></view>
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
        <view class="distribution-item" v-for="(item, index) in actionDistribution" :key="index" @tap="filterByActionType(item.type)">
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
        <text class="more-link" @tap="goToLogList">查看全部 ›</text>
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
        <view class="action-btn" @tap="goToLogList({ actionType: 'LOGIN' })">
          <text class="action-icon">🔵</text>
          <text class="action-text">登录日志</text>
        </view>
        <view class="action-btn" @tap="goToLogList({ success: false })">
          <text class="action-icon">❌</text>
          <text class="action-text">异常日志</text>
        </view>
        <view class="action-btn" @tap="goToLogList()">
          <text class="action-icon">📋</text>
          <text class="action-text">全部日志</text>
        </view>
        <view class="action-btn" @tap="refreshData">
          <text class="action-icon">🔄</text>
          <text class="action-text">刷新数据</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import auditLogApi from '@/services/auditLogApi'

const loading = ref(false)
const statsData = ref<any>({})

const todayStats = computed(() => {
  const today = statsData.value?.today || {}
  return [
    {
      icon: '🔵',
      label: '登录次数',
      value: today.loginCount || 0,
      trend: today.loginTrend || 0,
      bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      icon: '🟢',
      label: '操作次数',
      value: today.operationCount || 0,
      trend: today.operationTrend || 0,
      bgColor: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
    },
    {
      icon: '🔴',
      label: '错误数量',
      value: today.errorCount || 0,
      trend: -(today.errorTrend || 0),
      bgColor: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)'
    }
  ]
})

const trendData = computed(() => {
  return statsData.value?.last7Days || {
    dates: [],
    loginCounts: [],
    operationCounts: []
  }
})

const actionDistribution = computed(() => {
  const dist = statsData.value?.actionTypeDistribution || {}
  return Object.entries(dist).map(([type, count]: [string, any]) => ({
    type,
    count: count || 0
  })).sort((a, b) => b.count - a.count)
})

const topUsers = computed(() => {
  return statsData.value?.topUsers || []
})

const maxLoginCount = computed(() => {
  return Math.max(...(trendData.value.loginCounts || []), 1)
})

const maxOperationCount = computed(() => {
  return Math.max(...(trendData.value.operationCounts || []), 1)
})

const totalCount = computed(() => {
  return actionDistribution.value.reduce((sum, item) => sum + item.count, 0) || 1
})

onMounted(() => {
  fetchStatistics()
})

async function fetchStatistics() {
  if (loading.value) return

  try {
    loading.value = true
    uni.showLoading({ title: '加载中...' })

    const response = await auditLogApi.getStatistics()
    statsData.value = response.data || {}

    uni.hideLoading()
  } catch (error: any) {
    uni.hideLoading()
    console.error('获取统计数据失败:', error)
    uni.showToast({
      title: error.message || '获取统计数据失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

function refreshData() {
  fetchStatistics()
}

function goToLogList(params?: any) {
  let url = '/pages/admin/audit-log/list'
  if (params) {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
    url += `?${queryString}`
  }
  uni.navigateTo({ url })
}

function filterByActionType(type: string) {
  goToLogList({ actionType: type })
}

function getBarHeight(value: number, maxValue: number): string {
  if (!value || !maxValue) return '0%'
  const height = (value / maxValue) * 100
  return `${Math.max(height, 5)}%`
}

function getDistributionWidth(count: number): string {
  const percent = (count / totalCount.value) * 100
  return `${Math.max(percent, 5)}%`
}

function getPercent(count: number): number {
  return Math.round((count / totalCount.value) * 100)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
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

function getActionColor(type: string): string {
  const colorMap: Record<string, string> = {
    LOGIN: '#1976D2',
    CREATE: '#388E3C',
    UPDATE: '#F57C00',
    DELETE: '#D32F2F',
    QUERY: '#7B1FA2',
    SYSTEM_EVENT: '#546E7A',
    ERROR: '#F9A825'
  }
  return colorMap[type] || '#999999'
}

function getRankClass(index: number): string {
  if (index === 0) return 'rank-1'
  if (index === 1) return 'rank-2'
  if (index === 2) return 'rank-3'
  return 'rank-default'
}
</script>

<style lang="scss" scoped>
.audit-stats-page {
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

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 20rpx;
  display: block;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;

  .more-link {
    font-size: 26rpx;
    color: #007AFF;
  }

  .legend {
    display: flex;
    gap: 16rpx;

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6rpx;
      font-size: 22rpx;
      color: #666666;

      .legend-dot {
        width: 16rpx;
        height: 16rpx;
        border-radius: 50%;

        &.login { background: #1976D2; }
        &.operation { background: #388E3C; }
      }
    }
  }
}

.today-overview {
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16rpx;

    .stat-card {
      padding: 20rpx;
      display: flex;
      flex-direction: column;
      align-items: center;

      .stat-icon {
        width: 80rpx;
        height: 80rpx;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12rpx;

        .icon-text {
          font-size: 36rpx;
        }
      }

      .stat-info {
        text-align: center;

        .stat-value {
          font-size: 40rpx;
          font-weight: 700;
          color: #1A1A1A;
          display: block;
        }

        .stat-label {
          font-size: 22rpx;
          color: #666666;
          margin-top: 4rpx;
          display: block;
        }
      }

      .stat-trend {
        font-size: 24rpx;
        margin-top: 8rpx;

        &.up { color: #4CAF50; }
        &.down { color: #F44336; }
      }
    }
  }
}

.trend-section {
  .chart-container {
    .chart-bars {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      height: 400rpx;
      padding: 0 10rpx;

      .bar-group {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;

        .bars {
          flex: 1;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: 8rpx;

          .bar {
            width: 24rpx;
            min-height: 4rpx;
            border-radius: 4rpx 4rpx 0 0;
            transition: height 0.3s ease;

            &.bar-login { background: #1976D2; }
            &.bar-operation { background: #388E3C; }
          }
        }

        .bar-label {
          font-size: 20rpx;
          color: #999999;
          margin-top: 12rpx;
        }
      }
    }
  }
}

.distribution-section {
  .distribution-list {
    .distribution-item {
      display: flex;
      align-items: center;
      padding: 16rpx 0;
      border-bottom: 1rpx solid #F0F0F0;

      &:last-child {
        border-bottom: none;
      }

      &:active {
        background: #FAFAFA;
      }

      .dist-info {
        display: flex;
        align-items: center;
        width: 160rpx;

        .dist-type-badge {
          width: 48rpx;
          height: 48rpx;
          border-radius: 8rpx;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12rpx;
          font-size: 24rpx;

          &.type-login { background: #E3F2FD; }
          &.type-create { background: #E8F5E9; }
          &.type-update { background: #FFF3E0; }
          &.type-delete { background: #FFEBEE; }
          &.type-query { background: #F3E5F5; }
          &.type-system { background: #ECEFF1; }
          &.type-error { background: #FFF8E1; }
        }

        .dist-label {
          font-size: 26rpx;
          color: #333333;
        }
      }

      .dist-bar-container {
        flex: 1;
        height: 16rpx;
        background: #F0F0F0;
        border-radius: 8rpx;
        overflow: hidden;
        margin: 0 16rpx;

        .dist-bar {
          height: 100%;
          border-radius: 8rpx;
          transition: width 0.3s ease;
        }
      }

      .dist-count {
        font-size: 28rpx;
        font-weight: 600;
        color: #1A1A1A;
        width: 80rpx;
        text-align: right;
      }

      .dist-percent {
        font-size: 24rpx;
        color: #999999;
        width: 80rpx;
        text-align: right;
      }

      .arrow {
        font-size: 32rpx;
        color: #CCCCCC;
        margin-left: 8rpx;
      }
    }
  }
}

.top-users-section {
  .user-list {
    .user-item {
      display: flex;
      align-items: center;
      padding: 16rpx 0;
      border-bottom: 1rpx solid #F0F0F0;

      &:last-child {
        border-bottom: none;
      }

      .user-rank {
        width: 56rpx;
        height: 56rpx;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28rpx;
        font-weight: 700;
        margin-right: 16rpx;

        &.rank-1 { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #FFFFFF; }
        &.rank-2 { background: linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%); color: #FFFFFF; }
        &.rank-3 { background: linear-gradient(135deg, #CD7F32 0%, #A0522D 100%); color: #FFFFFF; }
        &.rank-default { background: #F0F0F0; color: #666666; }
      }

      .user-info {
        flex: 1;

        .user-name {
          font-size: 28rpx;
          font-weight: 500;
          color: #1A1A1A;
          display: block;
        }

        .user-phone {
          font-size: 24rpx;
          color: #999999;
          margin-top: 4rpx;
          display: block;
        }
      }

      .user-count {
        text-align: right;

        .count-value {
          font-size: 36rpx;
          font-weight: 700;
          color: #007AFF;
          display: block;
        }

        .count-label {
          font-size: 22rpx;
          color: #999999;
        }
      }
    }
  }
}

.quick-actions {
  .action-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20rpx;

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24rpx 16rpx;
      background: #FAFAFA;
      border-radius: 12rpx;

      &:active {
        transform: scale(0.95);
      }

      .action-icon {
        font-size: 48rpx;
        margin-bottom: 12rpx;
      }

      .action-text {
        font-size: 24rpx;
        color: #666666;
      }
    }
  }
}
</style>