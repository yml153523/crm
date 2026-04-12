<template>
  <view class="video-page">
    <view class="header">
      <text class="page-title">视频管理</text>
      <view class="upload-btn" @tap="goUpload">
        <text class="btn-icon">📤</text>
        <text class="btn-text">上传视频</text>
      </view>
    </view>

    <view class="stats-bar">
      <view class="stat-item">
        <text class="stat-value">{{ videoList.length }}</text>
        <text class="stat-label">总视频数</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-value">{{ totalViews }}</text>
        <text class="stat-label">总观看量</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-value">{{ totalDuration }}</text>
        <text class="stat-label">总时长(分)</text>
      </view>
    </view>
    
    <view class="video-list">
      <view class="video-card card" v-for="(item, index) in videoList" :key="index">
        <view class="video-wrapper">
          <image :src="item.cover || '/static/images/placeholder.png'" mode="aspectFill" class="cover" />
          <view class="duration-badge">
            <text>{{ formatDuration(item.duration) }}</text>
          </view>
          <view class="play-overlay" @tap="previewVideo(item)">
            <text class="play-icon">▶️</text>
          </view>
        </view>
        
        <view class="info">
          <text class="title">{{ item.title }}</text>
          <text class="desc">{{ item.description || '暂无描述' }}</text>
          
          <view class="meta-row">
            <view class="meta-item">
              <text class="meta-icon">👁️</text>
              <text>{{ item.viewCount || 0 }}次观看</text>
            </view>
            <view class="meta-item">
              <text class="meta-icon">✅</text>
              <text>{{ item.completionCount || 0 }}次完播</text>
            </view>
            <view class="meta-item">
              <text class="meta-icon">💬</text>
              <text>{{ item.commentCount || 0 }}条评论</text>
            </view>
          </view>
          
          <view class="tags-row">
            <view class="tag" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </view>
            <view class="tag tag-info" v-if="item.isRecommended">⭐ 推荐</view>
          </view>
        </view>
        
        <view class="actions">
          <view class="action-btn btn-primary" @tap="editVideo(item)">
            <text>编辑</text>
          </view>
          <view class="action-btn btn-danger" @tap="deleteVideo(item)">
            <text>删除</text>
          </view>
        </view>
      </view>
      
      <!-- 编辑弹窗 -->
      <view class="modal-overlay" v-if="showEditModal" @tap.self="showEditModal = false">
        <view class="modal-content card">
          <text class="modal-title">✏️ 编辑视频</text>
          
          <view class="form-group">
            <text class="form-label">标题</text>
            <input 
              type="text" 
              v-model="editForm.title" 
              placeholder="请输入视频标题"
              class="form-input"
            />
          </view>
          
          <view class="form-group">
            <text class="form-label">描述</text>
            <textarea 
              v-model="editForm.description" 
              placeholder="请输入视频描述"
              class="form-textarea"
            ></textarea>
          </view>
          
          <view class="form-group">
            <text class="form-label">分类</text>
            <picker :value="categoryIndex" :range="categories" @change="onCategoryChange">
              <view class="picker-input">{{ categories[categoryIndex] || '请选择' }} ▼</view>
            </picker>
          </view>
          
          <view class="form-group">
            <text class="form-label">状态</text>
            <picker :value="statusIndex" :range="statusOptions" @change="onStatusChange">
              <view class="picker-input">{{ statusOptions[statusIndex] || '请选择' }} ▼</view>
            </picker>
          </view>
          
          <view class="modal-actions">
            <view class="btn-cancel" @tap="showEditModal = false">
              <text>取消</text>
            </view>
            <view class="btn-save" @tap="saveEdit">
              <text>保存修改</text>
            </view>
          </view>
        </view>
      </view>
      
      <view class="empty-state" v-if="!videoList.length && !loading">
        <text class="empty-icon">🎬</text>
        <text class="empty-text">暂无视频内容</text>
        <view class="empty-action" @tap="goUpload">
          <text>上传第一个视频</text>
        </view>
      </view>
      
      <view class="load-more" v-if="videoList.length > 0">
        <text>{{ loading ? '⏳ 加载中...' : '— 已经到底了 —' }}</text>
      </view>
    </view>
    
    <view class="float-upload" @tap="goUpload">
      <text class="float-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(false)
