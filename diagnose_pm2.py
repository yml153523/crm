#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from ssh_utils import quick_ssh, run_cmd, get_ssh_manager

"""诊断PM2启动失败原因"""
ssh = quick_ssh('production')  # Auto-managed by SSHAutoManager

print("=== PM2启动失败诊断 ===\n")

# 1. 查看详细错误日志
print("1. PM2错误日志(最后30行):")
stdin, stdout, stderr = ssh.exec_command("pm2 logs crm-server --err --lines 30 --nostream 2>&1", timeout=10)
output = stdout.read().decode()
print(output[-1500:])

# 2. 手动测试Node能否加载server.js
print("\n2. 手动测试server.js:")
stdin, stdout, stderr = ssh.exec_command("""
cd /root/crm/server && timeout 8 node server.js 2>&1 | head -50 || echo '---进程超时或退出---'
""", timeout=15)
output = stdout.read().decode()
print(output[-1200:])

# 3. 检查依赖是否安装
print("\n3. 检查node_modules:")
stdin, stdout, stderr = ssh.exec_command("ls /root/crm/server/node_modules/.package-lock.json 2>&1 && echo '依赖已安装' || echo '依赖未安装'", timeout=5)
print(stdout.read().decode())

ssh.close()