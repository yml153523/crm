#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("120.55.195.40", username="root", password="1qaz@WSX", timeout=30)

print("=== 获取完整错误日志 ===")
stdin, stdout, stderr = ssh.exec_command("pm2 logs crm-server --err --lines 50 --nostream 2>&1", timeout=10)
output = stdout.read().decode()
print(output)

print("\n=== 检查server.js前10行 ===")
stdin, stdout, stderr = ssh.exec_command("head -10 /root/crm/server/server.js", timeout=10)
output = stdout.read().decode()
print(output)

print("\n=== 检查node_modules是否存在 ===")
stdin, stdout, stderr = ssh.exec_command("ls /root/crm/server/node_modules | head -20 || echo 'node_modules不存在'", timeout=10)
output = stdout.read().decode()
print(output)

ssh.close()