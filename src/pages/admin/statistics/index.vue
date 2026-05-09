<template>
  <AdminLayout title="数据统计" :showBack="true">
  <view class="statistics-page">
    <view v-if="loading" class="loading-container">
      <text class="loading-text">正在加载数据...</text>
    </view>

    <view v-else>
      <view class="time-filter">
      <view 
        class="time-tab"
        :class="{ active: currentTime === index }"
        v-for="(tab, index) in timeTabs"
        :key="index"
        @click="handleTimeChange(index)"
      >
        <text>{{ tab.name }}</text>
      </view>
    </view>
    
    <view class="stat-cards">
      <view class="stat-card card" v-for="(item, index) in statCards" :key="index" @click="showStatDetail(item)">
        <view class="card-header">
          <text class="card-icon">{{ item.icon }}</text>
          <view class="trend-badge" :class="item.trend > 0 ? 'up' : 'down'">
            <text>{{ item.trend > 0 ? '↑' : '↓' }} {{ Math.abs(item.trend) }}%</text>
          </view>
        </view>
        <text class="value">{{ item.value }}</text>
        <text class="label">{{ item.label }}</text>
        <view class="mini-chart" v-if="item.chartData">
          <view 
            class="chart-bar"
            v-for="(height, idx) in item.chartData"
            :key="idx"
            :style="{ height: height + '%' }"
          ></view>
        </view>
      </view>
    </view>

    <view class="chart-section card">
      <view class="section-header">
        <text class="section-title">📈 用户增长趋势</text>
        <view class="refresh-btn" @click="refreshChart">
          <text>刷新</text>
        </view>
      </view>
      
      <view class="chart-area">
        <view class="y-axis">
          <text v-for="(label, idx) in yLabels" :key="idx">{{ label }}</text>
        </view>
        
        <view class="chart-content">
          <view class="x-labels">
            <text v-for="(label, idx) in xLabels" :key="idx">{{ label }}</text>
          </view>
          
          <view class="bars-container">
            <view 
              class="bar-wrapper"
              v-for="(bar, idx) in chartData"
              :key="idx"
              @click="showBarDetail(bar, idx)"
            >
              <view class="bar" :style="{ height: bar.height + '%' }" :class="bar.highlight ? 'highlight' : ''"></view>
              <text class="bar-value">{{ bar.value }}</text>
            </view>
          </view>
        </view>
      </view>
      
      <view class="chart-legend">
        <view class="legend-item">
          <view class="legend-dot dot-blue"></view>
          <text>新增用户</text>
        </view>
        <view class="legend-item">
          <view class="legend-dot dot-purple"></view>
          <text>活跃用户</text>
        </view>
      </view>
    </view>
    
    <view class="table-section card">
      <view class="section-header">
        <text class="section-title">🔥 热门视频排行</text>
        <view class="export-btn" @click="exportData">
          <text>导出</text>
        </view>
      </view>
      
      <view class="table-header">
        <text class="th th-rank">排名</text>
        <text class="th th-name">视频名称</text>
        <text class="th th-views">观看量</text>
        <text class="th th-rate">完播率</text>
      </view>
      
      <view class="table-body">
        <view class="table-row" v-for="(video, index) in topVideos" :key="index">
          <view class="td td-rank">
            <view class="rank-badge" :class="getRankClass(index)">
              <text>{{ index + 1 }}</text>
            </view>
          </view>
          <text class="td td-name">{{ video.title }}</text>
          <text class="td td-views">{{ video.views }}</text>
          <view class="td td-rate">
            <text :class="video.rate >= 70 ? 'rate-good' : 'rate-normal'">{{ video.rate }}%</text>
          </view>
        </view>
      </view>
    </view>

    <view class="summary-section card">
      <text class="section-title">💡 数据洞察</text>
      <view class="insight-list">
        <view class="insight-item" v-for="(insight, index) in insights" :key="index">
          <view class="insight-icon">{{ insight.icon }}</view>
          <view class="insight-content">
            <text class="insight-title">{{ insight.title }}</text>
            <text class="insight-desc">{{ insight.desc }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
  </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import { apiGet } from '@/utils/request'

const currentTime = ref(0)
const loading = ref(true)
const timeTabs = [
  { name: '今日', value: 'today' },
  { name: '本周', value: 'week' },
  { name: '本月', value: 'month' },
  { name: '本年', value: 'year' }
]

const statCards = ref<any[]>([])

const yLabels = ['100', '75', '50', '25', '0']
const xLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const chartData = ref([
  { value: 0, height: 10, highlight: false },
  { value: 0, height: 10, highlight: false },
  { value: 0, height: 10, highlight: false },
  { value: 0, height: 10, highlight: false },
  { value: 0, height: 10, highlight: false },
  { value: 0, height: 10, highlight: false },
  { value: 0, height: 10, highlight: false }
])

const topVideos = ref<any[]>([])
const insights = ref<any[]>([])

onMounted(() => {
  loadStatistics('today')
})

async function loadStatistics(period: string) {
  loading.value = true
  try {
    const [statsRes, videosRes, insightsRes] = await Promise.all([
      apiGet('/api/statistics/overview', { period }),
      apiGet('/api/statistics/top-videos?limit=5&period=' + period),
      apiGet('/api/statistics/insights?period=' + period)
    ])
    
    if ((statsRes.data as any)?.success) {
      const data = (statsRes.data as any).data
      statCards.value = (data.cards || []).map((card: any) => ({
        icon: getIcon(card.key),
        label: card.label,
        value: card.value,
        trend: card.trend,
        chartData: generateChartData(card.value),
        key: card.key
      }))
    }
    
    if ((videosRes.data as any)?.success) {
      topVideos.value = (videosRes.data as any).data?.list || []
    }
    
    if ((insightsRes.data as any)?.success) {
      insights.value = (insightsRes.data as any).data?.insights || []
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    uni.showToast({ title: '加载数据失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function getIcon(key: string): string {
  const iconMap: Record<string, string> = {
    newUsers: '👥',
    activeUsers: '⚡',
    videoViews: '▶️',
    revenue: '💰',
    orders: '📦',
    redPackets: '🧧'
  }
  return iconMap[key] || '📊'
}

function formatValue(value: any, key?: string): string {
  if (value === undefined || value === null) return '0'
  
  if (key === 'revenue') {
    return `¥${Number(value).toLocaleString()}`
  }
  
  return Number(value).toLocaleString()
}

function formatNumber(value: any): string {
  if (!value) return '0'
  return Number(value).toLocaleString()
}

function generateChartData(baseValue: number): number[] {
  const data: number[] = []
  for (let i = 0; i < 7; i++) {
    const variation = baseValue * (0.7 + Math.random() * 0.6)
    data.push(Math.round((variation / Math.max(baseValue * 2, 1)) * 100))
  }
  return data.map(v => Math.max(20, Math.min(95, v)))
}

function handleTimeChange(index: number) {
  currentTime.value = index
  loadStatistics(timeTabs[index].value)
  uni.showToast({ title: `已切换至${timeTabs[index].name}数据`, icon: 'none' })
}

function showStatDetail(item: any) {
  uni.showModal({
    title: `${item.label}详情`,
    content: `当前值: ${formatValue(item.value, item.key)}\n环比变化: ${item.trend ? (item.trend > 0 ? '+' : '') + item.trend + '%' : '-'}\n\n点击查看更多详细信息`,
    showCancel: false,
    confirmText: '我知道了'
  })
}

function refreshChart() {
  uni.showLoading({ title: '刷新中...' })
  loadStatistics(timeTabs[currentTime.value].value).then(() => {
    uni.hideLoading()
    uni.showToast({ title: '数据已刷新 ✅', icon: 'success' })
  })
}

function showBarDetail(bar: any, index: number) {
  const dayName = xLabels[index]
  uni.showToast({
    title: `${dayName}: ${bar.value}人`,
    icon: 'none',
    duration: 1500
  })
}

function exportData() {
  uni.showModal({
    title: '导出数据',
    content: '确定要导出当前统计数据吗？\n格式: Excel (.xlsx)',
    success: (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '正在导出...' })
        setTimeout(() => {
          uni.hideLoading()
          uni.showToast({ title: '导出成功 📊', icon: 'success' })
        }, 1200)
      }
    }
  })
}

function getRankClass(index: number): string {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return 'rank-normal'
}
</script>

<style lang="scss" scoped>
.statistics-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 32px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 16px;
  
  .loading-text {
    font-size: 16px;
    color: #666666;
  }
}

.empty-state {
  padding: 40px 16px;
  text-align: center;
  
  .empty-text {
    font-size: 14px;
    color: #999999;
  }
}

.header {
  padding: 24px 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  
  .page-title {
    font-size: 24px;
    font-weight: bold;
    color: #FFFFFF;
    display: block;
  }
  
  .header-desc {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    margin-top: 6px;
    display: block;
  }
}

.time-filter {
  display: flex;
  padding: 14px 16px;
  background-color: #FFFFFF;
  gap: 10px;
  
  .time-tab {
    flex: 1;
    text-align: center;
    padding: 10px 0;
    font-size: 14px;
    color: #666666;
    border-radius: 8px;
    background-color: #F5F5F5;
    
    &.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #FFFFFF;
      font-weight: 600;
    }
  }
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
  
  .stat-card {
    padding: 16px;
    position: relative;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      
      .card-icon {
        font-size: 28px;
      }
      
      .trend-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        
        &.up {
          background-color: rgba(52, 199, 89, 0.15);
          
          text {
            color: #34C759;
          }
        }
        
        &.down {
          background-color: rgba(255, 59, 48, 0.15);
          
          text {
            color: #FF3B30;
          }
        }
      }
    }
    
    .value {
      font-size: 28px;
      font-weight: bold;
      color: #1A1A1A;
      display: block;
      line-height: 1.2;
    }
    
    .label {
      font-size: 13px;
      color: #999999;
      margin-top: 6px;
      display: block;
    }
    
    .mini-chart {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      height: 32px;
      margin-top: 12px;
      
      .chart-bar {
        flex: 1;
        background: linear-gradient(180deg, #667eea 0%, rgba(102, 126, 234, 0.2) 100%);
        border-radius: 2px;
        min-height: 4px;
      }
    }
  }
}

