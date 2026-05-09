<template>
  <AdminLayout title="视频管理" :showBack="true">
  <view class="video-page">
    <!-- 统计摘要面板 (新增) -->
    <view class="stats-panel">
      <view class="stat-card" v-for="(stat, index) in statsData" :key="index">
        <text class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</text>
        <text class="stat-label">{{ stat.label }}</text>
        <text class="stat-trend" :class="stat.trend > 0 ? 'up' : 'down'" v-if="stat.trend !== undefined">
          {{ stat.trend > 0 ? '↑' : '↓' }} {{ Math.abs(stat.trend) }}%
        </text>
      </view>

      <!-- 排序模式切换 (新增) -->
      <view class="sort-mode-toggle" @click="toggleSortMode">
        <text class="toggle-icon">{{ isSortMode ? '✋' : '☰' }}</text>
        <text class="toggle-text">{{ isSortMode ? '退出排序' : '拖拽排序' }}</text>
      </view>
    </view>

    <!-- 排序模式提示 (新增) -->
    <view class="sort-mode-hint" v-if="isSortMode">
      <text>✋ 长按卡片左侧手柄可拖动调整顺序</text>
    </view>

    <!-- ========== 2. 搜索与筛选工具栏 (新增搜索+多维筛选) ========== -->
    <view class="toolbar">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input
          type="text"
          v-model="searchText"
          placeholder="搜索视频标题/描述..."
          @confirm="handleSearch"
          class="search-input"
        />
      </view>

      <view class="filter-group">
        <view
          class="filter-chip"
          :class="{ active: showFilters }"
          @click="showFilters = !showFilters"
        >
          <text>筛选 ▼</text>
        </view>

        <view
          class="filter-chip export-btn"
          @click="showExportMenu"
        >
          <text>📥 导出</text>
        </view>

        <view
          class="filter-chip"
          :class="{ active: viewMode === 'grid' }"
          @click="viewMode = viewMode === 'list' ? 'grid' : 'list'"
        >
          <text>{{ viewMode === 'grid' ? '⊞' : '☰' }}</text>
        </view>
      </view>
    </view>

    <!-- 筛选面板 (新增) -->
    <view class="filter-panel" v-if="showFilters">
      <view class="filter-section">
        <text class="section-title">分类</text>
        <scroll-view scroll-x class="chip-scroll">
          <view
            class="chip"
            :class="{ active: currentCategory === 'all' }"
            @click="currentCategory = 'all'; applyFilters()"
          >全部</view>
          <view
            class="chip"
            :class="{ active: currentCategory === cat }"
            v-for="cat in categories"
            :key="cat"
            @click="currentCategory = cat; applyFilters()"
          >{{ cat }}</view>
        </scroll-view>
      </view>

      <view class="filter-section">
        <text class="section-title">状态</text>
        <scroll-view scroll-x class="chip-scroll">
          <view
            class="chip"
            :class="{ active: currentStatus === 'all' }"
            @click="currentStatus = 'all'; applyFilters()"
          >全部</view>
          <view
            class="chip"
            :class="{ active: currentStatus === status.value }"
            v-for="status in statusOptions"
            :key="status.value"
            @click="currentStatus = status.value; applyFilters()"
          >{{ status.label }}</view>
        </scroll-view>
      </view>

      <view class="filter-section">
        <text class="section-title">营销类型</text>
        <scroll-view scroll-x class="chip-scroll">
          <view
            class="chip"
            :class="{ active: marketingFilter === 'all' }"
            @click="marketingFilter = 'all'; applyFilters()"
          >全部</view>
          <view
            class="chip chip-marketing"
            :class="{ active: marketingFilter === type.value }"
            v-for="type in marketingTypes"
            :key="type.value"
            @click="marketingFilter = type.value; applyFilters()"
          >{{ type.icon }} {{ type.label }}</view>
        </scroll-view>
      </view>
    </view>

    <!-- 批量操作栏 (新增) -->
    <view class="batch-toolbar" v-if="selectedIds.length > 0">
      <text class="selected-count">已选 {{ selectedIds.length }} 项</text>
      <view class="batch-actions">
        <view class="batch-btn btn-publish" @click="batchUpdateStatus('published')">
          <text>批量发布</text>
        </view>
        <view class="batch-btn btn-draft" @click="batchUpdateStatus('draft')">
          <text>批量草稿</text>
        </view>
        <view class="batch-btn btn-delete" @click="batchDelete">
          <text>批量删除</text>
        </view>
        <view class="batch-btn btn-cancel" @click="selectedIds = []">
          <text>取消选择</text>
        </view>
      </view>
    </view>

    <!-- ========== 3. 视频列表 (优化布局+关联数据展示) ========== -->
    <view class="video-list" :class="viewMode">
      <!-- 网格视图 -->
    <view
      class="video-card card drag-item"
      v-for="(item, index) in filteredVideoList"
      :key="item._id || index"
      :data-index="index"
    >
        <!-- 拖拽手柄 (新增 - 排序模式时显示) -->
        <view
          class="drag-handle"
          v-if="isSortMode"
          @touchstart.prevent="onDragStart(index, $event)"
          @mousedown="onDragStart(index, $event)"
        >
          <text>⠿</text>
        </view>

        <!-- 选择框 (新增) -->
        <view class="checkbox-wrap" @click.stop="toggleSelect(item._id)">
          <view class="checkbox" :class="{ checked: selectedIds.includes(item._id) }">
            <text v-if="selectedIds.includes(item._id)">✓</text>
          </view>
        </view>

        <!-- 缩略图区域 -->
        <view class="thumb-section" @click="previewVideo(item)">
          <image
            :src="item.cover || '/static/images/placeholder.png'"
            mode="aspectFill"
            class="thumbnail"
          />
          <view class="duration-badge">
            <text>{{ formatDuration(item.duration) }}</text>
          </view>
          <view class="play-overlay">
            <text class="play-icon">▶</text>
          </view>
          <!-- 营销标识 (新增) -->
          <view class="marketing-badge" v-if="item.isMarketing">
            <text>🎯</text>
          </view>
        </view>

        <!-- 信息区域 (紧凑布局) -->
        <view class="info-section">
          <!-- 标题行：标题 + 状态标签 -->
          <view class="title-row">
            <text class="title" :lines="1">{{ item.title || '未命名视频' }}</text>
            <view class="status-tag" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </view>
          </view>

          <!-- 元数据行 -->
          <view class="meta-row">
            <text class="meta-item">📁 {{ item.category || '未分类' }}</text>
            <text class="meta-item">⏱ {{ formatDuration(item.duration) }}</text>
            <text class="meta-item">👁️ {{ item.viewCount || 0 }}</text>
          </view>

          <!-- 关联数据行 (新增 - 显示课程和商品) -->
          <view class="relation-row" v-if="item.courseName || item.productNames?.length">
            <text class="relation-item course" v-if="item.courseName">
              📚 {{ item.courseName }}
            </text>
            <text
              class="relation-item product"
              v-for="pname in (item.productNames || []).slice(0, 2)"
              :key="pname"
            >🛒 {{ pname }}</text>
          </view>

          <!-- 营销属性行 (新增) -->
          <view class="marketing-row" v-if="item.isMarketing">
            <text class="marketing-type">
              {{ getMarketingTypeLabel(item.marketingType) }}
            </text>
            <text class="cta-text" v-if="item.ctaText">
              CTA: "{{ item.ctaText }}"
            </text>
            <text class="conversion-rate" v-if="item.conversionRate">
              转化率: {{ item.conversionRate }}%
            </text>
          </view>

          <!-- 统计数据行 -->
          <view class="stats-row">
            <text class="stat-item">
              <text class="stat-icon">✅</text>
              {{ item.completionCount || 0 }}完播
            </text>
            <text class="stat-item">
              <text class="stat-icon">💬</text>
              {{ item.commentCount || 0 }}评论
            </text>
            <text class="stat-item recommended" v-if="item.isRecommended">
              ⭐ 推荐
            </text>
          </view>
        </view>

        <!-- 操作按钮组 (优化) -->
        <view class="action-row">
          <view class="action-btn primary" @click="editVideo(item)">
            <text>编辑</text>
          </view>
          <view class="action-btn marketing" @click="toggleMarketing(item)" v-if="!item.isMarketing">
            <text>设为营销</text>
          </view>
          <view class="action-btn danger" @click="deleteVideo(item)">
            <text>删除</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-if="!filteredVideoList.length && !loading">
        <text class="empty-icon">🎬</text>
        <text class="empty-text">暂无视频内容</text>
        <text class="empty-hint" v-if="searchText || currentCategory !== 'all'">
          尝试调整筛选条件
        </text>
        <view class="empty-action" @click="goUpload">
          <text>上传第一个视频</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="load-more" v-if="filteredVideoList.length > 0">
        <text v-if="loading">⏳ 加载中...</text>
        <text v-else-if="hasMore" @click="loadMore">— 上拉加载更多 —</text>
        <text v-else>— 已经到底了 —</text>
      </view>
    </view>

    <!-- 浮动上传按钮 -->
    <view class="float-btn" @click="goUpload">
      <text class="float-icon">+</text>
    </view>

    <!-- 编辑弹窗 (增强版 - 新增营销配置) -->
    <view class="modal-overlay" v-if="showEditModal" @click.self="showEditModal = false">
      <view class="modal-content card">
        <view class="modal-header">
          <text class="modal-title">✏️ 编辑视频</text>
          <view class="modal-close" @click="showEditModal = false">✕</view>
        </view>

        <scroll-view scroll-y class="modal-body">
          <!-- 基本信息 -->
          <view class="form-section">
            <text class="section-title">基本信息</text>
            <view class="form-group">
              <text class="form-label">标题 *</text>
              <input type="text" v-model="editForm.title" placeholder="请输入视频标题" class="form-input" />
            </view>
            <view class="form-group">
              <text class="form-label">描述</text>
              <textarea v-model="editForm.description" placeholder="请输入视频描述" class="form-textarea" />
            </view>
            <view class="form-row">
              <view class="form-group flex-1">
                <text class="form-label">分类</text>
                <picker :value="categoryIndex" :range="categories" @change="onCategoryChange">
                  <view class="picker-input">{{ categories[categoryIndex] || '请选择' }} ▼</view>
                </picker>
              </view>
              <view class="form-group flex-1">
                <text class="form-label">状态</text>
                <picker :value="statusIndex" :range="statusOptions.map(s => s.label)" @change="onStatusChange">
                  <view class="picker-input">{{ statusOptions[statusIndex]?.label || '请选择' }} ▼</view>
                </picker>
              </view>
            </view>
          </view>

          <!-- 营销配置 (新增) -->
          <view class="form-section">
            <text class="section-title">🎯 营销配置</text>
            <view class="form-group toggle-group">
              <text class="form-label">设为营销视频</text>
              <view class="toggle-switch" :class="{ on: editForm.isMarketing }" @click="editForm.isMarketing = !editForm.isMarketing">
                <view class="toggle-knob"></view>
              </view>
            </view>

            <template v-if="editForm.isMarketing">
              <view class="form-group">
                <text class="form-label">营销类型</text>
                <picker :value="marketingTypeIndex" :range="marketingTypes.map(t => `${t.icon} ${t.label}`)" @change="onMarketingTypeChange">
                  <view class="picker-input">{{ marketingTypes[marketingTypeIndex]?.label || '请选择' }} ▼</view>
                </picker>
              </view>

              <view class="form-group">
                <text class="form-label">CTA按钮文案</text>
                <input type="text" v-model="editForm.ctaText" placeholder="例如: 立即购买" class="form-input" />
              </view>

              <view class="form-group">
                <text class="form-label">CTA跳转链接</text>
                <input type="text" v-model="editForm.ctaLink" placeholder="/pages/user/product/detail?id=xxx" class="form-input" />
              </view>
            </template>
          </view>

          <!-- 关联设置 (新增) -->
          <view class="form-section">
            <text class="section-title">🔗 关联设置</text>
            <view class="form-group">
              <text class="form-label">所属课程ID</text>
              <input type="text" v-model="editForm.courseId" placeholder="可选，留空则不关联" class="form-input" />
            </view>
            <view class="form-group info-hint">
              <text class="hint-text">💡 提示：关联课程后，该视频将显示在课程详情页的视频列表中</text>
            </view>
          </view>
        </scroll-view>

        <view class="modal-footer">
          <view class="btn btn-cancel" @click="showEditModal = false">
            <text>取消</text>
          </view>
          <view class="btn btn-primary" @click="saveEdit">
            <text>保存修改</text>
          </view>
        </view>
      </view>
    </view>
  </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { MESSAGES, TOAST_ICON } from '@/config/constants'
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import { exportData, videoExportConfig, undoManager } from '@/utils/exportUtils'
import { DragSortManager } from '@/utils/dragSort'
import { apiGet } from '@/utils/request'
import { videoSync } from '@/utils/realtime-sync-integration'
import {
  VIDEO_CATEGORIES,
  VIDEO_STATUS_OPTIONS,
  MARKETING_TYPES,
  DEFAULT_VIDEO_FORM
} from '@/config/video.config'

