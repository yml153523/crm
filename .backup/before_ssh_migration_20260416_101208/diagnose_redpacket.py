#!/usr/bin/env python3
"""诊断红包API 500错误"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("120.55.195.40", username="root", password="1qaz@WSX", timeout=30)

print("=== 红包API错误诊断 ===\n")

# 1. 测试API并获取详细错误
print("1. 测试红包列表API:")
stdin, stdout, stderr = ssh.exec_command("""
curl -s -X GET 'http://127.0.0.1:5011/api/admin/red-packets/list?page=1&pageSize=5' \
  -H 'Authorization: Bearer demo-token-admin-test' \
  -H 'Content-Type: application/json' 2>&1
""", timeout=15)
print(stdout.read().decode()[:800])

# 2. 查看PM2错误日志
print("\n2. PM2最近错误日志:")
stdin, stdout, stderr = ssh.exec_command("pm2 logs crm-server --err --lines 20 --nostream 2>&1 | grep -A10 'red.*packet\\|RedPacket\\|Error' | tail -40", timeout=10)
print(stdout.read().decode()[:1000])

# 3. 检查RedPacket模型是否能正常加载
print("\n3. 测试MongoDB连接和RedPacket集合:")
stdin, stdout, stderr = ssh.exec_command("""
cd /root/crm/server && node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/crm', {useNewUrlParser:true, useUnifiedTopology:true})
.then(async () => {
  const RedPacket = require('./models/RedPacket');
  const count = await RedPacket.countDocuments();
  console.log('RedPacket集合文档数:', count);
  
  const sample = await RedPacket.findOne().lean();
  console.log('示例文档:', JSON.stringify(sample?._id:null));
  
  process.exit(0);
}).catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
})
" 2>&1
""", timeout=20)
print(stdout.read().decode()[:600])

ssh.close()
print("\n✅ 诊断完成")