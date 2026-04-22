<template>
  <view class="empty-state">
    <text class="empty-icon">{{ icon }}</text>
    <text class="empty-title">{{ title }}</text>
    <text class="empty-description">{{ description }}</text>
    <view class="empty-action" v-if="$slots.action">
      <slot name="action"></slot>
    </view>
  </view>
</template>

<script setup lang="ts">
interface Props {
  icon?: string
  title?: string
  description?: string
}

withDefaults(defineProps<Props>(), {
  icon: '📭',
  title: '暂无数据',
  description: '还没有相关内容'
})
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  
  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.6;
  }
  
  .empty-title {
    font-size: 17px;
    font-weight: 600;
    color: #333333;
    margin-bottom: 8px;
  }
  
  .empty-description {
    font-size: 14px;
    color: #999999;
    text-align: center;
    line-height: 1.5;
    max-width: 280px;
  }
  
  .empty-action {
    margin-top: 24px;
  }
}
</style>
