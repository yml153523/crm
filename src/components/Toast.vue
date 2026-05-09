<!--
  Toast 提示组件
  支持类型：success、error、warning、info、loading
-->
<template>
  <view v-if="visible" class="toast-wrapper" :class="[`toast-${type}`]">
    <view class="toast-content">
      <!-- Loading -->
      <view v-if="type === 'loading'" class="toast-loading">
        <view class="loading-spinner"></view>
      </view>
      
      <!-- Icon -->
      <text v-else class="toast-icon">{{ toastIcon }}</text>
      
      <!-- Message -->
      <text class="toast-message">{{ message }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

const visible = ref(false)
const message = ref('')
const type = ref<ToastType>('info')
let timer: number | null = null

const toastIcon = computed(() => {
  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
    loading: ''
  }
  return icons[type.value]
})

function show(msg: string, toastType: ToastType = 'info', duration: number = 2000) {
  // 清除之前的定时器
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  
  message.value = msg
  type.value = toastType
  visible.value = true
  
  // 自动隐藏
  if (toastType !== 'loading') {
    timer = setTimeout(() => {
      hide()
    }, duration) as unknown as number
  }
}

function hide() {
  visible.value = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

// 导出方法供外部调用
defineExpose({
  show,
  hide
})
</script>

<style scoped lang="scss">
.toast-wrapper {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  animation: toastIn 0.3s ease;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.toast-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 32px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  min-width: 200px;
  max-width: 300px;
}

.toast-icon {
  font-size: 36px;
  font-weight: bold;
}

.toast-loading {
  .loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.toast-message {
  font-size: 15px;
  color: #fff;
  text-align: center;
  line-height: 1.5;
}

// 类型样式
.toast-success {
  .toast-icon { color: #34C759; }
}

.toast-error {
  .toast-icon { color: #FF3B30; }
}

.toast-warning {
  .toast-icon { color: #FF9500; }
}

.toast-info {
  .toast-icon { color: #007AFF; }
}
</style>
