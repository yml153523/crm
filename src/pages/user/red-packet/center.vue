<template>
  <view class="red-packet-center-page">
    <!-- 未登录状态 -->
    <view class="not-logged-in" v-if="notLoggedIn">
      <text class="nli-icon">🔒</text>
      <text class="nli-text">请先登录后查看红包</text>
      <view class="nli-btn" @tap="goLogin">
        <text class="nli-btn-text">去登录</text>
      </view>
    </view>

    <template v-else>
    <view class="header">
      <text class="page-title">🧧 我的红包</text>
    </view>

    <view class="tab-bar">
      <view 
        class="tab-item" 
        :class="{ active: currentTab === 'available' }"
        @tap="switchTab('available')"
      >
        <text>可用 ({{ available.length }})</text>
      </view>
      <view 
        class="tab-item" 
        :class="{ active: currentTab === 'used' }"
        @tap="switchTab('used')"
      >
        <text>已用</text>
      </view>
      <view 
        class="tab-item" 
        :class="{ active: currentTab === 'expired' }"
        @tap="switchTab('expired')"
      >
        <text>已过期</text>
      </view>
    </view>

    <scroll-view scroll-y class="content-scroll" v-if="!loading">
      <!-- 可用红包 -->
      <view v-if="currentTab === 'available'" class="rp-list">
        <view 
          class="rp-card card available-card"
          v-for="rp in available" 
          :key="rp._id"
        >
          <view class="rp-amount-section">
            <text class="rp-amount">¥{{ (rp.amount / 100).toFixed(2) }}</text>
            <text class="rp-type">{{ getTaskTypeText(rp.redPacketId?.taskType) }}</text>
          </view>

          <view class="rp-info">
            <text class="rp-source">来源: {{ rp.redPacketId?.title || '系统发放' }}</text>
            <text class="rp-expire-info">有效期至: {{ formatTime(rp.expiresAt) }}</text>
          </view>

          <button class="use-btn" @tap="useRedPacket(rp)">立即使用</button>
        </view>

        <view class="empty-state" v-if="available.length === 0">
          <text class="empty-icon">🧧</text>
          <text class="empty-text">暂无可用红包</text>
          <button class="get-rp-btn" @tap="goToClaim">去领取红包</button>
        </view>
      </view>

      <!-- 已用红包 -->
      <view v-if="currentTab === 'used'" class="rp-list">
        <view 
          class="rp-card card used-card"
          v-for="rp in used" 
          :key="rp._id"
        >
          <div class="rp-header">
            <text class="rp-used-amount">-¥{{ (rp.usedAmount / 100).toFixed(2) }}</text>
            <text class="rp-original">原价 ¥{{ (rp.amount / 100).toFixed(2) }}</text>
          </div>

          <view class="rp-info">
            <text class="rp-order-info">用于订单: {{ rp.usedOrderId?.orderNo || '-' }}</text>
            <text class="rp-use-time">使用时间: {{ formatTime(rp.usedAt) }}</text>
          </view>
        </view>

        <view class="empty-state" v-if="used.length === 0">
          <text class="empty-text">暂无使用记录</text>
        </view>
      </view>

      <!-- 已过期红包 -->
      <view v-if="currentTab === 'expired'" class="rp-list">
        <view 
          class="rp-card card expired-card"
          v-for="rp in expired" 
          :key="rp._id"
        >
          <div class="rp-header">
            <text class="rp-expired-amount">¥{{ (rp.amount / 100).toFixed(2) }}</text>
            <text class="expired-badge">已过期</text>
          </div>

          <view class="rp-info">
            <text class="rp-reason">过期时间: {{ formatTime(rp.expiresAt) }}</text>
            <text class="rp-source">来源: {{ rp.redPacketId?.title || '系统发放' }}</text>
          </view>
        </view>

        <view class="empty-state" v-if="expired.length === 0">
          <text class="empty-text">暂无过期记录</text>
        </view>
      </view>
    </scroll-view>

    <view v-else class="loading-container">
      <text>加载中...</text>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { requireLogin } from '@/utils/auth'

const loading = ref(true)
const currentTab = ref('available')
const available = ref<any[]>([])
const used = ref<any[]>([])
const expired = ref<any[]>([])
const notLoggedIn = ref(false)

onMounted(() => {
  if (!requireLogin()) {
    notLoggedIn.value = true
    return
  }
  loadRedPackets()
})

