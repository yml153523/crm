export interface LoginCheckResult {
  isLoggedIn: boolean
  token: string
  userInfo: Record<string, any> | null
  isDemoMode: boolean
}

export function checkLogin(): LoginCheckResult {
  try {
    const token = uni.getStorageSync('token') || ''
    const userInfo = uni.getStorageSync('userInfo') || null
    const isLoggedIn = !!token
    const isDemoMode = typeof token === 'string' && token.startsWith('demo-')

    return { isLoggedIn, token, userInfo, isDemoMode }
  } catch {
    return { isLoggedIn: false, token: '', userInfo: null, isDemoMode: false }
  }
}

export function requireLogin(): boolean {
  const { isLoggedIn } = checkLogin()
  if (!isLoggedIn) {
    uni.showModal({
      title: '请先登录',
      content: '该功能需要登录后才能使用',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/login/index' })
        }
      }
    })
    return false
  }
  return true
}

export function getUserInfo(): Record<string, any> | null {
  try {
    return uni.getStorageSync('userInfo') || null
  } catch {
    return null
  }
}

export function getBalance(): string {
  const userInfo = getUserInfo()
  if (userInfo?.balance !== undefined && userInfo.balance !== null) {
    return Number(userInfo.balance).toFixed(2)
  }
  return '0.00'
}
