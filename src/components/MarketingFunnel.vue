<template>
  <view class="marketing-funnel">
    <!-- 标题栏 -->
    <view class="funnel-header">
      <text class="header-title">🎯 营销转化漏斗</text>
      <view class="time-range-selector">
        <view
          class="range-chip"
          :class="{ active: timeRange === range }"
          v-for="range in timeRanges"
          :key="range"
          @tap="timeRange = range; loadData()"
        >
          {{ getRangeLabel(range) }}
        </view>
      </view>
    </view>

    <!-- 核心漏斗图 -->
    <view class="funnel-container">
      <view
        class="funnel-stage"
        v-for="(stage, index) in funnelData"
        :key="stage.name"
        :style="{ width: getStageWidth(index) }"
        :class="{ 'stage-highlight': index === highlightedStage }"
        @tap="highlightedStage = index"
      >
        <!-- 阶段标签 -->
        <view class="stage-label">
          <text class="stage-icon">{{ stage.icon }}</text>
          <text class="stage-name">{{ stage.name }}</text>
        </view>

        <!-- 数据展示 -->
        <view class="stage-data">
          <text class="stage-value">{{ formatNumber(stage.value) }}</text>
          <text class="stage-unit">{{ stage.unit }}</text>
        </view>

        <!-- 转化率 -->
        <view class="conversion-rate" v-if="index > 0">
          <text class="rate-label">转化</text>
          <text class="rate-value" :class="getRateClass(stage.conversion)">
            {{ stage.conversion }}%
          </text>
        </view>

        <!-- 阶间连接线 -->
        <view class="connector" v-if="index < funnelData.length - 1">
          <text class="connector-arrow">↓</text>
          <text class="connector-rate">-{{ getDropRate(index) }}%</text>
        </view>
      </view>
    </view>

    <!-- 关键指标卡片 -->
    <view class="metrics-grid">
      <view class="metric-card" v-for="(metric, idx) in keyMetrics" :key="idx">
        <text class="metric-icon">{{ metric.icon }}</text>
        <text class="metric-value" :style="{ color: metric.color }">{{ metric.value }}</text>
        <text class="metric-label">{{ metric.label }}</text>
        <view class="metric-trend" :class="metric.trend > 0 ? 'up' : 'down'">
          <text>{{ metric.trend > 0 ? '↑' : '↓' }} {{ Math.abs(metric.trend) }}%</text>
        </view>
      </view>
    </view>

    <!-- 转化趋势图 (简化版) -->
    <view class="trend-section">
      <text class="section-title">📈 近7天转化趋势</text>
      <view class="trend-chart">
        <view class="chart-bars">
          <view
            class="bar-wrapper"
            v-for="(day, idx) in weeklyTrend"
            :key="idx"
          >
            <view
              class="bar"
              :style="{ height: getBarHeight(day.value) + '%' }"
              :class="{ 'bar-good': day.value >= averageConversion }"
            ></view>
            <text class="bar-label">{{ day.label }}</text>
            <text class="bar-value">{{ day.value }}%</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Top表现列表 -->
    <view class="top-performers">
      <text class="section-title">🏆 最佳表现内容</text>

      <view class="performer-list">
        <view class="performer-item" v-for="(item, idx) in topVideos" :key="idx">
          <view class="rank" :class="'rank-' + (idx + 1)">
            <text>{{ idx + 1 }}</text>
          </view>
          <view class="performer-info">
            <text class="performer-name">{{ item.title }}</text>
            <text class="performer-meta">{{ item.views }}次观看 · {{ item.conversion }}%转化</text>
          </view>
          <view class="performer-score">
            <text class="score-value">{{ item.revenue }}</text>
            <text class="score-label">收入</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 优化建议 -->
    <view class="suggestions" v-if="suggestions.length">
      <text class="section-title">💡 智能优化建议</text>
      <view class="suggestion-list">
        <view class="suggestion-item" v-for="(sug, idx) in suggestions" :key="idx">
          <view class="suggestion-icon" :class="'priority-' + sug.priority">
            <text>{{ sug.priority === 'high' ? '🔴' : sug.priority === 'medium' ? '🟡' : '🟢' }}</text>
          </view>
          <view class="suggestion-content">
            <text class="suggestion-title">{{ sug.title }}</text>
            <text class="suggestion-desc">{{ sug.description }}</text>
          </view>
          <view class="suggestion-action" @tap="applySuggestion(sug)">
            <text>应用</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 时间范围选项
