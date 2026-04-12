<template>
  <view class="course-page">
    <view class="header">
      <text class="page-title">课程管理</text>
      <view class="add-btn" @tap="showAddDialog">
        <text class="btn-icon">+</text>
        <text class="btn-text">添加课程</text>
      </view>
    </view>
    
    <view class="search-bar">
      <view class="search-input">
        <text class="search-icon">🔍</text>
        <input type="text" placeholder="搜索课程名称..." v-model="searchText" />
      </view>
      <view class="filter-btn" :class="{ active: showFilter }" @tap="showFilter = !showFilter">
        <text>筛选</text>
      </view>
    </view>

    <view class="filter-panel" v-if="showFilter">
      <view class="filter-row">
        <view 
          class="filter-tag"
          :class="{ active: currentCategory === 'all' }"
          @tap="currentCategory = 'all'"
        >全部</view>
        <view 
          class="filter-tag"
          :class="{ active: currentCategory === item }"
          v-for="item in categories"
          :key="item"
          @tap="currentCategory = item"
        >{{ item }}</view>
      </view>
    </view>
    
    <view class="course-list">
      <view class="course-card card" v-for="(item, index) in filteredList" :key="index">
        <image :src="item.coverImage || '/static/images/placeholder.png'" mode="aspectFill" class="cover" />
        <view class="info">
          <text class="title">{{ item.title }}</text>
          <text class="meta">📚 {{ item.category }} · 👨‍🏫 {{ item.instructor }}</text>
          <view class="stats-row">
            <text class="stat-item">👥 {{ item.studentCount }}人</text>
            <text class="stat-item">⏱️ {{ item.duration }}</text>
            <text class="stat-item">⭐ {{ item.rating }}</text>
          </view>
          <view class="tags">
            <view class="tag" :class="item.status === 'published' ? 'tag-success' : 'tag-warning'">
              {{ item.status === 'published' ? '✅ 已发布' : '📝 草稿' }}
            </view>
            <view class="tag tag-info" v-if="item.isHot">🔥 热门</view>
          </view>
        </view>
        <view class="actions">
          <view class="action-btn btn-edit" @tap="editCourse(item)">
            <text>编辑</text>
          </view>
          <view class="action-btn btn-delete" @tap="deleteCourse(item)">
            <text>删除</text>
          </view>
        </view>
      </view>
      
      <view class="empty-state" v-if="!filteredList.length && !loading">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无课程数据</text>
        <view class="empty-btn" @tap="showAddDialog">
          <text>立即添加第一个课程</text>
        </view>
      </view>
      
      <view class="load-more" v-if="filteredList.length > 0">
        <text>{{ loading ? '加载中...' : '上拉加载更多' }}</text>
      </view>
    </view>
    
    <view class="float-btn" @tap="showAddDialog">
      <text class="float-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const loading = ref(false)
const searchText = ref('')
const showFilter = ref(false)
const currentCategory = ref('all')
const categories = ref(['瑜伽', '普拉提', '舞蹈', '健身'])

const courseList = ref([
  {
    _id: '1',
    title: '零基础瑜伽入门',
    category: '瑜伽',
    instructor: '李老师',
    coverImage: '',
    studentCount: 128,
    duration: '12课时',
    rating: 4.8,
    status: 'published',
    isHot: true
  },
  {
    _id: '2',
    title: '高级普拉提塑形',
    category: '普拉提',
    instructor: '王老师',
    coverImage: '',
    studentCount: 86,
    duration: '16课时',
    rating: 4.9,
    status: 'published',
    isHot: false
  },
  {
    _id: '3',
    title: '拉丁舞基础教学',
    category: '舞蹈',
    instructor: '张老师',
    coverImage: '',
    studentCount: 45,
    duration: '10课时',
    rating: 4.6,
    status: 'draft',
    isHot: false
  },
  {
    _id: '4',
    title: '核心力量训练',
    category: '健身',
    instructor: '陈教练',
    coverImage: '',
    studentCount: 203,
    duration: '8课时',
    rating: 4.7,
    status: 'published',
    isHot: true
  }
])

const filteredList = computed(() => {
  let list = courseList.value
  
  if (currentCategory.value !== 'all') {
    list = list.filter(item => item.category === currentCategory.value)
  }
  
  if (searchText.value.trim()) {
    const keyword = searchText.value.toLowerCase()
    list = list.filter(item => 
      item.title.toLowerCase().includes(keyword) ||
      item.instructor.includes(keyword)
    )
  }
  
  return list
})

function showAddDialog() {
  uni.showModal({
    title: '➕ 添加新课程',
    content: '请输入课程信息：\n\n标题: 示例课程\n分类: 瑜伽\n老师: 测试老师\n\n点击确定即可添加到列表',
    editable: true,
    placeholderText: '请输入课程名称',
    success: (res) => {
      if (res.confirm && res.content) {
        const newCourse = {
          _id: Date.now().toString(),
          title: res.content || '新课程',
          category: categories.value[0],
          instructor: '管理员',
          coverImage: '',
          studentCount: 0,
          duration: '10课时',
          rating: 5.0,
          status: 'draft',
          isHot: false
        }
        courseList.value.unshift(newCourse)
        uni.showToast({ title: `已添加: ${res.content}`, icon: 'success' })
      }
    }
  })
}

