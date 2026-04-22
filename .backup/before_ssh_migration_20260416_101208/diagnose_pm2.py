#!/usr/bin/env python3
"""诊断PM2启动失败原因"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("120.55.195.40", username="root", password="1qaz@WSX", timeout=30)

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