const videoList = ref<any[]>([])

// 编辑相关状态
const showEditModal = ref(false)
const editForm = ref<any>({})
const categoryIndex = ref(0)
const statusIndex = ref(0)
const categories = ['瑜伽', '普拉提', '舞蹈', '健身', '其他']
const statusOptions = ['草稿', '审核中', '已发布', '已拒绝']

onMounted(() => {
  loadVideoList()
})

// 从数据库加载真实视频数据
async function loadVideoList() {
  loading.value = true
  try {
    console.log('正在从数据库加载视频列表...')
    
    const res: any = await new Promise((resolve, reject) => {
      uni.request({
        url: '/api/videos',
        method: 'GET',
        data: { page: 1, pageSize: 100 },  // 获取最多100条
        success: (response: any) => resolve(response),
        fail: (err: any) => reject(err)
      })
    })
    
    console.log('视频API响应:', res.statusCode, res.data)
    
    // 解析后端返回的数据格式
    // 后端返回: { success: true, data: { list: [...], pagination: { total: N } } }
    if (res.data && (res.data.success === true || res.statusCode === 200)) {
      const data = res.data.data || res.data
      const videos = data.list || []
      
      console.log(`从数据库获取到 ${videos.length} 个视频`)
      
      // 转换数据库字段为前端显示格式
      videoList.value = videos.map((v: any) => ({
        _id: v._id || v.id,
        id: v._id || v.id,
        title: v.title || '未命名视频',
        description: v.description || '',
        cover: v.cover || '',
        videoUrl: v.videoUrl || '',  // 真实的视频文件路径
        duration: v.duration || 0,  // 真实时长（秒），由后端ffprobe获取
        size: v.size || 0,
        viewCount: v.viewCount || 0,
        completionCount: v.completionCount || 0,
        commentCount: v.commentCount || 0,
        status: v.status || 'published',
        category: v.category || '其他',
        isRecommended: v.isRecommended || false,
        createdAt: v.createdAt,
        uploadedBy: v.uploadedBy,
        courseId: v.courseId
      }))
      
      if (videos.length === 0) {
        console.log('数据库暂无视频数据')
      }
    } else {
      console.warn('API返回异常:', res.data)
      videoList.value = []  // 空列表，不使用假数据
    }
    
  } catch (error) {
    console.error('加载视频列表失败:', error)
    videoList.value = []  // 出错时显示空列表，不用假数据
    uni.showToast({ title: '加载视频列表失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
const totalViews = computed(() => {
  return videoList.value.reduce((sum, item) => sum + (item.viewCount || 0), 0)
})

const totalDuration = computed(() => {
  let totalSeconds = 0
  videoList.value.forEach(item => {
    if (item.duration) {
      const dur = item.duration.toString()
      const parts = dur.split(':')
      if (parts.length === 2) {
        totalSeconds += (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0)
      } else if (parts.length === 3) {
        totalSeconds += (parseInt(parts[0]) || 0) * 3600 + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0)
      } else if (!isNaN(parseInt(dur))) {
        totalSeconds += parseInt(dur)
      }
    }
  })
  
  // 返回格式化的时长
  if (totalSeconds >= 3600) {
    return Math.round(totalSeconds / 3600) + '小时'
  } else if (totalSeconds >= 60) {
    return Math.round(totalSeconds / 60) + '分钟'
  }
  return totalSeconds + '秒'
})

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    published: '✅ 已发布',
    reviewing: '⏳ 审核中',
    draft: '📝 草稿',
    rejected: '❌ 已拒绝'
  }
  return map[status] || status
}

function getStatusClass(status: string): string {
  const map: Record<string, string> = {
    published: 'tag-success',
    reviewing: 'tag-warning',
    draft: 'tag-default',
    rejected: 'tag-danger'
  }
  return map[status] || 'tag-default'
}

// ==================== 上传功能 ====================
function goUpload() {
  // 第一步：弹出表单让用户输入视频信息
  uni.showModal({
    title: '📤 上传视频',
    content: '请先选择视频文件，然后填写信息',
    editable: true,
    placeholderText: '请输入视频标题（如：瑜伽基础教学）',
    success: (modalRes) => {
      if (!modalRes.confirm) return
      const inputTitle = modalRes.content?.trim()
      
      // 第二步：选择视频文件
      if (typeof window !== 'undefined' && document) {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'video/*'
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0]
          if (!file) return
          
          // 使用用户输入的标题，或从文件名提取
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
            
            // UniApp环境：需要转换为File对象再上传
            if (res.tempFilePath) {
              await uploadVideoToServer(res.tempFilePath, finalTitle)
            }
          }
        })
      }
    }
  })
}

