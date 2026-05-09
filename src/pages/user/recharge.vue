<template>
  <view class="recharge-page">
    <!-- 自定义导航栏 -->
    <view class="custom-nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="nav-title">充值中心</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 未登录状态 -->
    <view class="not-logged-in" v-if="notLoggedIn">
      <text class="nli-icon">🔒</text>
      <text class="nli-text">请先登录后使用充值功能</text>
      <view class="nli-btn" @click="goLogin">
        <text class="nli-btn-text">去登录</text>
      </view>
    </view>

    <!-- 已登录内容 -->
    <template v-else>
    <view class="balance-card">
      <text class="label">当前余额</text>
      <text class="amount">¥{{ balance }}</text>
      <text class="tip">充值后可购买课程、VIP会员等</text>
    </view>
    
    <view class="recharge-options card">
      <text class="section-title">选择充值金额</text>
      
      <view class="amount-grid">
        <view 
          class="amount-item"
          :class="{ active: selectedAmount === item.value }"
          v-for="(item, index) in amountList"
          :key="index"
          @click="selectedAmount = item.value"
        >
          <text class="value">¥{{ item.value }}</text>
          <text class="bonus" v-if="item.bonus">送¥{{ item.bonus }}</text>
          <text class="popular" v-if="item.popular">🔥 热门</text>
        </view>
      </view>
      
      <view class="pay-btn" :class="{ paying }" @click="handlePay">
        <text>{{ paying ? '处理中...' : '立即充值' }}</text>
      </view>
    </view>
    
    <view class="record-section card">
      <text class="section-title">💰 充值记录</text>
      
      <view class="record-list" v-if="recordList.length > 0">
        <view class="record-item" v-for="(record, index) in recordList" :key="index">
          <view class="record-info">
            <text class="record-amount">+¥{{ record.amount }}</text>
            <text class="record-time">{{ record.time }}</text>
          </view>
          <view class="record-status" :class="record.status === 'success' ? 'success' : 'failed'">
            <text>{{ record.status === 'success' ? '✅ 成功' : '❌ 失败' }}</text>
          </view>
        </view>
      </view>
      
      <view class="empty-state" v-else>
        <text class="empty-icon">📝</text>
        <text class="empty-text">暂无充值记录</text>
      </view>
    </view>
    
    <view class="tips-section card">
      <text class="section-title">⚠️ 温馨提示</text>
      <view class="tips-list">
        <text class="tip-item">• 充值金额实时到账，可立即使用</text>
        <text class="tip-item">• 如遇问题请联系客服：400-888-8888</text>
        <text class="tip-item">• 充值后不支持退款，请谨慎操作</text>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { requireLogin, getBalance } from '@/utils/auth'

const balance = ref('0.00')
const selectedAmount = ref(100)
const paying = ref(false)
const notLoggedIn = ref(false)

const amountList = [
  { value: 50, bonus: 0, popular: false },
  { value: 100, bonus: 5, popular: true },
  { value: 200, bonus: 20, popular: false },
  { value: 500, bonus: 60, popular: false },
  { value: 1000, bonus: 150, popular: true },
  { value: 2000, bonus: 350, popular: false }
]

const recordList = ref<any[]>([])

onMounted(() => {
  if (!requireLogin()) {
    notLoggedIn.value = true
    return
  }
  loadBalance()
  loadRecords()
})

function loadBalance() {
  balance.value = getBalance()
}

function loadRecords() {
  const mockRecords = [
    { amount: 200, time: '2026-04-07 14:30', status: 'success' },
    { amount: 500, time: '2026-04-01 09:15', status: 'success' }
  ]
  recordList.value = mockRecords
}

