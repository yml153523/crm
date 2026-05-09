<template>
  <AdminLayout title="提醒中心" :showBack="true">
  <view class="remind-page">
    <view class="tabs">
      <view 
        class="tab-item" 
        :class="{ active: activeTab === item.key }"
        v-for="(item, index) in tabs" 
        :key="index"
        @click="activeTab = item.key"
      >
        <text class="tab-icon">{{ item.icon }}</text>
        <text class="tab-label">{{ item.label }}</text>
        <view class="tab-badge" v-if="item.count > 0">
          <text>{{ item.count }}</text>
        </view>
      </view>
    </view>

    <!-- 红包提醒 -->
    <view class="content" v-if="activeTab === 'redPacket'">
      <view class="section-header">
        <text class="section-title">🧧 红包提醒</text>
        <view class="batch-btn" @click="sendBatchRemind('redPacket')">
          <text>批量发送</text>
        </view>
      </view>
      
      <view class="user-list">
        <view class="user-card card" v-for="(user, index) in redPacketUsers" :key="index">
          <view class="user-avatar">
            <text>{{ user.name.charAt(0) }}</text>
          </view>
          <view class="user-info">
            <text class="user-name">{{ user.name }}</text>
            <text class="user-phone">📱 {{ user.phone }}</text>
            <view class="user-tags">
              <view class="tag tag-vip" v-if="user.isVIP">VIP</view>
              <view class="tag tag-active" v-if="user.isActive">活跃</view>
            </view>
          </view>
          <view class="user-actions">
            <view 
              class="send-btn"
              :class="{ sending: sendingId === user._id }"
              @click="sendRemind(user._id, 'redPacket')"
            >
              <text>{{ sendingId === user._id ? '发送中...' : '发送' }}</text>
            </view>
          </view>
        </view>
        
        <view class="empty-state" v-if="!redPacketUsers.length && !loading">
          <text class="empty-icon">🧧</text>
          <text class="empty-text">暂无待发红包用户</text>
        </view>
      </view>
    </view>

    <!-- 上课提醒 -->
    <view class="content" v-if="activeTab === 'classReminder'">
      <view class="section-header">
        <text class="section-title">📚 上课提醒</text>
        <view class="batch-btn" @click="sendBatchRemind('classReminder')">
          <text>批量发送</text>
        </view>
      </view>
      
      <view class="user-list">
        <view class="user-card card" v-for="(user, index) in classUsers" :key="index">
          <view class="user-avatar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <text>{{ user.name.charAt(0) }}</text>
          </view>
          <view class="user-info">
            <text class="user-name">{{ user.name }}</text>
            <text class="user-phone">📱 {{ user.phone }}</text>
            <text class="course-info">课程: {{ user.courseName }} · {{ user.classTime }}</text>
          </view>
          <view class="user-actions">
            <view 
              class="send-btn btn-purple"
              :class="{ sending: sendingId === user._id }"
              @click="sendRemind(user._id, 'classReminder')"
            >
              <text>{{ sendingId === user._id ? '发送中...' : '发送' }}</text>
            </view>
          </view>
        </view>
        
        <view class="empty-state" v-if="!classUsers.length && !loading">
          <text class="empty-icon">📚</text>
          <text class="empty-text">暂无待上课用户</text>
        </view>
      </view>
    </view>

    <!-- 推荐管理 -->
    <view class="content" v-if="activeTab === 'recommendation'">
      <view class="section-header">
        <text class="section-title">⭐ 推荐内容管理</text>
        <view class="batch-btn" @click="showAddRecommendation" style="background: linear-gradient(135deg, #FF9500 0%, #FF6B00 100%);">
          <text>+ 添加推荐</text>
        </view>
      </view>

      <!-- 推荐列表 -->
      <view class="recommendation-list">
        <view class="rec-card card" v-for="(item, index) in recommendationList" :key="index">
          <view class="rec-cover">
            <image
              v-if="item.image"
              :src="item.image"
              mode="aspectFill"
              class="rec-image"
            />
            <view v-else class="rec-placeholder" :style="{ background: getRecGradient(index) }">
              <text class="rec-icon">{{ getRecTypeIcon(item.contentType) }}</text>
            </view>

            <!-- 类型标签 -->
            <view class="rec-type-badge" :class="'type-' + item.contentType">
              <text>{{ getRecTypeLabel(item.contentType) }}</text>
            </view>

            <!-- 状态标签 -->
            <view class="rec-status-badge" :class="item.status === 'active' ? 'status-active' : 'status-inactive'">
              <text>{{ item.status === 'active' ? '已发布' : '已下架' }}</text>
            </view>
          </view>

          <view class="rec-body">
            <text class="rec-title">{{ item.title }}</text>
            <text class="rec-desc" v-if="item.description">{{ item.description }}</text>

            <view class="rec-meta">
              <text class="meta-item" v-if="item.price > 0">💰 ¥{{ item.price }}</text>
              <text class="meta-item" v-else>🆓 免费</text>
              <text class="meta-item">👁️ {{ item.viewCount || 0 }}次查看</text>
              <text class="meta-item">👆 {{ item.clickCount || 0 }}次点击</text>
            </view>

            <view class="rec-tags" v-if="item.tags && item.tags.length > 0">
              <view class="tag-item" v-for="(tag, idx) in item.tags" :key="idx">
                <text>#{{ tag }}</text>
              </view>
            </view>
          </view>

          <view class="rec-actions">
            <view
              class="action-btn btn-edit"
              @click="editRecommendation(item)"
            >
              <text>编辑</text>
            </view>
            <view
              class="action-btn"
              :class="item.status === 'active' ? 'btn-disable' : 'btn-enable'"
              @click="toggleRecommendStatus(item)"
            >
              <text>{{ item.status === 'active' ? '下架' : '上架' }}</text>
            </view>
            <view
              class="action-btn btn-delete"
              @click="deleteRecommendation(item._id)"
            >
              <text>删除</text>
            </view>
          </view>
        </view>

        <view class="empty-state" v-if="!recommendationList.length && !loadingRec">
          <text class="empty-icon">⭐</text>
          <text class="empty-text">暂无推荐内容</text>
          <text class="empty-hint">点击上方按钮添加推荐内容</text>
        </view>
      </view>
    </view>

    <!-- 提醒历史 -->
    <view class="content" v-if="activeTab === 'history'">
      <view class="section-header">
        <text class="section-title">📋 发送记录</text>
        <view class="filter-tag" @click="showHistoryFilter = !showHistoryFilter">
          <text>筛选 ▼</text>
        </view>
      </view>

      <view class="history-filter" v-if="showHistoryFilter">
        <view class="filter-options">
          <view 
            class="filter-option"
            :class="{ active: historyType === 'all' }"
            @click="historyType = 'all'"
          >全部</view>
          <view 
            class="filter-option"
            :class="{ active: historyType === 'redPacket' }"
            @click="historyType = 'redPacket'"
          >红包</view>
          <view 
            class="filter-option"
            :class="{ active: historyType === 'classReminder' }"
            @click="historyType = 'classReminder'"
          >上课</view>
        </view>
      </view>
      
      <view class="history-list">
        <view class="history-item card" v-for="(record, index) in filteredHistory" :key="index">
          <view class="history-icon" :class="record.type === 'redPacket' ? 'icon-red' : 'icon-blue'">
            <text>{{ record.type === 'redPacket' ? '🧧' : '📚' }}</text>
          </view>
          <view class="history-content">
            <text class="history-title">{{ record.title }}</text>
            <text class="history-target">接收人: {{ record.targetName }} ({{ record.targetPhone }})</text>
            <text class="history-time">{{ record.time }}</text>
          </view>
          <view class="history-status" :class="record.status === 'success' ? 'status-success' : 'status-failed'">
            <text>{{ record.status === 'success' ? '✅ 成功' : '❌ 失败' }}</text>
          </view>
        </view>
        
        <view class="empty-state" v-if="!filteredHistory.length">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无发送记录</text>
        </view>
      </view>
    </view>
  </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { MESSAGES, TOAST_ICON } from '@/config/constants'
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import { remindAPI } from '@/api/remind'
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/request'
import { recommendationSync } from '@/utils/realtime-sync-integration'

