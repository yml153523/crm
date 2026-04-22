<template>
  <AdminLayout title="内容管理中心" :showBack="true">
  <view class="content-hub-page">
    <!-- ========== 1. 现代化Tab切换栏 ========== -->
    <view class="modern-tab-bar">
      <view
        class="mtab-item"
        :class="{ active: currentTab === 'video' }"
        @tap="switchTab('video')"
      >
        <text class="mtab-icon">🎬</text>
        <text class="mtab-text">视频</text>
      </view>

      <view
        class="mtab-item"
        :class="{ active: currentTab === 'course' }"
        @tap="switchTab('course')"
      >
        <text class="mtab-icon">📚</text>
        <text class="mtab-text">课程</text>
      </view>

      <view
        class="mtab-item"
        :class="{ active: currentTab === 'product' }"
        @tap="switchTab('product')"
      >
        <text class="mtab-icon">🛍️</text>
        <text class="mtab-text">商品</text>
      </view>

      <view class="mtab-indicator" :style="{ left: getIndicatorLeft() }"></view>
    </view>

    <!-- ========== 3. 统一搜索栏 ========== -->
    <view class="unified-toolbar">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input
          type="text"
          v-model="searchText"
          :placeholder="getSearchPlaceholder()"
          @confirm="handleSearch"
          class="search-input"
        />
      </view>
      <view class="quick-actions">
        <view class="action-btn add" @tap="handleAdd">
          <text>＋ 添加{{ getCurrentTabName() }}</text>
        </view>
        <view class="action-btn filter" @tap="showFilter = !showFilter">
          <text>筛选</text>
        </view>
      </view>
    </view>

    <!-- ========== 4. 筛选面板（根据Tab动态显示） ========== -->
    <view class="filter-panel" v-if="showFilter">
      <!-- 视频筛选 -->
      <view v-if="currentTab === 'video'">
        <view class="filter-section">
          <text class="section-title">分类</text>
          <scroll-view scroll-x class="chip-scroll">
            <view class="chip" :class="{ active: videoCategory === 'all' }" @tap="videoCategory = 'all'">全部</view>
            <view class="chip" :class="{ active: videoCategory === cat }" v-for="cat in videoCategories" :key="cat" @tap="videoCategory = cat">{{ cat }}</view>
          </scroll-view>
        </view>
        <view class="filter-section">
          <text class="section-title">状态</text>
          <scroll-view scroll-x class="chip-scroll">
            <view class="chip" :class="{ active: videoStatus === 'all' }" @tap="videoStatus = 'all'">全部</view>
            <view class="chip" :class="{ active: videoStatus === 'published' }" @tap="videoStatus = 'published'">已发布</view>
            <view class="chip" :class="{ active: videoStatus === 'draft' }" @tap="videoStatus = 'draft'">草稿</view>
          </scroll-view>
        </view>
      </view>

      <!-- 课程筛选 -->
      <view v-if="currentTab === 'course'">
        <view class="filter-section">
          <text class="section-title">分类</text>
          <scroll-view scroll-x class="chip-scroll">
            <view class="chip" :class="{ active: courseCategory === 'all' }" @tap="courseCategory = 'all'">全部</view>
            <view class="chip" :class="{ active: courseCategory === cat }" v-for="cat in courseCategories" :key="cat" @tap="courseCategory = cat">{{ cat }}</view>
          </scroll-view>
        </view>
        <view class="filter-section">
          <text class="section-title">状态</text>
          <scroll-view scroll-x class="chip-scroll">
            <view class="chip" :class="{ active: courseStatus === 'all' }" @tap="courseStatus = 'all'">全部</view>
            <view class="chip" :class="{ active: courseStatus === 'published' }" @tap="courseStatus = 'published'">已发布</view>
            <view class="chip" :class="{ active: courseStatus === 'draft' }" @tap="courseStatus = 'draft'">草稿</view>
          </scroll-view>
        </view>
      </view>

      <!-- 商品筛选 -->
      <view v-if="currentTab === 'product'">
        <view class="filter-section">
          <text class="section-title">分类</text>
          <scroll-view scroll-x class="chip-scroll">
            <view class="chip" :class="{ active: productCategory === 'all' }" @tap="productCategory = 'all'">全部</view>
            <view class="chip" :class="{ active: productCategory === cat.value }" v-for="cat in productCategories" :key="cat.value" @tap="productCategory = cat.value">{{ cat.label }}</view>
          </scroll-view>
        </view>
        <view class="filter-section">
          <text class="section-title">状态</text>
          <scroll-view scroll-x class="chip-scroll">
            <view class="chip" :class="{ active: productStatus === 'all' }" @tap="productStatus = 'all'">全部</view>
            <view class="chip" :class="{ active: productStatus === 'active' }" @tap="productStatus = 'active'">在售</view>
            <view class="chip" :class="{ active: productStatus === 'inactive' }" @tap="productStatus = 'inactive'">下架</view>
          </scroll-view>
        </view>
      </view>
    </view>

    <!-- ========== 5. 内容列表（根据Tab动态渲染） ========== -->

    <!-- 视频列表 -->
    <view class="content-list" v-if="currentTab === 'video'">
      <view class="content-card card" v-for="(item, index) in filteredVideoList" :key="item._id || index">
        <view class="card-header">
          <image :src="item.thumbnail || item.coverImage || '/static/images/placeholder.png'" mode="aspectFill" class="thumbnail" />
          <view class="play-badge" v-if="item.status === 'published'">▶️</view>
        </view>
        <view class="card-body">
          <text class="card-title">{{ item.title || item.name }}</text>
          <text class="card-meta">📁 {{ item.category || '未分类' }} · ⏱️ {{ item.duration || '00:00' }}</text>
          <view class="card-stats">
            <text class="stat">👁️ {{ item.viewCount || 0 }}</text>
            <text class="stat">❤️ {{ item.likeCount || 0 }}</text>
            <text class="status-badge" :class="item.status === 'published' ? 'success' : 'warning'">
              {{ item.status === 'published' ? '已发布' : '草稿' }}
            </text>
          </view>
        </view>
        <view class="card-actions">
          <view class="action-btn" @tap="editVideo(item)">编辑</view>
          <view class="action-btn danger" @tap="deleteVideo(item)">删除</view>
        </view>
      </view>

      <view class="empty-state" v-if="filteredVideoList.length === 0">
        <text class="empty-icon">🎬</text>
        <text class="empty-text">暂无视频内容</text>
        <view class="empty-btn" @tap="handleAdd">添加第一个视频</view>
      </view>
    </view>

    <!-- 课程列表 -->
    <view class="content-list" v-if="currentTab === 'course'">
      <view class="content-card card" v-for="(item, index) in filteredCourseList" :key="item._id || index">
        <view class="card-header">
          <image :src="item.coverImage || '/static/images/placeholder.png'" mode="aspectFill" class="thumbnail" />
          <view class="type-badge course">📚</view>
        </view>
        <view class="card-body">
          <text class="card-title">{{ item.title }}</text>
          <text class="card-meta">👨‍🏫 {{ item.instructor || '未指定' }} · 📖 {{ item.duration || '10课时' }}</text>
          <view class="card-stats">
            <text class="stat">👥 {{ item.enrollmentCount || 0 }}人报名</text>
            <text class="stat price">¥{{ item.price || 0 }}</text>
            <text class="status-badge" :class="item.status === 'published' ? 'success' : 'warning'">
              {{ item.status === 'published' ? '已发布' : '草稿' }}
            </text>
          </view>
        </view>
        <view class="card-actions">
          <view class="action-btn" @tap="editCourse(item)">编辑</view>
          <view class="action-btn danger" @tap="deleteCourse(item)">删除</view>
        </view>
      </view>

      <view class="empty-state" v-if="filteredCourseList.length === 0">
        <text class="empty-icon">📚</text>
        <text class="empty-text">暂无课程内容</text>
        <view class="empty-btn" @tap="handleAdd">添加第一门课程</view>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="content-list" v-if="currentTab === 'product'">
      <view class="content-card card" v-for="(item, index) in filteredProductList" :key="item._id || index">
        <view class="card-header">
          <image :src="item.images?.[0] || '/static/images/placeholder.png'" mode="aspectFill" class="thumbnail" />
          <view class="type-badge product">🛍️</view>
          <view class="stock-badge" v-if="item.stock !== undefined && item.stock <= 10 && item.stock > 0">⚠️ 库存紧张</view>
        </view>
        <view class="card-body">
          <text class="card-title">{{ item.name || item.title }}</text>
          <text class="card-meta">📦 库存: {{ item.stock || 0 }} · 🏷️ {{ item.category || '未分类' }}</text>
          <view class="card-stats">
            <text class="stat price-highlight">¥{{ item.price || 0 }}</text>
            <text class="stat">💰 已售 {{ item.salesCount || 0 }}</text>
            <text class="status-badge" :class="item.status === 'active' ? 'success' : 'warning'">
              {{ item.status === 'active' ? '在售' : '下架' }}
            </text>
          </view>
        </view>
        <view class="card-actions">
          <view class="action-btn" @tap="editProduct(item)">编辑</view>
          <view class="action-btn danger" @tap="deleteProduct(item)">删除</view>
        </view>
      </view>

      <view class="empty-state" v-if="filteredProductList.length === 0">
        <text class="empty-icon">🛍️</text>
        <text class="empty-text">暂无商品内容</text>
        <view class="empty-btn" @tap="handleAdd">添加第一个商品</view>
      </view>
    </view>

  </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiGet } from '@/utils/request'

