<template>
  <AdminLayout title="商品管理" :showBack="true">
  <view class="product-page">
    <!-- ========== 1. 统计面板 (新增) ========== -->
    <view class="stats-panel">
      <view class="stat-card" v-for="(stat, index) in statsData" :key="index">
        <text class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</text>
        <text class="stat-label">{{ stat.label }}</text>
        <text class="stat-badge warning" v-if="stat.badge">⚠️</text>
      </view>
    </view>

    <!-- ========== 2. 搜索与筛选工具栏 (增强) ========== -->
    <view class="toolbar">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input type="text" v-model="searchText" placeholder="搜索商品名称..." @confirm="handleSearch" class="search-input" />
      </view>
      <view class="add-btn" @click="showAddDialog">
        <text>＋ 添加</text>
      </view>
      <view class="filter-btn" :class="{ active: showFilter }" @click="showFilter = !showFilter">
        <text>筛选</text>
      </view>
    </view>

    <!-- 筛选面板 (增强) -->
    <view class="filter-panel" v-if="showFilter">
      <view class="filter-section">
        <text class="section-title">分类</text>
        <scroll-view scroll-x class="chip-scroll">
          <view class="chip" :class="{ active: currentCategory === 'all' }" @click="currentCategory = 'all'; applyFilters()">全部</view>
          <view
            class="chip"
            :class="{ active: currentCategory === cat.value }"
            v-for="cat in categoryOptions"
            :key="cat.value"
            @click="currentCategory = cat.value; applyFilters()"
          >{{ cat.label }}</view>
        </scroll-view>
      </view>

      <view class="filter-section">
        <text class="section-title">状态</text>
        <scroll-view scroll-x class="chip-scroll">
          <view class="chip" :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'; applyFilters()">全部</view>
          <view class="chip" :class="{ active: statusFilter === 'active' }" @click="statusFilter = 'active'; applyFilters()">在售</view>
          <view class="chip" :class="{ active: statusFilter === 'inactive' }" @click="statusFilter = 'inactive'; applyFilters()">下架</view>
          <view class="chip chip-warning" :class="{ active: statusFilter === 'low_stock' }" @click="statusFilter = 'low_stock'; applyFilters()">⚠️ 库存不足</view>
        </scroll-view>
      </view>

      <view class="filter-section">
        <text class="section-title">排序</text>
        <scroll-view scroll-x class="chip-scroll">
          <view class="chip" :class="{ active: sortBy === 'createdAt' }" @click="sortBy = 'createdAt'; sortOrder = -1; applyFilters()">最新上架</view>
          <view class="chip" :class="{ active: sortBy === 'salesCount' }" @click="sortBy = 'salesCount'; sortOrder = -1; applyFilters()">销量最高</view>
          <view class="chip" :class="{ active: sortBy === 'price' && sortOrder === 1 }" @click="sortBy = 'price'; sortOrder = 1; applyFilters()">价格从低到高</view>
          <view class="chip" :class="{ active: sortBy === 'price' && sortOrder === -1 }" @click="sortBy = 'price'; sortOrder = -1; applyFilters()">价格从高到低</view>
        </scroll-view>
      </view>
    </view>

    <!-- 批量操作栏 (新增) -->
    <view class="batch-toolbar" v-if="selectedIds.length > 0">
      <text class="selected-count">已选 {{ selectedIds.length }} 项</text>
      <view class="batch-actions">
        <view class="batch-btn btn-online" @click="batchUpdateStatus('active')">
          <text>批量上架</text>
        </view>
        <view class="batch-btn btn-offline" @click="batchUpdateStatus('inactive')">
          <text>批量下架</text>
        </view>
        <view class="batch-btn btn-cancel" @click="selectedIds = []">
          <text>取消选择</text>
        </view>
      </view>
    </view>

    <!-- ========== 3. 商品列表 (增强版) ========== -->
    <view class="product-list">
      <view class="product-card card" v-for="(item, index) in filteredProductList" :key="item._id || index">
        <!-- 选择框 + 商品图片 -->
        <view class="card-top">
          <view class="checkbox-wrap" @click.stop="toggleSelect(item._id)">
            <view class="checkbox" :class="{ checked: selectedIds.includes(item._id) }">
              <text v-if="selectedIds.includes(item._id)">✓</text>
            </view>
          </view>

          <image
            :src="item.images?.[0] || '/static/images/placeholder.png'"
            mode="aspectFill"
            class="product-image"
          />

          <!-- 库存预警标识 (新增) -->
          <view class="stock-badge low-stock" v-if="item.stock !== undefined && item.stock <= 10 && item.stock > 0">
            <text>⚠️ 库存紧张 ({{ item.stock }}件)</text>
          </view>
          <view class="stock-badge out-of-stock" v-if="item.status === 'out_of_stock' || item.stock === 0">
            <text>❌ 已售罄</text>
          </view>
        </view>

        <!-- 商品信息区 -->
        <view class="info-section">
          <!-- 标题行：名称 + 状态标签 -->
          <view class="title-row">
            <text class="title">{{ item.name }}</text>
            <view class="status-tag" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </view>
          </view>

          <!-- 价格行 (增强显示) -->
          <view class="price-row">
            <text class="current-price">¥{{ formatPrice(item.price) }}</text>
            <text class="original-price" v-if="isValidPrice(item.originalPrice) && item.originalPrice > item.price">
              ¥{{ formatPrice(item.originalPrice) }}
            </text>
            <text class="discount-tag" v-if="isValidPrice(item.originalPrice) && item.originalPrice > item.price">
              {{ Math.round((1 - item.price / item.originalPrice) * 100) }}% OFF
            </text>
          </view>

          <!-- 数据指标行 (新增) -->
          <view class="metrics-grid">
            <view class="metric-item">
              <text class="metric-value">💰 {{ (typeof item.salesCount === 'number' && !isNaN(item.salesCount)) ? item.salesCount : 0 }}</text>
              <text class="metric-label">已售</text>
            </view>
            <view class="metric-item">
              <text class="metric-value" :class="{ 'low-stock': (item.stock || 0) <= 10 }">📦 {{ (typeof item.stock === 'number' && !isNaN(item.stock)) ? item.stock : 'N/A' }}</text>
              <text class="metric-label">库存</text>
            </view>
            <view class="metric-item" v-if="isValidPrice(item.rating)">
              <text class="metric-value">⭐{{ formatPrice(item.rating) }}</text>
              <text class="metric-label">评分</text>
            </view>
          </view>

          <!-- 关联视频信息 (新增) -->
          <view class="video-relation" v-if="item.relatedVideoId || item.relatedVideoName">
            <text class="video-icon">🎬</text>
            <text class="video-name">演示视频: {{ item.relatedVideoName || '已关联' }}</text>
            <text class="video-link" @click="previewRelatedVideo(item)">▶ 播放</text>
          </view>

          <!-- 分类标签 -->
          <view class="category-tag">
            🏷️ {{ getCategoryLabel(item.category) }}
          </view>
        </view>

        <!-- 操作按钮组 (优化) -->
        <view class="action-row">
          <view class="action-btn primary" @click="editProduct(item)">
            <text>编辑</text>
          </view>
          <view
            class="action-btn"
            :class="item.status === 'active' ? 'warning' : 'success'"
            @click="toggleStatus(item)"
          >
            <text>{{ item.status === 'active' ? '下架' : '上架' }}</text>
          </view>
          <view class="action-btn danger" @click="deleteProduct(item)">
            <text>删除</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-if="!filteredProductList.length && !loading">
        <text class="empty-icon">🛒</text>
        <text class="empty-text">暂无商品数据</text>
        <text class="empty-hint" v-if="searchText || currentCategory !== 'all'">
          尝试调整筛选条件或搜索关键词
        </text>
        <view class="empty-action" @click="showAddDialog">
          <text>添加第一个商品</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="load-more" v-if="filteredProductList.length > 0">
        <text v-if="loading">⏳ 加载中...</text>
        <text v-else-if="hasMore" @click="loadMore">— 上拉加载更多 —</text>
        <text v-else>— 已经到底了 —</text>
      </view>
    </view>

    <!-- 添加/编辑弹窗 (新增) -->
    <view class="modal-overlay" v-if="showModal" @click.self="closeModal">
      <view class="modal-content card" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingProduct ? '✏️ 编辑商品' : '➕ 添加商品' }}</text>
          <view class="modal-close" @click="closeModal">✕</view>
        </view>

        <scroll-view scroll-y class="modal-body">
          <view class="form-group">
            <text class="form-label">商品名称 *</text>
            <input type="text" v-model="formData.name" placeholder="请输入商品名称" class="form-input" />
          </view>

          <view class="form-group">
            <text class="form-label">描述</text>
            <textarea v-model="formData.description" placeholder="请输入商品描述" class="form-textarea" />
          </view>

          <view class="form-row">
            <view class="form-group flex-1">
              <text class="form-label">分类 *</text>
              <picker :value="categoryIndex" :range="categoryOptions.map(c => c.label)" @change="onCategoryChange">
                <view class="picker-input">{{ categoryOptions[categoryIndex]?.label || '请选择' }} ▼</view>
              </picker>
            </view>
            <view class="form-group flex-1">
              <text class="form-label">价格 (元) *</text>
              <input type="digit" v-model="formData.price" placeholder="0.00" class="form-input" />
            </view>
          </view>

          <view class="form-row">
            <view class="form-group flex-1">
              <text class="form-label">原价 (元)</text>
              <input type="digit" v-model="formData.originalPrice" placeholder="用于显示折扣" class="form-input" />
            </view>
            <view class="form-group flex-1">
              <text class="form-label">库存数量 *</text>
              <input type="number" v-model="formData.stock" placeholder="0" class="form-input" />
            </view>
          </view>

          <view class="form-group">
            <text class="form-label">关联视频ID (可选)</text>
            <input type="text" v-model="formData.relatedVideoId" placeholder="留空则不关联" class="form-input" />
            <text class="form-hint">💡 关联后商品详情页将展示该视频作为演示</text>
          </view>
        </scroll-view>

        <view class="modal-footer">
          <view class="btn btn-cancel" @click="closeModal">
            <text>取消</text>
          </view>
          <view class="btn btn-primary" @click="submitForm" :class="{ disabled: !isFormValid }">
            <text>{{ editingProduct ? '保存' : '创建' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import { apiGet, apiPost, apiPut } from '@/utils/request'
import { productSync } from '@/utils/realtime-sync-integration'
import { MESSAGES, UI_COLORS, API_PATHS, TOAST_ICON } from '@/config/constants'

// 价格格式化安全函数
function formatPrice(price: any): string {
  if (typeof price !== 'number' || isNaN(price) || price < 0) return '0.00'
  return price.toFixed(2)
}

// 价格有效性验证
function isValidPrice(price: any): boolean {
  return typeof price === 'number' && !isNaN(price) && price > 0
}

const loading = ref(false)
const productList = ref<any[]>([])
const searchText = ref('')
const showFilter = ref(false)
const currentCategory = ref('all')
const statusFilter = ref('all')
const sortBy = ref<string>('createdAt')
const sortOrder = ref(-1)
const selectedIds = ref<string[]>([])

// 弹窗相关
const showModal = ref(false)
const editingProduct = ref<any>(null)
const formData = ref<any>({})
const categoryIndex = ref(0)

// 配置选项
const categoryOptions = [
  { value: 'vitamin', label: '维生素' },
  { value: 'supplement', label: '补充剂' },
  { value: 'health_food', label: '保健食品' },
  { value: 'equipment', label: '健身设备' },
  { value: 'other', label: '其他' }
]

// 统计数据 (新增)
const statsData = computed(() => {
  const total = productList.value.length
  const totalSales = productList.value.reduce((sum, p) => sum + ((p.salesCount || 0) * (p.price || 0)), 0)
  const totalStock = productList.value.reduce((sum, p) => sum + (p.stock || 0), 0)
  const lowStockCount = productList.value.filter(p => p.stock !== undefined && p.stock <= 10).length

  return [
    { label: '总商品数', value: total.toString(), color: '#007AFF', badge: false },
    { label: '总销售额', value: `¥${formatNumber(totalSales)}`, color: '#34C759', badge: false },
    { label: '总库存', value: formatNumber(totalStock), color: '#FF9500', badge: false },
    { label: '库存预警', value: `${lowStockCount}种`, color: '#FF3B30', badge: lowStockCount > 0 }
  ]
})

// 过滤后的列表
const filteredProductList = computed(() => {
  let list = [...productList.value]

  // 搜索过滤
  if (searchText.value.trim()) {
    const keyword = searchText.value.toLowerCase()
    list = list.filter(p =>
      (p.name || '').toLowerCase().includes(keyword) ||
      (p.description || '').toLowerCase().includes(keyword)
    )
  }

  // 分类过滤
  if (currentCategory.value !== 'all') {
    list = list.filter(p => p.category === currentCategory.value)
  }

  // 状态过滤
  if (statusFilter.value !== 'all') {
    if (statusFilter.value === 'low_stock') {
      list = list.filter(p => p.stock !== undefined && p.stock <= 10 && p.stock > 0)
    } else {
      list = list.filter(p => p.status === statusFilter.value)
    }
  }

  // 排序
  list.sort((a, b) => {
    const aVal = a[sortBy.value as keyof any]
    const bVal = b[sortBy.value as keyof any]
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * sortOrder.value
    }
    return 0
  })

  return list
})

const hasMore = computed(() => false)

const isFormValid = computed(() => {
  return formData.value.name?.trim() &&
         categoryOptions.some(c => c.value === formData.value.category) &&
         parseFloat(formData.value.price) >= 0 &&
         parseInt(formData.value.stock) >= 0
})

onMounted(() => {
  loadProducts()
})

watch([currentCategory, statusFilter], () => {
  console.log('筛选条件变化')
})

async function loadProducts() {
  loading.value = true
  try {
    const res = await apiGet(API_PATHS.PRODUCTS, { page: 1, pageSize: 100 })

    if (res.success) {
      const data = res.data
      const products = data.list || data || []

      productList.value = Array.isArray(products) ? products.map((p: any) => ({
        ...p,
        relatedVideoName: p.relatedVideoTitle || null
      })) : []
    } else {
      loadDemoProducts()
    }
  } catch (error) {
    console.error('加载商品列表失败:', error)
    productList.value = []
    uni.showToast({ title: MESSAGES.COMMON.LOADING + '商品列表', icon: TOAST_ICON.NONE })
  } finally {
    loading.value = false
  }
}

function loadDemoProducts() {
  productList.value = [
    { _id: 'demo-p1', title: 'VIP会员月卡', price: 29.90, stock: 999, category: '会员', status: 'published', sales: 1280, createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
    { _id: 'demo-p2', title: '《销售实战技巧》电子书', price: 49.00, stock: 500, category: '电子书', status: 'published', sales: 356, createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
    { _id: 'demo-p3', title: '企业咨询一对一服务', price: 1999.00, stock: 10, category: '服务', status: 'published', sales: 28, createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
    { _id: 'demo-p4', title: 'CRM系统高级版授权', price: 599.00, stock: 100, category: '软件', status: 'draft', sales: 0, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  ]
}

function handleSearch() {
  console.log('搜索:', searchText.value)
}

function applyFilters() {
  console.log('应用筛选')
}

function loadMore() {
  console.log('加载更多')
}

// 选择/取消选择
function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

// 批量操作
async function batchUpdateStatus(status: string) {
  if (selectedIds.value.length === 0) return

  uni.showModal({
    title: '批量操作确认',
    content: `确定要将选中的 ${selectedIds.value.length} 个商品${status === 'active' ? '上架' : '下架'}吗？`,
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '处理中...' })
        try {
          await new Promise(resolve => setTimeout(resolve, 500))

          productList.value = productList.value.map(p =>
            selectedIds.value.includes(p._id) ? { ...p, status } : p
          )

          uni.showToast({ title: `已${status === 'active' ? '上架' : '下架'} ${selectedIds.value.length} 个商品`, icon: TOAST_ICON.SUCCESS })
          selectedIds.value = []
        } catch (error) {
          uni.showToast({ title: MESSAGES.COMMON.ERROR, icon: TOAST_ICON.NONE })
        } finally {
          uni.hideLoading()
        }
      }
    }
  })
}

function showAddDialog() {
  editingProduct.value = null
  formData.value = {
    name: '',
    description: '',
    category: 'vitamin',
    price: '',
    originalPrice: '',
    stock: '0',
    relatedVideoId: ''
  }
  categoryIndex.value = 0
  showModal.value = true
}

function editProduct(item: any) {
  editingProduct.value = item
  formData.value = { ...item }
  const catIdx = categoryOptions.findIndex(c => c.value === item.category)
  categoryIndex.value = catIdx >= 0 ? catIdx : 0
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingProduct.value = null
}

function onCategoryChange(e: any) {
  categoryIndex.value = e.detail.value
  formData.value.category = categoryOptions[e.detail.value].value
}

async function submitForm() {
  if (!isFormValid.value) {
    uni.showToast({ title: '请填写完整信息', icon: TOAST_ICON.NONE })
    return
  }

  try {
    const payload = {
      name: formData.value.name.trim(),
      description: formData.value.description.trim(),
      category: formData.value.category,
      price: parseFloat(formData.value.price),
      originalPrice: formData.value.originalPrice ? parseFloat(formData.value.originalPrice) : undefined,
      stock: parseInt(formData.value.stock),
      relatedVideoId: formData.value.relatedVideoId || undefined
    }

    let res: any
    if (editingProduct.value) {
      res = await productSync.update(
        apiPut(`${API_PATHS.PRODUCTS}/${editingProduct.value._id}`, payload)
      )
    } else {
      res = await productSync.create(
        apiPost(API_PATHS.PRODUCTS, payload)
      )
    }

    if (res.success) {
      uni.showToast({ 
        title: editingProduct.value ? '✅ 已保存！用户端将实时更新' : '✅ 创建成功！用户端已收到通知', 
        icon: TOAST_ICON.SUCCESS,
        duration: 2000
      })
      closeModal()
      loadProducts()
    } else {
      uni.showToast({ title: (res.data as any)?.message || MESSAGES.COMMON.ERROR, icon: TOAST_ICON.NONE })
    }
  } catch (error) {
    console.error('提交表单失败:', error)
    uni.showToast({ title: MESSAGES.COMMON.NETWORK_ERROR, icon: TOAST_ICON.NONE })
  }
}

async function toggleStatus(item: any) {
  const newStatus = item.status === 'active' ? 'inactive' : 'active'
  const actionText = newStatus === 'active' ? '上架' : '下架'

  uni.showModal({
    title: `确认${actionText}`,
    content: `确定要${actionText}商品"${item.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await new Promise(resolve => setTimeout(resolve, 300))
          item.status = newStatus
          uni.showToast({ title: `已${actionText}`, icon: TOAST_ICON.SUCCESS })
        } catch (error) {
          uni.showToast({ title: MESSAGES.COMMON.ERROR, icon: TOAST_ICON.NONE })
        }
      }
    }
  })
}

async function deleteProduct(item: any) {
  uni.showModal({
    title: MESSAGES.COMMON.CONFIRM_DELETE,
    content: `确定要删除商品"${item.name}"吗？此操作不可恢复！`,
    confirmColor: UI_COLORS.DANGER,
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '删除中...' })
        try {
          const index = productList.value.findIndex(p => p._id === item._id)
          if (index > -1) {
            productList.value.splice(index, 1)
          }
          uni.showToast({ title: MESSAGES.COMMON.DELETE_SUCCESS, icon: TOAST_ICON.SUCCESS })
        } catch (error) {
          uni.showToast({ title: '删除失败', icon: TOAST_ICON.NONE })
        } finally {
          uni.hideLoading()
        }
      }
    }
  })
}

function previewRelatedVideo(item: any) {
  if (!item.relatedVideoId) {
    uni.showToast({ title: '未关联视频', icon: TOAST_ICON.NONE })
    return
  }

  uni.navigateTo({
    url: `/pages/admin/video/list`
  })

  uni.showToast({ title: '跳转到视频管理页面', icon: TOAST_ICON.NONE })
}

function getStatusClass(status: string): string {
  const map: Record<string, string> = {
    active: 'status-active',
    inactive: 'status-inactive',
    out_of_stock: 'status-out-of-stock'
  }
  return map[status] || ''
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    active: '在售',
    inactive: '已下架',
    out_of_stock: '售罄'
  }
  return map[status] || status
}

function getCategoryLabel(category: string): string {
  const found = categoryOptions.find(c => c.value === category)
  return found ? found.label : category || '未分类'
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}
</script>

<style lang="scss" scoped>
.product-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 100px;
}

/* 统计面板 */
.stats-panel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.stat-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  padding: 12px 6px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;

  .stat-value {
    display: block;
    font-size: 18px;
    font-weight: bold;
    color: #1A1A1A;
    margin-bottom: 2px;
  }

  .stat-label {
    display: block;
    font-size: 11px;
    color: #666666;
  }

  .stat-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    font-size: 10px;

    &.warning { animation: pulse 1s infinite; }
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 工具栏 */
.toolbar {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  background: #FFFFFF;
  align-items: center;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: #F5F5F5;
  border-radius: 20px;
  padding: 0 14px;
  height: 40px;

  .search-icon { margin-right: 8px; font-size: 16px; }
  .search-input {
    flex: 1;
    height: 40px;
    font-size: 14px;
    border: none;
    outline: none;
    background: transparent;
  }
}

.add-btn {
  padding: 10px 18px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-radius: 8px;
  font-size: 14px;
  color: #FFFFFF;
  font-weight: 500;
  white-space: nowrap;
}

.filter-btn {
  padding: 10px 16px;
  background: #F5F5F5;
  border-radius: 8px;
  font-size: 14px;
  color: #666666;

  &.active { background: #11998e; color: #FFFFFF; }
}

/* 筛选面板 */
.filter-panel {
  background: #FFFFFF;
  padding: 12px 16px;
  border-top: 1px solid #F0F0F0;
}

.filter-section {
  margin-bottom: 12px;

  &:last-child { margin-bottom: 0; }

  .section-title {
    font-size: 12px;
    color: #999999;
    font-weight: 600;
    margin-bottom: 8px;
    display: block;
  }
}

.chip-scroll {
  white-space: nowrap;
  display: flex;
  gap: 8px;
}

.chip {
  display: inline-block;
  padding: 6px 14px;
  background: #F5F5F5;
  border-radius: 16px;
  font-size: 13px;
  color: #666;

  &.active {
    background: #11998e;
    color: #FFFFFF;
  }

  &.chip-warning.active {
    background: linear-gradient(135deg, #FF9500, #FF3B30);
  }
}

/* 批量操作栏 */
.batch-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #FFF3CD;
  border-bottom: 1px solid #FFE69C;

  .selected-count {
    font-size: 14px;
    font-weight: 600;
    color: #856404;
  }

  .batch-actions {
    display: flex;
    gap: 8px;

    .batch-btn {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;

      &.btn-online { background: #34C759; color: #fff; }
      &.btn-offline { background: #FF9500; color: #fff; }
      &.btn-cancel { background: #E0E0E0; color: #666; }
    }
  }
}

/* 商品列表 */
.product-list {
  padding: 12px 16px;
}

.product-card {
  background: #FFFFFF;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-top {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;

  .checkbox-wrap {
    flex-shrink: 0;

    .checkbox {
      width: 22px;
      height: 22px;
      border: 2px solid #CCCCCC;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.9);

      &.checked {
        background: #11998e;
        border-color: #11998e;
        color: #FFFFFF;
        font-size: 12px;
      }
    }
  }

  .product-image {
    width: 80px;
    height: 80px;
    border-radius: 8px;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    flex-shrink: 0;
  }

  .stock-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 3px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;

    &.low-stock {
      background: rgba(255, 149, 0, 0.95);
      color: #FFFFFF;
    }

    &.out-of-stock {
      background: rgba(255, 59, 48, 0.95);
      color: #FFFFFF;
    }
  }
}

.info-section {
  padding: 0 12px 10px;

  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;

    .title {
      font-size: 15px;
      font-weight: 600;
      color: #1A1A1A;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-tag {
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;

      &.status-active { background: rgba(52, 199, 89, 0.15); color: #34C759; }
      &.status-inactive { background: rgba(153, 153, 153, 0.15); color: #999999; }
      &.status-out-of-stock { background: rgba(255, 59, 48, 0.15); color: #FF3B30; }
    }
  }

  /* 价格行 */
  .price-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 8px;

    .current-price {
      font-size: 20px;
      font-weight: bold;
      color: #FF3B30;
    }

    .original-price {
      font-size: 13px;
      color: #999999;
      text-decoration: line-through;
    }

    .discount-tag {
      padding: 2px 6px;
      background: linear-gradient(135deg, #FF3B30, #FF9500);
      color: #FFFFFF;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 600;
    }
  }

  /* 数据指标网格 */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 8px;

    .metric-item {
      text-align: center;
      padding: 6px;
      background: #FAFAFA;
      border-radius: 6px;

      .metric-value {
        display: block;
        font-size: 14px;
        font-weight: bold;
        color: #333333;

        &.low-stock { color: #FF9500; }
      }

      .metric-label {
        display: block;
        font-size: 10px;
        color: #999999;
        margin-top: 2px;
      }
    }
  }

  /* 关联视频 */
  .video-relation {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: rgba(102, 126, 234, 0.08);
    border-radius: 6px;
    margin-bottom: 6px;

    .video-icon { font-size: 14px; }
    .video-name {
      flex: 1;
      font-size: 12px;
      color: #5856D6;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .video-link {
      font-size: 11px;
      color: #007AFF;
      font-weight: 500;
      white-space: nowrap;
    }
  }

  /* 分类标签 */
  .category-tag {
    display: inline-block;
    padding: 3px 10px;
    background: #F5F5F5;
    border-radius: 12px;
    font-size: 11px;
    color: #666666;
  }
}

.action-row {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #F5F5F5;

  .action-btn {
    flex: 1;
    padding: 7px 0;
    border-radius: 6px;
    text-align: center;
    font-size: 12px;
    font-weight: 500;

    &.primary { background: #11998e; color: #FFFFFF; }
    &.warning { background: #FFF3CD; color: #856404; }
    &.success { background: #D4EDDA; color: #155724; }
    &.danger { background: #FFF0F0; color: #FF3B30; }
  }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;

  .empty-icon { font-size: 64px; margin-bottom: 16px; }
  .empty-text { font-size: 16px; color: #999999; margin-bottom: 8px; }
  .empty-hint { font-size: 13px; color: #CCCCCC; margin-bottom: 24px; }

  .empty-action {
    padding: 14px 32px;
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    border-radius: 24px;

    text { color: #FFFFFF; font-size: 15px; }
  }
}

.load-more {
  text-align: center;
  padding: 24px;

  text { font-size: 13px; color: #CCCCCC; }
}

.float-btn {
  position: fixed;
  right: 20px;
  bottom: 100px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.4);

  .float-icon {
    font-size: 32px;
    color: #FFFFFF;
    font-weight: 300;
    margin-top: -2px;
  }
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-content {
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid #F0F0F0;

  .modal-title { font-size: 18px; font-weight: bold; color: #1A1A1A; }
  .modal-close { font-size: 24px; color: #999999; padding: 4px; }
}

.modal-body {
  padding: 16px 20px;
  max-height: 65vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 14px;

  .form-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #333333;
    margin-bottom: 6px;
  }

  .form-input {
    width: 100%;
    height: 42px;
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    padding: 0 12px;
    font-size: 14px;
    box-sizing: border-box;
  }

  .form-textarea {
    width: 100%;
    min-height: 70px;
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 14px;
    box-sizing: border-box;
    resize: vertical;
  }

  .picker-input {
    width: 100%;
    height: 42px;
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    padding: 0 12px;
    font-size: 14px;
    display: flex;
    align-items: center;
    background: #FAFAFA;
  }

  .form-hint {
    display: block;
    font-size: 11px;
    color: #999999;
    margin-top: 4px;
  }

  &.flex-1 { flex: 1; }
}

.form-row {
  display: flex;
  gap: 10px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid #F0F0F0;

  .btn {
    flex: 1;
    height: 44px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 600;

    &.btn-cancel { background: #F5F5F5; color: #666666; }
    &.btn-primary {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      color: #FFFFFF;
    }
    &.disabled { opacity: 0.5; }
  }
}

@media (max-width: 768px) {
  .stats-panel {
    grid-template-columns: repeat(2, 1fr);
  }

  .info-section .metrics-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