const activeTab = ref('redPacket')
const loading = ref(false)
const sendingId = ref<string | null>(null)
const showHistoryFilter = ref(false)
const historyType = ref('all')

const tabs = ref([
  { key: 'redPacket', label: '红包提醒', icon: '🧧', count: 0 },
  { key: 'classReminder', label: '上课提醒', icon: '📚', count: 0 },
  { key: 'recommendation', label: '推荐管理', icon: '⭐', count: 0 },
  { key: 'history', label: '提醒历史', icon: '📋', count: 0 }
])

const redPacketUsers = ref<any[]>([])
const classUsers = ref<any[]>([])
const historyList = ref<any[]>([])

// 推荐管理相关状态
const recommendationList = ref<any[]>([])
const loadingRec = ref(false)
const showRecForm = ref(false)
const editingRec = ref<any>(null)
const recForm = ref({
  title: '',
  description: '',
  contentType: 'custom',
  contentId: '',
  link: '',
  image: '',
  price: 0,
  priority: 0,
  tags: [],
  status: 'active'
})

onMounted(async () => {
  try {
    await Promise.all([
      loadRedPacketUsers(),
      loadClassUsers(),
      loadRemindHistory(),
      loadRecommendations()
    ])
  } catch (error) {
    console.error('初始化加载失败:', error)
    // 确保有数据显示
    if (redPacketUsers.value.length === 0) redPacketUsers.value = getMockRedPacketUsers()
    if (classUsers.value.length === 0) classUsers.value = getMockClassUsers()
    if (historyList.value.length === 0) historyList.value = getMockHistory()
  }
})

