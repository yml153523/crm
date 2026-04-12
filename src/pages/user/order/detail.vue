<template>
  <view class="order-detail-page" v-if="order">
    <view class="header">
      <text class="page-title">订单详情</text>
    </view>

    <view class="status-card card" :class="'status-' + order.status">
      <text class="status-text">{{ getStatusText(order.status) }}</text>
      <text class="status-desc">{{ getStatusDesc(order.status) }}</text>
    </view>

    <view class="section-card">
      <text class="section-title">订单信息</text>
      <view class="info-list">
        <view class="info-item">
          <text class="label">订单号</text>
          <text class="value">{{ order.orderNo }}</text>
        </view>
        <view class="info-item">
          <text class="label">下单时间</text>
          <text class="value">{{ formatTime(order.createdAt) }}</text>
        </view>
        <view class="info-item" v-if="order.paidAt">
          <text class="label">支付时间</text>
          <text class="value">{{ formatTime(order.paidAt) }}</text>
        </view>
        <view class="info-item" v-if="order.transactionId">
          <text class="label">交易号</text>
          <text class="value copyable" @tap="copyText(order.transactionId)">{{ order.transactionId }}</text>
        </view>
      </view>
    </view>

    <view class="section-card">
      <text class="section-title">商品清单</text>
      <view 
        class="detail-item" 
        v-for="(item, index) in order.items" 
        :key="index"
      >
        <image :src="item.productImage || '/static/placeholder.png'" mode="aspectFill" class="item-image" />
        <view class="item-info">
          <text class="item-name">{{ item.productName }}</text>
          <text class="item-spec" v-if="item.variantName">规格: {{ item.variantName }}</text>
          <text class="item-qty-price">¥{{ item.price.toFixed(2) }} × {{ item.quantity }}</text>
        </view>
        <text class="item-subtotal">¥{{ (item.price * item.quantity).toFixed(2) }}</text>
      </view>
    </view>

    <view class="section-card">
      <text class="section-title">收货地址</text>
      <view class="address-box" v-if="order.shippingAddress">
        <text class="receiver-info">
          {{ order.shippingAddress.receiverName }}  {{ order.shippingAddress.receiverPhone }}
        </text>
        <text class="address-detail">
          {{ order.shippingAddress.province }}{{ order.shippingAddress.city }}{{ order.shippingAddress.district }}{{ order.shippingAddress.detailAddress }}
        </text>
      </view>
    </view>

    <view class="section-card amount-card">
      <text class="section-title">金额明细</text>
      <view class="amount-list">
        <view class="amount-row">
          <text class="label">商品总额</text>
          <text class="value">¥{{ order.totalAmount?.toFixed(2) || '0.00' }}</text>
        </view>
        <view class="amount-row" v-if="order.shippingFee > 0">
          <text class="label">运费</text>
          <text class="value">¥{{ order.shippingFee.toFixed(2) }}</text>
        </view>
        <view class="amount-row" v-if="order.discountAmount > 0">
          <text class="label">优惠/红包</text>
          <text class="value discount">-¥{{ order.discountAmount.toFixed(2) }}</text>
        </view>
        <view class="amount-row total-row">
          <text class="label">实付金额</text>
          <text class="value total">¥{{ order.finalAmount?.toFixed(2) || '0.00' }}</text>
        </view>
      </view>
    </view>

    <view class="logistics-section section-card" v-if="order.trackingNo">
      <text class="section-title">物流信息</text>
      <view class="logistics-info">
        <text class="company">物流公司: {{ order.logisticsCompany || '暂无' }}</text>
        <text class="tracking-no">快递单号: {{ order.trackingNo }}</text>
      </view>
    </view>

    <view class="actions-card" v-if="canOperate">
      <button 
        class="action-btn btn-pay"
        v-if="order.status === 'pending_payment'"
        @tap="payOrder"
      >立即支付</button>
      
      <button 
        class="action-btn btn-cancel"
        v-if="order.status === 'pending_payment'"
        @tap="cancelOrder"
      >取消订单</button>

      <button 
        class="action-btn btn-confirm"
        v-if="order.status === 'delivered'"
        @tap="confirmOrder"
      >确认收货</button>
    </view>
  </view>

  <view v-else class="loading-container">
    <text>加载中...</text>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const order = ref<any>(null)

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options || {}
  
  if (options.id) {
    loadOrderDetail(options.id)
  }
})

async function loadOrderDetail(id: string) {
  try {
    uni.showLoading({ title: '加载中...' })
    const res = await uni.request({ url: `/api/orders/${id}` })
    
    if ((res.data as any)?.success) {
      order.value = (res.data as any).data.order
    } else {
      uni.showToast({ title: (res.data as any)?.message || '加载失败', icon: 'none' })
    }
  } catch (error) {
    console.error('加载订单详情失败:', error)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending_payment: '待支付',
    paid: '已支付',
    shipping: '发货中',
    delivered: '已送达',
    completed: '已完成',
    cancelled: '已取消'
  }
  return map[status] || status
}

function getStatusDesc(status: string): string {
  const map: Record<string, string> = {
    pending_payment: '请在30分钟内完成支付',
    paid: '商家正在为您准备发货',
    shipping: '包裹正在配送中，请耐心等待',
    delivered: '包裹已送达，请确认收货',
    completed: '订单已完成，感谢您的购买',
    cancelled: '订单已取消'
  }
  return map[status] || ''
}

