const http = require('http');

function apiPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 5011, path: path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function apiGet(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 5011, path: path, method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // Step 1: 登录获取token
  console.log('=== Step 1: 用户登录 ===');
  const loginRes = await apiPost('/api/auth/login', { phone: '133333333333', password: '123456' });
  console.log('success:', loginRes.success);
  const token = loginRes.data.token;
  console.log('token前30位:', token.substring(0, 30));

  // Step 2: 解码JWT
  console.log('\n=== Step 2: JWT解码 ===');
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  console.log('decoded.id:', payload.id, '(type:', typeof payload.id, ')');
  console.log('decoded.phone:', payload.phone);

  // Step 3: my-reminds API
  console.log('\n=== Step 3: my-reminds API ===');
  const remindsRes = await apiGet('/api/remind/my-reminds', token);
  console.log('success:', remindsRes.success);
  if (remindsRes.data) {
    console.log('reminds数量:', remindsRes.data.list ? remindsRes.data.list.length : 'N/A');
    console.log('unreadCount:', remindsRes.data.unreadCount);
    if (remindsRes.data.list && remindsRes.data.list.length > 0) {
      remindsRes.data.list.slice(0, 3).forEach((r, i) => {
        console.log(`  #${i+1}: ${r.title} | ${r.status}`);
      });
    } else {
      console.log('  ⚠️ 列表为空！');
    }
    console.log('完整data:', JSON.stringify(remindsRes.data).substring(0, 300));
  } else {
    console.log('完整响应:', JSON.stringify(remindsRes).substring(0, 500));
  }

  // Step 4: 直接查数据库
  console.log('\n=== Step 4: 数据库直接查询 ===');
  const mongoose = require('mongoose');
  await mongoose.connect('mongodb://localhost:27017/crm_db');
  const db = mongoose.connection.db;
  const reminds = db.collection('reminds');
  
  const allReminds = await reminds.find({}).sort({ createdAt: -1 }).limit(5).toArray();
  console.log(`reminds集合总记录数: ${await reminds.countDocuments()}`);
  allReminds.forEach((r, i) => {
    const uid = r.userId;
    console.log(`  #${i+1}: userId=${JSON.stringify(uid)} (typeof=${typeof uid}, isObjectId=${uid instanceof mongoose.Types.ObjectId}) title=${r.title}`);
  });

  // Step 5: 模拟my-reminds的查询逻辑
  console.log('\n=== Step 5: 模拟查询逻辑 ===');
  const userIdStr = String(payload.id);
  console.log('userIdStr:', userIdStr);
  
  // 用字符串查询
  const q1 = await reminds.find({ userId: userIdStr }).toArray();
  console.log('字符串查询:', q1.length, '条');
  
  // 用ObjectId查询
  const q2 = await reminds.find({ userId: new mongoose.Types.ObjectId(userIdStr) }).toArray();
  console.log('ObjectId查询:', q2.length, '条');
  
  // 用$or查询
  const q3 = await reminds.find({ 
    $or: [
      { userId: userIdStr },
      { userId: new mongoose.Types.ObjectId(userIdStr) }
    ] 
  }).toArray();
  console.log('$or查询:', q3.length, '条');

  process.exit(0);
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
