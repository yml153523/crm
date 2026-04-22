#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from ssh_utils import quick_ssh, run_cmd, get_ssh_manager

"""修复后端服务并验证红包API"""
ssh = quick_ssh('production')  # Auto-managed by SSHAutoManager

print("=== 修复后端服务 ===\n")

# 1. 检查文件是否存在
print("1. 检查server.js文件:")
stdin, stdout, stderr = ssh.exec_command("ls -lh /root/crm/server/server.js 2>&1", timeout=10)
print(stdout.read().decode())

# 2. 停止旧进程
print("\n2. 停止旧PM2进程:")
cmds = [
    "cd /root/crm/server && pm2 stop crm-server 2>/dev/null || echo '未运行'",
    "pm2 delete crm-server 2>/dev/null || echo '不存在'",
    "fuser -k 5011/tcp 2>/dev/null || echo '端口空闲'"
]
for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    print(f"  $ {cmd[:50]}...")
    out = stdout.read().decode()[:200]
    if out.strip(): print(f"    {out}")

# 3. 重启服务（使用绝对路径）
print("\n3. 启动后端服务:")
stdin, stdout, stderr = ssh.exec_command("""
cd /root/crm/server && pm2 start server.js --name crm-server && \
sleep 5 && \
pm2 list | grep crm-server && \
echo '' && \
echo '=== 测试健康检查 ===' && \
curl -s http://127.0.0.1:5011/api/health && echo '' && \
echo '' && \
echo '=== 测试红包列表API ===' && \
curl -s -X GET 'http://127.0.0.1:5011/api/admin/red-packets/list?page=1&pageSize=3' \
  -H 'Authorization: Bearer demo-token-admin-test' | head -c 600
""", timeout=30)
output = stdout.read().decode()
print(output[:2000])

ssh.close()
print("\n✅ 修复完成")