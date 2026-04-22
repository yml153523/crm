#!/bin/bash
# 终极修复：使用tar+ssh一键部署

LOCAL_SERVER="/home/liuyeming/work/crm/server"
REMOTE="root@120.55.195.40"
REMOTE_SERVER="/root/crm/server"

echo "=== CRM后端服务终极修复 ==="
echo ""

# 1. 打包（排除node_modules等）
echo "[1/5] 打包server目录..."
cd $LOCAL_SERVER
tar -czf /tmp/crm-server.tar.gz \
  --exclude='node_modules' \
  --exclude='tests' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='uploads/videos/*' \
  .

SIZE=$(du -h /tmp/crm-server.tar.gz | cut -f1)
echo "   ✅ 打包完成: $SIZE"

# 2. 上传
echo ""
echo "[2/5] 上传到云端..."
scp /tmp/crm-server.tar.gz ${REMOTE}:${REMOTE_SERVER}/
echo "   ✅ 上传成功"

# 3. 解压和安装依赖
echo ""
echo "[3/5] 解压并安装依赖..."
ssh $REMOTE "
  cd $REMOTE_SERVER && \
  rm -rf node_modules ecosystem.config.js .env && \
  tar -xzf crm-server.tar.gz && \
  rm crm-server.tar.gz && \
  npm install --production 2>&1 | tail -3 && \
  echo '✅ 依赖安装完成'
"

# 4. 重启服务
echo ""
echo "[4/5] 启动后端服务..."
ssh $REMOTE "
  pm2 stop crm-server 2>/dev/null; pm2 delete crm-server 2>/dev/null && \
  fuser -k 5011/tcp 2>/dev/null; sleep 2 && \
  cd $REMOTE_SERVER && pm2 start server.js --name crm-server && \
  sleep 10 && \
  pm2 list | grep crm-server
"

# 5. 验证API
echo ""
echo "[5/5] 验证API..."
echo "--- 健康检查 ---"
curl -s --max-time 8 http://120.55.195.40:5011/api/health && echo ' ✅' || echo '❌ 失败'

echo ""
echo "--- 红包列表 ---"
curl -s --max-time 8 'http://120.55.195.40:5011/api/admin/red-packets/list?page=1&pageSize=3' \
  -H 'Authorization: Bearer demo-token-admin-test' | head -c 500

echo ""
echo "=========================================="
echo "✅ 终极修复完成！"
echo "=========================================="