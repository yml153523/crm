<template>
  <view class="order-create-page">
    <view class="header">
      <text class="page-title">确认订单</text>
    </view>

    <view class="section-card" v-if="orderItems.length > 0">
      <text class="section-title">商品清单</text>
      <view 
        class="order-item" 
        v-for="(item, index) in orderItems" 
        :key="index"
      >
        <image :src="item.productImage || '/static/placeholder.png'" mode="aspectFill" class="item-image" />
        <view class="item-info">
          <text class="item-name">{{ item.productName }}</text>
          <text class="item-variant" v-if="item.variantName">{{ item.variantName }}</text>
          <text class="item-price">¥{{ item.price.toFixed(2) }} × {{ item.quantity }}</text>
        </view>
        <text class="item-subtotal">¥{{ (item.price * item.quantity).toFixed(2) }}</text>
      </view>
    </view>

    <view class="section-card">
      <text class="section-title">收货地址</text>
      
      <view class="address-form">
        <view class="form-group">
          <input 
            v-model="address.receiverName"
            placeholder="收货人姓名 *"
            class="form-input"
          />
        </view>
        
        <view class="form-group">
          <input 
            v-model="address.receiverPhone"
            placeholder="手机号码 *"
            type="tel"
            maxlength="11"
            class="form-input"
          />
        </view>
        
        <view class="form-row">
          <input 
            v-model="address.province"
            placeholder="省份 *"
            class="form-input flex-1"
          />
          <input 
            v-model="address.city"
            placeholder="城市 *"
            class="form-input flex-1"
          />
        </view>
        
        <view class="form-row">
          <input 
            v-model="address.district"
            placeholder="区县 *"
            class="form-input flex-1"
          />
        </view>
        
        <textarea 
          v-model="address.detailAddress"
          placeholder="详细地址 *"
          class="form-textarea"
        ></textarea>
      </view>
    </view>

    <view class="section-card red-packet-section">
      <view class="red-packet-header">
        <text class="section-title">红包抵扣</text>
        <text class="available-count" v-if="availableRedPackets.length > 0">
          可用 {{ availableRedPackets.length }} 个
        </text>
      </view>
      
      <scroll-view scroll-x class="red-packet-list" v-if="availableRedPackets.length > 0">
        <view 
          class="rp-item" 
          :class="{ active: selectedRedPacket === index }"
          v-for="(rp, index) in availableRedPackets" 
          :key="rp._id"
          @tap="selectRedPacket(index)"
        >
          <text class="rp-amount">¥{{ (rp.amount / 100).toFixed(2) }}</text>
          <text class="rp-expire">{{ formatExpire(rp.expiresAt) }}到期</text>
        </view>
      </scroll-view>
      
      <view class="no-rp" v-else>
        <text>暂无可用红包</text>
      </view>
      
      <button class="use-rp-btn" @tap="goToRedPackets" v-if="availableRedPackets.length === 0">
        去领取红包
      </button>
    </view>

    <view class="section-card">
      <text class="section-title">备注信息</text>
      <textarea 
        v-model="buyerRemark"
        placeholder="选填：给商家的留言（如：尽快发货）"
        class="form-textarea"
        maxlength="200"
      ></textarea>
    </view>

    <view class="summary-card card">
      <view class="summary-row">
        <text class="label">商品金额</text>
        <text class="value">¥{{ totalAmount.toFixed(2) }}</text>
      </view>
      <view class="summary-row" v-if="discountAmount > 0">
        <text class="label">红包抵扣</text>
        <text class="value discount">-¥{{ discountAmount.toFixed(2) }}</text>
      </view>
      <view class="summary-row total-row">
        <text class="label">应付金额</text>
        <text class="value final-amount">¥{{ finalAmount.toFixed(2) }}</text>
      </view>
    </view>

    <button class="submit-btn" @tap="submitOrder" :disabled="submitting">
      {{ submitting ? '提交中...' : '提交订单' }}
    </button>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const orderItems = ref<any[]>([])
const address = ref({
  receiverName: '',
  receiverPhone: '',
  province: '',
  city: '',
  district: '',
  detailAddress: ''
})
const buyerRemark = ref('')
const availableRedPackets = ref<any[]>([])
const selectedRedPacket = ref<number | null>(null)
const submitting = ref(false)

