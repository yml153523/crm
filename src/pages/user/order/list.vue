<template>
  <view class="order-list-page">
    <view class="header">
      <text class="page-title">📦 我的订单</text>
    </view>

    <view class="tab-bar">
      <view 
        class="tab-item" 
        :class="{ active: currentTab === tab.value }"
        v-for="tab in tabs" 
        :key="tab.value"
        @tap="switchTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <scroll-view 
      scroll-y 
      class="order-scroll" 
      @scrolltolower="loadMore"
      refresher-enabled
      @refresherrefresh="onRefresh"
    >
      <view v-if="loading && orders.length === 0" class="loading-container">
        <text>加载中...</text>
      </view>

      <view v-else-if="orders.length > 0" class="order-list">
        <view 
          class="order-card card" 
          v-for="order in orders" 
          :key="order._id"
          @tap="goToDetail(order._id)"
        >
          <view class="card-header">
            <text class="order-no">订单号: {{ order.orderNo }}</text>
            <text class="status-badge" :class="'status-' + order.status">{{ getStatusText(order.status) }}</text>
          </view>

          <view class="items-preview">
            <text class="item-text">{{ order.items?.[0]?.productName }}{{ order.items?.length > 1 ? ` 等${order.items.length}件商品` : '' }}</text>
            <text class="amount">¥{{ order.finalAmount?.toFixed(2) || '0.00' }}</text>
          </view>

          <view class="actions">
            <button 
              class="action-btn btn-pay"
              v-if="order.status === 'pending_payment'"
              @tap.stop="payOrder(order._id)"
            >去支付</button>
            
            <button 
              class="action-btn btn-cancel"
              v-if="order.status === 'pending_payment'"
              @tap.stop="cancelOrder(order._id)"
            >取消订单</button>

            <button 
              class="action-btn btn-confirm"
              v-if="order.status === 'delivered'"
              @tap.stop="confirmOrder(order._id)"
            >确认收货</button>

            <button 
              class="action-btn btn-detail"
              @tap.stop="goToDetail(order._id)"
            >查看详情</button>
          </view>
        </view>
      </view>

      <view v-else class="empty-state">
        <text class="empty-icon">📦</text>
        <text class="empty-text">暂无订单</text>
        <button class="shop-btn" @tap="goShopping">去购物</button>
      </view>

      <view class="load-more" v-if="hasMore && !loading">
        <text>上拉加载更多</text>
      </view>
      
      <view class="no-more" v-if="!hasMore && orders.length > 0">
        <text>- 没有更多了 -</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const currentTab = ref('all')
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 10
const orders = ref<any[]>([])

const tabs = [
  { label: '全部', value: 'all' },
  { label: '待支付', value: 'pending_payment' },
  { label: '已支付', value: 'paid' },
  { label: '发货中', value: 'shipping' },
  { label: '已完成', value: 'completed' }
]

onMounted(() => {
  loadOrders()
})

async function onRefresh() {
  page.value = 1
  hasMore.value = true
  await loadOrders()
}

async function loadOrders() {
  if (loading.value) return
  loading.value = true
  
  try {
    const res = await uni.request({
      url: '/api/orders',
      data: {
        page: page.value,
        pageSize,
        status: currentTab.value
      }
    })
    
    const data = (res.data as any)?.data
    if (data?.list) {
      if (page.value === 1) {
        orders.value = data.list
      } else {
        orders.value.push(...data.list)
      }
      
      hasMore.value = data.pagination.page < data.pagination.totalPages
    }
  } catch (error) {
    console.error('加载订单失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  loadOrders()
}

function switchTab(tab: string) {
  currentTab.value = tab
  page.value = 1
  hasMore.value = true
  orders.value = []
  loadOrders()
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending_payment: '待支付',
    paid: '已支付',
    shipping: '发货中',
    delivered: '已送达',
    completed: '已完成',
    cancelled: '已取消',
    refunded: '已退款'
  }
  return map[status] || status
}

function goToDetail(orderId: string) {
  uni.navigateTo({ url: `/pages/user/order/detail?id=${orderId}` })
}

async function payOrder(orderId: string) {
  uni.showModal({
    title: '确认支付',
    content: '确定要支付该订单吗？(模拟支付)',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '支付中...' })
        try {
          const result = await uni.request({
            url: `/api/orders/${orderId}/pay`,
            method: 'POST',
            data: { paymentMethod: 'mock' }
          })
          
          uni.hideLoading()
          
          if ((result.data as any)?.success) {
            uni.showToast({ title: '支付成功', icon: 'success' })
            setTimeout(() => {
              goToDetail(orderId)
            }, 1000)
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

async function cancelOrder(orderId: string) {
  uni.showModal({
    title: '确认取消',
    content: '确定要取消该订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await uni.request({
            url: `/api/orders/${orderId}/cancel`,
            method: 'POST'
          })
          uni.showToast({ title: '订单已取消', icon: 'success' })
          onRefresh()
        } catch (error) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    }
  })
}

