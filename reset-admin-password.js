#!/usr/bin/env node
/**
 * 管理员密码重置脚本
 * 将admin用户的密码重置为 123456
 */

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./server/models/User')

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crm'

async function resetAdminPassword() {
  console.log('🔧 开始重置管理员密码...\n')

  try {
    // 连接数据库
    await mongoose.connect(MONGO_URI)
    console.log('✅ 数据库连接成功')

    // 查找admin用户
    const admin = await User.findOne({ phone: 'admin' })

    if (!admin) {
      console.log('⚠️  未找到admin用户，将创建新用户...')

      const hashedPassword = await bcrypt.hash('123456', 10)
      await User.create({
        phone: 'admin',
        password: hashedPassword,
        name: '系统管理员',
        role: 'admin'
      })

      console.log('✅ admin用户创建成功！密码: 123456')
    } else {
      console.log(`📋 找到admin用户 (ID: ${admin._id})`)

      // 重置密码
      const hashedPassword = await bcrypt.hash('123456', 10)
      admin.password = hashedPassword
      await admin.save()

      console.log('✅ 密码重置成功！新密码: 123456')
    }

    console.log('\n🎉 现在可以使用以下凭据登录:')
    console.log('   账号: admin')
    console.log('   密码: 123456')
    console.log('\n💡 提示: 请重启服务器使代码修改生效')

  } catch (error) {
    console.error('❌ 重置失败:', error.message)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    console.log('\n📦 数据库连接已关闭')
  }
}

resetAdminPassword()
