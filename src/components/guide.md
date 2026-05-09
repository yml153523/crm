/**
 * UI 组件使用指南
 * 展示如何使用新创建的 UI 组件
 */

// ========== LoadingState 组件 ==========

import LoadingState from '@/components/LoadingState.vue'

// 基础使用
<LoadingState />

// 自定义文本
<LoadingState text="加载中..." />

// 样式类型
<LoadingState type="spinner" />     // 默认旋转器
<LoadingState type="dots" />        // 跳动圆点
<LoadingState type="pulse" />       // 脉冲效果
<LoadingState type="skeleton" />     // 骨架屏

// 尺寸
<LoadingState size="sm" />   // 小
<LoadingState size="md" />   // 中等
<LoadingState size="lg" />   // 大

// 骨架屏自定义
<LoadingState 
  type="skeleton"
  count="5"
  width="100%"
  height="20px"
  radius="8px"
/>

// 内联模式
<LoadingState type="dots" :inline="true" />

// ========== EmptyState 组件 ==========

import EmptyState from '@/components/EmptyState.vue'

// 基础使用
<EmptyState />

// 自定义内容
<EmptyState 
  icon="📚"
  title="暂无课程"
  description="还没有购买任何课程，快去选购吧"
  buttonText="去选购"
  @click="goShop"
/>

// 无按钮
<EmptyState 
  icon="🛒"
  title="购物车是空的"
  description="快去添加喜欢的商品吧"
/>

// 事件处理
function handleEmptyClick() {
  console.log('点击了空状态按钮')
}

// ========== Toast 组件 ==========

import Toast from '@/components/Toast.vue'

// 注册
components: {
  Toast
}

// 使用
<template>
  <view>
    <!-- 其他内容 -->
    <Toast ref="toast" />
  </view>
</template>

// 调用方式
this.$refs.toast.show('操作成功', 'success')
this.$refs.toast.show('加载中...', 'loading')
this.$refs.toast.show('出错了', 'error')

// 或通过组合式 API
const toast = ref(null)
toast.value?.show('消息', 'info', 3000)

// ========== 组合使用示例 ==========

<template>
  <view class="page">
    <!-- 加载状态 -->
    <LoadingState 
      v-if="loading"
      type="spinner"
      text="加载中..."
    />

    <!-- 空状态 -->
    <EmptyState 
      v-else-if="list.length === 0"
      icon="📭"
      title="暂无数据"
      description="暂时没有内容"
      buttonText="刷新"
      @click="refresh"
    />

    <!-- 内容列表 -->
    <view v-else class="list">
      <!-- 列表项 -->
    </view>
    
    <!-- Toast -->
    <Toast ref="toast" />
  </view>
</template>

<script setup lang="ts">
const toast = ref(null)

async function refresh() {
  try {
    toast.value?.show('正在刷新...', 'loading')
    await fetchData()
    toast.value?.hide()
    toast.value?.show('刷新成功', 'success')
  } catch (error) {
    toast.value?.show('刷新失败', 'error')
  }
}
</script>

// ========== 在登录页面的使用示例 ==========

<template>
  <view class="login-page">
    <!-- 表单 -->
    <view class="login-form">
      <!-- 输入框 -->
    </view>

    <!-- Toast -->
    <Toast ref="toast" />
  </view>
</template>

<script setup lang="ts">
const toast = ref(null)

async function handleLogin() {
  if (!phone.value) {
    toast.value?.show('请输入手机号', 'warning')
    return
  }

  try {
    toast.value?.show('登录中...', 'loading')
    await login(phone.value)
    toast.value?.hide()
    toast.value?.show('登录成功', 'success')
  } catch (error) {
    toast.value?.show(error.message, 'error')
  }
}
</script>