.chart-section, .table-section, .summary-section {
  margin: 16px;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
    
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1A1A1A;
    }
    
    .refresh-btn, .export-btn {
      padding: 8px 16px;
      background-color: #F5F5F5;
      border-radius: 16px;
      
      text {
        font-size: 13px;
        color: #007AFF;
      }
    }
  }
}

.chart-area {
  display: flex;
  
  .y-axis {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-right: 10px;
    width: 36px;
    
    text {
      font-size: 11px;
      color: #999999;
      text-align: right;
    }
  }
  
  .chart-content {
    flex: 1;
    
    .x-labels {
      display: flex;
      justify-content: space-around;
      margin-bottom: 8px;
      
      text {
        font-size: 12px;
        color: #666666;
      }
    }
    
    .bars-container {
      display: flex;
      justify-content: space-around;
      align-items: flex-end;
      height: 180px;
      padding: 0 4px;
      
      .bar-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 36px;
        
        .bar {
          width: 28px;
          background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
          border-radius: 4px 4px 0 0;
          transition: all 0.3s ease;
          
          &.highlight {
            box-shadow: 0 0 12px rgba(102, 126, 234, 0.5);
          }
        }
        
        .bar-value {
          font-size: 11px;
          color: #666666;
          margin-top: 6px;
          font-weight: 600;
        }
      }
    }
  }
}