const timeRanges = ['today', 'week', 'month']
const timeRange = ref('week')
const highlightedStage = ref(-1)

// 漏斗数据 (模拟数据，实际应从API获取)
const funnelData = ref([
  {
    name: '视频观看',
    icon: '▶️',
    value: 12580,
    unit: '人次',
    conversion: 0,
    color: '#5856D6'
  },
  {
    name: '课程报名',
    icon: '📚',
    value: 1856,
    unit: '人',
    conversion: 14.8,
    color: '#007AFF'
  },
  {
    name: '商品浏览',
    icon: '🛒',
    value: 942,
    unit: '人次',
    conversion: 50.8,
    color: '#FF9500'
  },
  {
    name: '订单成交',
    icon: '💰',
    value: 287,
    unit: '单',
    conversion: 30.5,
    color: '#34C759'
  }
])

// 关键指标
const keyMetrics = ref([
  { icon: '📊', label: '整体转化率', value: '2.3%', color: '#007AFF', trend: 12 },
  { icon: '💵', label: '平均客单价', value: '¥328', color: '#34C759', trend: 8 },
  { icon: '⏱️', label: '平均决策时长', value: '2.5h', color: '#FF9500', trend: -15 },
  { icon: '🔄', label: '复购率', value: '23%', color: '#5856D6', trend: 5 }
])

// 周趋势数据
const weeklyTrend = ref([
  { label: '周一', value: 1.8 },
  { label: '周二', value: 2.1 },
  { label: '周三', value: 1.9 },
  { label: '周四', value: 2.4 },
  { label: '周五', value: 2.8 },
  { label: '周六', value: 3.2 },
  { label: '周日', value: 2.6 }
])

// Top表现视频
const topVideos = ref([
  { title: '维生素C的功效与选择指南', views: 3580, conversion: 4.2, revenue: '¥12,680' },
  { title: '蛋白粉正确冲泡教程', views: 2240, conversion: 3.8, revenue: '¥8,920' },
  { title: '瑜伽基础入门-第一课', views: 1890, conversion: 5.1, revenue: '¥7,560' }
])

// 优化建议
const suggestions = ref([
  {
    priority: 'high',
    title: '提升"商品浏览→订单"转化率',
    description: '当前仅30.5%，建议添加限时优惠或用户评价展示',
    action: 'add_urgency'
  },
  {
    priority: 'medium',
    title: '优化视频→课程报名路径',
    description: '14.8%的观看者转化为学员，可在视频结尾添加课程推荐卡片',
    action: 'add_cta'
  },
  {
    priority: 'low',
    title: '周末流量利用不足',
    description: '周末转化率高但流量低，可增加周末专属活动',
    action: 'weekend_promo'
  }
])

// 计算属性
const averageConversion = computed(() => {
  const sum = weeklyTrend.value.reduce((acc, day) => acc + day.value, 0)
  return (sum / weeklyTrend.value.length).toFixed(1)
})

onMounted(() => {
  loadData()
})

async function loadData() {
  // TODO: 从API获取实际数据
  console.log('加载漏斗数据:', timeRange.value)
}

function getRangeLabel(range: string): string {
  const map: Record<string, string> = {
    today: '今日',
    week: '本周',
    month: '本月'
  }
  return map[range] || range
}

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toString()
}

