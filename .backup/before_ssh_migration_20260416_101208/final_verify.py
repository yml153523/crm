#!/usr/bin/env python3
"""检查PM2状态和API响应"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("120.55.195.40", username="root", password="1qaz@WSX", timeout=30)

print("=== 最终验证 ===\n")

# 1. PM2状态详情
print("1. PM2进程状态:")
stdin, stdout, stderr = ssh.exec_command("pm2 list 2>&1 | grep -E 'crm-server|Status'", timeout=10)
print(stdout.read().decode())

# 2. 最新日志（包括正常和错误）
print("\n2. 最近日志(最后15行):")
stdin, stdout, stderr = ssh.exec_command("pm2 logs crm-server --lines 15 --nostream 2>&1", timeout=10)
output = stdout.read().decode()
if output.strip():
    print(output[-800:])
else:
    print("(无输出)")

# 3. 直接测试端口监听
print("\n3. 端口5011监听状态:")
stdin, stdout, stderr = ssh.exec_command("ss -tlnp | grep 5011 || netstat -tlnp | grep 5011 || echo '未监听'", timeout=5)
print(stdout.read().decode())

# 4. 测试API（带超时）
print("\n4. API测试(10秒超时):")
stdin, stdout, stderr = ssh.exec_command("timeout 10 curl -v http://127.0.0.1:5011/api/health 2>&1 | head -25", timeout=15)
print(stdout.read().decode()[-1000:])

ssh.close()