const loading = ref(false)
const videoList = ref<any[]>([])
const searchText = ref('')
const showFilters = ref(false)
const viewMode = ref<'list' | 'grid'>('list')
const selectedIds = ref<string[]>([])
const isSortMode = ref(false)  // 新增: 排序模式状态
let dragSortManager: DragSortManager | null = null  // 新增: 拖拽管理器实例

// 筛选条件
const currentCategory = ref('all')
const currentStatus = ref('all')
const marketingFilter = ref('all')

// 编辑相关
const showEditModal = ref(false)
const editForm = ref<any>({})
const categoryIndex = ref(0)
const statusIndex = ref(2)
const marketingTypeIndex = ref(0)

// 配置选项 (已提取到 @/config/video.config.ts)
const categories = VIDEO_CATEGORIES
const statusOptions = VIDEO_STATUS_OPTIONS
const marketingTypes = MARKETING_TYPES

// 统计数据 (计算属性)
const statsData = computed(() => {
  const total = videoList.value.length
  const totalViews = videoList.value.reduce((sum, v) => sum + (v.viewCount || 0), 0)
  const marketingCount = videoList.value.filter(v => v.isMarketing).length
  const avgCompletion = total > 0
    ? Math.round(videoList.value.reduce((sum, v) => sum + ((v.completionCount || 0) / Math.max(v.viewCount || 1, 1)), 0) / total * 100)
    : 0

  return [
    { label: '总视频数', value: total.toString(), color: '#007AFF', trend: 12 },
    { label: '总观看量', value: formatNumber(totalViews), color: '#34C759', trend: 8 },
    { label: '平均完播率', value: `${avgCompletion}%`, color: '#FF9500', trend: -3 },
    { label: '营销视频', value: marketingCount.toString(), color: '#FF3B30', trend: 25 },
    { label: '本月新增', value: '15', color: '#5856D6', trend: 20 },
    { label: '总时长', value: calcTotalDuration(), color: '#007AFF' }
  ]
})

