#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("120.55.195.40", username="root", password="1qaz@WSX", timeout=30)

print("=== 深度诊断后端服务 ===\n")

# 1. 检查进程是否真的在运行
print("1. 检查进程状态:")
stdin, stdout, stderr = ssh.exec_command("ps aux | grep 'node.*server.js' | grep -v grep", timeout=10)
print(stdout.read().decode())

# 2. 检查端口监听
print("\n2. 检查端口5011:")
stdin, stdout, stderr = ssh.exec_command("netstat -tlnp | grep 5011 || ss -tlnp | grep 5011", timeout=10)
print(stdout.read().decode())

# 3. 最新错误日志
print("\n3. 最新错误日志(最后20行):")
stdin, stdout, stderr = ssh.exec_command("pm2 logs crm-server --err --lines 20 --nostream 2>&1", timeout=10)
output = stdout.read().decode()
# 只打印最后几个关键错误
lines = output.split('\n')
for line in lines[-15:]:
    if line.strip():
        print(line)

# 4. 尝试本地curl测试
print("\n4. 本地API测试:")
stdin, stdout, stderr = ssh.exec_command("curl -v -m 5 http://127.0.0.1:5011/api/health 2>&1 | head -20", timeout=10)
print(stdout.read().decode())

# 5. 检查MongoDB连接
print("\n5. MongoDB状态:")
stdin, stdout, stderr = ssh.exec_command("systemctl is-active mongod 2>/dev/null || echo 'MongoDB未安装为服务'", timeout=10)
print(stdout.read().decode())

ssh.close()