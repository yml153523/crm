<template>
  <view class="stats-panel" :class="{ [variant]: true }">
    <view 
      class="stat-card" 
      v-for="(stat, index) in stats" 
      :key="index"
      :style="{ borderColor: stat.color }"
    >
      <text class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</text>
      <text class="stat-label">{{ stat.label }}</text>
      <text 
        class="stat-trend" 
        :class="stat.trend > 0 ? 'up' : 'down'" 
        v-if="stat.trend !== undefined"
      >
        {{ stat.trend > 0 ? '↑' : '↓' }} {{ Math.abs(stat.trend) }}%
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
interface StatItem {
  value: string | number
  label: string
  color?: string
  trend?: number
}

interface Props {
  stats: StatItem[]
  variant?: 'default' | 'compact'
}

withDefaults(defineProps<Props>(), {
  variant: 'default'
})
</script>

<style lang="scss" scoped>
.stats-panel {
  display: flex;
  gap: 12px;
  padding: 16px;
  
  &.compact {
    .stat-card {
      padding: 10px;
      
      .stat-value { font-size: 18px; }
      .stat-label { font-size: 11px; }
    }
  }
}

.stat-card {
  flex: 1;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 14px;
  border-left: 4px solid #007AFF;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  .stat-value {
    font-size: 24px;
    font-weight: bold;
    color: #333333;
  }
  
  .stat-label {
    font-size: 13px;
    color: #666666;
  }
  
  .stat-trend {
    font-size: 12px;
    
    &.up { color: #34C759; }
    &.down { color: #FF3B30; }
  }
}
</style>