const canOperate = computed(() => {
  if (!order.value) return false
  return ['pending_payment', 'delivered'].includes(order.value.status)
})

function formatTime(timeStr: string): string {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
}

function copyText(text: string) {
  uni.setClipboardData({ data: text })
  uni.showToast({ title: '已复制', icon: 'success' })
}

async function payOrder() {
  if (!order.value) return
  
  uni.showModal({
    title: '确认支付',
    content: `确定支付 ¥${order.value.finalAmount?.toFixed(2)} 吗？(模拟支付)`,
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '支付中...' })
        try {
          const result = await uni.request({
            url: `/api/orders/${order.value._id}/pay`,
            method: 'POST',
            data: { paymentMethod: 'mock' }
          })
          
          uni.hideLoading()
          
          if ((result.data as any)?.success) {
            uni.showToast({ title: '支付成功', icon: 'success' })
            setTimeout(() => loadOrderDetail(order.value._id), 1000)
          } else {
            uni.showToast({ title: (result.data as any)?.message || '支付失败', icon: 'none' })
          }
        } catch (error) {
          uni.hideLoading()
          uni.showToast({ title: '网络错误', icon: 'none' })
        }
      }
    }
  })
}

async function cancelOrder() {
  if (!order.value) return
  
  uni.showModal({
    title: '确认取消',
    content: '确定要取消该订单吗？取消后无法恢复。',
    success: async (res) => {
      if (res.confirm) {
        try {
          await uni.request({ url: `/api/orders/${order.value._id}/cancel`, method: 'POST' })
          uni.showToast({ title: '已取消', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 1000)
        } catch (error) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    }
  })
}

async function confirmOrder() {
  if (!order.value) return
  
  uni.showModal({
    title: '确认收货',
    content: '确定已收到货物吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await uni.request({ url: `/api/orders/${order.value._id}/confirm`, method: 'POST' })
          uni.showToast({ title: '确认成功', icon: 'success' })
          setTimeout(() => loadOrderDetail(order.value._id), 1000)
        } catch (error) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.order-detail-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 32px;
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

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  
  text {
    font-size: 16px;
    color: #666666;
  }
}

.status-card {
  margin: 12px 16px;
  padding: 20px;
  text-align: center;
  
  .status-text {
    font-size: 22px;
    font-weight: bold;
    display: block;
    margin-bottom: 8px;
  }
  
  .status-desc {
    font-size: 14px;
    color: #666666;
  }

  &.status-pending_payment { background-color: rgba(255, 149, 0, 0.1); .status-text { color: #FF9500; } }
  &.status-paid { background-color: rgba(0, 122, 255, 0.1); .status-text { color: #007AFF; } }
  &.status-shipping { background-color: rgba(52, 199, 89, 0.1); .status-text { color: #34C759; } }
  &.status-delivered { background-color: rgba(88, 86, 214, 0.1); .status-text { color: #5856D6; } }
  &.status-completed { background-color: rgba(52, 199, 89, 0.1); .status-text { color: #34C759; } }
  &.status-cancelled { background-color: rgba(153, 153, 153, 0.1); .status-text { color: #999999; } }
}

.section-card {
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

.info-list {
  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    
    .label {
      font-size: 14px;
      color: #999999;
    }
    
    .value {
      font-size: 14px;
      color: #333333;
      
      &.copyable {
        color: #007AFF;
      }
    }
  }
}

.detail-item {
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
    
    .item-spec {
      font-size: 12px;
      color: #999999;
      margin-top: 4px;
      display: block;
    }
    
    .item-qty-price {
      font-size: 13px;
      color: #666666;
      margin-top: 4px;
      display: block;
    }
  }
  
  .item-subtotal {
    font-size: 15px;
    font-weight: bold;
    color: #FF3B30;
    flex-shrink: 0;
  }
}

.address-box {
  padding: 12px;
  background-color: #F9F9F9;
  border-radius: 8px;
  
  .receiver-info {
    font-size: 15px;
    color: #1A1A1A;
    font-weight: 500;
    display: block;
    margin-bottom: 6px;
  }
  
  .address-detail {
    font-size: 14px;
    color: #666666;
    line-height: 1.4;
  }
}

.amount-card {
  .amount-list {
    .amount-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      
      .label {
        font-size: 14px;
        color: #666666;
      }
      
      .value {
        font-size: 14px;
        color: #333333;
        
        &.discount {
          color: #34C759;
        }
      }
      
      &.total-row {
        border-top: 1px solid #E0E0E0;
        margin-top: 10px;
        padding-top: 12px;
        
        .total {
          font-size: 20px;
          font-weight: bold;
          color: #FF3B30;
        }
      }
    }
  }
}

.logistics-section {
  .logistics-info {
    .company, .tracking-no {
      font-size: 14px;
      color: #333333;
      display: block;
      padding: 4px 0;
    }
    
    .tracking-no {
      color: #007AFF;
    }
  }
}

.actions-card {
  margin: 20px 16px;
  text-align: center;
  
  .action-btn {
    width: 200px;
    height: 44px;
    border-radius: 22px;
    font-size: 16px;
    font-weight: 600;
    border: none;
    margin: 8px auto;
    
    &.btn-pay {
      background-color: #FF3B30;
      color: #FFFFFF;
    }
    
    &.btn-cancel {
      background-color: #F5F5F5;
      color: #666666;
    }
    
    &.btn-confirm {
      background-color: #34C759;
      color: #FFFFFF;
    }
  }
}
</style>