// ==================== 状态管理 ====================
const currentTab = ref('video') // 当前激活的Tab: video | course | product
const searchText = ref('')
const showFilter = ref(false)

// 视频相关状态
const videoList = ref<any[]>([])
const videoCategories = ref<string[]>(['教程', '直播', '录播', '短视频'])
const videoCategory = ref('all')
const videoStatus = ref('all')

// 课程相关状态
const courseList = ref<any[]>([])
const courseCategories = ref<string[]>(['编程', '设计', '营销', '管理'])
const courseCategory = ref('all')
const courseStatus = ref('all')

// 商品相关状态
const productList = ref<any[]>([])
const productCategories = ref<{label: string, value: string}[]>([
  { label: '全部', value: 'all' },
  { label: '维生素', value: 'vitamin' },
  { label: '保健品', value: 'health' },
  { label: '健康食品', value: 'food' },
  { label: '器材', value: 'equipment' },
  { label: '其他', value: 'other' }
])
const productCategory = ref('all')
const productStatus = ref('all')

// ==================== 计算属性 ====================

// Tab指示器位置
function getIndicatorLeft(): string {
  const positions: Record<string, string> = {
    video: '0%',
    course: '33.33%',
    product: '66.66%'
  }
  return positions[currentTab.value] || '0%'
}

