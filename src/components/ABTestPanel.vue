<template>
  <view class="ab-test-panel">
    <view class="panel-header">
      <text class="panel-title">🧪 A/B 测试中心</text>
      <text class="panel-subtitle">数据驱动的产品优化</text>
    </view>

    <view class="quick-stats">
      <view class="stat-card" v-for="(stat, index) in quickStats" :key="index">
        <text class="stat-value">{{ stat.value }}</text>
        <text class="stat-label">{{ stat.label }}</text>
      </view>
    </view>

    <view class="toolbar">
      <button class="btn-primary create-btn" @click="showCreateModal = true">
        + 创建新实验
      </button>
      <button class="btn-secondary" @click="refreshData">
        🔄 刷新
      </button>
    </view>

    <scroll-view scroll-y class="experiment-list">
      <view
        v-for="exp in experiments"
        :key="exp.id"
        class="experiment-card"
        :class="{ 'active': exp.status === 'running' }"
      >
        <view class="card-header">
          <view class="exp-info">
            <text class="exp-name">{{ exp.name }}</text>
            <view :class="['status-badge', `status-${exp.status}`]">
              {{ getStatusText(exp.status) }}
            </view>
          </view>
          <view class="card-actions">
            <button
              v-if="exp.status === 'draft'"
              class="action-btn start-btn"
              @click="startExperiment(exp.id)"
            >▶ 启动</button>
            <button
              v-if="exp.status === 'running'"
              class="action-btn pause-btn"
              @click="pauseExperiment(exp.id)"
            >⏸ 暂停</button>
            <button
              v-if="exp.status === 'paused'"
              class="action-btn resume-btn"
              @click="resumeExperiment(exp.id)"
            >▶ 恢复</button>
            <button
              v-if="['running', 'paused'].includes(exp.status)"
              class="action-btn complete-btn"
              @click="confirmComplete(exp.id)"
            >✓ 完成</button>
            <button
              class="action-btn delete-btn"
              @click="deleteExperiment(exp.id)"
            >🗑</button>
          </view>
        </view>

        <text class="exp-description">{{ exp.description }}</text>

        <view class="variants-preview">
          <text class="variants-label">变体:</text>
          <view class="variant-tags">
            <text
              v-for="variant in exp.variants"
              :key="variant.id"
              class="variant-tag"
            >
              {{ variant.name }} ({{ variant.weight }}%)
            </text>
          </view>
        </view>

        <view class="exp-meta">
          <text>📅 {{ formatDate(exp.createdAt) }}</text>
          <text>🎯 {{ exp.targetMetric }}</text>
          <text>📊 流量: {{ exp.trafficAllocation }}%</text>
        </view>

        <view v-if="exp.status !== 'draft'" class="results-summary">
          <text class="results-title">📈 实时结果</text>
          <view class="mini-chart">
            <view
              v-for="(result, idx) in getMiniResults(exp.id)"
              :key="idx"
              class="mini-bar-wrapper"
            >
              <text class="mini-label">{{ result.name }}</text>
              <view class="mini-bar-container">
                <view
                  class="mini-bar"
                  :style="{ width: result.conversionRate + '%' }"
                  :class="{ 'winner': result.isWinner }"
                ></view>
                <text class="mini-value">{{ result.conversionRate }}%</text>
              </view>
              <text v-if="result.isWinner" class="winner-badge">🏆</text>
            </view>
          </view>
        </view>

        <button class="expand-btn" @click="toggleExpand(exp.id)">
          {{ expandedExp === exp.id ? '收起详情 ▲' : '展开详情 ▼' }}
        </button>

        <view v-if="expandedExp === exp.id" class="detailed-results">
          <view class="detail-section">
            <text class="detail-title">📊 详细数据分析</text>
            <view class="results-table">
              <view class="table-header">
                <text class="th">变体</text>
                <text class="th">访客数</text>
                <text class="th">转化数</text>
                <text class="th">转化率</text>
                <text class="th">置信区间</text>
                <text class="th">提升度</text>
                <text class="th">P值</text>
                <text class="th">显著性</text>
              </view>
              <view
                v-for="(result, idx) in getDetailedResults(exp.id)"
                :key="idx"
                class="table-row"
                :class="{ 'winner-row': result.isWinner }"
              >
                <text class="td name-cell">{{ result.name }}{{ result.isWinner ? ' 🏆' : '' }}</text>
                <text class="td">{{ result.visitors }}</text>
                <text class="td">{{ result.conversions }}</text>
                <text class="td rate-cell">{{ result.conversionRate }}%</text>
                <text class="td ci-cell">[{{ result.confidenceInterval[0] }}%, {{ result.confidenceInterval[1] }}%]</text>
                <text class="td" :class="{ 'positive': result.improvement > 0, 'negative': result.improvement < 0 }">
                  {{ idx > 0 ? (result.improvement >= 0 ? '+' : '') + result.improvement + '%' : '-' }}
                </text>
                <text class="td">{{ result.pValue.toFixed(4) }}</text>
                <text class="td" :class="{ 'significant': result.significant }">
                  {{ result.significant ? '✅ 显著' : '❌ 不显著' }}
                </text>
              </view>
            </view>
          </view>

          <view class="detail-section">
            <text class="detail-title">📋 统计摘要</text>
            <view class="stats-grid">
              <view class="stats-item" v-for="(value, key) in getExperimentStats(exp.id)" :key="key">
                <text class="stats-label">{{ formatStatLabel(key) }}</text>
                <text class="stats-value">{{ value }}</text>
              </view>
            </view>
          </view>

          <button class="report-btn" @click="generateReport(exp.id)">
            📄 生成完整报告
          </button>
        </view>
      </view>

      <view v-if="experiments.length === 0" class="empty-state">
        <text class="empty-icon">🧪</text>
        <text class="empty-text">暂无实验</text>
        <text class="empty-hint">点击上方按钮创建您的第一个 A/B 测试</text>
      </view>
    </scroll-view>

    <view v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <view class="modal-content">
        <view class="modal-header">
          <text class="modal-title">创建新实验</text>
          <button class="close-btn" @click="showCreateModal = false">✕</button>
        </view>

        <scroll-view scroll-y class="modal-body">
          <view class="form-group">
            <label class="form-label">实验名称 *</label>
            <input
              class="form-input"
              v-model="newExperiment.name"
              placeholder="例如: 首页CTA按钮颜色测试"
            />
          </view>

          <view class="form-group">
            <label class="form-label">实验描述</label>
            <textarea
              class="form-textarea"
              v-model="newExperiment.description"
              placeholder="描述实验目的和假设..."
              :maxlength="500"
            ></textarea>
          </view>

          <view class="form-group">
            <label class="form-label">目标指标 *</label>
            <picker
              :range="metricOptions"
              v-model="newExperiment.targetMetricIndex"
              @change="onMetricChange"
            >
              <view class="picker-display">{{ metricOptions[newExperiment.targetMetricIndex] }}</view>
            </picker>
          </view>

          <view class="form-group">
            <label class="form-label">流量分配 (%)</label>
            <slider
              :min="10"
              :max="100"
              :step="10"
              :value="newExperiment.trafficAllocation"
              @change="onTrafficChange"
              activeColor="#007AFF"
            />
            <text class="slider-value">{{ newExperiment.trafficAllocation }}%</text>
          </view>

          <view class="form-section-title">
            <text>变体配置</text>
            <button class="add-variant-btn" @click="addVariant">+ 添加变体</button>
          </view>

          <view
            v-for="(variant, index) in newExperiment.variants"
            :key="index"
            class="variant-config"
          >
            <view class="variant-header">
              <text class="variant-number">变体 {{ index + 1 }}</text>
              <button
                v-if="newExperiment.variants.length > 2"
                class="remove-variant-btn"
                @click="removeVariant(index)"
              >✕</button>
            </view>

            <view class="form-group">
              <label class="form-label">变体名称 *</label>
              <input
                class="form-input"
                v-model="variant.name"
                :placeholder="index === 0 ? '对照组 (原始版本)' : '实验组 ' + index"
              />
            </view>

            <view class="form-group">
              <label class="form-label">流量权重 (%)</label>
              <slider
                :min="5"
                :max="95"
                :step="5"
                :value="variant.weight"
                @change="(e: any) => onVariantWeightChange(index, e.detail.value)"
                activeColor="#007AFF"
              />
              <text class="slider-value">{{ variant.weight }}%</text>
            </view>

            <view class="form-group">
              <label class="form-label">变体配置 (JSON)</label>
              <textarea
                class="form-textarea code-textarea"
                v-model="variant.configStr"
                placeholder='{"buttonColor": "#007AFF", " buttonText": "立即报名"}'
              ></textarea>
            </view>
          </view>

          <view class="weight-warning" v-if="totalWeight !== 100">
            ⚠️ 变体权重总和必须为100%，当前: {{ totalWeight }}%
          </view>
        </scroll-view>

        <view class="modal-footer">
          <button class="btn-cancel" @click="showCreateModal = false">取消</button>
          <button
            class="btn-primary"
            :disabled="!isValidForm || totalWeight !== 100"
            @click="createExperiment"
          >
            创建实验
          </button>
        </view>
      </view>
    </view>

    <view v-if="showReportModal" class="modal-overlay" @click.self="showReportModal = false">
      <view class="modal-content report-modal">
        <view class="modal-header">
          <text class="modal-title">📊 实验报告</text>
          <button class="close-btn" @click="showReportModal = false">✕</button>
        </view>
        <scroll-view scroll-y class="report-body">
          <text class="report-text">{{ currentReport }}</text>
        </scroll-view>
        <view class="modal-footer">
          <button class="btn-secondary" @click="copyReport">复制报告</button>
          <button class="btn-primary" @click="showReportModal = false">关闭</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { abTestEngine, type Experiment, type Variant } from '@/utils/abTest'

