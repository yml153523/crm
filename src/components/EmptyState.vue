<!--
  通用空状态组件
  支持自定义图标、文字、按钮
-->
<template>
  <view class="empty-container">
    <view class="empty-content">
      <!-- 图标 -->
      <view class="empty-icon-wrapper">
        <text class="empty-icon">{{ icon }}</text>
        <view class="empty-icon-bg"></view>
      </view>

      <!-- 标题 -->
      <text class="empty-title">{{ title }}</text>

      <!-- 描述 -->
      <text v-if="description" class="empty-description">{{ description }}</text>

      <!-- 按钮 -->
      <button 
        v-if="buttonText" 
        class="empty-button"
        @click="handleClick"
      >
        {{ buttonText }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
interface Props {
  icon?: string
  title?: string
  description?: string
  buttonText?: string
}

const props = withDefaults(defineProps<Props>(), {
  icon: '📭',
  title: '暂无数据',
  description: '',
  buttonText: ''
})

const emit = defineEmits<{
  click: []
}>()

function handleClick() {
  emit('click')
}
</script>

<style scoped lang="scss">
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  min-height: 300px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 300px;
}

.empty-icon-wrapper {
  position: relative;
  margin-bottom: 24px;
}

.empty-icon {
  font-size: 64px;
  position: relative;
  z-index: 1;
}

.empty-icon-bg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border-radius: 50%;
  z-index: 0;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  color: #999;
  line-height: 1.6;
  margin-bottom: 24px;
}

.empty-button {
  min-width: 120px;
  height: 44px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;

  &:active {
    transform: translateY(2px);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  }
}
</style>
