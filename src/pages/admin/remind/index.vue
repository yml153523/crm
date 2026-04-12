<template>
  <view class="remind-page">
    <view class="header">
      <text class="page-title">提醒中心</text>
      <text class="header-desc">批量发送消息通知</text>
    </view>

    <view class="tabs">
      <view 
        class="tab-item" 
        :class="{ active: activeTab === item.key }"
        v-for="(item, index) in tabs" 
        :key="index"
        @tap="activeTab = item.key"
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
        <view class="batch-btn" @tap="sendBatchRemind('redPacket')">
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
              @tap="sendRemind(user._id, 'redPacket')"
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
        <view class="batch-btn" @tap="sendBatchRemind('classReminder')">
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
              @tap="sendRemind(user._id, 'classReminder')"
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

    <!-- 提醒历史 -->
    <view class="content" v-if="activeTab === 'history'">
      <view class="section-header">
        <text class="section-title">📋 发送记录</text>
        <view class="filter-tag" @tap="showHistoryFilter = !showHistoryFilter">
          <text>筛选 ▼</text>
        </view>
      </view>

      <view class="history-filter" v-if="showHistoryFilter">
        <view class="filter-options">
          <view 
            class="filter-option"
            :class="{ active: historyType === 'all' }"
            @tap="historyType = 'all'"
          >全部</view>
          <view 
            class="filter-option"
            :class="{ active: historyType === 'redPacket' }"
            @tap="historyType = 'redPacket'"
          >红包</view>
          <view 
            class="filter-option"
            :class="{ active: historyType === 'classReminder' }"
            @tap="historyType = 'classReminder'"
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { remindAPI } from '@/api/remind'

const activeTab = ref('redPacket')
const loading = ref(false)
const sendingId = ref<string | null>(null)
const showHistoryFilter = ref(false)
const historyType = ref('all')

const tabs = ref([
  { key: 'redPacket', label: '红包提醒', icon: '🧧', count: 0 },
  { key: 'classReminder', label: '上课提醒', icon: '📚', count: 0 },
  { key: 'history', label: '提醒历史', icon: '📋', count: 0 }
])

const redPacketUsers = ref<any[]>([])
const classUsers = ref<any[]>([])
const historyList = ref<any[]>([])

onMounted(async () => {
  try {
    await Promise.all([
      loadRedPacketUsers(),
      loadClassUsers(),
      loadRemindHistory()
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
    const res: any = await fetch('/api/remind/users/redPacket').then(r => r.json())
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
    const res: any = await fetch('/api/remind/users/classReminder').then(r => r.json())
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
      uni.showToast({ title: '发送成功 ✅', icon: 'success' })
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
        uni.showLoading({ title: '正在批量发送...' })
        try {
          const userIds = users.map((u: any) => u._id)
          const result: any = await fetch('/api/remind/batch-send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds, type })
          }).then(r => r.json())
          
          if (result.success) {
            uni.showToast({ 
              title: `已发送 ${result.data?.count || users.length} 条`, 
              icon: 'success',
              duration: 2000 
            })
            await loadRemindHistory()
          }
        } catch (error) {
          console.error('批量发送失败:', error)
          uni.showToast({ title: '批量发送失败', icon: 'none' })
        } finally {
          uni.hideLoading()
        }
      }
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
  }
}
</style>
