<template>
  <view class="video-list-page">
    <view class="header">
      <text class="title">📹 视频课程</text>
      <text class="subtitle">共 {{ videoList.length }} 个课程</text>
    </view>
    
    <view class="video-grid" v-if="videoList.length > 0">
      <view 
        class="video-card card" 
        v-for="(item, index) in videoList" 
        :key="index" 
        @tap="playVideo(item)"
      >
        <view class="cover-wrapper">
          <image :src="item.cover || '/static/images/placeholder.png'" mode="aspectFill" class="video-cover" />
          <view class="play-overlay">
            <text class="play-icon">▶️</text>
          </view>
          <view class="duration-badge" v-if="item.duration">
            <text>{{ formatDuration(item.duration) }}</text>
          </view>
        </view>
        
        <view class="video-info">
          <text class="video-title">{{ item.title }}</text>
          <view class="video-meta">
            <text class="meta-item">👁️ {{ item.viewCount || 0 }}次</text>
            <text class="meta-item">⏱️ {{ item.duration || '未知' }}</text>
          </view>
          <view class="tags-row">
            <view class="tag tag-hot" v-if="item.isRecommended">🔥 推荐</view>
            <view class="tag tag-new" v-if="item.status === 'published'">✅ 已发布</view>
          </view>
        </view>
      </view>
    </view>
    
    <view class="empty-state" v-else-if="!loading">
      <text class="empty-icon">🎬</text>
      <text class="empty-text">暂无视频课程</text>
      <text class="empty-desc">管理员正在上传中，敬请期待~</text>
    </view>
    
    <view class="loading-state" v-if="loading">
      <text>⏳ 加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { videoAPI } from '@/api/video'

const loading = ref(false)
const videoList = ref<any[]>([])

onMounted(() => {
  loadVideoList()
})

async function loadVideoList() {
  loading.value = true
  try {
    const res: any = await videoAPI.getVideoList({ pageSize: 50, status: 'published' })
    if (res.success && res.data) {
      videoList.value = res.data.list || []
    } else {
      videoList.value = []
    }
  } catch (error) {
    console.error('加载视频列表失败:', error)
    videoList.value = []
    uni.showToast({
      title: '加载失败，请稍后重试',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

function formatDuration(seconds: number): string {
  if (!seconds) return '00:00'
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

function playVideo(item: any) {
  uni.navigateTo({ url: `/pages/user/video/player?id=${item._id}&title=${encodeURIComponent(item.title)}` })
}
</script>

<style lang="scss" scoped>
.video-list-page {
  min-height: 100vh;
  background-color: #F5F5F5;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px 16px 20px;
  
  .title {
    font-size: 22px;
    font-weight: bold;
    color: #FFFFFF;
    display: block;
    margin-bottom: 6px;
  }
  
  .subtitle {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.85);
  }
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
  
  .video-card {
    border-radius: 12px;
    overflow: hidden;
    
    .cover-wrapper {
      position: relative;
      
      .video-cover {
        width: 100%;
        height: 140px;
        background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
        display: block;
      }
      
      .play-overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 48px;
        height: 48px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        
        .play-icon {
          font-size: 24px;
          margin-left: 2px;
        }
      }
      
      .duration-badge {
        position: absolute;
        right: 8px;
        bottom: 8px;
        background-color: rgba(0, 0, 0, 0.7);
        padding: 3px 8px;
        border-radius: 4px;
        
        text {
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 600;
        }
      }
    }
    
    .video-info {
      padding: 10px;
      
      .video-title {
        font-size: 14px;
        font-weight: 600;
        color: #1A1A1A;
        display: block;
        line-height: 1.3;
        margin-bottom: 6px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .video-meta {
        display: flex;
        gap: 8px;
        margin-bottom: 6px;
        
        .meta-item {
          font-size: 11px;
          color: #999999;
        }
      }
      
      .tags-row {
        display: flex;
        gap: 6px;
        
        .tag {
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 10px;
          
          &.tag-hot {
            background-color: rgba(255, 59, 48, 0.15);
            color: #FF3B30;
          }
          
          &.tag-new {
            background-color: rgba(52, 199, 89, 0.15);
            color: #34C759;
          }
        }
      }
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  
  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }
  
  .empty-text {
    font-size: 16px;
    color: #999999;
    margin-bottom: 8px;
    display: block;
  }
  
  .empty-desc {
    font-size: 13px;
    color: #CCCCCC;
  }
}

.loading-state {
  text-align: center;
  padding: 40px;
  
  text {
    font-size: 14px;
    color: #999999;
  }
}
</style>