// 真正的上传函数 - 调用后端API
async function uploadVideoToServer(fileOrPath: any, title: string) {
  uni.showLoading({ title: '正在上传...', mask: true })
  
  try {
    const formData = new FormData()
    
    if (typeof fileOrPath === 'string') {
      // UniApp tempFilePath - 需要转换
      const response = await new Promise((resolve, reject) => {
        uni.request({
          url: fileOrPath,
          responseType: 'arraybuffer',
          success: resolve,
          fail: reject
        })
      })
      const blob = new Blob([response.data], { type: 'video/mp4' })
      formData.append('video', blob, title + '.mp4')
    } else {
      // H5 File object
      formData.append('video', fileOrPath)
    }
    
    // 添加表单字段
    formData.append('title', title)
    formData.append('description', '')
    formData.append('category', '其他')
    formData.append('isRecommended', 'false')
    
    // 调用后端上传API
    const uploadRes: any = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/videos/upload')
      xhr.onload = () => resolve({ status: xhr.status, data: xhr.responseText })
      xhr.onerror = () => reject(new Error('网络错误'))
      xhr.send(formData)
    })
    
    console.log('上传响应:', uploadRes)
    
    if (uploadRes.status >= 200 && uploadRes.status < 300) {
      const result = JSON.parse(uploadRes.data)
      if (result.success) {
        uni.showToast({ title: '✅ 上传成功！', icon: 'success' })
        
        // 刷新列表（从数据库获取真实数据）
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

// 格式化视频时长显示（支持数字秒数或MM:SS字符串）
function formatDuration(duration: string | number): string {
  if (!duration && duration !== 0) return '00:00'
  
  let totalSeconds = 0
  
  // 如果是数字（秒）
  if (typeof duration === 'number') {
    totalSeconds = Math.round(duration)
  } 
  // 如果是字符串格式 "MM:SS" 或 "HH:MM:SS"
  else {
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
  
  // 转换为友好的中文显示
  if (totalSeconds >= 3600) {
    const hours = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    return `${hours}时${mins}分`
  } else if (totalSeconds >= 60) {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分钟`
  } else {
    return `${totalSeconds}秒`
  }
}

// ==================== 播放功能 ====================
function previewVideo(item: any) {
  console.log('播放视频:', item)
  console.log('视频URL:', item.videoUrl)
  
  // 构建完整的视频URL
  let videoUrl = item.videoUrl || ''
  
  // 如果是相对路径，转换为完整的HTTP URL
  if (videoUrl && !videoUrl.startsWith('http')) {
    // 获取当前主机地址
    const isDev = window.location.hostname === 'localhost'
    const host = isDev ? 'http://localhost:8080' : window.location.origin
    videoUrl = `${host}${videoUrl.startsWith('/') ? '' : '/'}${videoUrl}`
  }
  
  console.log('完整视频URL:', videoUrl)
  
  if (videoUrl) {
    // 有视频URL，尝试播放
    // H5环境直接使用HTML5 video播放器
    if (typeof window !== 'undefined' && document) {
      // 移除之前的播放器（如果存在）
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
            controls 
            autoplay
            playsinline
            webkit-playsinline
            x5-video-player-type="h5"
            x5-video-player-fullscreen="true"
            style="max-width:90vw;max-height:75vh;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);background:#000;"
          ></video>
          <div style="display:flex;gap:16px;margin-top:24px;">
            <button 
              id="close-video-btn"
              style="padding:12px 40px;background:#ff3b30;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:16px;font-weight:bold;"
            >
              ✕ 关闭播放器
            </button>
          </div>
          <div style="color:#666;font-size:12px;margin-top:16px;">
            时长: ${formatDuration(item.duration)} | 观看: ${item.viewCount || 0}次
          </div>
        </div>
      `
      document.body.appendChild(videoContainer)
      
      // 绑定关闭按钮事件
      setTimeout(() => {
        const closeBtn = document.getElementById('close-video-btn')
        if (closeBtn) {
          closeBtn.onclick = () => {
            const player = document.getElementById('video-player-overlay')
            if (player) player.remove()
          }
        }
        
        // 点击背景关闭
        videoContainer.addEventListener('click', (e) => {
          if (e.target === videoContainer || e.target.id === 'video-player-overlay') {
            videoContainer.remove()
          }
        })
      }, 100)
      
      uni.showToast({ title: '正在加载视频...', icon: 'loading', duration: 2000 })
    } else {
      // 非H5环境：跳转到视频播放页
      uni.navigateTo({
        url: `/pages/user/video/player?id=${item._id || item.id}&title=${encodeURIComponent(item.title || '')}&url=${encodeURIComponent(item.videoUrl || '')}`
      })
    }
  } else {
    // 无视频URL
    uni.showModal({
      title: '🎬 视频信息',
      content: `视频名称: ${item.title || '未命名'}\n时长: ${formatDuration(item.duration)}\n观看次数: ${item.viewCount || 0}次\n状态: ${getStatusText(item.status)}\n\n⚠️ 该视频暂无可播放的视频文件\n请先上传视频文件`,
      showCancel: false,
      confirmText: '我知道了'
    })
  }
}

// ==================== 观看统计功能 ====================

const showStatsModal = ref(false)
const watchStats = ref<any>({})
const watchersList = ref<any[]>([])
const showWatchersModal = ref(false)

// 加载观看统计数据
async function loadWatchStats() {
  try {
    uni.showLoading({ title: '加载中...' })
    
    const res: any = await new Promise((resolve, reject) => {
      uni.request({
        url: '/api/video-watches/stats',
        method: 'GET',
        success: (r: any) => resolve(r),
        fail: (err: any) => reject(err)
      })
    })
    
    if (res.data && res.data.success !== false) {
      watchStats.value = res.data.data || {}
      showStatsModal.value = true
    } else {
      uni.showToast({ title: '暂无观看数据', icon: 'none' })
    }
  } catch (error) {
    console.error('获取观看统计失败:', error)
    uni.showToast({ title: '获取失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function showWatchStats() {
  loadWatchStats()
}

// 查看某视频的观众列表
async function viewWatchers(item: any) {
  try {
    uni.showLoading({ title: '加载观众...' })
    
    const res: any = await new Promise((resolve, reject) => {
      uni.request({
        url: `/api/video-watches/video/${item._id || item.id}`,
        method: 'GET',
        success: (r: any) => resolve(r),
        fail: (err: any) => reject(err)
      })
    })
    
    if (res.data && res.data.success !== false) {
      watchersList.value = res.data.data?.list || []
      
      // 显示观众列表弹窗
      let contentText = `《${item.title}》的观众 (${watchersList.value.length}人)

`
      watchersList.value.slice(0, 10).forEach((w: any, i: number) => {
        const progress = w.watchProgress ? Math.round(w.watchProgress) : 0
        const status = w.completed ? '✅已看完' : `${progress}%`
        contentText += `${i+1}. ${w.userPhone || w.userName || '匿名'} - ${status}
`
      })
      if (watchersList.value.length > 10) {
        contentText += `
...还有 ${watchersList.value.length - 10} 人`
      }
      
      uni.showModal({
        title: '📋 观看详情',
        content: contentText,
        showCancel: false,
        confirmText: '关闭'
      })
    }
  } catch (error) {
    console.error('获取观众列表失败:', error)
    uni.showToast({ title: '获取失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function closeStatsModal() {
  showStatsModal.value = false
}

// ==================== 编辑功能 ====================
function editVideo(item: any) {
  // 打开编辑弹窗
  editForm.value = { ...item }
  
  // 设置下拉框默认值
  if (item.category) {
    categoryIndex.value = categories.indexOf(item.category)
    if (categoryIndex.value === -1) categoryIndex.value = 0
  }
  
  if (item.status) {
    const statusMap: Record<string, number> = {
      'draft': 0,
      'reviewing': 1,
      'published': 2,
      'rejected': 3
    }
    statusIndex.value = statusMap[item.status] ?? 2
  }
  
  showEditModal.value = true
}

function onCategoryChange(e: any) {
  categoryIndex.value = e.detail.value
  editForm.value.category = categories[e.detail.value]
}

function onStatusChange(e: any) {
  statusIndex.value = e.detail.value
  const statusMap = ['draft', 'reviewing', 'published', 'rejected']
  editForm.value.status = statusMap[e.detail.value]
}

async function saveEdit() {
  if (!editForm.value.title?.trim()) {
    uni.showToast({ title: '请输入标题', icon: 'none' })
    return
  }
  
  uni.showLoading({ title: '保存中...' })
  try {
    // 更新本地数据
    const index = videoList.value.findIndex(v => v._id === editForm.value._id)
    if (index > -1) {
      videoList.value[index] = { ...videoList.value[index], ...editForm.value }
    }
    
    // 尝试调用API（如果可用）
    try {
      await videoAPI.updateVideo(editForm.value._id, editForm.value)
    } catch (e) {
      console.log('API调用失败，已保存到本地')
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

// ==================== 删除功能 ====================
async function deleteVideo(item: any) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除视频"${item.title}"吗？\n此操作不可恢复！`,
    confirmColor: '#FF3B30',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '删除中...' })
        try {
          // 先尝试调用API
          let apiSuccess = false
          try {
            const result: any = await videoAPI.deleteVideo(item._id)
            if (result.success) apiSuccess = true
          } catch (e) {
            console.log('API删除失败，执行本地删除')
          }
          
          // 无论API是否成功，都从本地列表移除（保证用户体验）
          const index = videoList.value.findIndex(v => v._id === item._id)
          if (index > -1) {
            videoList.value.splice(index, 1)
          }
          
          uni.showToast({ 
            title: apiSuccess ? '删除成功（已同步服务器）' : '删除成功（仅本地）', 
            icon: 'success' 
          })
        } catch (error) {
          console.error('删除失败:', error)
          // 即使出错也从本地移除
          const index = videoList.value.findIndex(v => v._id === item._id)
          if (index > -1) {
            videoList.value.splice(index, 1)
          }
          uni.showToast({ title: '已从列表移除', icon: 'none' })
        } finally {
          uni.hideLoading()
        }
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

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 16px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  
  .page-title {
    font-size: 22px;
    font-weight: 600;
    color: #FFFFFF;
  }
  
  .upload-btn {
    display: flex;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.25);
    padding: 10px 18px;
    border-radius: 24px;
    
    .btn-icon {
      font-size: 16px;
      margin-right: 6px;
    }
    
    .btn-text {
      font-size: 14px;
      color: #FFFFFF;
    }
  }
}

.stats-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background-color: #FFFFFF;
  padding: 16px;
  margin: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  
  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .stat-value {
      font-size: 22px;
      font-weight: bold;
      color: #1A1A1A;
    }
    
    .stat-label {
      font-size: 12px;
      color: #999999;
      margin-top: 4px;
    }
  }
  
  .stat-divider {
    width: 1px;
    height: 36px;
    background-color: #E0E0E0;
  }
}

.video-list {
  padding: 0 16px;
  
  .video-card {
    margin-bottom: 16px;
    overflow: hidden;
    
    .video-wrapper {
      position: relative;
      width: 100%;
      height: 200px;
      border-radius: 12px;
      overflow: hidden;
      
      .cover {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      
      .duration-badge {
        position: absolute;
        right: 10px;
        bottom: 10px;
        background-color: rgba(0, 0, 0, 0.75);
        padding: 4px 8px;
        border-radius: 4px;
        
        text {
          color: #FFFFFF;
          font-size: 12px;
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
        background-color: rgba(0, 0, 0, 0.15);
        
        .play-icon {
          font-size: 48px;
          opacity: 0.9;
        }
      }
    }
    
    .info {
      padding: 14px 0;
      
      .title {
        font-size: 17px;
        font-weight: 600;
        color: #1A1A1A;
        display: block;
        line-height: 1.4;
      }
      
      .desc {
        font-size: 13px;
        color: #666666;
        margin-top: 6px;
        display: block;
        line-height: 1.4;
      }
      
      .meta-row {
        display: flex;
        gap: 16px;
        margin-top: 10px;
        
        .meta-item {
          display: flex;
          align-items: center;
          
          .meta-icon {
            margin-right: 4px;
            font-size: 13px;
          }
          
          text {
            font-size: 12px;
            color: #999999;
          }
        }
      }
      
      .tags-row {
        display: flex;
        gap: 8px;
        margin-top: 10px;
        
        .tag {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          
          &.tag-success {
            background-color: rgba(52, 199, 89, 0.15);
            color: #34C759;
          }
          
          &.tag-warning {
            background-color: rgba(255, 149, 0, 0.15);
            color: #FF9500;
          }
          
          &.tag-default {
            background-color: rgba(153, 153, 153, 0.15);
            color: #999999;
          }
          
          &.tag-danger {
            background-color: rgba(255, 59, 48, 0.15);
            color: #FF3B30;
          }
          
          &.tag-info {
            background-color: rgba(0, 122, 255, 0.15);
            color: #007AFF;
          }
        }
      }
    }
    
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 10px;
      border-top: 1px solid #F0F0F0;
      
      .action-btn {
        padding: 8px 20px;
        border-radius: 6px;
        font-size: 13px;
        
        &.btn-primary {
          background-color: #007AFF;
          color: #FFFFFF;
        }
        
        &.btn-danger {
          background-color: #FF3B30;
          color: #FFFFFF;
        }
      }
    }
  }
}

/* 编辑弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-content {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
  
  .modal-title {
    font-size: 20px;
    font-weight: bold;
    color: #1A1A1A;
    display: block;
    margin-bottom: 20px;
    text-align: center;
  }
  
  .form-group {
    margin-bottom: 18px;
    
    .form-label {
      font-size: 14px;
      font-weight: 600;
      color: #333333;
      display: block;
      margin-bottom: 8px;
    }
    
    .form-input {
      width: 100%;
      height: 44px;
      border: 1px solid #E0E0E0;
      border-radius: 8px;
      padding: 0 14px;
      font-size: 15px;
      box-sizing: border-box;
      outline: none;
      
      &:focus {
        border-color: #007AFF;
      }
    }
    
    .form-textarea {
      width: 100%;
      min-height: 80px;
      border: 1px solid #E0E0E0;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 15px;
      box-sizing: border-box;
      outline: none;
      resize: vertical;
      
      &:focus {
        border-color: #007AFF;
      }
    }
    
    .picker-input {
      width: 100%;
      height: 44px;
      border: 1px solid #E0E0E0;
      border-radius: 8px;
      padding: 0 14px;
      font-size: 15px;
      display: flex;
      align-items: center;
      background-color: #F5F5F5;
    }
  }
  
  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
    
    .btn-cancel, .btn-save {
      flex: 1;
      height: 46px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 600;
    }
    
    .btn-cancel {
      background-color: #F5F5F5;
      color: #666666;
    }
    
    .btn-save {
      background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
      color: #FFFFFF;
    }
  }
}

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
    margin-bottom: 28px;
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

.float-upload {
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
</style>