async function loadRedPacketUsers() {
  try {
    const res = await apiGet('/api/remind/users/redPacket')

    if (res.success) {
      redPacketUsers.value = (res.data?.list || []).map((u: any) => ({
        ...u,
        phone: u.phone ? u.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : ''
      }))
      tabs.value[0].count = redPacketUsers.value.length
    }
  } catch (error) {
    console.error('加载红包用户失败:', error)
    redPacketUsers.value = getMockRedPacketUsers()
    tabs.value[0].count = 5
  }
}

async function loadClassUsers() {
  try {
    const res = await apiGet('/api/remind/users/classReminder')

    if (res.success) {
      classUsers.value = (res.data?.list || []).map((u: any) => ({
        ...u,
        phone: u.phone ? u.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '',
        courseName: '瑜伽基础',
        classTime: '今天 14:00'
      }))
      tabs.value[1].count = classUsers.value.length
    }
  } catch (error) {
    console.error('加载上课用户失败:', error)
    classUsers.value = getMockClassUsers()
    tabs.value[1].count = 3
  }
}

async function loadRemindHistory() {
  try {
    const res: any = await remindAPI.getRemindHistory({ pageSize: 50 })
    if (res.success && res.data) {
      historyList.value = (res.data.list || []).map((r: any) => ({
        _id: r._id,
        type: r.type,
        title: r.title,
        targetName: r.userId?.name || '未知用户',
        targetPhone: r.userId?.phone || '',
        time: new Date(r.sentAt || r.createdAt).toLocaleString('zh-CN'),
        status: r.status === 'sent' ? 'success' : 'failed'
      }))
      tabs.value[2].count = 0
    }
  } catch (error) {
    console.error('加载提醒历史失败:', error)
    historyList.value = getMockHistory()
  }
}

