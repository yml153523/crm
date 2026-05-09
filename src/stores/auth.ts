import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI } from '@/api/auth'

interface UserInfo {
  _id: string
  name: string
  phone: string
  role: string
  avatar?: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(uni.getStorageSync('token') || '')
  const userInfo = ref<UserInfo | null>(uni.getStorageSync('userInfo') || null)
  
  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.role === 'admin' || userInfo.value?.role === 'super_admin')
  
  async function login(phone: string, password: string) {
    const res = await authAPI.login({ phone, password })
    token.value = res.token
    userInfo.value = res.user
    uni.setStorageSync('token', res.token)
    uni.setStorageSync('userInfo', res.user)
    return res
  }
  
  async function adminLogin(phone: string, password: string) {
    const res = await authAPI.adminLogin({ phone, password })
    token.value = res.token
    userInfo.value = res.user
    uni.setStorageSync('token', res.token)
    uni.setStorageSync('userInfo', res.user)
    return res
  }
  
  function logout() {
    token.value = ''
    userInfo.value = null
    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')
    uni.reLaunch({ url: '/pages/login/index' })
  }
  
  function setUserInfo(info: UserInfo) {
    userInfo.value = info
    uni.setStorageSync('userInfo', info)
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    isAdmin,
    login,
    adminLogin,
    logout,
    setUserInfo
  }
})
