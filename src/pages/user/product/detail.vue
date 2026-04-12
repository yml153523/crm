<template>
  <view class="product-detail-page" v-if="product">
    <view class="image-section">
      <swiper 
        :indicator-dots="true" 
        :autoplay="true" 
        circular 
        class="image-swiper"
      >
        <swiper-item v-for="(img, index) in allImages" :key="index">
          <image 
            :src="img || '/static/placeholder.png'" 
            mode="aspectFill"
            class="detail-image"
          />
        </swiper-item>
      </swiper>
    </view>

    <view class="info-card">
      <view class="price-row">
        <text class="current-price">¥{{ product.price.toFixed(2) }}</text>
        <text class="original-price" v-if="product.originalPrice > product.price">¥{{ product.originalPrice.toFixed(2) }}</text>
        <view class="discount-badge" v-if="discountPercent > 0">
          <text>{{ discountPercent }}折</text>
        </view>
      </view>

      <text class="product-name">{{ product.name }}</text>

      <view class="meta-info">
        <text class="meta-item">销量: {{ product.salesCount || 0 }}</text>
        <text class="meta-item">评分: {{ product.rating || 5.0 }}★</text>
        <text class="meta-item">库存: {{ product.stock }}</text>
      </view>

      <view class="tags-row" v-if="product.tags && product.tags.length > 0">
        <text class="tag" v-for="tag in product.tags" :key="tag">{{ tag }}</text>
      </view>
    </view>

    <view class="section-card" v-if="product.variants && product.variants.length > 0">
      <text class="section-title">选择规格</text>
      <scroll-view scroll-x class="variants-scroll">
        <view 
          class="variant-item" 
          :class="{ active: selectedVariant === index }"
          v-for="(variant, index) in product.variants" 
          :key="index"
          @tap="selectVariant(index)"
        >
          <text class="variant-name">{{ variant.name }}</text>
          <text class="variant-price">¥{{ variant.price?.toFixed(2) }}</text>
        </view>
      </scroll-view>
    </view>

    <view class="quantity-section">
      <text class="section-title">购买数量</text>
      <view class="quantity-control">
        <button class="qty-btn" @tap="decreaseQty">-</button>
        <text class="qty-value">{{ quantity }}</text>
        <button class="qty-btn" @tap="increaseQty">+</button>
      </view>
    </view>

    <view class="section-card description-section">
      <text class="section-title">商品描述</text>
      <rich-text class="description" :nodes="product.description || '暂无详细描述'"></rich-text>
    </view>

    <view class="related-video" v-if="product.relatedVideoId">
      <text class="section-title">相关视频介绍</text>
      <view class="video-card" @tap="goToVideo(product.relatedVideoId)">
        <text class="video-link-text">📹 查看产品视频介绍 →</text>
      </view>
    </view>

    <view class="bottom-bar">
      <button class="btn-cart" @tap="addToCart">加入购物车</button>
      <button class="btn-buy" @tap="buyNow">立即购买</button>
    </view>
  </view>

  <view v-else class="loading-container">
    <text>加载中...</text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const product = ref<any>(null)
const selectedVariant = ref<number | null>(null)
const quantity = ref(1)

const allImages = computed(() => {
  if (!product.value) return []
  const images = [product.value.coverImage]
  if (product.value.images && product.value.images.length > 0) {
    images.push(...product.value.images)
  }
  return images.filter(img => img)
})

const discountPercent = computed(() => {
  if (!product.value || !product.value.originalPrice || product.value.originalPrice <= product.value.price) return 0
  return Math.round((product.value.price / product.value.originalPrice) * 10)
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options || {}
  
  if (options.id) {
    loadProductDetail(options.id)
  }
})

async function loadProductDetail(id: string) {
  try {
    uni.showLoading({ title: '加载中...' })
    const res = await uni.request({ url: `/api/products/${id}` })
    
    if ((res.data as any)?.success) {
      product.value = (res.data as any).data.product
      
      if (product.value.variants && product.value.variants.length > 0) {
        selectedVariant.value = 0
      }
    }
  } catch (error) {
    console.error('加载商品详情失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function selectVariant(index: number) {
  selectedVariant.value = index
}

function decreaseQty() {
  if (quantity.value > 1) quantity.value--
}

function increaseQty() {
  const maxStock = product.value?.stock || 999
  if (quantity.value < maxStock) quantity.value++
}

function addToCart() {
  if (!checkStock()) return
  
  uni.showLoading({ title: '添加中...' })
  uni.request({
    url: '/api/cart',
    method: 'POST',
    data: {
      productId: product.value._id,
      quantity: quantity.value,
      variantName: selectedVariant.value !== null ? product.value.variants[selectedVariant.value].name : ''
    },
    success: (res: any) => {
      uni.hideLoading()
      if (res.data?.success) {
        uni.showToast({ title: '已加入购物车', icon: 'success' })
      } else {
        uni.showToast({ title: res.data?.message || '添加失败', icon: 'none' })
      }
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '网络错误', icon: 'none' })
    }
  })
}