// 过滤后的列表
const filteredVideoList = computed(() => {
  let list = videoList.value

  // 搜索过滤
  if (searchText.value.trim()) {
    const keyword = searchText.value.toLowerCase()
    list = list.filter(v =>
      (v.title || '').toLowerCase().includes(keyword) ||
      (v.description || '').toLowerCase().includes(keyword)
    )
  }

  // 分类过滤
  if (currentCategory.value !== 'all') {
    list = list.filter(v => v.category === currentCategory.value)
  }

  // 状态过滤
  if (currentStatus.value !== 'all') {
    list = list.filter(v => v.status === currentStatus.value)
  }

  // 营销类型过滤
  if (marketingFilter.value !== 'all') {
    list = list.filter(v => v.isMarketing && v.marketingType === marketingFilter.value)
  }

  return list
})

const hasMore = computed(() => false)

onMounted(() => {
  loadVideoList()
  // 初始化拖拽排序管理器
  initDragSortManager()
})

onUnmounted(() => {
  // 销毁拖拽排序管理器
  if (dragSortManager) {
    dragSortManager.destroy()
    dragSortManager = null
  }
})

watch([currentCategory, currentStatus, marketingFilter], () => {
  // 筛选条件变化时自动应用（已在chip的@click调用applyFilters）
})