const experiments = ref<Experiment[]>([])
const expandedExp = ref<string | null>(null)
const showCreateModal = ref(false)
const showReportModal = ref(false)
const currentReport = ref('')

const metricOptions = ['转化率', '点击率', '注册率', '购买率', '留存率', '自定义']

interface NewVariant {
  name: string;
  weight: number;
  configStr: string;
}

const newExperiment = ref({
  name: '',
  description: '',
  targetMetric: 'conversion_rate',
  targetMetricIndex: 0,
  trafficAllocation: 100,
  variants: [
    { name: '对照组', weight: 50, configStr: '{}' },
    { name: '实验组 A', weight: 50, configStr: '{}' }
  ] as NewVariant[]
})

const quickStats = computed(() => {
  const allExps = abTestEngine.getAllExperiments()
  return [
    {
      label: '总实验数',
      value: allExps.length.toString()
    },
    {
      label: '运行中',
      value: allExps.filter(e => e.status === 'running').length.toString()
    },
    {
      label: '已完成',
      value: allExps.filter(e => e.status === 'completed').length.toString()
    },
    {
      label: '总访客',
      value: formatNumber(
        allExps.reduce((sum, e) => {
          return sum + abTestEngine.getStats(e.id).totalVisitors
        }, 0)
      )
    }
  ]
})

