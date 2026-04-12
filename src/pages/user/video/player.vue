<template>
  <view class="player-page">
    <video 
      v-if="videoUrl" 
      :src="videoUrl" 
      id="mainVideo"
      controls
      autoplay
      class="video-player"
      @timeupdate="onTimeUpdate"
      @ended="onVideoEnded"
    ></video>
    
    <view v-else class="loading-container">
      <text class="loading-text">视频加载中...</text>
    </view>
    
    <view class="video-info card">
      <text class="title">{{ videoInfo.title || '视频播放' }}</text>
      <text class="desc">{{ videoInfo.description || '暂无描述' }}</text>
      
      <view class="watch-progress">
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: watchProgress + '%' }"></view>
        </view>
        <text class="progress-text">已观看 {{ formatTime(currentTime) }} / {{ formatTime(totalDuration) }} ({{ Math.round(watchProgress) }}%)</text>
      </view>
      
      <view class="watch-status">
        <text v-if="watchRecorded" class="status-recorded">✅ 观看记录已保存</text>
        <text v-else class="status-recording">📝 正在记录观看...</text>
      </view>
    </view>

    <!-- 关联商品展示 -->
    <view class="related-product-section card" v-if="videoInfo.productId || (videoInfo.productIds && videoInfo.productIds.length > 0)">
      <text class="section-title">🛒 相关推荐</text>
      
      <view 
        class="product-card"
        v-if="relatedProduct"
        @tap="goToProduct(relatedProduct._id)"
      >
        <image :src="relatedProduct.coverImage || '/static/placeholder.png'" mode="aspectFill" class="product-image" />
        <div class="product-info">
          <text class="product-name">{{ relatedProduct.name }}</text>
          <text class="product-price">¥{{ relatedProduct.price?.toFixed(2) }}</text>
        </div>
        <button class="cta-btn">{{ videoInfo.ctaText || '立即购买' }}</button>
      </view>

      <scroll-view scroll-x class="products-scroll" v-else-if="videoInfo.productIds?.length > 0">
        <view 
          class="mini-product-card"
          v-for="(pid, index) in videoInfo.productIds.slice(0, 5)" 
          :key="index"
          @tap="goToProduct(pid)"
        >
          <image src="/static/placeholder.png" mode="aspectFill" class="mini-image" />
          <text class="mini-text">查看详情 →</text>
        </view>
      </scroll-view>

      <view class="conversion-hint">
        <text>💡 观看本视频后购买可享受优惠</text>
      </view>
    </view>

    <!-- CTA按钮 -->
    <view class="cta-section" v-if="videoInfo.ctaText && videoInfo.ctaLink">
      <button class="main-cta-btn" @tap="handleCTA">
        {{ videoInfo.ctaText }} →
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const videoUrl = ref('')
const videoInfo = ref<any>({})
const currentTime = ref(0)
const totalDuration = ref(0)
const watchProgress = ref(0)
const watchRecorded = ref(false)
let reportTimer: any = null
let lastReportedTime = 0
const VIDEO_ID = ref('')
const USER_INFO = ref<any>({})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options: any = currentPage?.options || {}
  
  try {
    const userInfoStr = uni.getStorageSync('userInfo')
    if (userInfoStr) {
      USER_INFO.value = typeof userInfoStr === 'string' ? JSON.parse(userInfoStr) : userInfoStr
    }
  } catch (e) {}
  
  if (options?.id) {
    VIDEO_ID.value = options.id
    loadVideo(options.id)
  }
  if (options?.title) {
    videoInfo.value.title = decodeURIComponent(options.title)
  }

  reportTimer = setInterval(() => {
    if (currentTime.value > 0 && !watchRecorded.value) {
      reportWatchProgress()
    }
  }, 10000)
})

onUnmounted(() => {
  if (reportTimer) {
    clearInterval(reportTimer)
  }
  if (currentTime.value > 0) {
    reportWatchProgress(true)
  }
})