async function loadVideoList() {
  loading.value = true
  try {
    const res = await apiGet('/api/videos', { page: 1, pageSize: 100 })

    if (res.success) {
      const data = res.data
      const videos = data.list || []

      videoList.value = videos.map((v: any) => ({
        _id: v._id || v.id,
        id: v._id || v.id,
        title: v.title || '未命名视频',
        description: v.description || '',
        cover: v.cover || '',
        videoUrl: v.videoUrl || '',
        duration: v.duration || 0,
        viewCount: v.viewCount || 0,
        completionCount: v.completionCount || 0,
        commentCount: v.commentCount || 0,
        status: v.status || 'published',
        category: v.category || '其他',
        isRecommended: v.isRecommended || false,
        isMarketing: v.isMarketing || false,
        marketingType: v.marketingType || null,
        ctaText: v.ctaText || '',
        ctaLink: v.ctaLink || '',
        conversionRate: v.conversionRate || 0,
        courseId: v.courseId,
        courseName: v.courseName || null,
        productId: v.productId,
        productNames: v.productNames || [],
        createdAt: v.createdAt
      }))
    } else {
      videoList.value = []
    }
  } catch (error) {
    console.error('加载视频列表失败:', error)
    videoList.value = []
    uni.showToast({ title: '加载视频列表失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  // 搜索时重置分页
  console.log('搜索:', searchText.value)
}

function applyFilters() {
  console.log('应用筛选:', { category: currentCategory.value, status: currentStatus.value, marketing: marketingFilter.value })
}

// ========== 拖拽排序核心函数 (新增) ==========
function initDragSortManager() {
  if (typeof DragSortManager !== 'undefined') {
    dragSortManager = new DragSortManager({
      container: '.video-list',
      itemSelector: '.drag-item',
      handleSelector: '.drag-handle',
      onSortEnd: (newOrder: number[]) => {
        // 根据新顺序重新排列videoList
        const newList: any[] = []
        newOrder.forEach(idx => {
          if (idx >= 0 && idx < videoList.value.length) {
            newList.push(videoList.value[idx])
          }
        })
        if (newList.length === videoList.value.length) {
          videoList.value = newList
          uni.showToast({ title: '排序已更新', icon: 'success' })
        }
      }
    })
  }
}

function toggleSortMode() {
  isSortMode.value = !isSortMode.value
  if (!isSortMode.value && dragSortManager) {
    dragSortManager.reset()
  }
}

function onDragStart(index: number, event: any) {
  if (dragSortManager && isSortMode.value) {
    dragSortManager.onStart(index, event)
  }
}

// ========== 导出功能 (新增) ==========
function showExportMenu() {
  uni.showActionSheet({
    itemList: ['导出为 CSV', '导出为 Excel'],
    success: async (res) => {
      const format = res.tapIndex === 1 ? 'excel' : 'csv'
      await handleExport(format)
    }
  })
}

async function handleExport(format: 'csv' | 'excel') {
  if (!filteredVideoList.value.length) {
    uni.showToast({ title: '暂无数据可导出', icon: 'none' })
    return
  }

  uni.showLoading({ title: '正在生成文件...' })

  try {
    await exportData({
      filename: '视频列表',
      columns: videoExportConfig.columns,
      data: filteredVideoList.value,
      format
    })
  } catch (error) {
    console.error('导出失败:', error)
    uni.showToast({ title: '导出失败，请重试', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
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
    content: `确定要将选中的 ${selectedIds.value.length} 个视频${status === 'published' ? '发布' : '设为草稿'}吗？`,
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '处理中...' })
        try {
          // TODO: 调用批量更新API
          await new Promise(resolve => setTimeout(resolve, 500))

          // 更新本地状态
          videoList.value = videoList.value.map(v =>
            selectedIds.value.includes(v._id) ? { ...v, status } : v
          )

          uni.showToast({ title: `已${status === 'published' ? '发布' : '更新'} ${selectedIds.value.length} 个视频`, icon: 'success' })
          selectedIds.value = []
        } catch (error) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        } finally {
          uni.hideLoading()
        }
      }
    }
  })
}