const totalWeight = computed(() => {
  return newExperiment.value.variants.reduce((sum, v) => sum + v.weight, 0)
})

const isValidForm = computed(() => {
  return (
    newExperiment.value.name.trim() !== '' &&
    newExperiment.value.variants.every(v => v.name.trim() !== '') &&
    newExperiment.value.variants.length >= 2
  )
})

function loadExperiments(): void {
  experiments.value = abTestEngine.getAllExperiments()
}

function refreshData(): void {
  loadExperiments()
  uni.showToast({ title: '已刷新', icon: 'success' })
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    draft: '草稿',
    running: '运行中',
    paused: '已暂停',
    completed: '已完成'
  }
  return map[status] || status
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  return num.toString()
}

function toggleExpand(expId: string): void {
  expandedExp.value = expandedExp.value === expId ? null : expId
}

function getMiniResults(expId: string): Array<{name: string; conversionRate: number; isWinner: boolean}> {
  try {
    const results = abTestEngine.getResults(expId)
    return results.map(r => ({
      name: r.name,
      conversionRate: r.conversionRate,
      isWinner: r.isWinner
    }))
  } catch {
    return []
  }
}

function getDetailedResults(expId: string) {
  return abTestEngine.getResults(expId)
}

function getExperimentStats(expId: string): Record<string, any> {
  const stats = abTestEngine.getStats(expId)
  return stats
}

function formatStatLabel(key: string): string {
  const labels: Record<string, string> = {
    totalVisitors: '总访客数',
    totalConversions: '总转化数',
    overallConversionRate: '整体转化率',
    duration: '运行天数',
    eventsPerDay: '日均访客'
  }
  return labels[key] || key
}

