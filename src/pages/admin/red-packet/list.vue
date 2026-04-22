<template>
  <AdminLayout title="红包管理" :showBack="true">
    <view class="red-packet-page">
      <!-- 统计卡片 -->
      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-value">{{ totalPackets }}</text>
          <text class="stat-label">红包总数</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">¥{{ totalAmount }}</text>
          <text class="stat-label">总金额</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ sentCount }}</text>
          <text class="stat-label">已发送</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ receivedCount }}</text>
          <text class="stat-label">已领取</text>
        </view>
      </view>

      <!-- 操作栏 -->
      <view class="toolbar">
        <button class="btn-primary" @tap="showCreateModal = true">
          ＋ 发放新红包
        </button>
        <input
          type="text"
          v-model="searchText"
          placeholder="搜索红包..."
          class="search-input"
        />
      </view>

      <!-- 红包列表 -->
      <view class="packet-list">
        <view
          class="packet-card"
          v-for="(packet, index) in filteredPackets"
          :key="index"
        >
          <view class="packet-header">
            <view class="packet-type" :class="'type-' + packet.type">
              <text>{{ getTypeLabel(packet.type) }}</text>
            </view>
            <view class="packet-status" :class="packet.status">
              <text>{{ getStatusLabel(packet.status) }}</text>
            </view>
          </view>

          <view class="packet-body">
            <text class="packet-amount">¥{{ packet.amount }}</text>
            <text class="packet-info">
              总额: ¥{{ packet.totalAmount }} | 数量: {{ packet.count }}个
            </text>
            <text class="packet-time">创建时间: {{ packet.createdAt }}</text>
          </view>

          <view class="packet-actions">
            <button
              class="btn-small btn-detail"
              @tap="viewDetail(packet)"
            >
              详情
            </button>
            <button
              v-if="packet.status === 'active'"
              class="btn-small btn-disable"
              @tap="disablePacket(packet._id)"
            >
              停用
            </button>
          </view>
        </view>

        <view class="empty-state" v-if="filteredPackets.length === 0 && !loading">
          <text class="empty-icon">🧧</text>
          <text class="empty-text">暂无红包记录</text>
          <text class="empty-hint">点击上方按钮发放新红包</text>
        </view>
      </view>

      <!-- 创建红包弹窗 -->
      <view class="modal-overlay" v-if="showCreateModal" @tap="showCreateModal = false">
        <view class="modal-content" @tap.stop>
          <text class="modal-title">发放新红包</text>

          <view class="form-group">
            <text class="form-label">红包类型</text>
            <view class="type-selector">
              <view
                class="type-option"
                :class="{ active: newPacket.type === 'random' }"
                @tap="newPacket.type = 'random'"
              >
                <text>🎲 拼手气</text>
              </view>
              <view
                class="type-option"
                :class="{ active: newPacket.type === 'average' }"
                @tap="newPacket.type = 'average'"
              >
                <text>💰 普通红包</text>
              </view>
            </view>
          </view>

          <view class="form-group">
            <text class="form-label">总金额 (元)</text>
            <input
              type="digit"
              v-model="newPacket.totalAmount"
              placeholder="请输入金额"
              class="form-input"
            />
          </view>

          <view class="form-group">
            <text class="form-label">红包个数</text>
            <input
              type="number"
              v-model="newPacket.count"
              placeholder="请输入数量"
              class="form-input"
            />
          </view>

          <view class="form-group">
            <text class="form-label">备注</text>
            <textarea
              v-model="newPacket.remark"
              placeholder="可选：添加备注信息"
              class="form-textarea"
            />
          </view>

          <view class="modal-actions">
            <button class="btn-cancel" @tap="showCreateModal = false">取消</button>
            <button class="btn-confirm" @tap="createPacket" :disabled="creating">
              {{ creating ? '创建中...' : '确认发放' }}
            </button>
          </view>
        </view>
      </view>
    </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'

const loading = ref(false)
const creating = ref(false)
const showCreateModal = ref(false)
const searchText = ref('')

// 统计数据
const totalPackets = ref(0)
const totalAmount = ref('0.00')
const sentCount = ref(0)
const receivedCount = ref(0)

// 红包列表
const packetList = ref<any[]>([])

// 新建红包表单
const newPacket = ref({
  type: 'random',
  totalAmount: '',
  count: '',
  remark: ''
})

// 过滤后的列表
const filteredPackets = computed(() => {
  if (!searchText.value) return packetList.value

  const keyword = searchText.value.toLowerCase()
  return packetList.value.filter(p =>
    p.remark?.toLowerCase().includes(keyword) ||
    p.type?.includes(keyword)
  )
})

onMounted(() => {
  loadRedPackets()
  loadStatistics()
})

