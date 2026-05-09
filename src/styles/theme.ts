/**
 * CRM 移动端主题系统
 * 基于 Modern Minimalist + Tech Innovation 风格
 * 专为手机端优化，支持深色模式
 */

// 主题配置
export const theme = {
  // 亮色主题
  light: {
    // 主色
    primary: '#667EEA',          // 主色调 - 优雅紫
    primaryDark: '#5A67D8',
    primaryLight: '#A3BFFA',
    
    // 辅助色
    secondary: '#764BA2',        // 辅助色 - 深紫
    accent: '#F093FB',           // 强调色 - 粉紫
    
    // 功能色
    success: '#34C759',          // 成功 - 绿色
    warning: '#FF9500',          // 警告 - 橙色
    error: '#FF3B30',            // 错误 - 红色
    info: '#007AFF',             // 信息 - 蓝色
    
    // 背景色
    background: '#F5F6FA',       // 页面背景
    backgroundCard: '#FFFFFF',    // 卡片背景
    backgroundHover: '#F0F2F5',  // 悬停背景
    
    // 文字色
    textPrimary: '#1A1A1A',      // 主要文字
    textSecondary: '#666666',     // 次要文字
    textTertiary: '#999999',     // 辅助文字
    textDisabled: '#CCCCCC',      // 禁用文字
    
    // 边框色
    border: '#E8E8E8',
    borderLight: '#F0F0F0',
    
    // 阴影
    shadow: 'rgba(0, 0, 0, 0.08)',
    shadowLight: 'rgba(0, 0, 0, 0.04)',
    
    // 渐变
    gradient: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
    gradientLight: 'linear-gradient(135deg, #A3BFFA 0%, #C4B5FF 100%)',
  },
  
  // 深色主题
  dark: {
    primary: '#818CF8',          // 主色调
    primaryDark: '#667EEA',
    primaryLight: '#A5B4FC',
    
    secondary: '#A78BFA',        // 辅助色
    accent: '#F0ABFC',           // 强调色
    
    success: '#4ADE80',          // 成功
    warning: '#FBBF24',          // 警告
    error: '#F87171',            // 错误
    info: '#38BDF8',             // 信息
    
    background: '#0F172A',       // 页面背景
    backgroundCard: '#1E293B',    // 卡片背景
    backgroundHover: '#334155',   // 悬停背景
    
    textPrimary: '#F8FAFC',      // 主要文字
    textSecondary: '#CBD5E1',     // 次要文字
    textTertiary: '#94A3B8',     // 辅助文字
    textDisabled: '#475569',      // 禁用文字
    
    border: '#334155',
    borderLight: '#475569',
    
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowLight: 'rgba(0, 0, 0, 0.2)',
    
    gradient: 'linear-gradient(135deg, #818CF8 0%, #A78BFA 100%)',
    gradientLight: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  }
}

// 字体配置
export const fonts = {
  // 主字体
  primary: "'PingFang SC', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  
  // 标题字体
  display: "'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif",
  
  // 数字字体
  numeric: "'DIN Alternate', 'Roboto', sans-serif",
  
  // 字号
  sizes: {
    xs: '10px',
    sm: '12px',
    base: '14px',
    md: '15px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '28px',
  },
  
  // 行高
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  }
}

// 间距配置
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
}

// 圆角配置
export const borderRadius = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
  full: '9999px',
}

// 阴影配置
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.07)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
}

// 动画配置
export const transitions = {
  fast: '0.15s ease',
  normal: '0.25s ease',
  slow: '0.35s ease',
}

// 移动端优化配置
export const mobile = {
  // 安全区域
  safeAreaTop: 'env(safe-area-inset-top)',
  safeAreaBottom: 'env(safe-area-inset-bottom)',
  
  // 触摸优化
  touchTarget: '44px',        // Apple 推荐的最小触摸区域
  activeScale: 0.97,          // 点击时的缩放
  activeOpacity: 0.8,          // 点击时的不透明度
  
  // 手势
  swipeThreshold: 50,          // 滑动手势阈值
}

// 断点配置
export const breakpoints = {
  xs: '320px',
  sm: '375px',
  md: '414px',
  lg: '768px',
  xl: '1024px',
}

// 导出完整配置
export default {
  theme,
  fonts,
  spacing,
  borderRadius,
  shadows,
  transitions,
  mobile,
  breakpoints,
}
