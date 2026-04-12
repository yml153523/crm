<template>
  <view class="member-page">
    <view class="search-bar">
      <u-search v-model="keyword" placeholder="搜索会员" @search="handleSearch"></u-search>
    </view>
    
    <view class="member-list">
      <view class="member-card card" v-for="(item, index) in memberList" :key="index">
        <view class="member-info">
          <text class="member-name">{{ item.name }}</text>
          <text class="member-phone">{{ item.phone }}</text>
        </view>
        <view class="member-actions">
          <u-button type="primary" size="mini">详情</u-button>
        </view>
      </view>
      
      <u-empty v-if="!memberList.length && !loading" text="暂无会员数据"></u-empty>
      <u-loadmore v-if="memberList.length" :status="loadStatus"></u-loadmore>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const keyword = ref('')
const loading = ref(false)
const loadStatus = ref('loadmore')
const memberList = ref<any[]>([])

function handleSearch() {
  console.log('搜索:', keyword.value)
}
</script>

<style lang="scss" scoped>
.member-page {
  min-height: 100vh;
  background-color: #F5F5F5;
}

.search-bar {
  padding: 16rpx;
  background: #FFFFFF;
}

.member-list {
  padding: 16rpx;
  
  .member-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .member-info {
      .member-name {
        font-size: 30rpx;
        font-weight: 600;
        color: #1A1A1A;
        display: block;
      }
      
      .member-phone {
        font-size: 26rpx;
        color: #666666;
        margin-top: 4rpx;
        display: block;
      }
    }
  }
}
</style>