function startExperiment(id: string): void {
  abTestEngine.startExperiment(id)
  loadExperiments()
  uni.showToast({ title: '实验已启动', icon: 'success' })
}

function pauseExperiment(id: string): void {
  abTestEngine.pauseExperiment(id)
  loadExperiments()
  uni.showToast({ title: '实验已暂停', icon: 'none' })
}

function resumeExperiment(id: string): void {
  abTestEngine.pauseExperiment(id)
  loadExperiments()
  uni.showToast({ title: '实验已恢复', icon: 'success' })
}

function confirmComplete(id: string): void {
  uni.showModal({
    title: '确认完成',
    content: '确定要完成此实验吗？完成后将无法修改。',
    success: (res) => {
      if (res.confirm) {
        const results = abTestEngine.getResults(id)
        const winner = results.find(r => r.isWinner)
        abTestEngine.completeExperiment(id, winner?.id)
        loadExperiments()
        uni.showToast({ title: '实验已完成', icon: 'success' })
      }
    }
  })
}

function deleteExperiment(id: string): void {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除此实验吗？此操作不可恢复。',
    confirmColor: '#FF3B30',
    success: (res) => {
      if (res.confirm) {
        abTestEngine.deleteExperiment(id)
        loadExperiments()
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    }
  })
}

function onMetricChange(e: any): void {
  const metrics = ['conversion_rate', 'click_through_rate', 'signup_rate', 'purchase_rate', 'retention_rate', 'custom']
  newExperiment.value.targetMetric = metrics[e.detail.value]
  newExperiment.value.targetMetricIndex = e.detail.value
}

function onTrafficChange(e: any): void {
  newExperiment.value.trafficAllocation = e.detail.value
}

function addVariant(): void {
  newExperiment.value.variants.push({
    name: `实验组 ${String.fromCharCode(65 + newExperiment.value.variants.length - 1)}`,
    weight: Math.max(5, Math.floor(100 / (newExperiment.value.variants.length + 1))),
    configStr: '{}'
  })

  redistributeWeights()
}

function removeVariant(index: number): void {
  newExperiment.value.variants.splice(index, 1)
  redistributeWeights()
}

function redistributeWeights(): void {
  const count = newExperiment.value.variants.length
  const baseWeight = Math.floor(100 / count)
  const remainder = 100 - baseWeight * count

  newExperiment.value.variants.forEach((v, i) => {
    v.weight = baseWeight + (i < remainder ? 1 : 0)
  })
}

function onVariantWeightChange(index: number, value: number): void {
  newExperiment.value.variants[index].weight = value
}

function createExperiment(): void {
  try {
    const variants = newExperiment.value.variants.map(v => ({
      name: v.name,
      weight: v.weight,
      config: parseJSONSafely(v.configStr)
    }))

    abTestEngine.createExperiment({
      id: `exp_${Date.now()}`,
      name: newExperiment.value.name,
      description: newExperiment.value.description,
      targetMetric: newExperiment.value.targetMetric,
      trafficAllocation: newExperiment.value.trafficAllocation,
      variants
    })

    showCreateModal.value = false
    resetForm()
    loadExperiments()

    uni.showToast({ title: '实验创建成功', icon: 'success' })
  } catch (error: any) {
    uni.showToast({ title: error.message || '创建失败', icon: 'none' })
  }
}

function resetForm(): void {
  newExperiment.value = {
    name: '',
    description: '',
    targetMetric: 'conversion_rate',
    targetMetricIndex: 0,
    trafficAllocation: 100,
    variants: [
      { name: '对照组', weight: 50, configStr: '{}' },
      { name: '实验组 A', weight: 50, configStr: '{}' }
    ]
  }
}

function generateReport(expId: string): void {
  currentReport.value = abTestEngine.generateReport(expId)
  showReportModal.value = true
}

function copyReport(): void {
  uni.setClipboardData({
    data: currentReport.value,
    success: () => {
      uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
    }
  })
}

function parseJSONSafely(str: string): Record<string, any> {
  try {
    return JSON.parse(str || '{}')
  } catch {
    return {}
  }
}

onMounted(() => {
  initSampleData()
  loadExperiments()
})

