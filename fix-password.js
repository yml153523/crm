const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function diagnose() {
  try {
    await mongoose.connect('mongodb://localhost:27017/crm');
    console.log('✅ 数据库连接成功\n');

    const user = await User.findOne({ phone: 'admin' });

    if (!user) {
      console.log('❌ 未找到admin用户，正在创建...');
      const hashedPassword = await bcrypt.hash('123456', 10);
      await User.create({
        phone: 'admin',
        password: hashedPassword,
        name: '系统管理员',
        role: 'admin'
      });
      console.log('✅ admin用户已创建！密码: 123456');
      return;
    }

    console.log('📋 找到admin用户:');
    console.log('- ID:', user._id);
    console.log('- Password hash:', user.password.substring(0, 30) + '...');

    const test123456 = await bcrypt.compare('123456', user.password);
    const testAdmin123 = await bcrypt.compare('admin123', user.password);

    console.log('\n🔐 密码验证:');
    console.log('- 123456 =>', test123456 ? '✅ 匹配' : '❌ 不匹配');
    console.log('- admin123 =>', testAdmin123 ? '✅ 匹配' : '❌ 不匹配');

    if (!test123456) {
      console.log('\n🔧 重置密码为 123456...');
      user.password = await bcrypt.hash('123456', 10);
      await user.save();

      const verify = await bcrypt.compare('123456', user.password);
      console.log('✅ 重置完成！验证结果:', verify ? '✅ 成功' : '❌ 失败');
    }

    console.log('\n🎉 现在可以使用 admin / 123456 登录');

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

diagnose();
