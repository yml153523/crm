const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/crm_db').then(async () => {
  const db = mongoose.connection.db;
  const users = db.collection('users');
  
  const targetId = '69e97cf43d192bbf6381c6d7';
  
  // Step 1: 查看修复前状态
  const before = await users.findOne({ _id: new mongoose.Types.ObjectId(targetId) });
  console.log('=== 修复前 ===');
  console.log('_id:', before._id);
  console.log('phone:', JSON.stringify(before.phone));
  console.log('name:', JSON.stringify(before.name));
  
  const oldPhone = before.phone;
  const oldName = before.name;
  
  // Step 2: 执行修复 - 对调phone和name
  const result = await users.updateOne(
    { _id: new mongoose.Types.ObjectId(targetId) },
    { $set: { phone: oldName, name: oldPhone } }
  );
  
  console.log('\n=== 执行修复 ===');
  console.log('matchCount:', result.matchedCount);
  console.log('modifiedCount:', result.modifiedCount);
  
  // Step 3: 验证修复后状态
  const after = await users.findOne({ _id: new mongoose.Types.ObjectId(targetId) });
  console.log('\n=== 修复后 ===');
  console.log('_id:', after._id);
  console.log('phone:', JSON.stringify(after.phone));   // 应该是 "133333333333"
  console.log('name:', JSON.stringify(after.name));     // 应该是 "测试会员"
  
  // 验证结果
  if (after.phone === '133333333333' && after.name === '测试会员') {
    console.log('\n✅✅✅ 数据修复成功！phone/name字段已正确对调！');
  } else {
    console.log('\n❌❌❌ 修复失败！数据不符合预期');
  }
  
  // Step 4: 用标准查询验证（模拟remind.js的查找逻辑）
  console.log('\n=== 标准查询验证 ===');
  const byPhone = await users.findOne({ phone: '133333333333' });
  console.log('通过phone="133333333333"查询:', byPhone ? '找到 ✅ (_id=' + byPhone._id + ')' : '未找到 ❌');
  
  const byName = await users.findOne({ name: '测试会员' });
  console.log('通过name="测试会员"查询:', byName ? '找到 ✅ (_id=' + byName._id + ')' : '未找到 ❌');
  
  process.exit(0);
}).catch(e => { 
  console.error('错误:', e.message); 
  process.exit(1); 
});