function buyNow() {
  if (!checkStock()) return
  
  const items = [{
    productId: product.value._id,
    quantity: quantity.value,
    variantName: selectedVariant.value !== null ? product.value.variants[selectedVariant.value].name : ''
  }]
  
  uni.navigateTo({
    url: `/pages/user/order/create?items=${encodeURIComponent(JSON.stringify(items))}`
  })
}

function checkStock(): boolean {
  if (!product.value) {
    uni.showToast({ title: '商品信息加载中', icon: 'none' })
    return false
  }
  
  if (product.value.stock < quantity.value) {
    uni.showToast({ title: `库存仅剩${product.value.stock}件`, icon: 'none' })
    return false
  }
  
  return true
}

function goToVideo(videoId: string) {
  uni.navigateTo({ url: `/pages/user/video/player?id=${videoId}` })
}
</script>

<style lang="scss" scoped>
.product-detail-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 80px;
}

.image-section {
  .image-swiper {
    height: 375px;
    background-color: #FFFFFF;
    
    .detail-image {
      width: 100%;
      height: 375px;
    }
  }
}

.info-card, .section-card {
  margin: 12px;
  padding: 16px;
  background-color: #FFFFFF;
  border-radius: 12px;
  
  .price-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    
    .current-price {
      font-size: 28px;
      font-weight: bold;
      color: #FF3B30;
    }
    
    .original-price {
      font-size: 14px;
      color: #999999;
      text-decoration: line-through;
    }
    
    .discount-badge {
      background-color: #FF3B30;
      color: #FFFFFF;
      padding: 2px 8px;
      border-radius: 4px;
      
      text {
        font-size: 12px;
      }
    }
  }

  .product-name {
    font-size: 18px;
    font-weight: 600;
    color: #1A1A1A;
    margin-top: 8px;
    display: block;
    line-height: 1.4;
  }

  .meta-info {
    display: flex;
    gap: 16px;
    margin-top: 12px;
    
    .meta-item {
      font-size: 13px;
      color: #666666;
    }
  }

  .tags-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 12px;
    
    .tag {
      font-size: 12px;
      color: #007AFF;
      background-color: rgba(0, 122, 255, 0.08);
      padding: 4px 10px;
      border-radius: 16px;
    }
  }
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  display: block;
  margin-bottom: 12px;
}

.variants-scroll {
  white-space: nowrap;
  
  .variant-item {
    display: inline-block;
    padding: 10px 20px;
    border: 2px solid #E0E0E0;
    border-radius: 8px;
    margin-right: 10px;
    
    &.active {
      border-color: #007AFF;
      background-color: rgba(0, 122, 255, 0.05);
    }
    
    .variant-name {
      font-size: 14px;
      color: #1A1A1A;
      display: block;
    }
    
    .variant-price {
      font-size: 16px;
      font-weight: bold;
      color: #FF3B30;
      margin-top: 4px;
      display: block;
    }
  }
}

.quantity-section {
  .quantity-control {
    display: flex;
    align-items: center;
    gap: 24px;
    
    .qty-btn {
      width: 36px;
      height: 36px;
      border-radius: 18px;
      background-color: #F5F5F5;
      font-size: 20px;
      line-height: 36px;
      text-align: center;
    }
    
    .qty-value {
      font-size: 20px;
      font-weight: 600;
      width: 40px;
      text-align: center;
    }
  }
}

.description-section {
  .description {
    font-size: 14px;
    color: #333333;
    line-height: 1.6;
  }
}

.related-video {
  .video-card {
    padding: 16px;
    background-color: rgba(0, 122, 255, 0.05);
    border-radius: 8px;
    border: 1px dashed #007AFF;
    
    .video-link-text {
      font-size: 15px;
      color: #007AFF;
      font-weight: 500;
    }
  }
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background-color: #FFFFFF;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  
  button {
    flex: 1;
    height: 48px;
    border-radius: 24px;
    font-size: 16px;
    font-weight: 600;
    border: none;
  }
  
  .btn-cart {
    background-color: #FF9500;
    color: #FFFFFF;
  }
  
  .btn-buy {
    background-color: #007AFF;
    color: #FFFFFF;
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
</style>