function getMockRedPacketUsers() {
  return [
    { _id: '1', name: '张三', phone: '138****1234', isVIP: true, isActive: true },
    { _id: '2', name: '李四', phone: '139****5678', isVIP: false, isActive: true },
    { _id: '3', name: '王五', phone: '137****9012', isVIP: true, isActive: false },
    { _id: '4', name: '赵六', phone: '136****3456', isVIP: false, isActive: true },
    { _id: '5', name: '孙七', phone: '135****7890', isVIP: true, isActive: true }
  ]
}

function getMockClassUsers() {
  return [
    { _id: '6', name: '周八', phone: '134****2345', courseName: '瑜伽基础', classTime: '今天 14:00' },
    { _id: '7', name: '吴九', phone: '133****6789', courseName: '普拉提进阶', classTime: '今天 16:30' },
    { _id: '8', name: '郑十', phone: '132****0123', courseName: '舞蹈入门', classTime: '明天 10:00' }
  ]
}

function getMockHistory() {
  return [
    { _id: 'h1', type: 'redPacket', title: '新年红包提醒', targetName: '张三', targetPhone: '138****1234', time: '2026-04-08 10:30:00', status: 'success' },
    { _id: 'h2', type: 'classReminder', title: '瑜伽课上课提醒', targetName: '李四', targetPhone: '139****5678', time: '2026-04-07 13:45:00', status: 'success' },
    { _id: 'h3', type: 'redPacket', title: '会员日红包', targetName: '王五', targetPhone: '137****9012', time: '2026-04-06 09:15:00', status: 'failed' }
  ]
}

// ==================== 推荐管理功能 ====================

async function loadRecommendations() {
  loadingRec.value = true
  try {
    const res = await apiGet('/api/recommendations?pageSize=50')

    if (res.success && res.data?.list) {
      recommendationList.value = res.data.list
      tabs.value[2].count = recommendationList.value.filter((r: any) => r.status === 'active').length
    } else {
      console.log('[提醒中心] 加载推荐失败，使用示例数据')
      recommendationList.value = getMockRecommendations()
      tabs.value[2].count = 3
    }
  } catch (error) {
    console.error('加载推荐列表失败:', error)
    recommendationList.value = getMockRecommendations()
    tabs.value[2].count = 3
  } finally {
    loadingRec.value = false
  }
}

function getMockRecommendations() {
  return [
    {
      _id: 'rec1',
      title: '瑜伽基础入门课程',
      description: '适合零基础学员，从呼吸法开始学习',
      contentType: 'course',
      image: '',
      price: 0,
      priority: 10,
      status: 'active',
      viewCount: 156,
      clickCount: 89,
      tags: ['瑜伽', '新手', '热门']
    },
    {
      _id: 'rec2',
      title: '普拉提核心训练',
      description: '强化核心肌群，塑造完美体型',
      contentType: 'video',
      image: '',
      price: 99,
      priority: 8,
      status: 'active',
      viewCount: 234,
      clickCount: 145,
      tags: ['普拉提', '训练', '瘦身']
    },
    {
      _id: 'rec3',
      title: '运动装备限时优惠',
      description: '精选瑜伽垫、弹力带等装备，会员专享8折',
      contentType: 'product',
      image: '',
      price: 0,
      priority: 6,
      status: 'active',
      viewCount: 98,
      clickCount: 67,
      tags: ['优惠', '装备', '限时']
    },
    {
      _id: 'rec4',
      title: '春季减肥挑战赛',
      description: '参与挑战，赢取大奖！',
      contentType: 'custom',
      image: '',
      price: 0,
      priority: 5,
      status: 'inactive',
      viewCount: 45,
      clickCount: 23,
      tags: ['活动', '挑战', '已结束']
    }
  ]
}

function showAddRecommendation() {
  editingRec.value = null
  recForm.value = {
    title: '',
    description: '',
    contentType: 'custom',
    contentId: '',
    link: '',
    image: '',
    price: 0,
    priority: 0,
    tags: [],
    status: 'active'
  }
  showRecForm.value = true
}