// 过滤后的视频列表
const filteredVideoList = computed(() => {
  let list = videoList.value

  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    list = list.filter(item =>
      (item.title || item.name || '').toLowerCase().includes(keyword)
    )
  }

  if (videoCategory.value !== 'all') {
    list = list.filter(item => item.category === videoCategory.value)
  }

  if (videoStatus.value !== 'all') {
    list = list.filter(item => item.status === videoStatus.value)
  }

  return list
})

// 过滤后的课程列表
const filteredCourseList = computed(() => {
  let list = courseList.value

  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    list = list.filter(item =>
      (item.title || '').toLowerCase().includes(keyword)
    )
  }

  if (courseCategory.value !== 'all') {
    list = list.filter(item => item.category === courseCategory.value)
  }

  if (courseStatus.value !== 'all') {
    list = list.filter(item => item.status === courseStatus.value)
  }

  return list
})

// 过滤后的商品列表
const filteredProductList = computed(() => {
  let list = productList.value

  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    list = list.filter(item =>
      ((item.name || item.title || '')).toLowerCase().includes(keyword)
    )
  }

  if (productCategory.value !== 'all') {
    list = list.filter(item => item.category === productCategory.value)
  }

  if (productStatus.value !== 'all') {
    list = list.filter(item => item.status === productStatus.value)
  }

  return list
})

// ==================== 方法 ====================

function switchTab(tab: string) {
  currentTab.value = tab
  searchText.value = ''
  showFilter.value = false
}

function getSearchPlaceholder(): string {
  const placeholders = {
    video: '搜索视频标题...',
    course: '搜索课程名称...',
    product: '搜索商品名称...'
  }
  return placeholders[currentTab.value] || '搜索...'
}

function getCurrentTabName(): string {
  const names = {
    video: '视频',
    course: '课程',
    product: '商品'
  }
  return names[currentTab.value] || ''
}

function handleSearch() {
  console.log('[ContentHub] 搜索:', searchText.value)
}

function handleAdd() {
  const urls = {
    video: '/pages/admin/video/list',
    course: '/pages/admin/course/library',
    product: '/pages/admin/product/list'
  }
  uni.navigateTo({ url: urls[currentTab.value] })
}

// 编辑操作
function editVideo(item: any) {
  console.log('[ContentHub] 编辑视频:', item)
  uni.navigateTo({ url: `/pages/admin/video/edit?id=${item._id}` })
}

function editCourse(item: any) {
  console.log('[ContentHub] 编辑课程:', item)
  uni.navigateTo({ url: `/pages/admin/course/edit?id=${item._id}` })
}

function editProduct(item: any) {
  console.log('[ContentHub] 编辑商品:', item)
  uni.navigateTo({ url: `/pages/admin/product/edit?id=${item._id}` })
}

