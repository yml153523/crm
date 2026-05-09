<template>
  <view class="product-list-page">
    <view class="header">
      <text class="page-title">🛍️ 商品列表</text>
    </view>

    <view class="search-bar">
      <input 
        v-model="keyword" 
        placeholder="搜索商品..." 
        @confirm="handleSearch"
        confirm-type="search"
        class="search-input"
      />
    </view>

    <scroll-view scroll-x class="category-tabs">
      <view 
        class="tab-item" 
        :class="{ active: currentCategory === '' }"
        @click="selectCategory('')"
      >
        <text>全部</text>
      </view>
      <view 
        class="tab-item" 
        :class="{ active: currentCategory === item }"
        v-for="item in categories" 
        :key="item"
        @click="selectCategory(item)"
      >
        <text>{{ getCategoryName(item) }}</text>
      </view>
    </scroll-view>

    <view class="sort-bar">
      <view 
        class="sort-item" 
        :class="{ active: sortBy === 'sales' }"
        @click="changeSort('sales')"
      >
        <text>销量</text>
      </view>
      <view 
        class="sort-item" 
        :class="{ active: sortBy === 'price' }"
        @click="changeSort('price')"
      >
        <text>价格</text>
      </view>
      <view 
        class="sort-item" 
        :class="{ active: sortBy === 'new' }"
        @click="changeSort('new')"
      >
        <text>最新</text>
      </view>
    </view>

    <view class="product-grid" v-if="products.length > 0">
      <view 
        class="product-card" 
        v-for="product in products" 
        :key="product._id"
        @click="goToDetail(product._id)"
      >
        <image 
          :src="product.coverImage || '/static/placeholder.png'" 
          mode="aspectFill" 
          class="product-image"
        />
        
        <view class="product-info">
          <text class="product-name">{{ product.name }}</text>
          
          <view class="tags" v-if="product.tags && product.tags.length > 0">
            <text class="tag" v-for="(tag, idx) in product.tags.slice(0, 2)" :key="idx">{{ tag }}</text>
          </view>

          <view class="price-row">
            <text class="current-price">¥{{ product.price.toFixed(2) }}</text>
            <text class="original-price" v-if="product.originalPrice && product.originalPrice > product.price">¥{{ product.originalPrice.toFixed(2) }}</text>
          </view>

          <view class="meta-row">
            <text class="sales">已售 {{ product.salesCount || 0 }}</text>
            <text class="rating">★ {{ product.rating || 5.0 }}</text>
          </view>

          <view class="badges" v-if="product.isNew || product.isHot || product.isRecommended">
            <text class="badge badge-new" v-if="product.isNew">新品</text>
            <text class="badge badge-hot" v-if="product.isHot">热销</text>
            <text class="badge badge-rec" v-if="product.isRecommended">推荐</text>
          </view>
        </view>
      </view>
    </view>

    <view class="empty-state" v-else-if="!loading">
      <text class="empty-icon">📦</text>
      <text class="empty-text">暂无商品</text>
    </view>

    <view class="loading-more" v-if="hasMore && !loading">
      <text>上拉加载更多</text>
    </view>

    <view class="no-more" v-if="!hasMore && products.length > 0">
      <text>- 没有更多了 -</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const keyword = ref('')
const currentCategory = ref('')
const sortBy = ref('sales')
const page = ref(1)
const pageSize = 10
const loading = ref(false)
const hasMore = ref(true)

const categories = ['vitamin', 'supplement', 'health_food', 'equipment', 'other']
const products = ref<any[]>([])

onMounted(() => {
  loadProducts()
})

async function loadProducts() {
  if (loading.value) return
  loading.value = true
  
  try {
    const res = await uni.request({
      url: '/api/products',
      data: {
        page: page.value,
        pageSize,
        category: currentCategory.value,
        sort: sortBy.value,
        keyword: keyword.value
      }
    })
    
    const data = (res.data as any)?.data
    if (data?.list) {
      if (page.value === 1) {
        products.value = data.list
      } else {
        products.value.push(...data.list)
      }
      
      hasMore.value = data.pagination.page < data.pagination.totalPages
    }
  } catch (error) {
    console.error('加载商品失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function selectCategory(category: string) {
  currentCategory.value = category
  page.value = 1
  hasMore.value = true
  loadProducts()
}

function changeSort(sort: string) {
  sortBy.value = sort
  page.value = 1
  hasMore.value = true
  loadProducts()
}

function handleSearch() {
  page.value = 1
  hasMore.value = true
  loadProducts()
}

function goToDetail(id: string) {
  uni.navigateTo({ url: `/pages/user/product/detail?id=${id}` })
}

function getCategoryName(cat: string): string {
  const map: Record<string, string> = {
    vitamin: '维生素',
    supplement: '保健品',
    health_food: '健康食品',
    equipment: '器材',
    other: '其他'
  }
  return map[cat] || cat
}
</script>

<style lang="scss" scoped>
.product-list-page {
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

.search-bar {
  padding: 12px 16px;
  background-color: #FFFFFF;
  
  .search-input {
    height: 40px;
    padding: 0 16px;
    border-radius: 20px;
    background-color: #F5F5F5;
    font-size: 14px;
  }
}

.category-tabs {
  display: flex;
  padding: 12px 16px;
  background-color: #FFFFFF;
  white-space: nowrap;
  gap: 8px;
  
  .tab-item {
    display: inline-block;
    padding: 6px 16px;
    border-radius: 16px;
    background-color: #F5F5F5;
    
    text {
      font-size: 13px;
      color: #666666;
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

.sort-bar {
  display: flex;
  padding: 10px 16px;
  background-color: #FFFFFF;
  gap: 24px;
  margin-top: 4px;
  
  .sort-item {
    text {
      font-size: 14px;
      color: #666666;
    }
    
    &.active text {
      color: #007AFF;
      font-weight: 600;
    }
  }
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
  
  .product-card {
    background-color: #FFFFFF;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    
    .product-image {
      width: 100%;
      height: 180px;
      background-color: #E8E8E8;
    }
    
    .product-info {
      padding: 12px;
      
      .product-name {
        font-size: 14px;
        color: #1A1A1A;
        font-weight: 500;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .tags {
        display: flex;
        gap: 4px;
        margin-top: 6px;
        
        .tag {
          font-size: 11px;
          color: #007AFF;
          background-color: rgba(0, 122, 255, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
        }
      }

      .price-row {
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin-top: 8px;
        
        .current-price {
          font-size: 18px;
          font-weight: bold;
          color: #FF3B30;
        }
        
        .original-price {
          font-size: 12px;
          color: #999999;
          text-decoration: line-through;
        }
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        margin-top: 6px;
        
        .sales, .rating {
          font-size: 12px;
          color: #999999;
        }
        
        .rating {
          color: #FF9500;
        }
      }

      .badges {
        display: flex;
        gap: 4px;
        margin-top: 6px;
        
        .badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          
          &.badge-new {
            background-color: #34C759;
            color: #FFFFFF;
          }
          
          &.badge-hot {
            background-color: #FF3B30;
            color: #FFFFFF;
          }
          
          &.badge-rec {
            background-color: #FF9500;
            color: #FFFFFF;
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
  padding: 80px 16px;
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }
  
  .empty-text {
    font-size: 16px;
    color: #999999;
  }
}

.loading-more, .no-more {
  text-align: center;
  padding: 16px;
  
  text {
    font-size: 13px;
    color: #999999;
  }
}
</style>
