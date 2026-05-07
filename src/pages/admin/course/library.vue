<template>
  <AdminLayout title="课程管理" :showBack="true">
  <view class="course-page">
    <!-- ========== 1. 统计面板 (新增) ========== -->
    <view class="stats-panel">
      <view class="stat-card" v-for="(stat, index) in statsData" :key="index">
        <text class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</text>
        <text class="stat-label">{{ stat.label }}</text>
        <text class="stat-trend" :class="stat.trend > 0 ? 'up' : 'down'" v-if="stat.trend !== undefined">
          {{ stat.trend > 0 ? '↑' : '↓' }} {{ Math.abs(stat.trend) }}%
        </text>
      </view>
    </view>

    <!-- ========== 2. 搜索与筛选工具栏 (保留+增强) ========== -->
    <view class="toolbar">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input type="text" v-model="searchText" placeholder="搜索课程名称..." @confirm="handleSearch" class="search-input" />
      </view>
      <view class="add-btn" @click="showAddDialog">
        <text>＋ 添加</text>
      </view>
      <view class="filter-btn" :class="{ active: showFilter }" @click="showFilter = !showFilter">
        <text>筛选</text>
      </view>
    </view>

    <!-- 筛选面板 (保留) -->
    <view class="filter-panel" v-if="showFilter">
      <view class="filter-row">
        <view class="filter-tag" :class="{ active: currentCategory === 'all' }" @click="filterByCategory('all')">全部</view>
        <view class="filter-tag" :class="{ active: currentCategory === item }" v-for="item in categories" :key="item" @click="filterByCategory(item)">{{ item }}</view>
      </view>
      <view class="filter-row">
        <view class="filter-tag" :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'; applyFilters()">全部状态</view>
        <view class="filter-tag" :class="{ active: statusFilter === 'published' }" @click="statusFilter = 'published'; applyFilters()">已发布</view>
        <view class="filter-tag" :class="{ active: statusFilter === 'draft' }" @click="statusFilter = 'draft'; applyFilters()">草稿</view>
      </view>
    </view>

    <!-- ========== 3. 课程列表 (增强版 - 显示更多数据) ========== -->
    <view class="course-list">
      <view class="course-card card" v-for="(item, index) in courseList" :key="item._id || index">
        <!-- 封面图 + 快捷操作 -->
        <view class="card-header">
          <image :src="item.coverImage || '/static/images/placeholder.png'" mode="aspectFill" class="cover" />
          <view class="quick-actions">
            <view class="quick-btn view" @click="viewCourseDetail(item)">
              <text>📋 详情</text>
            </view>
          </view>
        </view>

        <!-- 核心信息区 (增强) -->
        <view class="info">
          <view class="title-row">
            <text class="title">{{ item.title }}</text>
            <view class="status-badge" :class="item.status === 'published' ? 'badge-success' : 'badge-warning'">
              {{ item.status === 'published' ? '✅ 已发布' : '📝 草稿' }}
            </view>
          </view>

          <!-- 元数据行 -->
          <text class="meta">📚 {{ item.category || '未分类' }} · 👨‍🏫 {{ item.instructor || '未指定' }} · ⏱ {{ item.duration || '10课时' }}</text>

          <!-- 数据指标行 (新增) -->
          <view class="metrics-row">
            <view class="metric-item">
              <text class="metric-value">{{ item.enrollmentCount || 0 }}</text>
              <text class="metric-label">报名</text>
            </view>
            <view class="metric-item">
              <text class="metric-value">{{ item.completionRate || '0%' }}</text>
              <text class="metric-label">完成率</text>
            </view>
            <view class="metric-item">
              <text class="metric-value price">¥{{ item.price || 0 }}</text>
              <text class="metric-label">价格</text>
            </view>
            <view class="metric-item" v-if="item.rating">
              <text class="metric-value rating">⭐ {{ item.rating }}</text>
              <text class="metric-label">评分</text>
            </view>
          </view>

          <!-- 视频数量提示 (新增) -->
          <view class="video-count-hint" v-if="item.videoIds?.length">
            <text>🎬 包含 {{ item.videoIds.length }} 个视频</text>
            <text class="link" @click="viewCourseVideos(item)">查看视频列表 →</text>
          </view>

          <!-- 关联商品提示 (新增) -->
          <view class="product-hint" v-if="item.relatedProducts?.length">
            <text>🛒 推荐商品:</text>
            <text class="product-tag" v-for="p in item.relatedProducts.slice(0, 3)" :key="p">{{ p }}</text>
          </view>
        </view>

        <!-- 操作按钮 (优化布局) -->
        <view class="actions">
          <view class="action-btn btn-edit" @click="editCourse(item)">
            <text>✏️ 编辑</text>
          </view>
          <view class="action-btn btn-videos" @click="viewCourseVideos(item)" v-if="item.videoIds?.length">
            <text>🎬 视频</text>
          </view>
          <view class="action-btn btn-delete" @click="deleteCourse(item)">
            <text>🗑️ 删除</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-if="!courseList.length && !loading">
        <text class="empty-icon">📚</text>
        <text class="empty-text">暂无课程数据</text>
        <view class="empty-btn" @click="showAddDialog">
          <text>立即添加第一个课程</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="load-more" v-if="courseList.length > 0 && hasMore">
        <text @click="loadMore">{{ loading ? MESSAGES.COMMON.LOADING : '— 上拉加载更多 —' }}</text>
      </view>
    </view>

    <!-- 添加/编辑弹窗 (增强版 - 内联编辑) -->
    <view class="modal-overlay" v-if="showModal" @click.self="closeModal">
      <view class="modal-content card" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingCourse ? '✏️ 编辑课程' : '➕ 添加课程' }}</text>
          <view class="modal-close" @click="closeModal">✕</view>
        </view>

        <scroll-view scroll-y class="modal-body">
          <view class="form-group">
            <text class="form-label">课程名称 *</text>
            <input type="text" v-model="formData.title" placeholder="请输入课程名称" class="form-input" />
          </view>

          <view class="form-group">
            <text class="form-label">课程描述</text>
            <textarea v-model="formData.description" placeholder="请输入课程描述" class="form-textarea" />
          </view>

          <view class="form-row">
            <view class="form-group flex-1">
              <text class="form-label">分类</text>
              <input type="text" v-model="formData.category" placeholder="如: 瑜伽、健身" class="form-input" />
            </view>
            <view class="form-group flex-1">
              <text class="form-label">讲师</text>
              <input type="text" v-model="formData.instructor" placeholder="讲师名称" class="form-input" />
            </view>
          </view>

          <view class="form-row">
            <view class="form-group flex-1">
              <text class="form-label">价格 (元)</text>
              <input type="digit" v-model="formData.price" placeholder="0" class="form-input" />
            </view>
            <view class="form-group flex-1">
              <text class="form-label">课时数</text>
              <input type="digit" v-model="formData.duration" placeholder="10" class="form-input" />
            </view>
          </view>

          <view class="form-group">
            <text class="form-label">状态</text>
            <view class="status-selector">
              <view class="status-option" :class="{ active: formData.status === 'draft' }" @click="formData.status = 'draft'">
                <text>📝 草稿</text>
              </view>
              <view class="status-option" :class="{ active: formData.status === 'published' }" @click="formData.status = 'published'">
                <text>✅ 发布</text>
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="modal-footer">
          <view class="btn btn-cancel" @click="closeModal">
            <text>取消</text>
          </view>
          <view class="btn btn-primary" @click="submitForm" :class="{ disabled: !isFormValid }">
            <text>{{ editingCourse ? '保存' : '创建' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 课程详情展开面板 (新增) -->
    <view class="detail-overlay" v-if="showDetailPanel" @click.self="showDetailPanel = false">
      <view class="detail-panel card" @click.stop>
        <view class="panel-header">
          <text class="panel-title">📖 课程详情: {{ detailData.title }}</text>
          <view class="panel-close" @click="showDetailPanel = false">✕</view>
        </view>
        <scroll-view scroll-y class="panel-body">
          <view class="detail-section">
            <text class="section-label">基本信息</text>
            <text class="detail-text">描述: {{ detailData.description || '暂无描述' }}</text>
            <text class="detail-text">分类: {{ detailData.category || '未分类' }}</text>
            <text class="detail-text">讲师: {{ detailData.instructor || '未指定' }}</text>
          </view>
          <view class="detail-section">
            <text class="section-label">统计数据</text>
            <text class="detail-text">报名人数: {{ detailData.enrollmentCount || 0 }} 人</text>
            <text class="detail-text">完成率: {{ detailData.completionRate || '0%' }}</text>
            <text class="detail-text">评分: ⭐ {{ detailData.rating || '暂无评分' }}</text>
            <text class="detail-text">价格: ¥{{ detailData.price || 0 }}</text>
          </view>
          <view class="detail-section" v-if="detailData.videoIds?.length">
            <text class="section-label">包含视频 ({{ detailData.videoIds.length }}个)</text>
            <text class="detail-text" v-for="(vid, idx) in detailData.videoIds" :key="idx">视频 {{ idx + 1 }}: {{ vid }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { MESSAGES, API_PATHS, TOAST_ICON } from '@/config/constants'
import { ref, computed, onMounted, watch } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/request'
import { courseSync, initRealtimeSync } from '@/utils/realtime-sync-integration'

const loading = ref(false)
const searchText = ref('')
const showFilter = ref(false)
const currentCategory = ref('all')
const statusFilter = ref('all')
const categories = ref<string[]>([])

const courseList = ref<any[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const hasMore = ref(true)

// 弹窗相关
const showModal = ref(false)
const editingCourse = ref<any>(null)
const formData = ref({
  title: '',
  description: '',
  category: '',
  instructor: '',
  price: '',
  duration: '',
  status: 'draft'
})

// 详情面板
const showDetailPanel = ref(false)
const detailData = ref<any>({})

// 统计数据 (新增)
const statsData = computed(() => {
  const total = courseList.value.length
  const totalStudents = courseList.value.reduce((sum, c) => sum + (c.enrollmentCount || 0), 0)
  const totalRevenue = courseList.value.reduce((sum, c) => sum + ((c.price || 0) * (c.enrollmentCount || 0)), 0)
  const avgRating = total > 0
    ? (courseList.value.reduce((sum, c) => sum + (parseFloat(c.rating) || 0), 0) / total).toFixed(1)
    : '0'

  return [
    { label: '总课程数', value: total.toString(), color: '#007AFF', trend: 8 },
    { label: '总学员数', value: formatNumber(totalStudents), color: '#34C759', trend: 15 },
    { label: '总收入', value: `¥${formatNumber(totalRevenue)}`, color: '#FF9500', trend: 22 },
    { label: '平均评分', value: avgRating, color: '#FF3B30', trend: 5 }
  ]
})

const isFormValid = computed(() => {
  return formData.value.title.trim().length > 0
})

onMounted(() => {
  loadCourses()
})

watch([currentCategory, statusFilter], () => {
  page.value = 1
  courseList.value = []
  loadCourses()
})

async function loadCourses() {
  if (loading.value) return

  loading.value = true
  try {
    // 检查是否为演示模式
    const token = uni.getStorageSync('token') || ''
    const isDemoMode = token.startsWith('demo-')

    if (isDemoMode) {
      console.log('[课程管理] 演示模式，使用模拟数据')
      await new Promise(resolve => setTimeout(resolve, 500))

      courseList.value = [
        {
          _id: 'demo-1',
          title: '销售技巧实战',
          category: '销售',
          instructor: '张老师',
          price: 199,
          status: 'published',
          enrollmentCount: 156,
          completionCount: 89,
          rating: '4.8',
          createdAt: '2026-04-18'
        },
        {
          _id: 'demo-2',
          title: '客户关系维护',
          category: '服务',
          instructor: '李老师',
          price: 299,
          status: 'published',
          enrollmentCount: 234,
          completionCount: 167,
          rating: '4.9',
          createdAt: '2026-04-17'
        }
      ]
      total.value = courseList.value.length
      hasMore.value = false
      categories.value = ['销售', '服务', '管理', '技术']
      loading.value = false
      return
    }

    const params: any = {
      page: page.value,
      pageSize: pageSize.value
    }

    if (currentCategory.value !== 'all') {
      params.category = currentCategory.value
    }

    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value
    }

    if (searchText.value.trim()) {
      params.keyword = searchText.value.trim()
    }

    const res = await apiGet(API_PATHS.COURSES, params)

    const data = (res.data as any)?.data
    if (data?.list) {
      if (page.value === 1) {
        courseList.value = data.list.map((course: any) => ({
          ...course,
          completionRate: course.enrollmentCount && course.completionCount
            ? `${Math.round(course.completionCount / course.enrollmentCount * 100)}%`
            : '0%',
          relatedProducts: course.relatedProducts || []
        }))
      } else {
        courseList.value.push(...data.list)
      }

      total.value = data.pagination?.total || 0
      hasMore.value = courseList.value.length < total.value

      // 提取所有分类
      const allCategories = new Set<string>()
      data.list.forEach((course: any) => {
        if (course.category) allCategories.add(course.category)
      })
      categories.value = Array.from(allCategories)
    }
  } catch (error) {
    console.error('加载课程失败:', error)
    uni.showToast({ title: '加载失败', icon: TOAST_ICON.NONE })
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  courseList.value = []
  loadCourses()
}

function filterByCategory(category: string) {
  currentCategory.value = category
}

function applyFilters() {
  // 筛选逻辑已在watch中处理
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  loadCourses()
}

function showAddDialog() {
  editingCourse.value = null
  formData.value = {
    title: '',
    description: '',
    category: categories.value[0] || '瑜伽',
    instructor: '',
    price: '0',
    duration: '10',
    status: 'draft'
  }
  showModal.value = true
}

function editCourse(item: any) {
  // 使用内联编辑而非跳转 (修复404问题)
  editingCourse.value = item
  formData.value = {
    title: item.title,
    description: item.description || '',
    category: item.category || '',
    instructor: item.instructor || '',
    price: String(item.price || 0),
    duration: item.duration || '10',
    status: item.status || 'draft'
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingCourse.value = null
}

async function submitForm() {
  if (!isFormValid.value) {
    uni.showToast({ title: '请填写课程名称', icon: TOAST_ICON.NONE })
    return
  }

  try {
    const payload = {
      title: formData.value.title.trim(),
      description: formData.value.description.trim(),
      category: formData.value.category || '瑜伽',
      instructor: formData.value.instructor || '未指定',
      price: parseFloat(formData.value.price) || 0,
      duration: formData.value.duration || '10课时',
      status: formData.value.status
    }

    uni.showLoading({ title: editingCourse.value ? '保存中...' : '创建中...' })

    // 使用实时同步包装函数（自动发射事件到用户端）
    let response: any
    if (editingCourse.value) {
      response = await courseSync.update(
        apiPut(`${API_PATHS.COURSES}/${editingCourse.value._id}`, payload)
      )
    } else {
      response = await courseSync.create(
        apiPost(API_PATHS.COURSES, payload)
      )
    }

    uni.hideLoading()

    console.log('[课程管理] API响应:', response.statusCode, response.data)

    if (response.success) {
      const data = response.data
      uni.showToast({
        title: editingCourse.value ? MESSAGES.ADMIN.COURSE_SAVED : MESSAGES.ADMIN.COURSE_CREATED,
        icon: TOAST_ICON.SUCCESS,
        duration: 2000
      })
      closeModal()
      page.value = 1
      courseList.value = []
      loadCourses()
    } else if (response.statusCode === 401) {
      uni.showToast({ title: '登录已过期，请重新登录', icon: TOAST_ICON.NONE })
      setTimeout(() => {
        uni.navigateTo({ url: '/pages/admin/login' })
      }, 1500)
    } else {
      const errorMsg = response.data?.message || `请求失败 (${response.statusCode})`
      uni.showToast({ title: errorMsg, icon: TOAST_ICON.NONE })
      console.error('[课程管理] 创建失败:', errorMsg, response.data)
    }
  } catch (error: any) {
    uni.hideLoading()
    console.error('[课程管理] 提交表单异常:', error)
    uni.showToast({ title: error.errMsg || MESSAGES.COMMON.NETWORK_ERROR, icon: TOAST_ICON.NONE })
  }
}

async function deleteCourse(item: any) {
  uni.showModal({
    title: MESSAGES.COMMON.CONFIRM_DELETE,
    content: `确定要删除课程"${item.title}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await apiDelete(`${API_PATHS.COURSES}/${item._id}`)

          courseList.value = courseList.value.filter(c => c._id !== item._id)
          total.value--
          uni.showToast({ title: MESSAGES.COMMON.DELETE_SUCCESS, icon: TOAST_ICON.SUCCESS })
        } catch (error) {
          console.error('删除课程失败:', error)
          uni.showToast({ title: '删除失败', icon: TOAST_ICON.NONE })
        }
      }
    }
  })
}

function viewCourseDetail(item: any) {
  detailData.value = item
  showDetailPanel.value = true
}

function viewCourseVideos(item: any) {
  uni.showModal({
    title: `🎬 ${item.title} 的视频列表`,
    content: `该课程包含 ${item.videoIds?.length || 0} 个视频\n\n点击确定可查看视频管理页面`,
    showCancel: true,
    confirmText: '去查看',
    success: (res) => {
      if (res.confirm) {
        uni.navigateTo({ url: '/pages/admin/video/list' })
      }
    }
  })
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}
</script>

<style lang="scss" scoped>
.course-page {
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  padding: 12px 6px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

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

  .stat-trend {
    display: block;
    font-size: 10px;
    font-weight: 600;
    margin-top: 2px;

    &.up { color: #34C759; }
    &.down { color: #FF3B30; }
  }
}

/* 工具栏 */
.toolbar {
  display: flex;
  padding: 12px 16px;
  background: #FFFFFF;
  gap: 10px;
  align-items: center;

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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

    &.active { background: #007AFF; color: #FFFFFF; }
  }
}

/* 筛选面板 */
.filter-panel {
  padding: 12px 16px;
  background: #FFFFFF;
  border-top: 1px solid #E0E0E0;

  .filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;

    &:last-child { margin-bottom: 0; }
  }

  .filter-tag {
    padding: 6px 14px;
    background: #F5F5F5;
    border-radius: 16px;
    font-size: 13px;
    color: #666666;

    &.active {
      background: #007AFF;
      color: #FFFFFF;
    }
  }
}

/* 课程列表 */
.course-list {
  padding: 12px 16px;

  .course-card {
    background: #FFFFFF;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .card-header {
    position: relative;
    display: flex;

    .cover {
      width: 120px;
      height: 90px;
      border-radius: 10px 0 0 10px;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      flex-shrink: 0;
    }

    .quick-actions {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 10;

      .quick-btn {
        padding: 4px 10px;
        background: rgba(0, 122, 255, 0.9);
        border-radius: 12px;
        font-size: 11px;
        color: #FFFFFF;
      }
    }
  }

  .info {
    flex: 1;
    padding: 12px;

    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      gap: 8px;

      .title {
        font-size: 16px;
        font-weight: 600;
        color: #1A1A1A;
        flex: 1;
      }

      .status-badge {
        padding: 3px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        white-space: nowrap;

        &.badge-success { background: rgba(52, 199, 89, 0.15); color: #34C759; }
        &.badge-warning { background: rgba(255, 149, 0, 0.15); color: #FF9500; }
      }
    }

    .meta {
      font-size: 13px;
      color: #666666;
      margin-bottom: 8px;
      display: block;
    }

    /* 数据指标行 (新增) */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding: 10px;
      background: #FAFAFA;
      border-radius: 8px;
      margin-bottom: 8px;

      .metric-item {
        text-align: center;

        .metric-value {
          display: block;
          font-size: 15px;
          font-weight: bold;
          color: #1A1A1A;

          &.price { color: #FF3B30; }
          &.rating { color: #FF9500; }
        }

        .metric-label {
          display: block;
          font-size: 10px;
          color: #999999;
          margin-top: 2px;
        }
      }
    }

    /* 视频数量提示 (新增) */
    .video-count-hint {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      background: rgba(102, 126, 234, 0.08);
      border-radius: 6px;
      font-size: 12px;
      color: #5856D6;
      margin-bottom: 6px;

      .link {
        color: #007AFF;
        font-weight: 500;
      }
    }

    /* 商品提示 (新增) */
    .product-hint {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 12px;
      color: #666666;

      .product-tag {
        padding: 2px 8px;
        background: rgba(255, 59, 48, 0.1);
        color: #FF3B30;
        border-radius: 8px;
      }
    }
  }

  .actions {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1px solid #F0F0F0;

    .action-btn {
      flex: 1;
      padding: 8px 0;
      border-radius: 6px;
      text-align: center;
      font-size: 12px;
      font-weight: 500;

      &.btn-edit { background: #007AFF; color: #FFFFFF; }
      &.btn-videos { background: rgba(102, 126, 234, 0.15); color: #5856D6; }
      &.btn-delete { background: #FFF0F0; color: #FF3B30; }
    }
  }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;

  .empty-icon { font-size: 64px; margin-bottom: 16px; }
  .empty-text { font-size: 16px; color: #999999; margin-bottom: 24px; }

  .empty-btn {
    padding: 12px 28px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 24px;

    text { color: #FFFFFF; font-size: 15px; }
  }
}

.load-more {
  text-align: center;
  padding: 20px;

  text { font-size: 13px; color: #999999; }
}

.float-btn {
  position: fixed;
  right: 24px;
  bottom: 80px;
  width: 52px;
  height: 52px;
  border-radius: 26px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.35);
  z-index: 999;

  .float-icon {
    font-size: 28px;
    color: #FFFFFF;
    font-weight: 300;
    margin-top: -2px;
  }
}

/* 弹窗样式 - 移动端优化版 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}

.modal-content {
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - 80px);
  height: auto;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid #F0F0F0;
  flex-shrink: 0;

  .modal-title {
    font-size: 17px;
    font-weight: bold;
    color: #1A1A1A;
  }

  .modal-close {
    font-size: 24px;
    color: #999999;
    padding: 4px;
    line-height: 1;
  }
}

.modal-body {
  padding: 16px 18px;
  max-height: calc(100vh - 220px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  flex: 1;
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

  &.flex-1 { flex: 1; }
}

.form-row {
  display: flex;
  gap: 12px;
}

.status-selector {
  display: flex;
  gap: 10px;

  .status-option {
    flex: 1;
    padding: 10px;
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    text-align: center;
    font-size: 13px;
    color: #666666;

    &.active {
      border-color: #007AFF;
      background: rgba(0, 122, 255, 0.08);
      color: #007AFF;
      font-weight: 600;
    }
  }
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid #F0F0F0;
  flex-shrink: 0;

  .btn {
    flex: 1;
    height: 44px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 600;

    &.btn-primary {
      background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
      color: #FFFFFF;
    }

    &.disabled { opacity: 0.5; }
  }
}

/* 详情面板 */
.detail-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.detail-panel {
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid #F0F0F0;

  .panel-title {
    font-size: 17px;
    font-weight: bold;
    color: #1A1A1A;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .panel-close { font-size: 24px; color: #999999; padding: 4px; }
}

.panel-body {
  padding: 20px;
  max-height: 65vh;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #F5F5F5;

  &:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }

  .section-label {
    font-size: 14px;
    font-weight: 600;
    color: #1A1A1A;
    margin-bottom: 8px;
    display: block;
  }

  .detail-text {
    font-size: 13px;
    color: #666666;
    line-height: 1.6;
    display: block;
    margin-bottom: 4px;
  }
}

@media (max-width: 768px) {
  .stats-panel {
    grid-template-columns: repeat(2, 1fr);
  }

  .info .metrics-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
