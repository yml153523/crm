/**
 * 课程管理模块 - 实时同步集成示例
 * 
 * 展示如何在现有CRUD操作中添加实时同步功能
 */

// 原始代码（修改前）:
// async function submitForm() {
//   const response = await apiPost('/api/courses', payload)
//   if (response.success) {
//     uni.showToast({ title: '创建成功', icon: 'success' })
//     closeModal()
//     loadCourses()
//   }
// }

// 修改后的代码（添加实时同步）:

import { apiPost, apiPut, apiDelete } from '@/utils/request'
import { courseSync, initRealtimeSync } from '@/utils/realtime-sync-integration'

/**
 * 初始化（在App.vue的onLaunch中调用一次）
 */
export function setupRealtimeSync() {
  // 在应用启动时初始化WebSocket连接
  initRealtimeSync()
}

/**
 * 创建课程 - 带实时同步
 */
export async function createCourseSync(formData: any) {
  uni.showLoading({ title: '创建中...' })
  
  try {
    // 使用包装函数，自动在成功后发射事件
    const response = await courseSync.create(
      apiPost('/api/courses', formData)
    )
    
    uni.hideLoading()
    
    if (response.success) {
      uni.showToast({ 
        title: '✅ 创建成功！用户端将实时收到通知', 
        icon: 'success',
        duration: 2000
      })
      
      return response.data?.course || response.data
    } else {
      throw new Error(response.message || '创建失败')
    }
  } catch (error: any) {
    uni.hideLoading()
    console.error('[课程管理] 创建失败:', error)
    uni.showToast({ title: error.message || '创建失败', icon: 'none' })
    throw error
  }
}

/**
 * 更新课程 - 带实时同步
 */
export async function updateCourseSync(courseId: string, formData: any) {
  uni.showLoading({ title: '保存中...' })
  
  try {
    const response = await courseSync.update(
      apiPut(`/api/courses/${courseId}`, formData)
    )
    
    uni.hideLoading()
    
    if (response.success) {
      uni.showToast({ 
        title: '✅ 已更新！用户端将自动刷新', 
        icon: 'success' 
      })
      
      return response.data?.course || response.data
    } else {
      throw new Error(response.message || '更新失败')
    }
  } catch (error: any) {
    uni.hideLoading()
    console.error('[课程管理] 更新失败:', error)
    uni.showToast({ title: error.message || '更新失败', icon: 'none' })
    throw error
  }
}

/**
 * 删除课程 - 带实时同步
 */
export async function deleteCourseSync(courseId: string) {
  try {
    const response = await courseSync.delete(
      apiDelete(`/api/courses/${courseId}`)
    )
    
    if (response.success) {
      uni.showToast({ 
        title: '已删除，用户端将同步移除', 
        icon: 'success' 
      })
      return true
    } else {
      throw new Error(response.message || '删除失败')
    }
  } catch (error: any) {
    console.error('[课程管理] 删除失败:', error)
    uni.showToast({ title: error.message || '删除失败', icon: 'none' })
    throw error
  }
}

/**
 * 批量操作示例：批量发布课程
 */
export async function publishCoursesSync(courseIds: string[]) {
  const results = []
  
  for (const courseId of courseIds) {
    try {
      const result = await recommendationSync.publish(  // 使用recommendation事件更合适
        apiPut(`/api/courses/${courseId}`, { status: 'published' })
      )
      results.push({ success: true, id: courseId, data: result })
    } catch (error) {
      results.push({ success: false, id: courseId, error })
    }
  }
  
  const successCount = results.filter(r => r.success).length
  uni.showToast({ 
    title: `成功发布${successCount}/${courseIds.length}个课程`, 
    icon: successCount === courseIds.length ? 'success' : 'none'
  })
  
  return results
}
