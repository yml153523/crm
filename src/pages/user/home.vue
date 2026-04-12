<template>
  <view class="home-page">
    <!-- 顶部用户信息 -->
    <view class="header">
      <view class="user-info">
        <view class="avatar" @click="goLogin" v-if="!isLoggedIn">
          <text class="avatar-text">未登录</text>
        </view>
        <image 
          v-else
          :src="userInfo?.avatar || '/static/images/default-avatar.png'" 
          mode="aspectFill"
          class="avatar-img"
        />
        
        <view class="user-detail">
          <text class="user-name" v-if="isLoggedIn">{{ userInfo?.name || '用户' }}</text>
          <text class="user-name" v-else @click="goLogin">点击登录</text>
          
          <text class="balance">余额: ¥{{ balance }}</text>
        </view>

        <view class="action-btn" @click="showMenu = !showMenu" v-if="isLoggedIn">
          <text>☰</text>
        </view>
      </view>
    </view>

    <!-- Banner 轮播 -->
    <view class="banner-section">
      <swiper 
        class="banner-swiper" 
        :indicator-dots="true" 
        :autoplay="true" 
        :interval="3000"
        :circular="true"
      >
        <swiper-item v-for="(item, index) in banners" :key="index">
          <view class="banner-item" :style="{ background: item.bg }">
            <text class="banner-title">{{ item.title }}</text>
            <text class="banner-desc">{{ item.desc }}</text>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <!-- 快捷菜单 -->
    <view class="menu-section card">
      <view 
        class="menu-item" 
        v-for="(item, index) in menuList" 
        :key="index"
        @click="navigateTo(item.path)"
      >
        <view class="menu-icon" :style="{ background: item.color }">
          <text>{{ item.icon }}</text>
        </view>
        <view class="menu-content">
          <text class="menu-label">{{ item.label }}</text>
          <text class="menu-desc">{{ item.desc }}</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>

    <!-- 推荐课程 -->
    <view class="course-section">
      <view class="section-header">
        <text class="section-title">推荐课程</text>
        <text class="more-link" @click="goVideoList">更多 ›</text>
      </view>
      
      <scroll-view scroll-x class="course-scroll">
        <view class="course-list">
          <view 
            class="course-card" 
            v-for="(course, index) in courseList" 
            :key="index"
            @click="playVideo(course)"
          >
            <view class="course-cover" :style="{ background: course.cover }">
              <text class="play-icon">▶</text>
            </view>
            <view class="course-info">
              <text class="course-title">{{ course.title }}</text>
              <view class="course-meta">
                <text>{{ course.views }}次观看</text>
                <text class="tag">{{ course.tag }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部提示 -->
    <view class="footer-tips">
      <text>CRM 系统 © 2024 | 客户关系管理平台</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const isLoggedIn = ref(false)
const userInfo = ref<any>(null)
const balance = ref('0.00')
const showMenu = ref(false)

const banners = ref([
  { title: '欢迎回来', desc: '探索更多精彩课程', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { title: '新课程上线', desc: '限时优惠进行中', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { title: '会员专享', desc: 'VIP 独家内容', bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }
])

const menuList = [
  { icon: '📹', label: '我的课程', desc: '已购买的课程', color: '#667eea', path: '/pages/user/video/list' },
  { icon: '💰', label: '充值中心', desc: '余额充值与记录', color: '#34C759', path: '/pages/user/recharge' },
  { icon: '📊', label: '学习进度', desc: '查看学习情况', color: '#FF9500', path: '' },
  { icon: '⚙️', label: '个人中心', desc: '账户设置与管理', color: '#5856D6', path: '' }
]

const courseList = ref([
  { id: 1, title: 'CRM 基础入门', views: 1234, tag: '热门', cover: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  { id: 2, title: '客户开发技巧', views: 892, tag: '新课', cover: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' },
  { id: 3, title: '销售实战案例', views: 2341, tag: '推荐', cover: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)' }
])

function goLogin() {
  uni.navigateTo({ url: '/pages/login/index' })
}

function navigateTo(path: string) {
  if (!path) {
    uni.showToast({ title: '功能开发中...', icon: 'none' })
    return
  }
  
  if (path.includes('/pages/user/')) {
    // TabBar 页面使用 switchTab
    const tabPath = path.split('/').slice(-2).join('/')
    uni.switchTab({ url: `/${tabPath}` })
  } else {
    uni.navigateTo({ url: path })
  }
}

function goVideoList() {
  uni.switchTab({ url: '/pages/user/video/list' })
}

function playVideo(course: any) {
  uni.navigateTo({ url: `/pages/user/video/player?id=${course.id}` })
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background-color: #F5F6FA;
  padding-bottom: 120rpx;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60rpx 32rpx 40rpx;
}

.user-info {
  display: flex;
  align-items: center;
}

.avatar, .avatar-img {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
}

.avatar {
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 24rpx;
  color: #FFFFFF;
}

.user-detail {
  flex: 1;
  margin-left: 24rpx;
}

.user-name {
  font-size: 34rpx;
  font-weight: 600;
  color: #FFFFFF;
  display: block;
  margin-bottom: 8rpx;
}

.balance {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
}

.action-btn {
  width: 64rpx;
  height: 64rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn text {
  font-size: 28rpx;
  color: #FFFFFF;
}

.banner-section {
  margin: -30rpx 24rpx 20rpx;
  position: relative;
  z-index: 10;
}

.banner-swiper {
  height: 280rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.banner-item {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 36rpx;
}

.banner-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #FFFFFF;
  margin-bottom: 12rpx;
}

.banner-desc {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

.menu-section {
  margin: 20rpx 24rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  background: #FFFFFF;
  border-bottom: 1rpx solid #F0F0F0;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: #F8F8F8;
  }
}

.menu-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-icon text {
  font-size: 36rpx;
}

.menu-content {
  flex: 1;
  margin-left: 24rpx;
}

.menu-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
  display: block;
}

.menu-desc {
  font-size: 24rpx;
  color: #999999;
  margin-top: 4rpx;
  display: block;
}

.arrow {
  font-size: 36rpx;
  color: #CCCCCC;
}

.course-section {
  margin: 20rpx 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333333;
}

.more-link {
  font-size: 26rpx;
  color: #667eea;
}

.course-scroll {
  white-space: nowrap;
}

.course-list {
  display: inline-flex;
  gap: 20rpx;
}

.course-card {
  width: 300rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.course-cover {
  height: 180rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.play-icon {
  font-size: 48rpx;
  color: #FFFFFF;
  opacity: 0.9;
}

.course-info {
  padding: 20rpx;
}

.course-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
  display: block;
  margin-bottom: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.course-meta text {
  font-size: 22rpx;
  color: #999999;
}

.tag {
  font-size: 20rpx !important;
  color: #FF3B30 !important;
  background: #FFF0F0;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.footer-tips {
  text-align: center;
  padding: 40rpx 0;
}

.footer-tips text {
  font-size: 22rpx;
  color: #CCCCCC;
}

.card {
  background: #FFFFFF;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}
</style>