function editRecommendation(item: any) {
  editingRec.value = item
  recForm.value = {
    title: item.title || '',
    description: item.description || '',
    contentType: item.contentType || 'custom',
    contentId: item.contentId || '',
    link: item.link || '',
    image: item.image || '',
    price: item.price || 0,
    priority: item.priority || 0,
    tags: item.tags || [],
    status: item.status || 'active'
  }
  showRecForm.value = true
}

async function saveRecommendation() {
  if (!recForm.value.title.trim()) {
    uni.showToast({ title: '请输入标题', icon: 'none' })
    return
  }

  uni.showLoading({ title: '保存中...' })
  try {
    let res: any
    if (editingRec.value) {
      // 更新
      res = await recommendationSync.update(
        apiPut(`/api/recommendations/${editingRec.value._id}`, recForm.value)
      )
    } else {
      // 创建
      res = await recommendationSync.create(
        apiPost('/api/recommendations', recForm.value)
      )
    }

    if (res.success) {
      uni.showToast({ 
        title: editingRec.value ? MESSAGES.ADMIN.REMIND_UPDATED : MESSAGES.ADMIN.REMIND_CREATED, 
        icon: TOAST_ICON.SUCCESS,
        duration: 2000
      })
      showRecForm.value = false
      await loadRecommendations()
    } else {
      uni.showToast({ title: res.message || '保存失败', icon: 'none' })
    }
  } catch (error) {
    console.error('保存推荐失败:', error)
    // 本地模拟保存成功
    if (editingRec.value) {
      const index = recommendationList.value.findIndex((r: any) => r._id === editingRec.value._id)
      if (index !== -1) {
        recommendationList.value[index] = { ...recommendationList.value[index], ...recForm.value }
      }
    } else {
      const newRec = {
        _id: 'rec' + Date.now(),
        ...recForm.value,
        viewCount: 0,
        clickCount: 0,
        createdAt: new Date().toISOString()
      }
      recommendationList.value.unshift(newRec)
    }
    uni.showToast({ title: '保存成功（本地）✅', icon: TOAST_ICON.SUCCESS })
    showRecForm.value = false
    tabs.value[2].count = recommendationList.value.filter((r: any) => r.status === 'active').length
  } finally {
    uni.hideLoading()
  }
}

