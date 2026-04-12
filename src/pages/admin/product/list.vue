<template>
  <view class="product-admin-page">
    <view class="header">
      <text class="page-title">📦 商品管理</text>
      <button class="add-btn" @tap="goToCreate">+ 新增商品</button>
    </view>

    <view class="search-bar">
      <input 
        v-model="keyword" 
        placeholder="搜索商品名称..."
        @confirm="handleSearch"
        confirm-type="search"
        class="search-input"
      />
    </view>

    <scroll-view scroll-x class="category-tabs">
      <view 
        class="tab-item" 
        :class="{ active: currentCategory === '' }"
        @tap="selectCategory('')"
      >
        <text>全部</text>
      </view>
      <view 
        v-for="cat in categories" 
        :key="cat.value"
        class="tab-item" 
        :class="{ active: currentCategory === cat.value }"
        @tap="selectCategory(cat.value)"
      >
        <text>{{ cat.label }}</text>
      </view>
    </scroll-view>

    <view v-if="loading" class="loading-container">
      <text>加载中...</text>
    </view>

    <view v-else-if="products.length > 0" class="product-list">
      <view 
        class="admin-card card" 
        v-for="product in products" 
        :key="product._id"
      >
        <view class="card-header">
          <image :src="product.coverImage || '/static/placeholder.png'" mode="aspectFill" class="thumb-image" />
          <div class="header-info">
            <text class="prod-name">{{ product.name }}</text>
            <text class="prod-category">{{ getCategoryName(product.category) }}</text>
          </div>
          <view class="status-toggle" :class="{ active: product.status === 'active' }" @tap.stop="toggleStatus(product)">
            <text>{{ product.status === 'active' ? '上架' : '下架' }}</text>
          </view>
        </view>

        <view class="card-body">
          <div class="info-row">
            <span>价格:</span>
            <text class="price">¥{{ product.price.toFixed(2) }}</text>
            <text class="original-price" v-if="product.originalPrice > product.price">¥{{ product.originalPrice.toFixed(2) }}</text>
          </div>
          <div class="info-row">
            <span>库存:</span>
            <text>{{ product.stock }}件</text>
          </div>
          <div class="info-row">
            <span>销量:</span>
            <text>{{ product.salesCount || 0 }}件</text>
          </div>
        </view>

        <view class="card-footer">
          <button class="action-btn edit-btn" @tap="editProduct(product._id)">编辑</button>
          <button class="action-btn delete-btn" @tap="deleteProduct(product._id, product.name)">删除</button>
        </view>
      </view>
    </view>

    <view v-else class="empty-state">
      <text class="empty-text">暂无商品，点击右上角添加</text>
    </view>

    <view class="load-more" v-if="hasMore && !loading">
      <text>加载更多</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const keyword = ref('')
const currentCategory = ref('')
const page = ref(1)
const pageSize = 10
const loading = ref(false)
const hasMore = ref(true)
const products = ref<any[]>([])

const categories = [
  { value: 'vitamin', label: '维生素' },
  { value: 'supplement', label: '保健品' },
  { value: 'health_food', label: '健康食品' },
  { value: 'equipment', label: '器材' },
  { value: 'other', label: '其他' }
]

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
        keyword: keyword.value
      }
    })
    
    const data = (res.data as any)?.data
    if (data?.list) {
      products.value = data.list
      hasMore.value = data.pagination.page < data.pagination.totalPages
    }
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function selectCategory(cat: string) {
  currentCategory.value = cat
  page.value = 1
  loadProducts()
}

function handleSearch() {
  page.value = 1
  loadProducts()
}

function getCategoryName(cat: string): string {
  const item = categories.find(c => c.value === cat)
  return item?.label || cat
}

async function toggleStatus(product: any) {
  const newStatus = product.status === 'active' ? 'inactive' : 'active'
  
  try {
    const res = await uni.request({
      url: `/api/admin/products/${product._id}/status`,
      method: 'PATCH',
      data: { status: newStatus }
    })
    
    if ((res.data as any)?.success) {
      product.status = newStatus
      uni.showToast({ title: newStatus === 'active' ? '已上架' : '已下架', icon: 'success' })
    }
  } catch (error) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function goToCreate() {
  uni.navigateTo({ url: '/pages/admin/product/edit' })
}

function editProduct(id: string) {
  uni.navigateTo({ url: `/pages/admin/product/edit?id=${id}` })
}

function deleteProduct(id: string, name: string) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除"${name}"吗？此操作不可恢复。`,
    confirmColor: '#FF3B30',
    success: async (res) => {
      if (res.confirm) {
        try {
          await uni.request({ url: `/api/admin/products/${id}`, method: 'DELETE' })
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadProducts()
        } catch (error) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.product-admin-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 32px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 16px;
  background-color: #FFFFFF;
  
  .page-title {
    font-size: 20px;
    font-weight: bold;
    color: #1A1A1A;
  }
  
  .add-btn {
    background-color: #007AFF;
    color: #FFFFFF;
    padding: 8px 20px;
    border-radius: 20px;
    font-size: 14px;
    border: none;
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
    padding: 8px 16px;
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

.loading-container, .empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 80px 16px;
  
  text {
    font-size: 16px;
    color: #999999;
  }
}

.product-list {
  padding: 12px 16px;
  
  .admin-card {
    padding: 14px;
    margin-bottom: 10px;

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      
      .thumb-image {
        width: 60px;
        height: 60px;
        border-radius: 8px;
        background-color: #E8E8E8;
        flex-shrink: 0;
      }

      .header-info {
        flex: 1;
        
        .prod-name {
          font-size: 15px;
          font-weight: 500;
          color: #1A1A1A;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .prod-category {
          font-size: 12px;
          color: #999999;
          margin-top: 4px;
          display: block;
        }
      }

      .status-toggle {
        padding: 6px 12px;
        border-radius: 12px;
        background-color: #FF3B30;
        flex-shrink: 0;
        
        text {
          font-size: 12px;
          color: #FFFFFF;
        }
        
        &.active {
          background-color: #34C759;
        }
      }
    }

    .card-body {
      .info-row {
        display: flex;
        gap: 8px;
        padding: 4px 0;
        font-size: 13px;
        color: #666666;
        
        span {
          color: #999999;
          min-width: 40px;
        }
        
        .price {
          font-size: 15px;
          font-weight: bold;
          color: #FF3B30;
        }
        
        .original-price {
          text-decoration: line-through;
          color: #CCCCCC;
        }
      }
    }

    .card-footer {
      display: flex;
      gap: 10px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #F5F5F5;
      
      .action-btn {
        flex: 1;
        height: 36px;
        border-radius: 18px;
        font-size: 14px;
        border: none;
        
        &.edit-btn {
          background-color: #007AFF;
          color: #FFFFFF;
        }
        
        &.delete-btn {
          background-color: #F5F5F5;
          color: #666666;
        }
      }
    }
  }
}

.load-more {
  text-align: center;
  padding: 16px;
  
  text {
    font-size: 13px;
    color: #999999;
  }
}
</style>