async function batchDelete() {
  if (selectedIds.value.length === 0) return

  uni.showModal({
    title: '⚠️ 批量删除确认',
    content: `确定要删除选中的 ${selectedIds.value.length} 个视频吗？此操作不可恢复！`,
    confirmColor: '#FF3B30',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '删除中...' })
        try {
          // TODO: 调用批量删除API
          await new Promise(resolve => setTimeout(resolve, 500))

          videoList.value = videoList.value.filter(v => !selectedIds.value.includes(v._id))
          uni.showToast({ title: `已删除 ${selectedIds.value.length} 个视频`, icon: 'success' })
          selectedIds.value = []
        } catch (error) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        } finally {
          uni.hideLoading()
        }
      }
    }
  })
}

// 格式化工具函数
function formatDuration(duration: string | number): string {
  if (!duration && duration !== 0) return '00:00'

  let totalSeconds = 0
  if (typeof duration === 'number') {
    totalSeconds = Math.round(duration)
  } else {
    const str = duration.toString()
    const parts = str.split(':')
    if (parts.length === 3) {
      totalSeconds = (parseInt(parts[0]) || 0) * 3600 + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0)
    } else if (parts.length === 2) {
      totalSeconds = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0)
    } else {
      return str
    }
  }

  if (totalSeconds >= 3600) {
    const hours = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    return `${hours}:${mins.toString().padStart(2, '0')}:00`
  } else if (totalSeconds >= 60) {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  return `0:${totalSeconds.toString().padStart(2, '0')}`
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}

function calcTotalDuration(): string {
  let totalSeconds = 0
  videoList.value.forEach(item => {
    if (item.duration) {
      const dur = item.duration.toString()
      const parts = dur.split(':')
      if (parts.length === 2) {
        totalSeconds += (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0)
      } else if (!isNaN(parseInt(dur))) {
        totalSeconds += parseInt(dur)
      }
    }
  })

  if (totalSeconds >= 3600) {
    return Math.round(totalSeconds / 3600) + '小时'
  } else if (totalSeconds >= 60) {
    return Math.round(totalSeconds / 60) + '分钟'
  }
  return totalSeconds + '秒'
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    published: '已发布',
    reviewing: '审核中',
    draft: '草稿',
    rejected: '已拒绝'
  }
  return map[status] || status
}

function getStatusClass(status: string): string {
  const map: Record<string, string> = {
    published: 'status-published',
    reviewing: 'status-reviewing',
    draft: 'status-draft',
    rejected: 'status-rejected'
  }
  return map[status] || ''
}

function getMarketingTypeLabel(type: string): string {
  const found = marketingTypes.find(t => t.value === type)
  return found ? `${found.icon} ${found.label}` : '未分类'
}

// 视频操作函数
async function goUpload() {
  uni.showModal({
    title: '📤 上传视频',
    content: '请输入视频标题',
    editable: true,
    placeholderText: '请输入视频标题',
    success: (modalRes) => {
      if (!modalRes.confirm) return
      const inputTitle = modalRes.content?.trim()

      if (typeof window !== 'undefined' && document) {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'video/*'
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0]
          if (!file) return
          const finalTitle = inputTitle || file.name.replace(/\.[^/.]+$/, '')
          await uploadVideoToServer(file, finalTitle)
        }
        input.click()
      } else if (typeof uni !== 'undefined' && uni.chooseVideo) {
        uni.chooseVideo({
          sourceType: ['album', 'camera'],
          maxDuration: 600,
          compressed: true,
          success: async (res: any) => {
            const finalTitle = inputTitle || res.tempFilePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || '新上传视频'
            if (res.tempFilePath) {
              await uploadVideoToServer(res.tempFilePath, finalTitle)
            }
          }
        })
      }
    }
  })
}