function handlePay() {
  if (paying.value) return
  
  paying.value = true
  
  uni.showModal({
    title: '确认充值',
    content: `确定要充值 ¥${selectedAmount.value} 吗？`,
    confirmText: '确认支付',
    success: async (res) => {
      if (res.confirm) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1500))
          const currentBalance = parseFloat(balance.value) || 0
          balance.value = (currentBalance + selectedAmount.value).toFixed(2)
          recordList.value.unshift({
            amount: selectedAmount.value,
            time: new Date().toLocaleString('zh-CN'),
            status: 'success'
          })
          uni.showToast({ title: `充值成功！¥${selectedAmount.value}`, icon: 'success', duration: 2000 })
        } catch (error) {
          uni.showToast({ title: '支付失败，请重试', icon: 'none' })
        }
      }
      paying.value = false
    },
    fail: () => { paying.value = false }
  })
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/index' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.recharge-page {
  min-height: 100vh;
  background-color: #FAFAFA;
  padding-bottom: 32px;
}

.custom-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 16px;
  background-color: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  position: sticky;
  top: 0;
  z-index: 100;

  .nav-back {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;

    .back-icon {
      font-size: 20px;
      color: #FFFFFF;
      font-weight: bold;
    }
  }

  .nav-title {
    font-size: 17px;
    font-weight: 600;
    color: #FFFFFF;
  }

  .nav-placeholder {
    width: 32px;
  }
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

.balance-card {
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  padding: 32px 20px;
  text-align: center;
  
  .label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    display: block;
    margin-bottom: 8px;
  }
  
  .amount {
    font-size: 48px;
    font-weight: bold;
    color: #FFFFFF;
    margin-bottom: 8px;
    display: block;
  }
  
  .tip {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }
}

.recharge-options, .record-section, .tips-section {
  margin: 16px;
  
  .section-title {
    font-size: 17px;
    font-weight: 600;
    color: #1A1A1A;
    margin-bottom: 16px;
    display: block;
  }
}

.amount-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  
  .amount-item {
    padding: 18px 10px;
    border: 2px solid #E0E0E0;
    border-radius: 10px;
    text-align: center;
    position: relative;
    
    &.active {
      border-color: #007AFF;
      background: linear-gradient(135deg, #F0F7FF 0%, #E8F2FF 100%);
      
      .value {
        color: #007AFF;
      }
    }
    
    .value {
      font-size: 22px;
      font-weight: bold;
      color: #1A1A1A;
      display: block;
      margin-bottom: 4px;
    }
    
    .bonus {
      font-size: 11px;
      color: #FF3B30;
      display: block;
    }
    
    .popular {
      position: absolute;
      top: -8px;
      right: -8px;
      font-size: 10px;
      background: #FF3B30;
      color: white;
      padding: 2px 6px;
      border-radius: 8px;
    }
  }
}

.pay-btn {
  width: auto;
  max-width: 320px;
  height: 50px;
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  color: #FFFFFF;
  font-size: 17px;
  font-weight: bold;
  border-radius: 25px;
  margin: 24px auto 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.35);
  
  &.paying {
    opacity: 0.7;
  }
  
  &:active {
    transform: scale(0.98);
  }
}

.record-list {
  .record-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 0;
    border-bottom: 1px solid #F5F5F5;
    
    &:last-child {
      border-bottom: none;
    }
    
    .record-info {
      .record-amount {
        font-size: 17px;
        font-weight: 600;
        color: #34C759;
        display: block;
        margin-bottom: 4px;
      }
      
      .record-time {
        font-size: 12px;
        color: #999999;
      }
    }
    
    .record-status {
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 13px;
      
      &.success {
        background-color: rgba(52, 199, 89, 0.15);
        
        text {
          color: #34C759;
        }
      }
      
      &.failed {
        background-color: rgba(255, 59, 48, 0.15);
        
        text {
          color: #FF3B30;
        }
      }
    }
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    display: block;
  }
  
  .empty-text {
    font-size: 15px;
    color: #999999;
  }
}

.tips-section {
  .tips-list {
    .tip-item {
      font-size: 13px;
      color: #666666;
      line-height: 1.8;
      display: block;
    }
  }
}
</style>
