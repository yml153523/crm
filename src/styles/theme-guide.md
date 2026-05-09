/**
 * CRM 主题系统使用指南
 * 包含主题配置、样式使用、深色模式支持
 */

// ========== 1. 引入主题 ==========

// 在 App.vue 或 main.ts 中引入
import '@/styles/mobile-theme.css'

// 或在页面中按需引入
import theme from '@/styles/theme'

// ========== 2. 使用 CSS 变量 ==========

/*
  所有颜色都通过 CSS 变量定义，使用时直接引用即可：
  
  color: var(--color-primary);
  background: var(--gradient-primary);
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-lg);
*/

// ========== 3. 主题切换 ==========

// 在代码中切换主题
function toggleTheme() {
  const isDark = uni.getStorageSync('darkMode')
  
  if (isDark) {
    uni.setStorageSync('darkMode', false)
    // 可以通过 uni.setTheme 或自定义方式切换
  } else {
    uni.setStorageSync('darkMode', true)
  }
  
  // 触发页面更新
  uni.reLaunch({ url: getCurrentPages()[0].route })
}

// ========== 4. 组件中使用 ==========

/*
  在 Vue 组件中直接使用 CSS 变量：
*/

<template>
  <view class="container">
    <!-- 按钮 -->
    <button class="btn btn-primary">主按钮</button>
    <button class="btn btn-secondary">次要按钮</button>
    
    <!-- 卡片 -->
    <view class="card">
      <text class="title">卡片标题</text>
      <text class="description">卡片描述内容</text>
    </view>
    
    <!-- 输入框 -->
    <input class="input" placeholder="请输入" />
    
    <!-- 标签 -->
    <view class="flex gap-sm">
      <text class="tag tag-primary">标签一</text>
      <text class="tag tag-success">成功</text>
      <text class="tag tag-error">错误</text>
    </view>
    
    <!-- 头像 -->
    <view class="avatar avatar-lg">👤</view>
    
    <!-- 列表项 -->
    <view class="list-item">
      <text class="icon">📱</text>
      <text class="flex-1">菜单项</text>
      <text class="arrow">›</text>
    </view>
  </view>
</template>

<style lang="scss">
.container {
  padding: var(--spacing-lg);
  
  .card {
    margin: var(--spacing-lg) 0;
    padding: var(--spacing-xl);
    
    .title {
      font-size: var(--font-size-xl);
      font-weight: 700;
      color: var(--color-text-primary);
      display: block;
      margin-bottom: var(--spacing-sm);
    }
    
    .description {
      font-size: var(--font-size-base);
      color: var(--color-text-secondary);
    }
  }
  
  .arrow {
    font-size: var(--font-size-2xl);
    color: var(--color-text-tertiary);
    font-weight: 300;
  }
  
  .icon {
    font-size: 22px;
    margin-right: var(--spacing-md);
  }
}
</style>

// ========== 5. 深色模式 ==========

/*
  深色模式自动适配，通过 @media (prefers-color-scheme: dark) 检测系统设置
  也可以手动控制：
*/

// 检测深色模式
function isDarkMode() {
  return uni.getStorageSync('darkMode') || 
         (typeof window !== 'undefined' && 
          window.matchMedia('(prefers-color-scheme: dark)').matches)
}

// 在 onShow 中更新主题
onShow(() => {
  if (isDarkMode()) {
    uni.setStorageSync('darkMode', true)
  }
})

// ========== 6. 响应式断点 ==========

/*
  支持以下断点：
  - xs: 320px  (超小屏幕)
  - sm: 375px  (iPhone SE)
  - md: 414px  (iPhone Plus)
  - lg: 768px  (平板)
  - xl: 1024px (笔记本)
*/

// 在 SCSS 中使用
@media screen and (max-width: 768px) {
  .container {
    padding: 12px;
  }
  
  .card {
    padding: 16px;
  }
}

@media screen and (max-width: 375px) {
  .container {
    padding: 8px;
  }
  
  .title {
    font-size: 16px !important;
  }
}

// ========== 7. 动画效果 ==========

/*
  预置动画：
  - animate-fade-in: 淡入
  - animate-slide-up: 上滑淡入
  - animate-pulse: 脉冲
*/

<template>
  <view class="container animate-slide-up">
    <text>内容</text>
  </view>
</template>

