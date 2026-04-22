<template>
  <view class="ab-test-page">
    <ABTestPanel />
  </view>
</template>

<script setup lang="ts">
import ABTestPanel from '@/components/ABTestPanel.vue'
</script>

<style scoped>
.ab-test-page {
  background: #F5F5F5;
  min-height: 100vh;
}
</style>
