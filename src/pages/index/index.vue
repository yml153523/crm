<template>
  <view class="index-page">
    <view class="welcome-section">
      <text class="title">欢迎使用 CRM 系统</text>
      <text class="subtitle">客户关系管理平台</text>
    </view>
    
    <view class="action-cards">
      <view class="card user-card" @click="goToUserLogin">
        <u-icon name="account" size="60" color="#007AFF"></u-icon>
        <text class="label">用户端</text>
        <text class="desc">会员/课程/视频</text>
      </view>
      
      <view class="card admin-card" @click="goToAdminLogin">
        <u-icon name="setting" size="60" color="#1A1A2E"></u-icon>
        <text class="label">管理后台</text>
        <text class="desc">数据统计/管理</text>
      </view>
    </view>
    
    <view class="info-section card">
      <text class="section-title">系统信息</text>
      <view class="info-list">
        <view class="info-item">
          <text class="label">版本：</text>
          <text class="value">v1.0.0</text>
        </view>
        <view class="info-item">
          <text class="label">技术栈：</text>
          <text class="value">UniApp + Vue3</text>
        </view>
        <view class="info-item">
          <text class="label">平台支持：</text>
          <text class="value">小程序 / APP / H5</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
function goToUserLogin() {
  uni.navigateTo({ url: '/pages/login/index' })
}

function goToAdminLogin() {
  uni.navigateTo({ url: '/pages/admin/login' })
}
</script>

<style lang="scss" scoped>
.index-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0 32rpx;
}

.welcome-section {
  text-align: center;
  padding-top: 120rpx;
  
  .title {
    font-size: 48rpx;
    font-weight: bold;
    color: #FFFFFF;
    display: block;
    margin-bottom: 16rpx;
  }
  
  .subtitle {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}

.action-cards {
  display: flex;
  gap: 24rpx;
  margin-top: 80rpx;
  
  .card {
    flex: 1;
    background: #FFFFFF;
    border-radius: 20rpx;
    padding: 40rpx 20rpx;
    text-align: center;
    
    .label {
      font-size: 32rpx;
      font-weight: 600;
      color: #1A1A1A;
      display: block;
      margin-top: 20rpx;
    }
    
    .desc {
      font-size: 24rpx;
      color: #666666;
      margin-top: 8rpx;
      display: block;
    }
  }
}

.info-section {
  margin-top: 40rpx;
  
  .section-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #1A1A1A;
    display: block;
    margin-bottom: 20rpx;
  }
  
  .info-list {
    .info-item {
      display: flex;
      padding: 12rpx 0;
      
      .label {
        font-size: 26rpx;
        color: #666666;
        width: 160rpx;
      }
      
      .value {
        font-size: 26rpx;
        color: #1A1A1A;
        flex: 1;
      }
    }
  }
}
</style>