// ========== 8. 触摸优化 ==========

/*
  移动端触摸优化：
  - 最小触摸区域 44px (Apple 标准)
  - 点击缩放效果 0.97
  - 点击不透明度 0.8
*/

.touch-item {
  min-height: 44px;
  transition: transform var(--transition-fast), opacity var(--transition-fast);
  
  &:active {
    transform: scale(0.97);
    opacity: 0.8;
  }
}

// ========== 9. 完整页面示例 ==========

<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header gradient-bg">
      <view class="brand">
        <text class="brand-name">宜宁</text>
        <text class="brand-sub">品质生活</text>
      </view>
      
      <view class="avatar-wrapper">
        <view class="avatar">
          <text>👤</text>
        </view>
        <view class="badge">3</view>
      </view>
    </view>
    
    <!-- 搜索框 -->
    <view class="search-box">
      <text class="search-icon">🔍</text>
      <text class="search-placeholder">搜索...</text>
    </view>
    
    <!-- 快捷入口 -->
    <view class="quick-actions">
      <view 
        v-for="item in actions" 
        :key="item.id"
        class="action-item"
      >
        <view class="action-icon" :style="{ background: item.bg }">
          <text>{{ item.icon }}</text>
        </view>
        <text class="action-label">{{ item.label }}</text>
      </view>
    </view>
    
    <!-- 内容列表 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">推荐内容</text>
        <text class="section-more">更多 ›</text>
      </view>
      
      <view class="card" v-for="item in list" :key="item.id">
        <view class="card-cover" :style="{ background: item.gradient }">
          <text class="card-emoji">{{ item.emoji }}</text>
        </view>
        <view class="card-body">
          <text class="card-title">{{ item.title }}</text>
          <view class="card-footer">
            <text class="card-stats">{{ item.stats }}</text>
            <text class="card-price">¥{{ item.price }}</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 底部安全区 -->
    <view class="safe-area-bottom"></view>
  </view>
</template>

<style lang="scss">
.page {
  min-height: 100vh;
  background: var(--color-bg);
  
  .header {
    padding: 16px;
    padding-top: calc(var(--spacing-xl) + env(safe-area-inset-top));
    
    .brand {
      display: flex;
      align-items: baseline;
      gap: 6px;
      
      .brand-name {
        font-size: 22px;
        font-weight: 800;
        color: #fff;
      }
      
      .brand-sub {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
      }
    }
    
    .avatar-wrapper {
      position: relative;
      
      .avatar {
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }
      
      .badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 16px;
        height: 16px;
        background: var(--color-error);
        color: #fff;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }
  
  .search-box {
    margin: -20px 16px 16px;
    padding: 12px 16px;
    background: #fff;
    border-radius: 28px;
    box-shadow: var(--shadow-md);
    display: flex;
    align-items: center;
    gap: 10px;
    
    .search-icon {
      font-size: 16px;
      opacity: 0.5;
    }
    
    .search-placeholder {
      font-size: 14px;
      color: var(--color-text-tertiary);
    }
  }
  
  .quick-actions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    padding: 16px;
    background: #fff;
    margin: 0 16px;
    border-radius: 16px;
    box-shadow: var(--shadow-sm);
    
    .action-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      
      .action-icon {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }
      
      .action-label {
        font-size: 12px;
        color: var(--color-text-secondary);
      }
    }
  }
  
  .section {
    padding: 16px;
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      
      .section-title {
        font-size: 18px;
        font-weight: 700;
        color: var(--color-text-primary);
      }
      
      .section-more {
        font-size: 13px;
        color: var(--color-text-tertiary);
      }
    }
  }
  
  .card {
    margin-bottom: 12px;
    background: #fff;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    
    &:active {
      transform: scale(0.98);
      opacity: 0.9;
    }
    
    .card-cover {
      height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .card-emoji {
        font-size: 48px;
        opacity: 0.7;
      }
    }
    
    .card-body {
      padding: 12px;
      
      .card-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--color-text-primary);
        display: block;
        margin-bottom: 8px;
      }
      
      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .card-stats {
          font-size: 12px;
          color: var(--color-text-tertiary);
        }
        
        .card-price {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-error);
        }
      }
    }
  }
  
  .safe-area-bottom {
    height: calc(env(safe-area-inset-bottom) + 20px);
  }
}
</style>