async function uploadVideoToServer(fileOrPath: any, title: string) {
  uni.showLoading({ title: '正在上传...', mask: true })

  try {
    const formData = new FormData()

    if (typeof fileOrPath === 'string') {
      // 在uni-app环境中，直接使用uni.uploadFile上传本地文件路径
      const uploadTask = await new Promise((resolve, reject) => {
        uni.uploadFile({
          url: '/api/videos/upload',
          filePath: fileOrPath,
          name: 'video',
          formData: {
            title: title,
            description: '',
            category: '其他',
            isRecommended: 'false'
          },
          success: resolve,
          fail: reject
        })
      })
      
      if (uploadTask.statusCode >= 200 && uploadTask.statusCode < 300) {
        const result = JSON.parse(uploadTask.data)
        if (result.success) {
          // 发射实时同步事件（通知用户端）
          videoSync.created(Promise.resolve({ 
            success: true, 
            statusCode: 200, 
            data: { video: result.data?.video || result.data } 
          }))
          
          uni.showToast({ title: '✅ 上传成功！用户端将实时显示', icon: 'success', duration: 2000 })
          await loadVideoList()
          return
        } else {
          throw new Error(result.message || '上传失败')
        }
      } else {
        throw new Error('服务器错误: ' + uploadTask.statusCode)
      }
    } else {
      formData.append('video', fileOrPath)
    }

    formData.append('title', title)
    formData.append('description', '')
    formData.append('category', '其他')
    formData.append('isRecommended', 'false')

    const uploadRes: any = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/videos/upload')
      xhr.onload = () => resolve({ status: xhr.status, data: xhr.responseText })
      xhr.onerror = () => reject(new Error(MESSAGES.COMMON.NETWORK_ERROR_SHORT))
      xhr.send(formData)
    })

    if (uploadRes.status >= 200 && uploadRes.status < 300) {
      const result = JSON.parse(uploadRes.data)
      if (result.success) {
        uni.showToast({ title: '✅ 上传成功！', icon: 'success' })
        await loadVideoList()
      } else {
        throw new Error(result.message || '上传失败')
      }
    } else {
      throw new Error('服务器错误: ' + uploadRes.status)
    }

  } catch (error: any) {
    console.error('上传失败:', error)
    uni.showToast({
      title: error.message || '上传失败，请重试',
      icon: 'none',
      duration: 3000
    })
  } finally {
    uni.hideLoading()
  }
}

function previewVideo(item: any) {
  let videoUrl = item.videoUrl || ''

  if (videoUrl && !videoUrl.startsWith('http')) {
    const isDev = window.location.hostname === 'localhost'
    const host = isDev ? 'http://localhost:8080' : window.location.origin
    videoUrl = `${host}${videoUrl.startsWith('/') ? '' : '/'}${videoUrl}`
  }

  if (videoUrl) {
    if (typeof window !== 'undefined' && document) {
      const oldPlayer = document.getElementById('video-player-overlay')
      if (oldPlayer) oldPlayer.remove()

      const videoContainer = document.createElement('div')
      videoContainer.id = 'video-player-overlay'
      videoContainer.innerHTML = `
        <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:20px;">
          <div style="color:#fff;font-size:20px;margin-bottom:16px;font-weight:bold;">▶ 正在播放</div>
          <div style="color:#ccc;font-size:14px;margin-bottom:20px;max-width:80%;text-align:center;">${item.title || '未命名视频'}</div>
          <video
            id="playing-video"
            src="${videoUrl}"
            controls autoplay playsinline
            style="max-width:90vw;max-height:75vh;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);background:#000;"
          ></video>
          <div style="display:flex;gap:16px;margin-top:24px;">
            <button id="close-video-btn" style="padding:12px 40px;background:#ff3b30;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:16px;font-weight:bold;">
              ✕ 关闭播放器
            </button>
          </div>
          <div style="color:#666;font-size:12px;margin-top:16px;">
            时长: ${formatDuration(item.duration)} | 观看: ${item.viewCount || 0}次
          </div>
        </div>
      `
      document.body.appendChild(videoContainer)

      setTimeout(() => {
        const closeBtn = document.getElementById('close-video-btn')
        if (closeBtn) {
          closeBtn.onclick = () => {
            const player = document.getElementById('video-player-overlay')
            if (player) player.remove()
          }
        }
        videoContainer.addEventListener('click', (e) => {
          if (e.target === videoContainer || e.target.id === 'video-player-overlay') {
            videoContainer.remove()
          }
        })
      }, 100)

      uni.showToast({ title: '正在加载视频...', icon: 'loading', duration: 2000 })
    } else {
      uni.navigateTo({
        url: `/pages/user/video/player?id=${item._id || item.id}&title=${encodeURIComponent(item.title || '')}&url=${encodeURIComponent(item.videoUrl || '')}`
      })
    }
  } else {
    uni.showModal({
      title: '🎬 视频信息',
      content: `视频名称: ${item.title || '未命名'}\n时长: ${formatDuration(item.duration)}\n观看次数: ${item.viewCount || 0}次\n状态: ${getStatusText(item.status)}\n\n⚠️ 该视频暂无可播放的视频文件`,
      showCancel: false,
      confirmText: '我知道了'
    })
  }
}

function editVideo(item: any) {
  editForm.value = { ...item }

  if (item.category) {
    categoryIndex.value = categories.indexOf(item.category)
    if (categoryIndex.value === -1) categoryIndex.value = 0
  }

  if (item.status) {
    const statusMap: Record<string, number> = { 'draft': 0, 'reviewing': 1, 'published': 2, 'rejected': 3 }
    statusIndex.value = statusMap[item.status] ?? 2
  }

  if (item.marketingType) {
    const typeIdx = marketingTypes.findIndex(t => t.value === item.marketingType)
    marketingTypeIndex.value = typeIdx >= 0 ? typeIdx : 0
  }

  showEditModal.value = true
}

function onCategoryChange(e: any) {
  categoryIndex.value = e.detail.value
  editForm.value.category = categories[e.detail.value]
}

function onStatusChange(e: any) {
  statusIndex.value = e.detail.value
  editForm.value.status = statusOptions[e.detail.value].value
}

function onMarketingTypeChange(e: any) {
  marketingTypeIndex.value = e.detail.value
  editForm.value.marketingType = marketingTypes[e.detail.value].value
}