// 删除操作
async function deleteVideo(item: any) {
  const res = await uni.showModal({
    title: '确认删除',
    content: `确定要删除视频"${item.title}"吗？`
  })
  if (res.confirm) {
    videoList.value = videoList.value.filter(v => v._id !== item._id)
    uni.showToast({ title: '已删除', icon: 'success' })
  }
}

async function deleteCourse(item: any) {
  const res = await uni.showModal({
    title: '确认删除',
    content: `确定要删除课程"${item.title}"吗？`
  })
  if (res.confirm) {
    courseList.value = courseList.value.filter(c => c._id !== item._id)
    uni.showToast({ title: '已删除', icon: 'success' })
  }
}

async function deleteProduct(item: any) {
  const res = await uni.showModal({
    title: '确认删除',
    content: `确定要删除商品"${item.name || item.title}"吗？`
  })
  if (res.confirm) {
    productList.value = productList.value.filter(p => p._id !== item._id)
    uni.showToast({ title: '已删除', icon: 'success' })
  }
}

// ==================== 数据加载 ====================

async function loadVideos() {
  try {
    const timestamp = Date.now()
    const res: any = await apiGet(`/api/videos?t=${timestamp}`, {}, {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    })

    if (res.success) {
      videoList.value = res.data.data?.list || res.data.data || []
      console.log(`[ContentHub] 加载了 ${videoList.value.length} 个视频`)
    } else {
      console.warn('[ContentHub] 视频API返回异常:', res.data)
      videoList.value = getFallbackVideos()
    }
  } catch (e) {
    console.error('[ContentHub] 加载视频失败:', e)
    videoList.value = getFallbackVideos()
  }
}

async function loadCourses() {
  try {
    const timestamp = Date.now()
    const res: any = await apiGet(`/api/courses?t=${timestamp}`, {}, {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    })

    if (res.success) {
      courseList.value = res.data.data?.list || res.data.data || []
      console.log(`[ContentHub] 加载了 ${courseList.value.length} 门课程`)
    } else {
      console.warn('[ContentHub] 课程API返回异常:', res.data)
      courseList.value = getCoursesFallback()
    }
  } catch (e) {
    console.error('[ContentHub] 加载课程失败:', e)
    courseList.value = getCoursesFallback()
  }
}

async function loadProducts() {
  try {
    const timestamp = Date.now()
    const res: any = await apiGet(`/api/products?t=${timestamp}`, {}, {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    })

    if (res.success) {
      productList.value = res.data.data?.list || res.data.data || []
      console.log(`[ContentHub] 加载了 ${productList.value.length} 个商品`)
    } else {
      console.warn('[ContentHub] 商品API返回异常:', res.data)
      productList.value = getProductsFallback()
    }
  } catch (e) {
    console.error('[ContentHub] 加载商品失败:', e)
    productList.value = getProductsFallback()
  }
}

// 兜底数据（当API不可用时使用）
function getFallbackVideos(): any[] {
  return [
    { _id: 'v1', title: '产品介绍视频', category: '教程', duration: '05:30', viewCount: 1234, likeCount: 89, status: 'published' },
    { _id: 'v2', title: '使用教程', category: '教程', duration: '10:15', viewCount: 856, likeCount: 45, status: 'published' },
    { _id: 'v3', title: '客户案例分享', category: '录播', duration: '08:20', viewCount: 567, likeCount: 34, status: 'draft' }
  ]
}

function getCoursesFallback(): any[] {
  return [
    { _id: 'c1', title: '健康养生入门', category: '健康', instructor: '张医生', duration: '12课时', enrollmentCount: 234, price: 199, status: 'published' },
    { _id: 'c2', title: '营养学基础', category: '营养', instructor: '李教授', duration: '20课时', enrollmentCount: 189, price: 299, status: 'published' },
    { _id: 'c3', title: '运动健身指南', category: '运动', instructor: '王教练', duration: '15课时', enrollmentCount: 156, price: 0, status: 'draft' }
  ]
}

function getProductsFallback(): any[] {
  return [
    { _id: 'p1', name: '维生素C片', category: 'vitamin', price: 68, stock: 500, salesCount: 1200, status: 'active', images: [] },
    { _id: 'p2', name: '蛋白粉', category: 'health', price: 258, stock: 200, salesCount: 890, status: 'active', images: [] },
    { _id: 'p3', name: '瑜伽垫', category: 'equipment', price: 128, stock: 50, salesCount: 456, status: 'inactive', images: [] }
  ]
}

// ==================== 生命周期 ====================

onMounted(() => {
  console.log('[ContentHub] 页面加载 - 获取最新数据')
  loadVideos()
  loadCourses()
  loadProducts()
})
</script>

<style scoped>
.content-hub-page {
  padding: 16px;
  background-color: #F8F9FA;
  min-height: 100vh;
}

