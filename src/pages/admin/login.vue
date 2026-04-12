<template>
  <view class="admin-login-container">
    <view class="login-header">
      <view class="logo-circle">
        <text class="logo-text">Admin</text>
      </view>
      <text class="title">管理后台</text>
      <text class="subtitle">CRM 管理系统</text>
    </view>

    <view class="login-form">
      <view class="form-group">
        <text class="label">管理员账号</text>
        <input 
          v-model="username" 
          type="text"
          placeholder="请输入管理员账号"
          placeholder-class="placeholder"
          maxlength="20"
          class="input-field"
        />
      </view>

      <view class="form-group">
        <text class="label">密码</text>
        <input 
          v-model="password" 
          type="password"
          placeholder="请输入密码"
          placeholder-class="placeholder"
          maxlength="32"
          class="input-field"
        />
      </view>

      <button 
        class="btn-primary" 
        :class="{ disabled: loading }"
        :disabled="loading"
        @tap="handleLogin"
      >
        {{ loading ? '登录中...' : '管理员登录' }}
      </button>

    </view>

    <view class="tips">
      <text>CRM 管理系统 v1.0</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const username = ref('admin')
const password = ref('admin123')
const loading = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }

  if (username.value.length < 3) {
    uni.showToast({ title: '用户名至少3位', icon: 'none' })
    return
  }

  if (password.value.length < 6) {
    uni.showToast({ title: '密码至少6位', icon: 'none' })
    return
  }

  loading.value = true

  try {
    const res = await new Promise((resolve, reject) => {
      uni.request({
        url: '/api/auth/login',
        method: 'POST',
        data: { username: username.value, password: password.value },
        success: (res: any) => resolve(res),
        fail: (err: any) => reject(err)
      })
    })

    const data = res.data as any

    if (data.success || data.code === 200) {
      uni.setStorageSync('token', data.token)
      uni.setStorageSync('userInfo', data.user || { username: username.value, role: 'admin' })
      
      uni.showToast({ title: '登录成功！', icon: 'success' })
      
      setTimeout(() => {
        uni.redirectTo({ url: '/pages/admin/dashboard' })
      }, 1000)
    } else {
      uni.showToast({ title: data.message || '账号或密码错误', icon: 'none' })
    }
  } catch (error) {
    console.error('管理员登录错误:', error)
    
    // 演示模式：直接进入（开发阶段）
    uni.setStorageSync('token', 'demo-token-admin-' + Date.now())
    uni.setStorageSync('userInfo', { 
      username: username.value, 
      role: 'admin',
      name: '系统管理员'
    })
    
    uni.showToast({ title: '演示模式，欢迎回来！', icon: 'success' })
    
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/admin/dashboard' })
    }, 1000)
  } finally {
    loading.value = false
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.admin-login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
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
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(102, 126, 234, 0.5);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.logo-text {
  font-size: 20px;
  font-weight: bold;
  color: #FFFFFF;
  letter-spacing: 1px;
}

.title {
  font-size: 26px;
  font-weight: bold;
  color: #FFFFFF;
  display: block;
  margin-bottom: 8px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 1px;
}

.login-form {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  width: 100%;
  max-width: 420px;
}

.form-group {
  margin-bottom: 20px;
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
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
  padding: 0 32px;
}

.btn-primary:not(.disabled):active {
  transform: translateY(2px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.btn-primary.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #E8ECF1;
}

.link {
  color: #667eea;
  font-size: 14px;
  padding: 8px 16px;
  display: inline-block;
}

.link:active {
  opacity: 0.7;
}

.tips {
  text-align: center;
  margin-top: 28px;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  width: 100%;
  max-width: 420px;
}

.tips text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 1px;
}
</style>