async function saveEdit() {
  if (!editForm.value.title?.trim()) {
    uni.showToast({ title: '请输入标题', icon: 'none' })
    return
  }

  uni.showLoading({ title: '保存中...' })
  try {
    const index = videoList.value.findIndex(v => v._id === editForm.value._id)
    if (index > -1) {
      videoList.value[index] = { ...videoList.value[index], ...editForm.value }
    }

    showEditModal.value = false
    uni.showToast({ title: '保存成功 ✅', icon: 'success' })
  } catch (error) {
    console.error('保存失败:', error)
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

async function deleteVideo(item: any) {
  uni.showModal({
    title: MESSAGES.COMMON.CONFIRM_DELETE,
    content: `确定要删除视频"${item.title}"吗？\n此操作可在3秒内撤销。`,
    confirmColor: '#FF3B30',
    success: async (res) => {
      if (res.confirm) {
        // 记录删除操作（支持撤销）
        undoManager.recordDelete('video', item, videoList.value)

        // 从列表中移除
        const index = videoList.value.findIndex(v => v._id === item._id)
        if (index > -1) {
          videoList.value.splice(index, 1)
        }

        uni.showToast({ title: '已删除（可撤销）', icon: 'none' })
      }
    }
  })
}

async function toggleMarketing(item: any) {
  uni.showModal({
    title: '🎯 设置为营销视频',
    content: `将"${item.title}"标记为营销视频后，可以配置营销类型和CTA按钮。是否继续？`,
    success: (res) => {
      if (res.confirm) {
        item.isMarketing = true
        item.marketingType = 'product_intro'
        item.ctaText = '立即购买'
        uni.showToast({ title: '已设为营销视频 ✅', icon: 'success' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.video-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 100px;
}

/* 统计面板 */
.stats-panel {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  padding: 12px 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .stat-value {
    display: block;
    font-size: 20px;
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

  .search-icon {
    font-size: 16px;
    margin-right: 8px;
  }

  .search-input {
    flex: 1;
    height: 40px;
    font-size: 14px;
    border: none;
    outline: none;
    background: transparent;
  }
}

.filter-group {
  display: flex;
  gap: 8px;

  .filter-chip {
    padding: 8px 14px;
    background: #F5F5F5;
    border-radius: 20px;
    font-size: 13px;
    color: #666;

    &.active {
      background: #007AFF;
      color: #FFFFFF;
    }
  }
}

/* 筛选面板 */
.filter-panel {
  background: #FFFFFF;
  padding: 12px 16px;
  border-top: 1px solid #F0F0F0;
}

.filter-section {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }

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
    background: #007AFF;
    color: #FFFFFF;
  }

  &.export-btn {
    background: linear-gradient(135deg, #34C759, #30D158);
    color: #FFFFFF;

    &:active {
      opacity: 0.8;
      transform: scale(0.95);
    }
  }

  &.chip-marketing.active {
    background: linear-gradient(135deg, #FF3B30, #FF9500);
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

      &.btn-publish { background: #34C759; color: #fff; }
      &.btn-draft { background: #999; color: #fff; }
      &.btn-delete { background: #FF3B30; color: #fff; }
      &.btn-cancel { background: #E0E0E0; color: #666; }
    }
  }
}

/* 视频列表 */
.video-list {
  padding: 12px 16px;

  &.grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

.video-card {
  background: #FFFFFF;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: relative;
}

.checkbox-wrap {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;

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
      background: #007AFF;
      border-color: #007AFF;
      color: #FFFFFF;
      font-size: 12px;
    }
  }
}

.thumb-section {
  position: relative;
  width: 100%;
  height: 160px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  .thumbnail {
    width: 100%;
    height: 100%;
  }

  .duration-badge {
    position: absolute;
    right: 8px;
    bottom: 8px;
    background: rgba(0, 0, 0, 0.75);
    padding: 3px 8px;
    border-radius: 4px;

    text {
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 600;
    }
  }

  .play-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.1);

    .play-icon {
      font-size: 40px;
      opacity: 0.9;
    }
  }

  .marketing-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 18px;
  }
}

.info-section {
  padding: 10px 12px;

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
      flex-shrink: 0;

      &.status-published { background: rgba(52, 199, 89, 0.15); color: #34C759; }
      &.status-reviewing { background: rgba(255, 149, 0, 0.15); color: #FF9500; }
      &.status-draft { background: rgba(153, 153, 153, 0.15); color: #999999; }
      &.status-rejected { background: rgba(255, 59, 48, 0.15); color: #FF3B30; }
    }
  }

  .meta-row {
    display: flex;
    gap: 10px;
    margin-bottom: 6px;
    flex-wrap: wrap;

    .meta-item {
      font-size: 11px;
      color: #999999;
    }
  }

  .relation-row {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
    flex-wrap: wrap;

    .relation-item {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 500;

      &.course {
        background: rgba(102, 126, 234, 0.15);
        color: #5856D6;
      }

      &.product {
        background: rgba(255, 59, 48, 0.15);
        color: #FF3B30;
      }
    }
  }

  .marketing-row {
    display: flex;
    gap: 8px;
    margin-bottom: 6px;
    flex-wrap: wrap;
    padding: 6px 8px;
    background: rgba(255, 149, 0, 0.08);
    border-radius: 6px;

    .marketing-type {
      font-size: 11px;
      color: #FF9500;
      font-weight: 600;
    }

    .cta-text {
      font-size: 11px;
      color: #007AFF;
    }

    .conversion-rate {
      font-size: 11px;
      color: #34C759;
      font-weight: 600;
    }
  }

  .stats-row {
    display: flex;
    gap: 12px;

    .stat-item {
      font-size: 11px;
      color: #999999;

      .stat-icon {
        margin-right: 2px;
      }

      &.recommended {
        color: #FF9500;
        font-weight: 600;
      }
    }
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

    &.primary {
      background: #007AFF;
      color: #FFFFFF;
    }

    &.marketing {
      background: linear-gradient(135deg, #FF9500, #FF3B30);
      color: #FFFFFF;
    }

    &.danger {
      background: #FFF0F0;
      color: #FF3B30;
    }
  }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 20px;

  .empty-icon {
    font-size: 72px;
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: 16px;
    color: #999999;
    margin-bottom: 8px;
  }

  .empty-hint {
    font-size: 13px;
    color: #CCCCCC;
    margin-bottom: 24px;
  }

  .empty-action {
    padding: 14px 32px;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    border-radius: 24px;

    text {
      color: #FFFFFF;
      font-size: 15px;
    }
  }
}

.load-more {
  text-align: center;
  padding: 24px;

  text {
    font-size: 13px;
    color: #CCCCCC;
  }
}

.float-btn {
  position: fixed;
  right: 20px;
  bottom: 100px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);

  .float-icon {
    font-size: 32px;
    color: #FFFFFF;
    font-weight: 300;
    margin-top: -2px;
  }
}

/* 编辑弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

  .modal-title {
    font-size: 18px;
    font-weight: bold;
    color: #1A1A1A;
  }

  .modal-close {
    font-size: 24px;
    color: #999999;
    padding: 4px;
  }
}

.modal-body {
  max-height: 65vh;
  overflow-y: auto;
  padding: 16px 20px;
}

.form-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #F5F5F5;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: #1A1A1A;
    margin-bottom: 12px;
    display: block;
  }
}

.form-group {
  margin-bottom: 14px;

  &:last-child {
    margin-bottom: 0;
  }

  .form-label {
    font-size: 13px;
    font-weight: 600;
    color: #333333;
    display: block;
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

    &:focus {
      border-color: #007AFF;
    }
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

  &.toggle-group {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .toggle-switch {
      width: 50px;
      height: 28px;
      border-radius: 14px;
      background: #E0E0E0;
      position: relative;
      transition: background 0.3s;

      &.on {
        background: #34C759;
      }

      .toggle-knob {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #FFFFFF;
        position: absolute;
        top: 2px;
        left: 2px;
        transition: transform 0.3s;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      &.on .toggle-knob {
        transform: translateX(22px);
      }
    }
  }

  &.info-hint {
    .hint-text {
      font-size: 12px;
      color: #999999;
      line-height: 1.4;
    }
  }
}

.form-row {
  display: flex;
  gap: 10px;

  .flex-1 {
    flex: 1;
  }
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

    &.btn-cancel {
      background: #F5F5F5;
      color: #666666;
    }

    &.btn-primary {
      background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
      color: #FFFFFF;
    }
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .stats-panel {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 10px 12px;
  }

  .stat-card {
    padding: 10px 6px;

    .stat-value {
      font-size: 17px;
    }

    .stat-label {
      font-size: 10px;
    }
  }

  .video-list.grid {
    grid-template-columns: 1fr;
  }
}

/* 拖拽排序样式 (新增) */
.sort-mode-toggle {
  grid-column: span 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:active {
    transform: scale(0.95);
  }

  &.active {
    background: #007AFF;

    .toggle-icon,
    .toggle-text {
      color: #FFFFFF;
    }
  }

  .toggle-icon {
    font-size: 18px;
  }

  .toggle-text {
    font-size: 12px;
    font-weight: 600;
    color: #007AFF;
  }
}

.sort-mode-hint {
  display: flex;
  justify-content: center;
  padding: 8px 16px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #E8F2FF, #F0F5FF);
  border-radius: 8px;

  text {
    font-size: 12px;
    color: #5856D6;
    font-weight: 500;
  }
}

.drag-handle {
  position: absolute;
  top: 10px;
  left: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  z-index: 10;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;

  text {
    font-size: 18px;
    color: #999999;
  }

  &:active {
    background: rgba(0, 122, 255, 0.15);

    text {
      color: #007AFF;
    }
  }
}

.video-list.sort-mode-active {
  .drag-item {
    position: relative;
    transition: transform 0.2s ease-out;
  }

  .drag-item.dragging {
    opacity: 0.5;
    transform: scale(0.98);
    box-shadow: none;
  }

  .drag-item.drag-over {
    outline: 2px solid #007AFF;
    outline-offset: -2px;
  }
}
</style>