async function loadVideo(id: string) {
  try {
    const res: any = await new Promise((resolve, reject) => {
      uni.request({
        url: '/api/videos/' + id,
        method: 'GET',
        success: (r: any) => resolve(r),
        fail: (err: any) => reject(err)
      })
    })

    if (res.statusCode === 200 && res.data && res.data.data && res.data.data.video) {
      const video = res.data.data.video
      videoInfo.value = video
      let url = video.videoUrl || ''
      if (url && url.indexOf('http') !== 0) {
        const host = window.location.origin || ''
        url = host + (url.indexOf('/') === 0 ? '' : '/') + url
      }
      videoUrl.value = url
      totalDuration.value = video.duration || 0
    } else {
      const pages = getCurrentPages()
      const opts = pages[pages.length - 1]?.options || {}
      if (opts.url) {
        let url = decodeURIComponent(opts.url)
        if (url.indexOf('http') !== 0) {
          url = window.location.origin + url
        }
        videoUrl.value = url
      }
    }
    
    setTimeout(function() { reportWatchProgress(false, true) }, 2000)
  } catch (error) {
    console.error('加载视频失败:', error)
    uni.showToast({ title: '视频加载失败', icon: 'none' })
  }
}

function onTimeUpdate(e: any) {
  const video = e.detail.target || e.target
  if (video) {
    currentTime.value = video.currentTime || 0
    if (totalDuration.value === 0 && video.duration) {
      totalDuration.value = video.duration
    }
    if (totalDuration.value > 0) {
      watchProgress.value = (currentTime.value / totalDuration.value) * 100
    }
  }
}

function onVideoEnded() {
  watchProgress.value = 100
  reportWatchProgress(true)
  watchRecorded.value = true
  uni.showToast({ title: '✅ 观看完成，记录已保存', icon: 'success' })
}

async function reportWatchProgress(isFinal: boolean, isFirst: boolean) {
  if (!isFirst && !isFinal && Math.abs(currentTime.value - lastReportedTime) < 5) {
    return
  }
  lastReportedTime = currentTime.value
  
  try {
    var payload = {
      userId: USER_INFO.value?._id || USER_INFO.value?.id || 'anonymous',
      userPhone: USER_INFO.value?.phone || '匿名用户',
      userName: USER_INFO.value?.name || '',
      videoId: VIDEO_ID.value,
      videoTitle: videoInfo.value.title || '未知视频',
      watchedDuration: Math.round(currentTime.value),
      totalDuration: Math.round(totalDuration.value),
      deviceInfo: navigator.userAgent.substring(0, 80)
    }

    new Promise(function(resolve, reject) {
      uni.request({
        url: '/api/video-watches',
        method: 'POST',
        data: payload,
        success: function(r: any) { resolve(r) },
        fail: function(err: any) { reject(err) }
      })
    })
    
    if (isFinal || watchProgress.value >= 80) {
      watchRecorded.value = true
    }
    console.log('📊 观看进度已上报: ' + Math.round(watchProgress.value) + '%')
  } catch (error) {
    console.error('上报失败:', error)
  }
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00'
  var mins = Math.floor(seconds / 60)
  var secs = Math.floor(seconds % 60)
  return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0')
}
</script>

<style scoped>
.player-page { min-height: 100vh; background-color: #000; }
.loading-container { height: 300px; display: flex; align-items: center; justify-content: center; }
.loading-text { color: #FFFFFF; font-size: 16px; }
.video-player { width: 100%; height: 220px; background-color: #000; }
.video-info { margin: -16px 16px 16px; border-radius: 12px; position: relative; }
.title { font-size: 18px; font-weight: 600; color: #1A1A1A; display: block; margin-bottom: 8px; }
.desc { font-size: 14px; color: #666666; line-height: 1.6; margin-bottom: 16px; }
.watch-progress { padding: 12px 0; border-top: 1px solid #F0F0F0; }
.progress-bar { height: 8px; background: #E8E8E8; border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px; transition: width 0.3s ease; }
.progress-text { font-size: 13px; color: #888888; }
.watch-status { margin-top: 10px; text-align: center; }
.status-recorded { color: #34C759; font-size: 13px; font-weight: 500; }
.status-recording { color: #FF9500; font-size: 13px; }
</style>
