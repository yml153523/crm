<template>
  <view class="cart-page">
    <!-- 未登录状态 -->
    <view class="not-logged-in" v-if="notLoggedIn">
      <text class="nli-icon">🔒</text>
      <text class="nli-text">请先登录后查看购物车</text>
      <view class="nli-btn" @click="goLogin">
        <text class="nli-btn-text">去登录</text>
      </view>
    </view>

    <template v-else>
    <view class="header">
      <text class="page-title">🛒 购物车</text>
      <text class="item-count" v-if="cartData.itemCount > 0">({{ cartData.itemCount }}件)</text>
    </view>

    <view v-if="loading" class="loading-container">
      <text>加载中...</text>
    </view>

    <view v-else-if="cartData.items && cartData.items.length > 0">
      <view class="cart-list">
        <view 
          class="cart-item card" 
          v-for="item in cartData.items" 
          :key="item._id"
        >
          <image 
            :src="item.product?.coverImage || '/static/placeholder.png'" 
            mode="aspectFill"
            class="item-image"
          />
          
          <view class="item-info">
            <text class="item-name">{{ item.product?.name || '商品已下架' }}</text>
            <text class="item-variant" v-if="item.variantName">规格: {{ item.variantName }}</text>
            
            <view class="item-bottom">
              <view class="price-row">
                <text class="item-price">¥{{ item.price.toFixed(2) }}</text>
                <text class="item-subtotal">小计: ¥{{ item.subtotal.toFixed(2) }}</text>
              </view>

              <view class="quantity-control">
                <button class="qty-btn" @click="updateQuantity(item._id, item.quantity - 1)">-</button>
                <text class="qty-value">{{ item.quantity }}</text>
                <button class="qty-btn" @click="updateQuantity(item._id, item.quantity + 1)">+</button>
              </view>
            </view>
          </view>

          <button class="delete-btn" @click="removeItem(item._id)">🗑️</button>
        </view>
      </view>

      <view class="summary-card card">
        <view class="summary-row">
          <text class="label">商品金额</text>
          <text class="value">¥{{ cartData.totalAmount.toFixed(2) }}</text>
        </view>
        
        <view class="summary-row total-row">
          <text class="label">合计</text>
          <text class="value total-amount">¥{{ cartData.totalAmount.toFixed(2) }}</text>
        </view>
      </view>

      <button class="checkout-btn" @click="goToCheckout">
        去结算 ({{ cartData.itemCount }}件)
      </button>

      <button class="clear-btn" @click="clearCart">
        清空购物车
      </button>
    </view>

    <view v-else class="empty-state">
      <text class="empty-icon">🛒</text>
      <text class="empty-text">购物车是空的</text>
      <button class="shop-btn" @click="goShopping">去逛逛</button>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { MESSAGES, TOAST_ICON } from '@/config/constants'
import { ref, onMounted } from 'vue'
import { requireLogin } from '@/utils/auth'

const loading = ref(true)
const cartData = ref<any>({ items: [], totalAmount: 0, itemCount: 0 })
const notLoggedIn = ref(false)

onMounted(() => {
  if (!requireLogin()) {
    notLoggedIn.value = true
    return
  }
  loadCart()
})