/* 现代化Tab切换栏（iOS风格分段控制器） */
.modern-tab-bar {
  position: relative;
  display: flex;
  background: #E8E8E8;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}

.mtab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 8px;
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
}

.mtab-item.active {
  color: #ffffff;
}

.mtab-icon {
  font-size: 18px;
  transition: transform 0.3s ease;
}

.mtab-item.active .mtab-icon {
  transform: scale(1.1);
}

.mtab-text {
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  transition: color 0.3s ease;
}

.mtab-item.active .mtab-text {
  color: #ffffff;
}

/* 滑动指示器 */
.mtab-indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: calc(33.33% - 4px);
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  border-radius: 10px;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.35);
}

/* 统一工具栏 */
.unified-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 12px;
  padding: 0 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.search-box:focus-within {
  border-color: #007AFF;
  box-shadow: 0 2px 12px rgba(0, 122, 255, 0.15);
}

.search-icon {
  font-size: 18px;
  margin-right: 10px;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  font-size: 14px;
  border: none;
  outline: none;
  height: 44px;
  background: transparent;
}

.quick-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  color: #333333;
  padding: 0 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  height: 44px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.action-btn:active {
  transform: scale(0.96);
}

.action-btn.add {
  background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(52, 199, 89, 0.35);
}

.action-btn.filter {
  background: linear-gradient(135deg, #FF9500 0%, #FF6B00 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(255, 149, 0, 0.35);
}

/* 筛选面板 */
.filter-panel {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.filter-section {
  margin-bottom: 12px;
}

.filter-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #333333;
  margin-bottom: 8px;
  display: block;
}

.chip-scroll {
  white-space: nowrap;
}

.chip {
  display: inline-block;
  padding: 6px 16px;
  background: #f0f0f0;
  border-radius: 20px;
  font-size: 13px;
  color: #666666;
  margin-right: 8px;
  transition: all 0.2s ease;
}

.chip.active {
  background: #007AFF;
  color: #ffffff;
}

.chip.warning {
  background: #FF3B30;
  color: #ffffff;
}

/* 内容列表 */
.content-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.content-card {
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.content-card:active {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.card-header {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%);
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-badge,
.type-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 8px 14px;
  border-radius: 24px;
  font-size: 18px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.type-badge.course {
  background: linear-gradient(135deg, rgba(52, 199, 89, 0.9) 0%, rgba(48, 209, 88, 0.9) 100%);
}

.type-badge.product {
  background: linear-gradient(135deg, rgba(255, 149, 0, 0.9) 0%, rgba(255, 107, 0, 0.9) 100%);
}

.stock-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  background: linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%);
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(255, 59, 48, 0.35);
}

.card-body {
  padding: 18px 20px 16px;
}

.card-title {
  font-size: 17px;
  font-weight: 700;
  color: #1A1A1A;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
  margin-bottom: 10px;
}

.card-meta {
  font-size: 13px;
  color: #888888;
  display: block;
  margin-bottom: 12px;
}

.card-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.stat {
  font-size: 13px;
  color: #999999;
  font-weight: 500;
}

.price {
  color: #FF9500;
  font-weight: 600;
}

.price-highlight {
  font-size: 20px;
  font-weight: 800;
  color: #FF3B30;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 700;
  margin-left: auto;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.status-badge.success {
  background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
  color: #2E7D32;
}

.status-badge.warning {
  background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
  color: #F57C00;
}

.card-actions {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #F0F0F0;
  background: #FAFAFA;
}

.action-btn {
  flex: 1;
  text-align: center;
  padding: 12px;
  background: #F5F5F5;
  border-radius: 10px;
  font-size: 13px;
  color: #333333;
  font-weight: 600;
  transition: all 0.2s ease;
  border: none;
}

.action-btn:active {
  transform: scale(0.97);
  background: #EEEEEE;
}

.action-btn.danger {
  background: linear-gradient(135deg, #FFF0F0 0%, #FFE5E5 100%);
  color: #FF3B30;
}

/* 空状态（精心设计） */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 30px;
  background: linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%);
  border-radius: 16px;
  border: 2px dashed #E0E0E0;
}

.empty-icon {
  font-size: 72px;
  margin-bottom: 20px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.empty-text {
  font-size: 18px;
  color: #666666;
  font-weight: 600;
  margin-bottom: 12px;
}

.empty-btn {
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  color: #ffffff;
  padding: 14px 36px;
  border-radius: 28px;
  font-size: 15px;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(0, 122, 255, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.5px;
}

.empty-btn:active {
  transform: scale(0.96);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}
</style>