function editCourse(item: any) {
  uni.showModal({
    title: '✏️ 编辑课程',
    content: `当前: ${item.title}\n\n请输入新的课程名称:`,
    editable: true,
    placeholderText: item.title,
    success: (res) => {
      if (res.confirm && res.content) {
        const index = courseList.value.findIndex(c => c._id === item._id)
        if (index > -1) {
          courseList.value[index].title = res.content
          uni.showToast({ title: '修改成功 ✅', icon: 'success' })
        }
      }
    }
  })
}

function deleteCourse(item: any) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除课程"${item.title}"吗？`,
    success: (res) => {
      if (res.confirm) {
        const index = courseList.value.findIndex(c => c._id === item._id)
        if (index > -1) {
          courseList.value.splice(index, 1)
          uni.showToast({ title: '删除成功', icon: 'success' })
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.course-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 100px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  
  .page-title {
    font-size: 22px;
    font-weight: 600;
    color: #FFFFFF;
  }
  
  .add-btn {
    display: flex;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.25);
    padding: 10px 18px;
    border-radius: 24px;
    
    .btn-icon {
      font-size: 18px;
      color: #FFFFFF;
      margin-right: 6px;
      font-weight: bold;
    }
    
    .btn-text {
      font-size: 14px;
      color: #FFFFFF;
    }
  }
}

.search-bar {
  display: flex;
  padding: 12px 16px;
  background-color: #FFFFFF;
  gap: 10px;
  
  .search-input {
    flex: 1;
    display: flex;
    align-items: center;
    background-color: #F5F5F5;
    padding: 10px 14px;
    border-radius: 8px;
    
    .search-icon {
      margin-right: 8px;
      font-size: 16px;
    }
    
    input {
      flex: 1;
      font-size: 14px;
      border: none;
      outline: none;
      background: transparent;
    }
  }
  
  .filter-btn {
    padding: 10px 16px;
    background-color: #F5F5F5;
    border-radius: 8px;
    font-size: 14px;
    color: #666666;
    
    &.active {
      background-color: #007AFF;
      color: #FFFFFF;
    }
  }
}

.filter-panel {
  padding: 12px 16px;
  background-color: #FFFFFF;
  border-top: 1px solid #E0E0E0;
  
  .filter-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    
    .filter-tag {
      padding: 8px 16px;
      background-color: #F5F5F5;
      border-radius: 20px;
      font-size: 13px;
      color: #666666;
      
      &.active {
        background-color: #007AFF;
        color: #FFFFFF;
      }
    }
  }
}

.course-list {
  padding: 16px;
  
  .course-card {
    display: flex;
    margin-bottom: 16px;
    overflow: hidden;
    
    .cover {
      width: 120px;
      height: 90px;
      border-radius: 10px;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      flex-shrink: 0;
    }
    
    .info {
      flex: 1;
      margin-left: 14px;
      display: flex;
      flex-direction: column;
      
      .title {
        font-size: 16px;
        font-weight: 600;
        color: #1A1A1A;
        display: block;
        line-height: 1.3;
      }
      
      .meta {
        font-size: 13px;
        color: #666666;
        margin-top: 6px;
        display: block;
      }
      
      .stats-row {
        display: flex;
        gap: 12px;
        margin-top: 6px;
        
        .stat-item {
          font-size: 12px;
          color: #999999;
        }
      }
      
      .tags {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        
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
          
          &.tag-info {
            background-color: rgba(0, 122, 255, 0.15);
            color: #007AFF;
          }
        }
      }
    }
    
    .actions {
      position: absolute;
      right: 16px;
      bottom: 16px;
      display: flex;
      gap: 8px;
      
      .action-btn {
        padding: 6px 14px;
        border-radius: 6px;
        font-size: 12px;
        
        &.btn-edit {
          background-color: #007AFF;
          color: #FFFFFF;
        }
        
        &.btn-delete {
          background-color: #FF3B30;
          color: #FFFFFF;
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
    font-size: 16px;
    color: #999999;
    margin-bottom: 24px;
  }
  
  .empty-btn {
    padding: 12px 28px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 24px;
    
    text {
      color: #FFFFFF;
      font-size: 15px;
    }
  }
}

.load-more {
  text-align: center;
  padding: 20px;
  
  text {
    font-size: 13px;
    color: #999999;
  }
}

.float-btn {
  position: fixed;
  right: 20px;
  bottom: 100px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  
  .float-icon {
    font-size: 32px;
    color: #FFFFFF;
    font-weight: 300;
    margin-top: -2px;
  }
}
</style>