async function confirmOrder(orderId: string) {
  uni.showModal({
    title: '确认收货',
    content: '确定已收到货物吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await uni.request({
            url: `/api/orders/${orderId}/confirm`,
            method: 'POST'
          })
          uni.showToast({ title: '确认收货成功', icon: 'success' })
          onRefresh()
        } catch (error) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    }
  })
}

function goShopping() {
  uni.navigateTo({ url: '/pages/user/product/list' })
}
</script>

<style lang="scss" scoped>
.order-list-page {
  min-height: 100vh;
  background-color: #F5F5F5;
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

.tab-bar {
  display: flex;
  padding: 12px 16px;
  background-color: #FFFFFF;
  gap: 8px;
  overflow-x: auto;
  
  .tab-item {
    flex-shrink: 0;
    padding: 8px 16px;
    border-radius: 16px;
    background-color: #F5F5F5;
    
    text {
      font-size: 13px;
      color: #666666;
      white-space: nowrap;
    }
    
    &.active {
      background-color: #007AFF;
      
      text {
        color: #FFFFFF;
        font-weight: 600;
      }
    }
  }
}

.order-scroll {
  height: calc(100vh - 140px);
  
  .loading-container, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 16px;
    
    text {
      font-size: 16px;
      color: #666666;
    }
  }

  .empty-state {
    .empty-icon {
      font-size: 64px;
      margin-bottom: 12px;
    }
    
    .shop-btn {
      background-color: #007AFF;
      color: #FFFFFF;
      padding: 10px 32px;
      border-radius: 20px;
      font-size: 15px;
      border: none;
      margin-top: 16px;
    }
  }
}

.order-list {
  padding: 12px 16px;
  
  .order-card {
    padding: 14px;
    margin-bottom: 10px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      
      .order-no {
        font-size: 13px;
        color: #666666;
      }
      
      .status-badge {
        font-size: 13px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 4px;
        
        &.status-pending_payment { color: #FF9500; background-color: rgba(255, 149, 0, 0.1); }
        &.status-paid { color: #007AFF; background-color: rgba(0, 122, 255, 0.1); }
        &.status-shipping { color: #34C759; background-color: rgba(52, 199, 89, 0.1); }
        &.status-delivered { color: #5856D6; background-color: rgba(88, 86, 214, 0.1); }
        &.status-completed { color: #34C759; background-color: rgba(52, 199, 89, 0.1); }
        &.status-cancelled { color: #999999; background-color: rgba(153, 153, 153, 0.1); }
      }
    }

    .items-preview {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      
      .item-text {
        font-size: 14px;
        color: #333333;
      }
      
      .amount {
        font-size: 16px;
        font-weight: bold;
        color: #FF3B30;
      }
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #F5F5F5;
      
      .action-btn {
        padding: 6px 16px;
        border-radius: 16px;
        font-size: 13px;
        border: none;
        
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
        
        &.btn-detail {
          background-color: #E8E8E8;
          color: #333333;
        }
      }
    }
  }
}

.load-more, .no-more {
  text-align: center;
  padding: 16px;
  
  text {
    font-size: 13px;
    color: #999999;
  }
}
</style>
