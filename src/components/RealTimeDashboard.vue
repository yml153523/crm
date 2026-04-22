<template>
  <view class="realtime-dashboard">
    <view class="dashboard-header">
      <view class="header-left">
        <text class="dashboard-title">📡 实时数据看板</text>
        <text class="dashboard-subtitle">数据每2秒自动更新</text>
      </view>
      <view :class="['connection-status', `status-${connectionState}`]">
        <view class="status-dot"></view>
        <text class="status-text">{{ connectionText }}</text>
      </view>
    </view>

    <view class="control-bar">
      <scroll-view scroll-x class="channel-selector">
        <view
          v-for="channel in channels"
          :key="channel.id"
          :class="['channel-tab', { active: selectedChannel === channel.id }]"
          @tap="selectChannel(channel.id)"
        >
          <text>{{ channel.icon }} {{ channel.label }}</text>
        </view>
      </scroll-view>

      <button
        :class="['toggle-btn', { active: isSimulating }]"
        @tap="toggleSimulation"
      >
        {{ isSimulating ? '⏹ 停止模拟' : '▶ 开始模拟' }}
      </button>
    </view>

    <view class="main-metric-card">
      <view class="metric-header">
        <text class="metric-label">{{ currentChannelLabel }}</text>
        <view :class="['trend-indicator', currentTrend]">
          <text>{{ trendIcon }}</text>
          <text class="trend-value">{{ trendPercent }}</text>
        </view>
      </view>

      <view class="metric-value-container">
        <text class="metric-value" :class="{ updating: isUpdating }">
          {{ formatMetricValue(currentValue) }}
        </text>
        <text class="metric-unit">{{ currentUnit }}</text>
      </view>

      <view class="mini-chart">
        <svg class="chart-svg" viewBox="0 0 300 80" preserveAspectRatio="none">
          <defs>
            <linearGradient :id="`gradient-${selectedChannel}`" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" :stop-color="currentColor" stop-opacity="0.4"/>
              <stop offset="100%" :stop-color="currentColor" stop-opacity="0.05"/>
            </linearGradient>
          </defs>
          <path
            :d="chartPath"
            :fill="`url(#gradient-${selectedChannel})`"
            :stroke="currentColor"
            stroke-width="2"
          />
        </svg>
        <view class="chart-overlay">
          <text class="chart-max">{{ chartMax }}</text>
          <text class="chart-min">{{ chartMin }}</text>
        </view>
      </view>

      <view class="metric-stats">
        <view class="stat-item">
          <text class="stat-label">平均值</text>
          <text class="stat-value">{{ formatNumber(averageValue) }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">最高值</text>
          <text class="stat-value highlight-high">{{ formatNumber(maxValue) }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">最低值</text>
          <text class="stat-value highlight-low">{{ formatNumber(minValue) }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">更新次数</text>
          <text class="stat-value">{{ updateCount }}</text>
        </view>
      </view>
    </view>

    <view class="metrics-grid">
      <view
        v-for="metric in otherMetrics"
        :key="metric.id"
        class="metric-tile"
        @tap="selectChannel(metric.id)"
      >
        <view class="tile-header">
          <text class="tile-icon">{{ metric.icon }}</text>
          <text class="tile-label">{{ metric.label }}</text>
        </view>
        <text class="tile-value" :class="{ updating: metric.updating }">
          {{ formatMetricValue(metric.value, metric.unit) }}
        </text>
        <view :class="['tile-trend', metric.trend]">
          <text>{{ getTrendIcon(metric.trend) }} {{ Math.abs(metric.change).toFixed(1) }}%</text>
        </view>
      </view>
    </view>

    <view class="activity-feed">
      <text class="feed-title">📋 实时动态</text>
      <scroll-view scroll-y class="feed-list" :scroll-top="scrollTop">
        <view
          v-for="(activity, index) in recentActivities"
          :key="index"
          class="activity-item"
        >
          <view :class="['activity-dot', activity.type]"></view>
          <view class="activity-content">
            <text class="activity-text">{{ activity.text }}</text>
            <text class="activity-time">{{ activity.time }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="performance-panel">
      <text class="panel-title">⚡ 系统性能</text>
      <view class="perf-grid">
        <view class="perf-item">
          <text class="perf-label">延迟</text>
          <view class="perf-bar">
            <view
              class="perf-fill latency"
              :style="{ width: latency + '%' }"
            ></view>
          </view>
          <text class="perf-value">{{ latency }}ms</text>
        </view>
        <view class="perf-item">
          <text class="perf-label">吞吐量</text>
          <view class="perf-bar">
            <view
              class="perf-fill throughput"
              :style="{ width: throughput + '%' }"
            ></view>
          </view>
          <text class="perf-value">{{ throughput }}/s</text>
        </view>
        <view class="perf-item">
          <text class="perf-label">内存使用</text>
          <view class="perf-bar">
            <view
              class="perf-fill memory"
              :style="{ width: memoryUsage + '%' }"
            ></view>
          </view>
          <text class="perf-value">{{ memoryUsage }}%</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { realTimeManager } from '@/utils/realtime'
import type { RealTimeDataPoint } from '@/utils/realtime'

interface Channel {
  id: string;
  label: string;
  icon: string;
  unit: string;
  color: string;
}

const channels: Channel[] = [
  { id: 'visitors', label: '访客数', icon: '👥', unit: '', color: '#007AFF' },
  { id: 'conversions', label: '转化数', icon: '✨', unit: '', color: '#34C759' },
  { id: 'orders', label: '订单数', icon: '📦', unit: '', color: '#FF9500' },
  { id: 'revenue', label: '收入', icon: '💰', unit: '¥', color: '#AF52DE' },
  { id: 'video_views', label: '视频观看', icon: '🎬', unit: '', color: '#FF3B30' },
  { id: 'course_enrollments', label: '课程报名', icon: '📚', unit: '', color: '#5856D6' },
  { id: 'product_views', label: '商品浏览', icon: '🛒', unit: '', color: '#FF2D55' },
  { id: 'cart_additions', label: '加入购物车', icon: '🛍️', unit: '', color: '#00C7BE' }
]

const selectedChannel = ref('visitors')
const connectionState = ref<'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'>('disconnected')
const isSimulating = ref(false)
const isUpdating = ref(false)
const updateCount = ref(0)
const scrollTop = ref(0)

const channelData = ref<Map<string, RealTimeDataPoint[]>>(new Map())
const currentDataPoint = ref<RealTimeDataPoint | null>(null)
const activities = ref<Array<{type: string; text: string; time: string}>>([])
const maxActivities = 20

let unsubscribers: Array<() => void> = []

const currentChannel = computed(() => {
  return channels.find(c => c.id === selectedChannel.value) || channels[0]
})

const currentColor = computed(() => currentChannel.value.color)

const currentUnit = computed(() => currentChannel.value.unit)

const currentChannelLabel = computed(() => currentChannel.value.label)

const currentValue = computed(() => {
  return currentDataPoint.value?.value || 0
})

const currentTrend = computed(() => {
  return currentDataPoint.value?.metadata?.trend || 'neutral'
})

const trendIcon = computed(() => {
  const icons: Record<string, string> = {
    up: '↑',
    down: '↓',
    neutral: '→'
  }
  return icons[currentTrend.value] || '→'
})

const trendPercent = computed(() => {
  const change = currentDataPoint.value?.metadata?.changePercent || 0
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
})

const historicalData = computed(() => {
  return channelData.value.get(selectedChannel.value) || []
})

const averageValue = computed(() => {
  if (historicalData.value.length === 0) return 0
  const sum = historicalData.value.reduce((acc, point) => acc + point.value, 0)
  return sum / historicalData.value.length
})

const maxValue = computed(() => {
  if (historicalData.value.length === 0) return 0
  return Math.max(...historicalData.value.map(p => p.value))
})

const minValue = computed(() => {
  if (historicalData.value.length === 0) return 0
  return Math.min(...historicalData.value.map(p => p.value))
})

const chartMax = computed(() => formatNumber(maxValue.value))
const chartMin = computed(() => formatNumber(minValue.value))

const chartPath = computed(() => {
  const data = historicalData.value.slice(-30)
  if (data.length < 2) return ''

  const maxVal = maxValue.value || 1
  const minVal = minValue.value
  const range = maxVal - minVal || 1

  const width = 300
  const height = 80
  const padding = 5

  let path = ''
  let areaPath = ''

  data.forEach((point, index) => {
    const x = (index / (data.length - 1)) * (width - 2 * padding) + padding
    const y = height - padding - ((point.value - minVal) / range) * (height - 2 * padding)

    if (index === 0) {
      path += `M ${x} ${y}`
      areaPath += `M ${x} ${height} L ${x} ${y}`
    } else {
      path += ` L ${x} ${y}`
      areaPath += ` L ${x} ${y}`
    }
  })

  areaPath += ` L ${width - padding} ${height} Z`

  return areaPath
})

const otherMetrics = computed(() => {
  return channels
    .filter(c => c.id !== selectedChannel.value)
    .slice(0, 4)
    .map(channel => {
      const data = channelData.value.get(channel.id)
      const latest = data?.[data.length - 1]
      const prev = data?.[data.length - 2]
      let change = 0
      let trend = 'neutral'

      if (latest && prev && prev.value !== 0) {
        change = ((latest.value - prev.value) / prev.value) * 100
        trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
      }

      return {
        ...channel,
        value: latest?.value || 0,
        change,
        trend,
        updating: false
      }
    })
})

const connectionText = computed(() => {
  const texts: Record<string, string> = {
    connecting: '连接中...',
    connected: '已连接',
    disconnected: '未连接',
    reconnecting: '重连中...',
    error: '连接错误'
  }
  return texts[connectionState.value] || '未知'
})

const recentActivities = computed(() => activities.value.slice(-10))

const latency = ref(Math.floor(Math.random() * 50) + 10)
const throughput = ref(Math.floor(Math.random() * 100) + 50)
const memoryUsage = ref(Math.floor(Math.random() * 40) + 30)

function selectChannel(channelId: string): void {
  selectedChannel.value = channelId
  const data = channelData.value.get(channelId)
  currentDataPoint.value = data?.[data.length - 1] || null
}

function toggleSimulation(): void {
  if (isSimulating.value) {
    realTimeManager.stopSimulation()
    isSimulating.value = false
  } else {
    realTimeManager.startSimulation()
    isSimulating.value = true
    subscribeToAllChannels()
  }
}

function subscribeToAllChannels(): void {
  unsubscribers.forEach(unsub => unsub())
  unsubscribers = []

  channels.forEach(channel => {
    const unsub = realTimeManager.subscribe(channel.id, (data: any) => {
      handleDataUpdate(channel.id, data)
    })
    unsubscribers.push(unsub)
  })
}

function handleDataUpdate(channelId: string, data: any): void {
  if (!channelData.value.has(channelId)) {
    channelData.value.set(channelId, [])
  }

  const buffer = channelData.value.get(channelId)!
  buffer.push({
    timestamp: Date.now(),
    value: data.value,
    label: data.label,
    metadata: data.metadata
  })

  while (buffer.length > 60) {
    buffer.shift()
  }

  if (channelId === selectedChannel.value) {
    triggerUpdateAnimation()
    currentDataPoint.value = buffer[buffer.length - 1]
  }

  updateCount.value++

  addActivity(channelId, data)
  updatePerformanceMetrics()
}

function triggerUpdateAnimation(): void {
  isUpdating.value = true
  setTimeout(() => {
    isUpdating.value = false
  }, 300)
}

function addActivity(channelId: string, data: any): void {
  const channel = channels.find(c => c.id === channelId)
  const type = data.metadata?.trend === 'up' ? 'positive' :
               data.metadata?.trend === 'down' ? 'negative' : 'neutral'

  activities.value.push({
    type,
    text: `${channel?.icon || ''} ${channel?.label || channelId}: ${formatNumber(data.value)}${data.metadata?.trend ? ` (${data.metadata.trend === 'up' ? '+' : ''}${data.metadata.changePercent?.toFixed(1)}%)` : ''}`,
    time: new Date().toLocaleTimeString('zh-CN')
  })

  while (activities.value.length > maxActivities) {
    activities.value.shift()
  }

  setTimeout(() => {
    scrollTop.value = activities.value.length * 1000
  }, 100)
}

function updatePerformanceMetrics(): void {
  latency.value = Math.min(100, Math.max(5, latency.value + (Math.random() - 0.5) * 10))
  throughput.value = Math.min(200, Math.max(20, throughput.value + (Math.random() - 0.5) * 15))
  memoryUsage.value = Math.min(90, Math.max(20, memoryUsage + (Math.random() - 0.5) * 3))
}

function formatMetricValue(value: number, unit?: string): string {
  const num = formatNumber(value)
  return unit ? `${unit}${num}` : num
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return Math.round(num).toString()
}

function getTrendIcon(trend: string): string {
  const icons: Record<string, string> = {
    up: '↑',
    down: '↓',
    neutral: '→'
  }
  return icons[trend] || '→'
}

onMounted(() => {
  const unsubState = realTimeManager.onStateChange((state) => {
    connectionState.value = state
  })
  unsubscribers.push(unsubState)

  setTimeout(() => {
    toggleSimulation()
  }, 500)
})

onUnmounted(() => {
  unsubscribers.forEach(unsub => unsub())
  realTimeManager.stopSimulation()
})
</script>

<style scoped>
.realtime-dashboard {
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  flex: 1;
}

.dashboard-title {
  font-size: 24px;
  font-weight: 700;
  color: white;
  display: block;
  margin-bottom: 4px;
}

.dashboard-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 12px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999999;
  animation: pulse 2s infinite;
}

.status-connected .status-dot {
  background: #34C759;
}

.status-connecting .status-dot,
.status-reconnecting .status-dot {
  background: #FF9500;
}

.status-error .status-dot {
  background: #FF3B30;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.status-text {
  font-size: 12px;
  color: white;
  font-weight: 600;
}

.control-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.channel-selector {
  flex: 1;
  white-space: nowrap;
}

.channel-tab {
  display: inline-block;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  margin-right: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  transition: all 0.3s ease;
}

.channel-tab.active {
  background: white;
  color: #667eea;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toggle-btn {
  background: rgba(255, 255, 255, 0.25);
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  backdrop-filter: blur(10px);
  white-space: nowrap;
}

.toggle-btn.active {
  background: #34C759;
}

.main-metric-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.metric-label {
  font-size: 16px;
  font-weight: 600;
  color: #333333;
}

.trend-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
}

.trend-indicator.up {
  background: #E8F5E9;
  color: #34C759;
}

.trend-indicator.down {
  background: #FFEBEE;
  color: #FF3B30;
}

.trend-indicator.neutral {
  background: #F5F5F5;
  color: #666666;
}

.metric-value-container {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 20px;
}

.metric-value {
  font-size: 48px;
  font-weight: 800;
  color: #1A1A1A;
  transition: all 0.3s ease;
}

.metric-value.updating {
  transform: scale(1.05);
  color: v-bind(currentColor);
}

.metric-unit {
  font-size: 20px;
  font-weight: 600;
  color: #666666;
}

.mini-chart {
  position: relative;
  height: 80px;
  margin-bottom: 20px;
  background: #F8F9FA;
  border-radius: 12px;
  overflow: hidden;
}

.chart-svg {
  width: 100%;
  height: 100%;
}

.chart-overlay {
  position: absolute;
  top: 8px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.chart-max,
.chart-min {
  font-size: 11px;
  color: #999999;
  font-weight: 600;
}

.metric-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: #F8F9FA;
  border-radius: 10px;
}

.stat-label {
  font-size: 11px;
  color: #999999;
  display: block;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #333333;
}

.stat-value.highlight-high {
  color: #34C759;
}

.stat-value.highlight-low {
  color: #FF3B30;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.metric-tile {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.metric-tile:active {
  transform: scale(0.98);
}

.tile-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.tile-icon {
  font-size: 18px;
}

.tile-label {
  font-size: 13px;
  color: #666666;
  font-weight: 600;
}

.tile-value {
  font-size: 28px;
  font-weight: 800;
  color: #1A1A1A;
  display: block;
  margin-bottom: 6px;
  transition: all 0.3s ease;
}

.tile-value.updating {
  transform: scale(1.05);
}

.tile-trend {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.tile-trend.up {
  background: #E8F5E9;
  color: #34C759;
}

.tile-trend.down {
  background: #FFEBEE;
  color: #FF3B30;
}

.tile-trend.neutral {
  background: #F5F5F5;
  color: #666666;
}

.activity-feed {
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.feed-title {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  display: block;
  margin-bottom: 12px;
}

.feed-list {
  max-height: 250px;
}

.activity-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #F0F0F0;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.activity-dot.positive {
  background: #34C759;
}

.activity-dot.negative {
  background: #FF3B30;
}

.activity-dot.neutral {
  background: #999999;
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: 13px;
  color: #333333;
  line-height: 1.4;
  display: block;
  margin-bottom: 2px;
}

.activity-time {
  font-size: 11px;
  color: #999999;
}

.performance-panel {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  display: block;
  margin-bottom: 12px;
}

.perf-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.perf-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.perf-label {
  font-size: 12px;
  color: #666666;
  width: 60px;
  flex-shrink: 0;
}

.perf-bar {
  flex: 1;
  height: 8px;
  background: #F0F0F0;
  border-radius: 4px;
  overflow: hidden;
}

.perf-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.perf-fill.latency {
  background: linear-gradient(90deg, #34C759, #FF9500, #FF3B30);
}

.perf-fill.throughput {
  background: linear-gradient(90deg, #007AFF, #5856D6);
}

.perf-fill.memory {
  background: linear-gradient(90deg, #34C759, #FF9500);
}

.perf-value {
  font-size: 12px;
  font-weight: 600;
  color: #333333;
  width: 45px;
  text-align: right;
}

@media (max-width: 768px) {
  .dashboard-title {
    font-size: 20px;
  }

  .metric-value {
    font-size: 36px;
  }

  .metric-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .control-bar {
    flex-direction: column;
  }

  .toggle-btn {
    width: 100%;
  }
}
</style>