function initSampleData(): void {
  if (abTestEngine.getAllExperiments().length === 0) {
    abTestEngine.createExperiment({
      id: 'exp_cta_button_color',
      name: '首页 CTA 按钮颜色测试',
      description: '测试不同颜色的 CTA 按钮对用户转化率的影响，优化首页核心转化路径',
      status: 'running',
      targetMetric: 'conversion_rate',
      trafficAllocation: 80,
      startDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
      variants: [
        {
          id: 'control',
          name: '蓝色 (当前)',
          weight: 50,
          config: { buttonColor: '#007AFF', buttonText: '立即报名' }
        },
        {
          id: 'variant_a',
          name: '绿色',
          weight: 50,
          config: { buttonColor: '#34C759', buttonText: '立即报名' }
        }
      ]
    })

    for (let i = 0; i < 150; i++) {
      const userId = `user_${Math.floor(Math.random() * 1000)}`
      const variant = abTestEngine.assignVariant('exp_cta_button_color', userId)

      if (variant && Math.random() < 0.28) {
        abTestEngine.trackConversion('exp_cta_button_color', userId)
      }

      if (variant?.id === 'variant_a' && Math.random() < 0.32) {
        abTestEngine.trackConversion('exp_cta_button_color', userId)
      }
    }

    abTestEngine.createExperiment({
      id: 'exp_pricing_display',
      name: '商品价格展示方式测试',
      description: '对比原价划线 vs 折扣标签两种展示方式对购买决策的影响',
      status: 'running',
      targetMetric: 'purchase_rate',
      trafficAllocation: 100,
      startDate: Date.now() - 3 * 24 * 60 * 60 * 1000,
      variants: [
        {
          id: 'control_price',
          name: '原价划线',
          weight: 50,
          config: { style: 'strikethrough' }
        },
        {
          id: 'variant_discount',
          name: '折扣标签',
          weight: 50,
          config: { style: 'badge' }
        }
      ]
    })

    for (let i = 0; i < 80; i++) {
      const userId = `user_${Math.floor(Math.random() * 800) + 1000}`
      abTestEngine.assignVariant('exp_pricing_display', userId)

      if (Math.random() < 0.15) {
        abTestEngine.trackConversion('exp_pricing_display', userId)
      }
    }
  }
}
</script>

<style scoped>
.ab-test-panel {
  padding: 16px;
  background: #F5F5F5;
  min-height: 100vh;
}

.panel-header {
  margin-bottom: 20px;
}

.panel-title {
  font-size: 22px;
  font-weight: 600;
  color: #1A1A1A;
  display: block;
  margin-bottom: 4px;
}

.panel-subtitle {
  font-size: 14px;
  color: #666666;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
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
  font-weight: 700;
  color: #007AFF;
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
  margin-bottom: 16px;
}

.btn-primary {
  flex: 1;
  background: #007AFF;
  color: white;
  border: none;
  border-radius: 10px;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-secondary {
  background: #FFFFFF;
  color: #007AFF;
  border: 1px solid #007AFF;
  border-radius: 10px;
  height: 44px;
  padding: 0 20px;
  font-size: 14px;
}

.create-btn {
  flex: 2;
}

.experiment-list {
  max-height: calc(100vh - 300px);
}

.experiment-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-left: 4px solid transparent;
  transition: all 0.3s ease;
}

.experiment-card.active {
  border-left-color: #34C759;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.exp-info {
  flex: 1;
}

.exp-name {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  display: block;
  margin-bottom: 6px;
}

.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.status-draft {
  background: #E8E8E8;
  color: #666666;
}

.status-running {
  background: #E8F5E9;
  color: #34C759;
}

.status-paused {
  background: #FFF3E0;
  color: #FF9500;
}

.status-completed {
  background: #E3F2FD;
  color: #007AFF;
}

.card-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  border: none;
  min-width: 60px;
}

.start-btn {
  background: #34C759;
  color: white;
}

.pause-btn {
  background: #FF9500;
  color: white;
}

.resume-btn {
  background: #007AFF;
  color: white;
}

.complete-btn {
  background: #5856D6;
  color: white;
}

.delete-btn {
  background: #FF3B30;
  color: white;
}

.exp-description {
  font-size: 13px;
  color: #666666;
  line-height: 1.5;
  display: block;
  margin-bottom: 12px;
}

.variants-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.variants-label {
  font-size: 12px;
  color: #999999;
}