async function loadRedPackets() {
  loading.value = true
  
  try {
    const res = await uni.request({ url: '/api/red-packets/my' })
    
    if ((res.data as any)?.success) {
      const data = (res.data as any).data
      available.value = data.available || []
      used.value = data.used || []
      expired.value = data.expired || []
    }
  } catch (error) {
    console.error('加载红包失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function switchTab(tab: string) {
  currentTab.value = tab
}

function getTaskTypeText(taskType?: string): string {
  const map: Record<string, string> = {
    watch_video: '观看视频',
    purchase_product: '购买商品',
    register: '新人注册',
    share: '分享邀请',
    checkin: '签到',
    manual: '系统发放'
  }
  return map[taskType || ''] || '通用'
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function useRedPacket(rp: any) {
  uni.showModal({
    title: '使用红包',
    content: `确定使用该¥${(rp.amount / 100).toFixed(2)}红包吗？将在下单时自动抵扣。`,
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '请在下单时选择该红包', icon: 'none' })
      }
    }
  })
}

function goToClaim() {
  uni.showModal({
    title: '🎁 领取红包',
    content: '红包领取功能即将上线！\n\n您可以通过以下方式获取红包：\n• 参与活动\n• 邀请好友\n• 签到奖励',
    showCancel: false,
    confirmText: '我知道了'
  })
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/index' })
}
</script>

<style lang="scss" scoped>
.red-packet-center-page {
  min-height: 100vh;
  background-color: #FAFAFA;
}

.not-logged-in {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}
.nli-icon { font-size: 64px; }
.nli-text { font-size: 16px; color: #999; }
.nli-btn {
  margin-top: 12px;
  padding: 12px 40px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 24px;
  cursor: pointer;
  &:active { opacity: 0.85; }
}
.nli-btn-text { font-size: 16px; color: #fff; font-weight: 600; }

.header {
  padding: 20px 16px;
  background-color: #FFFFFF;
  
  .page-title {
    font-size: 20px;
    font-weight: bold;
    color: #1A1A1A;
  }
}

.tab-bar {
  display: flex;
  padding: 12px 16px;
  background-color: #FFFFFF;
  gap: 8px;
  
  .tab-item {
    flex: 1;
    text-align: center;
    padding: 10px 0;
    border-radius: 16px;
    background-color: #F5F5F5;
    
    text {
      font-size: 14px;
      color: #666666;
    }
    
    &.active {
      background-color: #FF3B30;
      
      text {
        color: #FFFFFF;
        font-weight: 600;
      }
    }
  }
}

.content-scroll {
  height: calc(100vh - 120px);
  padding: 12px 16px;

  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 300px;
    
    text {
      font-size: 16px;
      color: #666666;
    }
  }

  .rp-list {
    .rp-card {
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 12px;
    }

    .available-card {
      background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
      
      .rp-amount-section {
        text-align: center;
        margin-bottom: 12px;
        
        .rp-amount {
          font-size: 32px;
          font-weight: bold;
          color: #FFFFFF;
          display: block;
        }
        
        .rp-type {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.9);
        }
      }

      .rp-info {
        background-color: rgba(255, 255, 255, 0.95);
        border-radius: 8px;
        padding: 10px;
        
        .rp-source, .rp-expire-info {
          font-size: 13px;
          color: #666666;
          display: block;
          line-height: 1.5;
        }
      }

      .use-btn {
        width: 100%;
        height: 40px;
        background-color: #FFFFFF;
        color: #FF3B30;
        border-radius: 20px;
        font-size: 15px;
        font-weight: 600;
        border: none;
        margin-top: 12px;
      }
    }

    .used-card {
      background-color: #FFFFFF;
      
      .rp-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        
        .rp-used-amount {
          font-size: 22px;
          font-weight: bold;
          color: #34C759;
        }
        
        .rp-original {
          font-size: 14px;
          color: #999999;
          text-decoration: line-through;
        }
      }

      .rp-info {
        .rp-order-info {
          font-size: 14px;
          color: #333333;
          display: block;
          margin-bottom: 4px;
        }
        
        .rp-use-time {
          font-size: 12px;
          color: #999999;
        }
      }
    }

    .expired-card {
      background-color: #F5F5F5;
      opacity: 0.7;
      
      .rp-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .rp-expired-amount {
          font-size: 22px;
          font-weight: bold;
          color: #999999;
        }
        
        .expired-badge {
          background-color: #CCCCCC;
          color: #FFFFFF;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
      }

      .rp-info {
        .rp-reason, .rp-source {
          font-size: 13px;
          color: #999999;
          display: block;
          line-height: 1.5;
        }
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 16px;
    
    .empty-icon {
      font-size: 64px;
      margin-bottom: 12px;
    }
    
    .empty-text {
      font-size: 16px;
      color: #999999;
      margin-bottom: 16px;
    }
    
    .get-rp-btn {
      background-color: #FF3B30;
      color: #FFFFFF;
      padding: 10px 32px;
      border-radius: 24px;
      font-size: 15px;
      border: none;
    }
  }
}
</style>