async function loadRedPackets() {
  loading.value = true
  try {
    const token = uni.getStorageSync('token') || ''

    if (token.startsWith('demo-')) {
      // 演示模式使用模拟数据
      packetList.value = [
        {
          _id: 'demo-1',
          type: 'random',
          status: 'active',
          amount: '88.88',
          totalAmount: '100.00',
          count: 10,
          remark: '新年红包',
          createdAt: '2026-04-20 10:00:00'
        },
        {
          _id: 'demo-2',
          type: 'average',
          status: 'completed',
          amount: '50.00',
          totalAmount: '50.00',
          count: 5,
          remark: '活动奖励',
          createdAt: '2026-04-19 15:30:00'
        }
      ]
      return
    }

    // 真实API调用（待后端实现）
    console.log('[红包管理] API待实现')
  } catch (error) {
    console.error('[红包管理] 加载失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadStatistics() {
  try {
    const token = uni.getStorageSync('token') || ''

    if (token.startsWith('demo-')) {
      totalPackets.value = 12
      totalAmount.value = '1,888.00'
      sentCount.value = 8
      receivedCount.value = 156
      return
    }
  } catch (error) {
    console.error('[红包管理] 统计加载失败:', error)
  }
}

function getTypeLabel(type: string) {
  return type === 'random' ? '🎲 拼手气' : '💰 普通红包'
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    active: '进行中',
    completed: '已结束',
    expired: '已过期',
    disabled: '已停用'
  }
  return map[status] || status
}

function viewDetail(packet: any) {
  uni.showModal({
    title: '红包详情',
    content: `类型: ${getTypeLabel(packet.type)}\n金额: ¥${packet.totalAmount}\n数量: ${packet.count}个\n状态: ${getStatusLabel(packet.status)}\n备注: ${packet.remark || '无'}`,
    showCancel: false
  })
}

async function disablePacket(id: string) {
  uni.showModal({
    title: '确认停用',
    content: '确定要停用此红包吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showToast({ title: '已停用', icon: 'success' })
        loadRedPackets()
      }
    }
  })
}

async function createPacket() {
  if (!newPacket.value.totalAmount || !newPacket.value.count) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }

  const amount = parseFloat(newPacket.value.totalAmount)
  const count = parseInt(newPacket.value.count)

  if (amount <= 0 || count <= 0) {
    uni.showToast({ title: '金额和数量必须大于0', icon: 'none' })
    return
  }

  if (amount / count < 0.01) {
    uni.showToast({ title: '单个红包最少0.01元', icon: 'none' })
    return
  }

  creating.value = true

  try {
    const token = uni.getStorageSync('token') || ''

    if (token.startsWith('demo-')) {
      // 演示模式模拟成功
      setTimeout(() => {
        uni.showToast({ title: '✅ 红包发放成功！', icon: 'success' })
        showCreateModal.value = false
        newPacket.value = {
          type: 'random',
          totalAmount: '',
          count: '',
          remark: ''
        }
        loadRedPackets()
        loadStatistics()
        creating.value = false
      }, 1000)
      return
    }

    // 真实API调用
    console.log('[红包管理] 创建API待实现')
    creating.value = false
  } catch (error) {
    console.error('[红包管理] 创建失败:', error)
    uni.showToast({ title: '创建失败', icon: 'none' })
    creating.value = false
  }
}
</script>

<style scoped>
.red-packet-page {
  padding: 16px;
  background: #F5F6FA;
  min-height: 100vh;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #FF3B30;
  display: block;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666666;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.btn-primary {
  flex-shrink: 0;
  height: 44px;
  background: linear-gradient(135deg, #FF3B30 0%, #FF6B35 100%);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 0 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.search-input {
  flex: 1;
  height: 44px;
  background: #FFFFFF;
  border: 2px solid #E0E0E0;
  border-radius: 10px;
  padding: 0 16px;
  font-size: 14px;
}

.packet-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.packet-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.packet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.packet-type {
  background: linear-gradient(135deg, #FF6B35 0%, #FF3B30 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
}

.packet-status {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.packet-status.active {
  background: #E8F5E9;
  color: #34C759;
}

.packet-status.completed,
.packet-status.expired {
  background: #F5F5F5;
  color: #999999;
}

.packet-status.disabled {
  background: #FFEBEE;
  color: #FF3B30;
}

.packet-body {
  margin-bottom: 12px;
}

.packet-amount {
  font-size: 28px;
  font-weight: bold;
  color: #FF3B30;
  display: block;
  margin-bottom: 8px;
}

.packet-info {
  font-size: 14px;
  color: #666666;
  display: block;
  margin-bottom: 4px;
}

.packet-time {
  font-size: 12px;
  color: #999999;
  display: block;
}

.packet-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-small {
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 13px;
  border: none;
  cursor: pointer;
}

.btn-detail {
  background: #007AFF;
  color: white;
}

.btn-disable {
  background: #FF3B30;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #333333;
  display: block;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  color: #999999;
  display: block;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-title {
  font-size: 20px;
  font-weight: bold;
  color: #333333;
  display: block;
  margin-bottom: 20px;
  text-align: center;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #333333;
  display: block;
  margin-bottom: 8px;
}

.form-input,
.form-textarea {
  width: 100%;
  height: 48px;
  background: #F5F7FA;
  border: 2px solid #E0E0E0;
  border-radius: 10px;
  padding: 0 16px;
  font-size: 15px;
  box-sizing: border-box;
}

.form-textarea {
  height: 80px;
  padding: 12px 16px;
  resize: none;
}

.type-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.type-option {
  height: 48px;
  background: #F5F7FA;
  border: 2px solid #E0E0E0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.type-option.active {
  background: #FFF3E0;
  border-color: #FF6B35;
  color: #FF6B30;
  font-weight: 600;
}

.modal-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel,
.btn-confirm {
  height: 48px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.btn-cancel {
  background: #F5F5F5;
  color: #666666;
}

.btn-confirm {
  background: linear-gradient(135deg, #FF3B30 0%, #FF6B35 100%);
  color: white;
}

.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>