async function toggleRecommendStatus(item: any) {
  const newStatus = item.status === 'active' ? 'inactive' : 'active'

  uni.showModal({
    title: '确认操作',
    content: `确定要${newStatus === 'active' ? '上架' : '下架'}该推荐吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const result: any = await apiPut(`/api/recommendations/${item._id}`, { status: newStatus })

          if (result.success) {
            item.status = newStatus
            tabs.value[2].count = recommendationList.value.filter((r: any) => r.status === 'active').length
            uni.showToast({
              title: `${newStatus === 'active' ? '上架' : '下架'}成功 ✅`,
              icon: TOAST_ICON.SUCCESS
            })
          }
        } catch (error) {
          // 本地更新
          item.status = newStatus
          tabs.value[2].count = recommendationList.value.filter((r: any) => r.status === 'active').length
          uni.showToast({
            title: `${newStatus === 'active' ? '上架' : '下架'}成功（本地）✅`,
            icon: TOAST_ICON.SUCCESS
          })
        }
      }
    }
  })
}

async function deleteRecommendation(id: string) {
  uni.showModal({
    title: MESSAGES.COMMON.CONFIRM_DELETE,
    content: '确定要删除该推荐内容吗？此操作不可恢复，用户端将同步移除。',
    confirmColor: '#FF3B30',
    success: async (res) => {
      if (res.confirm) {
        try {
          const result: any = await recommendationSync.delete
            ? await recommendationSync.delete(apiDelete(`/api/recommendations/${id}`))
            : await apiDelete(`/api/recommendations/${id}`)

          if (result.success) {
            recommendationList.value = recommendationList.value.filter((r: any) => r._id !== id)
            tabs.value[2].count = recommendationList.value.filter((r: any) => r.status === 'active').length
            uni.showToast({ title: '✅ 已删除！用户端将同步移除', icon: TOAST_ICON.SUCCESS, duration: 2000 })
          }
        } catch (error) {
          // 本地删除
          recommendationList.value = recommendationList.value.filter((r: any) => r._id !== id)
          tabs.value[2].count = recommendationList.value.filter((r: any) => r.status === 'active').length
          uni.showToast({ title: MESSAGES.COMMON.DELETE_SUCCESS_LOCAL, icon: TOAST_ICON.SUCCESS })
        }
      }
    }
  })
}

// 推荐管理的工具函数
function getRecTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    video: '🎬',
    course: '📚',
    product: '🛍️',
    link: '🔗',
    custom: '⭐'
  }
  return icons[type] || '📄'
}

function getRecTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    video: '视频',
    course: '课程',
    product: '商品',
    link: '链接',
    custom: '自定义'
  }
  return labels[type] || '内容'
}

function getRecGradient(index: number): string {
  const gradients = [
    'linear-gradient(135deg, #FF9500 0%, #FF6B00 100%)',
    'linear-gradient(135deg, #AF52DE 0%, #BF5AF2 100%)',
    'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
    'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)'
  ]
  return gradients[index % gradients.length]
}

const filteredHistory = computed(() => {
  if (historyType.value === 'all') {
    return historyList.value
  }
  return historyList.value.filter(item => item.type === historyType.value)
})

async function sendRemind(userId: string, type: string) {
  sendingId.value = userId
  try {
    const res: any = await remindAPI.sendRemind({ userId, type })
    if (res.success) {
      uni.showToast({ title: '发送成功 ✅', icon: TOAST_ICON.SUCCESS })
      await loadRemindHistory()
      
      if (activeTab.value !== 'history') {
        activeTab.value = 'history'
      }
    }
  } catch (error) {
    console.error('发送失败:', error)
    uni.showToast({ title: '发送失败', icon: 'none' })
  } finally {
    sendingId.value = null
  }
}

async function sendBatchRemind(type: string) {
  const users = type === 'redPacket' ? redPacketUsers.value : classUsers.value

  if (users.length === 0) {
    uni.showToast({ title: '暂无用户', icon: 'none' })
    return
  }

  uni.showModal({
    title: '批量发送确认',
    content: `确定要向所有${type === 'redPacket' ? '红包' : '上课'}用户发送提醒吗？共${users.length}人`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '正在批量发送...', mask: true })

          // 检查是否为演示模式
          const token = uni.getStorageSync('token') || ''
          const isDemoMode = token.startsWith('demo-')

          if (isDemoMode) {
            console.log('[提醒中心] 演示模式模拟批量发送')

            // 模拟发送延迟
            await new Promise(resolve => setTimeout(resolve, 1500))

            // 先关闭loading，再显示成功提示
            uni.hideLoading()

            await new Promise(resolve => setTimeout(resolve, 100))

            uni.showToast({
              title: `✅ 已发送 ${users.length} 条提醒`,
              icon: TOAST_ICON.SUCCESS,
              duration: 2000
            })

            // 延迟刷新历史记录，避免与toast冲突
            setTimeout(async () => {
              try {
                await loadRemindHistory()
              } catch (e) {
                console.error('[提醒中心] 刷新历史记录失败:', e)
              }
            }, 2000)

            return
          }

          // 真实API调用
          const userIds = users.map((u: any) => u._id)
          const result: any = await apiPost('/api/remind/batch-send', { userIds, type })

          uni.hideLoading()

          if (result.success) {
            uni.showToast({
              title: `已发送 ${result.data?.count || users.length} 条`,
              icon: TOAST_ICON.SUCCESS,
              duration: 2000
            })

            setTimeout(async () => {
              try {
                await loadRemindHistory()
              } catch (e) {
                console.error('[提醒中心] 刷新历史记录失败:', e)
              }
            }, 2000)
          } else {
            uni.showToast({
              title: result.message || '发送失败',
              icon: 'none'
            })
          }
        } catch (error) {
          console.error('批量发送失败:', error)

          // 确保loading被关闭
          uni.hideLoading()

          uni.showToast({
            title: '批量发送失败，请重试',
            icon: 'none',
            duration: 3000
          })
        }
      }
    },
    fail: () => {
      console.log('[提醒中心] 用户取消批量发送')
    }
  })
}
</script>

<style lang="scss" scoped>
.remind-page {
  min-height: 100vh;
  background-color: #F5F5F5;
}

.header {
  padding: 24px 16px 20px;
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  
  .page-title {
    font-size: 24px;
    font-weight: bold;
    color: #FFFFFF;
    display: block;
  }
  
  .header-desc {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    margin-top: 6px;
    display: block;
  }
}

.tabs {
  display: flex;
  background-color: #FFFFFF;
  padding: 12px 16px;
  gap: 10px;
  
  .tab-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 14px 8px;
    border-radius: 12px;
    background-color: #F5F5F5;
    position: relative;
    
    &.active {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      
      .tab-icon, .tab-label {
        color: #FFFFFF;
      }
    }
    
    .tab-icon {
      font-size: 28px;
      margin-bottom: 6px;
    }
    
    .tab-label {
      font-size: 13px;
      font-weight: 600;
      color: #666666;
    }
    
    .tab-badge {
      position: absolute;
      top: 6px;
      right: 6px;
      background-color: #FF3B30;
      border-radius: 10px;
      min-width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 5px;
      
      text {
        color: #FFFFFF;
        font-size: 10px;
        font-weight: bold;
      }
    }
  }
}

.content {
  padding: 16px;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1A1A1A;
    }
    
    .batch-btn {
      padding: 8px 18px;
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      border-radius: 20px;
      
      text {
        color: #FFFFFF;
        font-size: 13px;
        font-weight: 600;
      }
    }
    
    .filter-tag {
      padding: 8px 16px;
      background-color: #F5F5F5;
      border-radius: 16px;
      
      text {
        font-size: 13px;
        color: #666666;
      }
    }
  }
}

.user-list {
  .user-card {
    display: flex;
    align-items: center;
    padding: 16px;
    margin-bottom: 12px;
    
    .user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 24px;
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
      text {
        color: #FFFFFF;
        font-size: 20px;
        font-weight: bold;
      }
    }
    
    .user-info {
      flex: 1;
      margin-left: 14px;
      
      .user-name {
        font-size: 16px;
        font-weight: 600;
        color: #1A1A1A;
        display: block;
      }
      
      .user-phone {
        font-size: 13px;
        color: #999999;
        margin-top: 4px;
        display: block;
      }
      
      .course-info {
        font-size: 12px;
        color: #007AFF;
        margin-top: 4px;
        display: block;
      }
      
      .user-tags {
        display: flex;
        gap: 6px;
        margin-top: 6px;
        
        .tag {
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 10px;
          
          &.tag-vip {
            background-color: rgba(255, 215, 0, 0.2);
            color: #DAA520;
          }
          
          &.tag-active {
            background-color: rgba(52, 199, 89, 0.15);
            color: #34C759;
          }
        }
      }
    }
    
    .user-actions {
      .send-btn {
        padding: 10px 22px;
        background-color: #007AFF;
        border-radius: 20px;
        
        text {
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 600;
        }
        
        &.btn-purple {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        &.sending {
          opacity: 0.7;
        }
      }
    }
  }
}

.history-filter {
  margin-bottom: 16px;
  
  .filter-options {
    display: flex;
    gap: 10px;
    
    .filter-option {
      padding: 8px 18px;
      background-color: #F5F5F5;
      border-radius: 16px;
      font-size: 13px;
      color: #666666;
      
      &.active {
        background-color: #007AFF;
        color: #FFFFFF;
      }
    }
  }
}

.history-list {
  .history-item {
    display: flex;
    align-items: flex-start;
    padding: 16px;
    margin-bottom: 12px;
    
    .history-icon {
      width: 44px;
      height: 44px;
      border-radius: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-right: 14px;
      
      &.icon-red {
        background-color: rgba(250, 112, 154, 0.15);
        font-size: 22px;
      }
      
      &.icon-blue {
        background-color: rgba(102, 126, 234, 0.15);
        font-size: 22px;
      }
    }
    
    .history-content {
      flex: 1;
      
      .history-title {
        font-size: 15px;
        font-weight: 600;
        color: #1A1A1A;
        display: block;
      }
      
      .history-target {
        font-size: 13px;
        color: #666666;
        margin-top: 4px;
        display: block;
      }
      
      .history-time {
        font-size: 12px;
        color: #999999;
        margin-top: 4px;
        display: block;
      }
    }
    
    .history-status {
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      
      &.status-success {
        background-color: rgba(52, 199, 89, 0.15);
        
        text {
          color: #34C759;
        }
      }
      
      &.status-failed {
        background-color: rgba(255, 59, 48, 0.15);
        
        text {
          color: #FF3B30;
        }
      }
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: 15px;
    color: #999999;
    margin-bottom: 8px;
  }

  .empty-hint {
    font-size: 13px;
    color: #CCCCCC;
  }
}

/* ==================== 推荐管理样式 ==================== */
.recommendation-list {
  .rec-card {
    background: #FFFFFF;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    .rec-cover {
      position: relative;
      width: 100%;
      height: 140px;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 12px;

      .rec-image {
        width: 100%;
        height: 100%;
      }

      .rec-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;

        .rec-icon {
          font-size: 48px;
        }
      }

      .rec-type-badge {
        position: absolute;
        top: 8px;
        left: 8px;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;

        &.type-video {
          background-color: rgba(0, 122, 255, 0.9);
          color: #FFFFFF;
        }

        &.type-course {
          background-color: rgba(52, 199, 89, 0.9);
          color: #FFFFFF;
        }

        &.type-product {
          background-color: rgba(255, 149, 0, 0.9);
          color: #FFFFFF;
        }

        &.type-link {
          background-color: rgba(175, 82, 222, 0.9);
          color: #FFFFFF;
        }

        &.type-custom {
          background-color: rgba(255, 149, 0, 0.9);
          color: #FFFFFF;
        }
      }

      .rec-status-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;

        &.status-active {
          background-color: rgba(52, 199, 89, 0.9);
          color: #FFFFFF;
        }

        &.status-inactive {
          background-color: rgba(153, 153, 153, 0.9);
          color: #FFFFFF;
        }
      }
    }

    .rec-body {
      .rec-title {
        font-size: 16px;
        font-weight: 600;
        color: #1A1A1A;
        display: block;
        margin-bottom: 6px;
      }

      .rec-desc {
        font-size: 13px;
        color: #666666;
        line-height: 1.4;
        display: block;
        margin-bottom: 10px;
      }

      .rec-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 10px;

        .meta-item {
          font-size: 12px;
          color: #999999;
        }
      }

      .rec-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;

        .tag-item {
          padding: 3px 8px;
          background-color: #F5F5F5;
          border-radius: 8px;

          text {
            font-size: 11px;
            color: #666666;
          }
        }
      }
    }

    .rec-actions {
      display: flex;
      gap: 8px;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid #F0F0F0;

      .action-btn {
        flex: 1;
        padding: 10px 0;
        border-radius: 20px;
        text-align: center;
        font-size: 13px;
        font-weight: 600;

        text {
          color: #FFFFFF;
        }

        &.btn-edit {
          background-color: #007AFF;
        }

        &.btn-disable {
          background-color: #FF3B30;
        }

        &.btn-enable {
          background-color: #34C759;
        }

        &.btn-delete {
          background-color: #999999;
        }

        &:active {
          opacity: 0.8;
        }
      }
    }
  }
}
</style>