.variant-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.variant-tag {
  background: #F0F0F0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #333333;
}

.exp-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #999999;
  margin-top: 8px;
  flex-wrap: wrap;
}

.results-summary {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #E8E8E8;
}

.results-title {
  font-size: 13px;
  font-weight: 600;
  color: #333333;
  display: block;
  margin-bottom: 8px;
}

.mini-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mini-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-label {
  font-size: 12px;
  color: #666666;
  width: 70px;
  flex-shrink: 0;
}

.mini-bar-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.mini-bar {
  height: 20px;
  background: linear-gradient(90deg, #007AFF, #5856D6);
  border-radius: 4px;
  transition: width 0.5s ease;
  min-width: 2px;
}

.mini-bar.winner {
  background: linear-gradient(90deg, #34C759, #30D158);
}

.mini-value {
  font-size: 12px;
  font-weight: 600;
  color: #333333;
  width: 45px;
  text-align: right;
}

.winner-badge {
  font-size: 16px;
}

.expand-btn {
  width: 100%;
  margin-top: 12px;
  padding: 8px;
  background: #F8F8F8;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  color: #007AFF;
}

.detailed-results {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px solid #E8E8E8;
}

.detail-section {
  margin-bottom: 16px;
}

.detail-title {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  display: block;
  margin-bottom: 12px;
}

.results-table {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #E0E0E0;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 1fr 0.8fr 0.8fr 0.8fr 1.2fr 0.8fr 0.8fr 0.9fr;
  gap: 8px;
  padding: 10px 8px;
  font-size: 12px;
  align-items: center;
}

.table-header {
  background: #F5F5F5;
  font-weight: 600;
  color: #333333;
  border-bottom: 1px solid #E0E0E0;
}

.table-row {
  border-bottom: 1px solid #F0F0F0;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row.winner-row {
  background: #FFF9E6;
}

.th,
.td {
  font-size: 11px;
  color: #333333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th {
  font-weight: 600;
  color: #666666;
}

.name-cell {
  font-weight: 600;
  color: #007AFF;
}

.rate-cell {
  font-weight: 600;
  color: #34C759;
}

.ci-cell {
  color: #666666;
  font-size: 10px;
}

.positive {
  color: #34C759 !important;
  font-weight: 600;
}

.negative {
  color: #FF3B30 !important;
  font-weight: 600;
}

.significant {
  color: #34C759 !important;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stats-item {
  background: #F8F8F8;
  padding: 12px;
  border-radius: 8px;
}

.stats-label {
  font-size: 12px;
  color: #666666;
  display: block;
  margin-bottom: 4px;
}

.stats-value {
  font-size: 18px;
  font-weight: 700;
  color: #007AFF;
}

.report-btn {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
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
  font-size: 18px;
  font-weight: 600;
  color: #333333;
  display: block;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  color: #999999;
}

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
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.report-modal {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #E8E8E8;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #999999;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #333333;
  display: block;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  height: 44px;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #007AFF;
  outline: none;
}

.form-textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  box-sizing: border-box;
  resize: vertical;
  font-family: inherit;
}

.code-textarea {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  background: #F8F8F8;
}

.picker-display {
  height: 44px;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #333333;
  background: white;
}

.slider-value {
  font-size: 14px;
  font-weight: 600;
  color: #007AFF;
  margin-left: 8px;
}

.form-section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.add-variant-btn {
  background: #007AFF;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 12px;
}

.variant-config {
  background: #F8F8F8;
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 12px;
}

.variant-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.variant-number {
  font-size: 14px;
  font-weight: 600;
  color: #007AFF;
}

.remove-variant-btn {
  background: #FF3B30;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.weight-warning {
  background: #FFF3E0;
  color: #FF9500;
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-top: 12px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #E8E8E8;
}

.btn-cancel {
  flex: 1;
  background: #F0F0F0;
  color: #666666;
  border: none;
  border-radius: 10px;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.report-body {
  flex: 1;
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.report-text {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.8;
  color: #333333;
  white-space: pre-wrap;
  word-break: break-all;
}

@media (max-width: 768px) {
  .table-header,
  .table-row {
    grid-template-columns: 0.8fr 0.6fr 0.6fr 0.7fr 1fr 0.7fr 0.7fr 0.8fr;
    font-size: 10px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .card-actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }
}
</style>
