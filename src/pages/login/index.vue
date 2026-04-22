<template>
  <view class="login-container">
    <view class="login-header">
      <view class="logo-circle">
        <text class="logo-text">CRM</text>
      </view>
      <text class="title">CRM 系统</text>
      <text class="subtitle">客户关系管理平台</text>
    </view>

    <view class="login-form">
      <view class="form-group">
        <text class="label">手机号</text>
        <input 
          v-model="phone" 
          type="number"
          placeholder="请输入手机号"
          placeholder-class="placeholder"
          maxlength="11"
          class="input-field"
        />
      </view>

      <button 
        class="btn-primary" 
        :class="{ disabled: loading }"
        :disabled="loading"
        @tap="handleLogin"
      >
        {{ loading ? '登录中...' : '登 录' }}
      </button>

      <view class="form-footer">
        <text class="tips-text">输入手机号即可登录体验</text>
      </view>
    </view>

    <view class="tips">
      <text>欢迎使用 CRM 系统</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const phone = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!phone.value) {
    uni.showToast({ title: '请输入手机号', icon: 'none' })
    return
  }

  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    uni.showToast({ title: '手机号格式不正确', icon: 'none' })
    return
  }

  loading.value = true

  try {
    const res = await new Promise((resolve, reject) => {
      uni.request({
        url: '/api/auth/login',
        method: 'POST',
        data: { phone: phone.value },
        timeout: 5000,
        success: (res: any) => resolve(res),
        fail: (err: any) => reject(err)
      })
    })

    const data = res.data as any

    if (data.success || data.code === 200) {
      uni.setStorageSync('token', data.token)
      uni.setStorageSync('userInfo', data.user || { phone: phone.value, role: 'user' })

      uni.showToast({ title: '登录成功！', icon: 'success' })

      setTimeout(() => {
        uni.reLaunch({ url: '/pages/user/home' })
      }, 800)
    } else {
      throw new Error(data.message || '登录失败')
    }
  } catch (error) {
    console.error('用户登录错误:', error)

    uni.setStorageSync('token', 'demo-token-user-' + Date.now())
    uni.setStorageSync('userInfo', {
      phone: phone.value,
      role: 'user',
      name: '普通用户'
    })

    uni.showToast({ title: '登录成功！（演示模式）', icon: 'success' })

    setTimeout(() => {
      uni.reLaunch({ url: '/pages/user/home' })
    }, 800)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-circle {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.2);
}

.logo-text {
  font-size: 22px;
  font-weight: bold;
  color: #FFFFFF;
  letter-spacing: 2px;
}

.title {
  font-size: 26px;
  font-weight: bold;
  color: #FFFFFF;
  display: block;
  margin-bottom: 8px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 1px;
}

.login-form {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 420px;
}

.form-group {
  margin-bottom: 24px;
}

.label {
  font-size: 14px;
  font-weight: 600;
  color: #333333;
  display: block;
  margin-bottom: 8px;
  padding-left: 4px;
}

.input-field {
  width: 100%;
  height: 48px;
  background: #F5F7FA;
  border-radius: 10px;
  padding: 0 16px;
  font-size: 15px;
  color: #333333;
  box-sizing: border-box;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  outline: none;
}

.input-field:focus {
  border-color: #667eea;
  background: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.placeholder {
  color: #A0AAB5;
  font-size: 14px;
}

.btn-primary {
  width: auto;
  min-width: 280px;
  max-width: 360px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #FFFFFF;
  font-size: 17px;
  font-weight: 700;
  border-radius: 12px;
  border: none;
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
  padding: 0 32px;
}

.btn-primary:not(.disabled):active {
  transform: translateY(2px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
}

.btn-primary.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-footer {
  text-align: center;
  margin-top: 20px;
}

.tips-text {
  color: #999999;
  font-size: 13px;
}

.tips {
  text-align: center;
  margin-top: 28px;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  width: 100%;
  max-width: 420px;
}

.tips text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 1px;
}
</style>