const totalAmount = computed(() => {
  return orderItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const discountAmount = computed(() => {
  if (selectedRedPacket.value === null || !availableRedPackets.value[selectedRedPacket.value]) return 0
  const rp = availableRedPackets.value[selectedRedPacket.value]
  return Math.min(rp.amount / 100, totalAmount.value)
})

const finalAmount = computed(() => {
  return Math.max(0, totalAmount.value - discountAmount.value)
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options || {}
  
  if (options.items) {
    try {
      orderItems.value = JSON.parse(decodeURIComponent(options.items))
    } catch (e) {
      console.error('解析items失败:', e)
    }
  }
  
  loadAvailableRedPackets()
})

async function loadAvailableRedPackets() {
  try {
    const res = await uni.request({ url: '/api/red-packets/available?status=available' })
    
    if ((res.data as any)?.success) {
      availableRedPackets.value = (res.data as any).data?.list?.filter(
        (rp: any) => rp.canClaim === false && rp.taskType !== 'manual'
      ) || []
    }
  } catch (error) {
    console.error('加载红包失败:', error)
  }
}

function selectRedPacket(index: number) {
  if (selectedRedPacket.value === index) {
    selectedRedPacket.value = null
  } else {
    selectedRedPacket.value = index
  }
}

function formatExpire(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function goToRedPackets() {
  uni.navigateTo({ url: '/pages/user/red-packet/center' })
}

async function submitOrder() {
  if (!validateForm()) return
  
  submitting.value = true
  
  try {
    const payload: any = {
      items: orderItems.value.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        variantName: item.variantName
      })),
      shippingAddress: address.value,
      buyerRemark: buyerRemark.value
    }
    
    if (selectedRedPacket.value !== null) {
      payload.redPacketId = availableRedPackets.value[selectedRedPacket.value]._id
    }
    
    const res = await uni.request({
      url: '/api/orders',
      method: 'POST',
      data: payload
    })
    
    if ((res.data as any)?.success) {
      const orderId = (res.data as any).data.order._id
      uni.showToast({ title: '订单创建成功', icon: 'success' })
      
      setTimeout(() => {
        uni.navigateTo({ url: `/pages/user/order/detail?id=${orderId}` })
      }, 1000)
    } else {
      uni.showToast({ title: (res.data as any)?.message || '订单创建失败', icon: 'none' })
    }
  } catch (error) {
    console.error('提交订单失败:', error)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function validateForm(): boolean {
  if (!address.value.receiverName.trim()) {
    uni.showToast({ title: '请输入收货人姓名', icon: 'none' })
    return false
  }
  
  if (!address.value.receiverPhone || !/^1\d{10}$/.test(address.value.receiverPhone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return false
  }
  
  if (!address.value.province || !address.value.city || !address.value.district) {
    uni.showToast({ title: '请完善省市区信息', icon: 'none' })
    return false
  }
  
  if (!address.value.detailAddress.trim()) {
    uni.showToast({ title: '请输入详细地址', icon: 'none' })
    return false
  }
  
  return true
}
</script>

<style lang="scss" scoped>
.order-create-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 80px;
}

.header {
  padding: 20px 16px;
  background-color: #FFFFFF;
  
  .page-title {
    font-size: 20px;
    font-weight: bold;
    color: #1A1A1A;
  }
}

.section-card, .summary-card {
  margin: 12px 16px;
  padding: 16px;
  background-color: #FFFFFF;
  border-radius: 12px;
  
  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #1A1A1A;
    display: block;
    margin-bottom: 12px;
  }
}

.order-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #F5F5F5;
  
  &:last-child {
    border-bottom: none;
  }
  
  .item-image {
    width: 70px;
    height: 70px;
    border-radius: 8px;
    background-color: #E8E8E8;
    flex-shrink: 0;
  }
  
  .item-info {
    flex: 1;
    
    .item-name {
      font-size: 14px;
      color: #1A1A1A;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .item-variant, .item-price {
      font-size: 12px;
      color: #999999;
      margin-top: 4px;
      display: block;
    }
  }
  
  .item-subtotal {
    font-size: 14px;
    font-weight: bold;
    color: #FF3B30;
    flex-shrink: 0;
  }
}

.address-form {
  .form-group {
    margin-bottom: 12px;
  }
  
  .form-row {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;
    
    .flex-1 {
      flex: 1;
    }
  }

  .form-input {
    height: 44px;
    padding: 0 12px;
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    font-size: 14px;
  }
  
  .form-textarea {
    height: 80px;
    padding: 10px 12px;
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    font-size: 14px;
  }
}

.red-packet-section {
  .red-packet-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    
    .available-count {
      font-size: 13px;
      color: #FF9500;
    }
  }
  
  .red-packet-list {
    white-space: nowrap;
    
    .rp-item {
      display: inline-block;
      padding: 10px 16px;
      margin-right: 10px;
      border: 2px solid #FF3B30;
      border-radius: 8px;
      text-align: center;
      
      &.active {
        background-color: rgba(255, 59, 48, 0.08);
      }
      
      .rp-amount {
        font-size: 18px;
        font-weight: bold;
        color: #FF3B30;
        display: block;
      }
      
      .rp-expire {
        font-size: 11px;
        color: #999999;
        margin-top: 4px;
        display: block;
      }
    }
  }
  
  .no-rp {
    text-align: center;
    padding: 16px;
    
    text {
      font-size: 14px;
      color: #999999;
    }
  }
  
  .use-rp-btn {
    background: none;
    color: #FF9500;
    font-size: 14px;
    padding: 8px;
    margin-top: 8px;
    text-decoration: underline;
  }
}

.summary-card {
  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    
    .label {
      font-size: 14px;
      color: #666666;
    }
    
    .value {
      font-size: 14px;
      color: #1A1A1A;
    }
    
    .discount {
      color: #34C759;
    }
    
    &.total-row {
      border-top: 1px solid #E0E0E0;
      margin-top: 8px;
      padding-top: 12px;
      
      .final-amount {
        font-size: 22px;
        font-weight: bold;
        color: #FF3B30;
      }
    }
  }
}

.submit-btn {
  position: fixed;
  bottom: 20px;
  left: 16px;
  right: 16px;
  height: 50px;
  background-color: #007AFF;
  color: #FFFFFF;
  border-radius: 25px;
  font-size: 17px;
  font-weight: 600;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
  
  &[disabled] {
    opacity: 0.6;
  }
}
</style>