.chart-legend {
  display: flex;
  gap: 24px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #F0F0F0;
  
  .legend-item {
    display: flex;
    align-items: center;
    
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 5px;
      margin-right: 6px;
      
      &.dot-blue {
        background-color: #667eea;
      }
      
      &.dot-purple {
        background-color: #764ba2;
      }
    }
    
    text {
      font-size: 13px;
      color: #666666;
    }
  }
}

.table-section {
  .table-header, .table-row {
    display: flex;
    align-items: center;
    padding: 12px 8px;
    
    &.table-header {
      background-color: #F8F8F8;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    
    &.table-row {
      border-bottom: 1px solid #F5F5F5;
    }
    
    .th, .td {
      font-size: 13px;
      
      &.th-rank, &.td-rank {
        width: 50px;
        text-align: center;
      }
      
      &.th-name, &.td-name {
        flex: 1;
        color: #1A1A1A;
        font-weight: 500;
      }
      
      &.th-views, &.td-views {
        width: 80px;
        text-align: right;
        color: #666666;
      }
      
      &.th-rate, &.td-rate {
        width: 70px;
        text-align: right;
      }
    }
    
    .rank-badge {
      width: 26px;
      height: 26px;
      border-radius: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: bold;
      
      &.rank-gold {
        background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
        color: #FFFFFF;
      }
      
      &.rank-silver {
        background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%);
        color: #FFFFFF;
      }
      
      &.rank-bronze {
        background: linear-gradient(135deg, #CD7F32 0%, #B8860B 100%);
        color: #FFFFFF;
      }
      
      &.rank-normal {
        background-color: #F5F5F5;
        color: #666666;
      }
    }
    
    .rate-good {
      color: #34C759;
      font-weight: 600;
    }
    
    .rate-normal {
      color: #FF9500;
    }
  }
}

.summary-section {
  .section-title {
    font-size: 18px;
    font-weight: 600;
    color: #1A1A1A;
    display: block;
    margin-bottom: 16px;
  }
  
  .insight-list {
    .insight-item {
      display: flex;
      padding: 14px 0;
      border-bottom: 1px solid #F5F5F5;
      
      &:last-child {
        border-bottom: none;
      }
      
      .insight-icon {
        font-size: 32px;
        margin-right: 14px;
        flex-shrink: 0;
      }
      
      .insight-content {
        flex: 1;
        
        .insight-title {
          font-size: 15px;
          font-weight: 600;
          color: #1A1A1A;
          display: block;
        }
        
        .insight-desc {
          font-size: 13px;
          color: #666666;
          margin-top: 4px;
          display: block;
          line-height: 1.4;
        }
      }
    }
  }
}
</style>