async function loadCart() {
  loading.value = true
  try {
    const res = await uni.request({ url: '/api/cart' })
    
    if ((res.data as any)?.success) {
      cartData.value = (res.data as any).data
    }
  } catch (error) {
    console.error('加载购物车失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function updateQuantity(itemId: string, newQty: number) {
  if (newQty < 1) return
  
  try {
    const res = await uni.request({
      url: `/api/cart/item/${itemId}`,
      method: 'PUT',
      data: { quantity: newQty }
    })
    
    if ((res.data as any)?.success) {
      if ((res.data as any).data?.adjustedQuantity) {
        uni.showToast({ title: (res.data as any).data.message, icon: 'none' })
      }
      await loadCart()
    } else {
      uni.showToast({ title: (res.data as any)?.message || '更新失败', icon: 'none' })
    }
  } catch (error) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function removeItem(itemId: string) {
  uni.showModal({
    title: MESSAGES.COMMON.CONFIRM_DELETE,
    content: '确定要删除该商品吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await uni.request({
            url: `/api/cart/item/${itemId}`,
            method: 'DELETE'
          })
          await loadCart()
          uni.showToast({ title: '已删除', icon: 'success' })
        } catch (error) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

async function clearCart() {
  uni.showModal({
    title: '确认清空',
    content: '确定要清空购物车吗？此操作不可撤销。',
    confirmColor: '#FF3B30',
    success: async (res) => {
      if (res.confirm) {
        try {
          await uni.request({ url: '/api/cart/clear', method: 'DELETE' })
          cartData.value = { items: [], totalAmount: 0, itemCount: 0 }
          uni.showToast({ title: '已清空', icon: 'success' })
        } catch (error) {
          uni.showToast({ title: '清空失败', icon: 'none' })
        }
      }
    }
  })
}

function goToCheckout() {
  uni.navigateTo({ url: '/pages/user/order/create' })
}

function goShopping() {
  uni.switchTab({ url: '/pages/user/product/list' }) || uni.navigateTo({ url: '/pages/user/product/list' })
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/index' })
}
</script>

<style lang="scss" scoped>
.cart-page {
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

.cart-page {
  padding-bottom: 120px;
}

.header {
  display: flex;
  align-items: center;
  padding: 20px 16px;
  background-color: #FFFFFF;
  
  .page-title {
    font-size: 20px;
    font-weight: bold;
    color: #1A1A1A;
  }
  
  .item-count {
    font-size: 14px;
    color: #666666;
    margin-left: 8px;
  }
}

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
  
  .empty-text {
    margin-bottom: 20px;
  }
  
  .shop-btn {
    background-color: #007AFF;
    color: #FFFFFF;
    padding: 12px 40px;
    border-radius: 24px;
    font-size: 16px;
    border: none;
  }
}

.cart-list {
  padding: 12px 16px;
  
  .cart-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    margin-bottom: 10px;
    
    .item-image {
      width: 100px;
      height: 100px;
      border-radius: 8px;
      background-color: #E8E8E8;
      flex-shrink: 0;
    }
    
    .item-info {
      flex: 1;
      
      .item-name {
        font-size: 15px;
        color: #1A1A1A;
        font-weight: 500;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .item-variant {
        font-size: 12px;
        color: #999999;
        margin-top: 4px;
        display: block;
      }

      .item-bottom {
        margin-top: 8px;
        
        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          
          .item-price {
            font-size: 16px;
            font-weight: bold;
            color: #FF3B30;
          }
          
          .item-subtotal {
            font-size: 13px;
            color: #666666;
          }
        }

        .quantity-control {
          display: flex;
          align-items: center;
          gap: 12px;
          
          .qty-btn {
            width: 28px;
            height: 28px;
            border-radius: 14px;
            background-color: #F5F5F5;
            font-size: 16px;
            line-height: 28px;
            text-align: center;
            border: none;
          }
          
          .qty-value {
            font-size: 16px;
            font-weight: 600;
            min-width: 30px;
            text-align: center;
          }
        }
      }
    }
    
    .delete-btn {
      background: none;
      border: none;
      font-size: 18px;
      padding: 4px;
    }
  }
}

.summary-card {
  margin: 12px 16px;
  padding: 16px;
  
  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    
    .label {
      font-size: 14px;
      color: #666666;
    }
    
    .value {
      font-size: 14px;
      color: #1A1A1A;
    }
    
    &.total-row {
      border-top: 1px solid #E0E0E0;
      padding-top: 12px;
      margin-top: 8px;
      
      .total-amount {
        font-size: 22px;
        font-weight: bold;
        color: #FF3B30;
      }
    }
  }
}

.checkout-btn {
  position: fixed;
  bottom: 70px;
  left: 16px;
  right: 16px;
  height: 48px;
  background-color: #007AFF;
  color: #FFFFFF;
  border-radius: 24px;
  font-size: 17px;
  font-weight: 600;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.clear-btn {
  position: fixed;
  bottom: 126px;
  right: 16px;
  background: none;
  color: #FF3B30;
  font-size: 14px;
  border: none;
  padding: 8px;
}
</style>
