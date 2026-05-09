<!--
  通用加载状态组件
  支持多种样式：spinner、dots、pulse
-->
<template>
  <view class="loading-container" :class="[`loading-${size}`, { 'loading-inline': inline }]">
    <!-- Spinner 样式 -->
    <view v-if="type === 'spinner'" class="spinner-wrapper">
      <view class="spinner"></view>
      <text v-if="text" class="loading-text">{{ text }}</text>
    </view>

    <!-- Dots 样式 -->
    <view v-else-if="type === 'dots'" class="dots-wrapper">
      <view class="dot" v-for="i in 3" :key="i" :style="{ animationDelay: (i - 1) * 0.2 + 's' }"></view>
      <text v-if="text" class="loading-text">{{ text }}</text>
    </view>

    <!-- Pulse 样式 -->
    <view v-else-if="type === 'pulse'" class="pulse-wrapper">
      <view class="pulse-ring"></view>
      <view class="pulse-core"></view>
      <text v-if="text" class="loading-text">{{ text }}</text>
    </view>

    <!-- 骨架屏 -->
    <view v-else-if="type === 'skeleton'" class="skeleton-wrapper">
      <view 
        v-for="i in count" 
        :key="i" 
        class="skeleton-item"
        :style="{ width: width, height: height, borderRadius: radius }"
      ></view>
    </view>
  </view>
</template>

<script setup lang="ts">
interface Props {
  type?: 'spinner' | 'dots' | 'pulse' | 'skeleton'
  size?: 'sm' | 'md' | 'lg'
  text?: string
  inline?: boolean
  count?: number
  width?: string
  height?: string
  radius?: string
}

withDefaults(defineProps<Props>(), {
  type: 'spinner',
  size: 'md',
  inline: false,
  count: 3,
  width: '100%',
  height: '20px',
  radius: '8px'
})
</script>

<style scoped lang="scss">
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;

  &.loading-inline {
    padding: 10px;
    display: inline-flex;
  }
}

// Spinner
.spinner-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spinner {
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-sm .spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
}

.loading-md .spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
}

.loading-lg .spinner {
  width: 36px;
  height: 36px;
  border: 4px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// Dots
.dots-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #667eea;
  animation: bounce 1.4s ease-in-out infinite both;
}

.loading-sm .dot {
  width: 6px;
  height: 6px;
}

.loading-lg .dot {
  width: 10px;
  height: 10px;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

// Pulse
.pulse-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-sm .pulse-ring,
.loading-sm .pulse-core {
  width: 20px;
  height: 20px;
}

.loading-md .pulse-ring,
.loading-md .pulse-core {
  width: 30px;
  height: 30px;
}

.loading-lg .pulse-ring,
.loading-lg .pulse-core {
  width: 50px;
  height: 50px;
}

.pulse-ring {
  position: absolute;
  border-radius: 50%;
  background: rgba(102, 126, 234, 0.3);
  animation: pulse 1.5s ease-out infinite;
}

.pulse-core {
  position: relative;
  border-radius: 50%;
  background: #667eea;
}

@keyframes pulse {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

// 骨架屏
.skeleton-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.skeleton-item {
  background: linear-gradient(90deg, 
    #f0f0f0 25%, 
    #e0e0e0 50%, 
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.loading-text {
  font-size: 14px;
  color: #999;
  margin-top: 8px;
}
</style>