function getStageWidth(index: number): string {
  // 漏斗宽度递减效果 (100% -> 70% -> 50% -> 35%)
  const widths = ['100%', '72%', '52%', '36%']
  return widths[index] || '100%'
}

function getRateClass(rate: number): string {
  if (rate >= 40) return 'rate-excellent'
  if (rate >= 20) return 'rate-good'
  if (rate >= 10) return 'rate-normal'
  return 'rate-poor'
}

function getDropRate(currentIndex: number): number {
  if (currentIndex === 0) return 0
  const current = funnelData.value[currentIndex].value
  const previous = funnelData.value[currentIndex - 1].value
  return Math.round((1 - current / previous) * 100)
}

function getBarHeight(value: number): number {
  const maxVal = Math.max(...weeklyTrend.value.map(d => d.value))
  return (value / maxVal) * 100
}

function applySuggestion(suggestion: any) {
  uni.showModal({
    title: suggestion.title,
    content: `${suggestion.description}\n\n是否跳转到相关设置页面？`,
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '即将跳转...', icon: 'none' })
        // TODO: 根据suggestion.action类型跳转到对应页面
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.marketing-funnel {
  padding: 16px;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

/* 标题栏 */
.funnel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;

  .header-title {
    font-size: 20px;
    font-weight: bold;
    color: #1A1A1A;
  }

  .time-range-selector {
    display: flex;
    gap: 8px;

    .range-chip {
      padding: 6px 14px;
      background: #F5F5F5;
      border-radius: 16px;
      font-size: 13px;
      color: #666666;
      transition: all 0.3s ease;

      &.active {
        background: linear-gradient(135deg, #007AFF, #5856D6);
        color: #FFFFFF;
        font-weight: 600;
      }

      &:active {
        transform: scale(0.95);
      }
    }
  }
}

/* 漏斗容器 */
.funnel-container {
  position: relative;
  padding: 20px 10px;
  margin-bottom: 24px;
  min-height: 300px;
}

/* 单个阶段 */
.funnel-stage {
  margin: 0 auto 16px;
  padding: 18px 20px;
  border-radius: 12px;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0.08;
    background: currentColor;
  }

  &:active {
    transform: scale(0.98);
  }

  &.stage-highlight {
    animation: pulse-stage 0.6s ease-out;
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.3);
  }

  .stage-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-bottom: 8px;

    .stage-icon {
      font-size: 20px;
    }

    .stage-name {
      font-size: 15px;
      font-weight: 600;
      color: #FFFFFF;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
  }

  .stage-data {
    margin-bottom: 6px;

    .stage-value {
      font-size: 32px;
      font-weight: bold;
      color: #FFFFFF;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }

    .stage-unit {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.85);
      margin-left: 4px;
    }
  }

  .conversion-rate {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 12px;

    .rate-label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.9);
    }

    .rate-value {
      font-size: 14px;
      font-weight: bold;
      color: #FFFFFF;

      &.rate-excellent { color: #A8FF78; }
      &.rate-good { color: #FFFFFF; }
      &.rate-normal { color: #FFE066; }
      &.rate-poor { color: #FF6B6B; }
    }
  }

  /* 连接线 */
  .connector {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin-top: 8px;
    color: rgba(255, 255, 255, 0.7);

    .connector-arrow {
      font-size: 16px;
    }

    .connector-rate {
      font-size: 11px;
      font-weight: 600;
    }
  }
}

/* 各阶段的背景色 */
.funnel-stage:nth-child(1) { background: linear-gradient(135deg, #5856D6, #AF52DE); }
.funnel-stage:nth-child(2) { background: linear-gradient(135deg, #007AFF, #5AC8FA); }
.funnel-stage:nth-child(3) { background: linear-gradient(135deg, #FF9500, #FFCC00); }
.funnel-stage:nth-child(4) { background: linear-gradient(135deg, #34C759, #30D158); }

@keyframes pulse-stage {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

/* 关键指标网格 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.metric-card {
  background: #F8F9FA;
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.96);
  }

  .metric-icon {
    font-size: 20px;
    display: block;
    margin-bottom: 6px;
  }

  .metric-value {
    font-size: 18px;
    font-weight: bold;
    color: #1A1A1A;
    display: block;
    margin-bottom: 2px;
  }

  .metric-label {
    font-size: 11px;
    color: #999999;
    display: block;
    margin-bottom: 4px;
  }

  .metric-trend {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;

    &.up {
      background: rgba(52, 199, 89, 0.15);
      color: #34C759;
    }

    &.down {
      background: rgba(255, 59, 48, 0.15);
      color: #FF3B30;
    }
  }
}

/* 趋势图表 */
.trend-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #1A1A1A;
  display: block;
  margin-bottom: 12px;
}

.trend-chart {
  background: #FAFAFA;
  border-radius: 12px;
  padding: 16px;

  .chart-bars {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    height: 120px;
    gap: 8px;
  }

  .bar-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    justify-content: flex-end;

    .bar {
      width: 24px;
      min-height: 8px;
      background: linear-gradient(to top, #007AFF, #5AC8FA);
      border-radius: 4px 4px 0 0;
      transition: height 0.5s ease-out;

      &.bar-good {
        background: linear-gradient(to top, #34C759, #30D158);
      }
    }

    .bar-label {
      font-size: 10px;
      color: #999999;
      margin-top: 6px;
    }

    .bar-value {
      font-size: 10px;
      font-weight: 600;
      color: #666666;
      margin-top: 2px;
    }
  }
}

/* Top表现列表 */
.top-performers {
  margin-bottom: 24px;
}

.performer-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.performer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #FAFAFA;
  border-radius: 10px;
  transition: background 0.2s ease;

  &:active {
    background: #F0F0F0;
  }

  .rank {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    color: #FFFFFF;
    flex-shrink: 0;

    &.rank-1 { background: linear-gradient(135deg, #FFD700, #FFA500); }
    &.rank-2 { background: linear-gradient(135deg, #C0C0C0, #A0A0A0); }
    &.rank-3 { background: linear-gradient(135deg, #CD7F32, #B87333); }
  }

  .performer-info {
    flex: 1;
    min-width: 0;

    .performer-name {
      font-size: 14px;
      font-weight: 500;
      color: #1A1A1A;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .performer-meta {
      font-size: 12px;
      color: #999999;
      display: block;
      margin-top: 2px;
    }
  }

  .performer-score {
    text-align: right;
    flex-shrink: 0;

    .score-value {
      font-size: 15px;
      font-weight: bold;
      color: #34C759;
      display: block;
    }

    .score-label {
      font-size: 10px;
      color: #999999;
    }
  }
}

/* 优化建议 */
.suggestions {
  .suggestion-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .suggestion-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    background: #FAFAFA;
    border-radius: 10px;
    border-left: 3px solid transparent;

    .suggestion-icon {
      font-size: 16px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .suggestion-content {
      flex: 1;

      .suggestion-title {
        font-size: 14px;
        font-weight: 600;
        color: #1A1A1A;
        display: block;
        margin-bottom: 4px;
      }

      .suggestion-desc {
        font-size: 12px;
        color: #666666;
        line-height: 1.4;
      }
    }

    .suggestion-action {
      padding: 6px 14px;
      background: #007AFF;
      border-radius: 14px;
      font-size: 12px;
      color: #FFFFFF;
      font-weight: 500;
      white-space: nowrap;
      flex-shrink: 0;

      &:active {
        opacity: 0.8;
      }
    }

    &.priority-high { border-left-color: #FF3B30; }
    &.priority-medium { border-left-color: #FF9500; }
    &.priority-low { border-left-color: #34C759; }
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .funnel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .time-range-selector {
    justify-content: center;
  }

  .trend-chart .chart-bars {
    gap: 4px;
  }

  .trend-chart .bar-wrapper .bar {
    width: 20px;
  }
}
</style>
