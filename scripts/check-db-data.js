const mongoose = require('mongoose');
const path = require('path');

mongoose.connect('mongodb://localhost:27017/crm_db').then(async () => {
  // 直接连接MongoDB，不依赖models文件
  const db = mongoose.connection.db;
  const users = db.collection('users');
  
  // 查找包含 133333333333 的用户文档
  const matched = await users.find({
    $or: [
      { phone: '133333333333' },
      { name: '133333333333' }
    ]
  }).toArray();
  
  console.log('=== 找到 ' + matched.length + ' 个匹配用户 ===');
  matched.forEach((u, i) => {
    console.log('\n--- 用户 #' + (i+1) + ' ---');
    console.log('_id:', u._id);
    console.log('phone:', JSON.stringify(u.phone));
    console.log('name:', JSON.stringify(u.name));
    console.log('role:', u.role);
    console.log('createdAt:', u.createdAt);
  });
  
  // 查看所有用户的phone/name分布
  const allUsers = await users.find({}, {projection: {phone:1, name:1, role:1}}).limit(30).toArray();
  console.log('\n=== 所有用户(前30)的phone/name分布 ===');
  let abnormalCount = 0;
  allUsers.forEach(u => {
    const phoneStr = String(u.phone || '');
    const nameStr = String(u.name || '');
    const phoneLooksLikeName = phoneStr.length > 0 && !/^1\d+$/.test(phoneStr);
    const nameLooksLikePhone = nameStr.length > 0 && /^1\d+$/.test(nameStr);
    
    if (phoneLooksLikeName || nameLooksLikePhone) {
      abnormalCount++;
      console.log('⚠️ 异常#' + abnormalCount + ': _id=' + u._id + ' phone=' + JSON.stringify(u.phone) + ' name=' + JSON.stringify(u.name) + ' role=' + u.role);
    } else {
      console.log('✅ 正常: _id=' + u._id + ' phone=' + JSON.stringify(u.phone) + ' name=' + JSON.stringify(u.name));
    }
  });
  
  // 统计总数
  const totalCount = await users.countDocuments();
  console.log('\n=== 数据库统计 ===');
  console.log('users集合总文档数:', totalCount);
  console.log('异常数据(前30中):', abnormalCount);
  
  process.exit(0);
}).catch(e => { 
  console.error('错误:', e.message); 
  process.exit(1); 
});
