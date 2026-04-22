#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("120.55.195.40", username="root", password="1qaz@WSX", timeout=30)

print("=== 检查后端服务状态和日志 ===")

commands = [
    "pm2 logs crm-server --lines 30 --nostream 2>&1",
    "",
    "echo '---'",
    "curl -s -m 10 http://127.0.0.1:5011/api/health || echo '健康检查失败'",
    "",
    "echo '---'",
    "ls -lh /root/crm/server/routes/user.js /root/crm/server/routes/auditLog.js"
]

for cmd in commands:
    if cmd == "":
        print("")
        continue
    print(f"$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    output = stdout.read().decode()
    err = stderr.read().decode()
    if output:
        print(output[:1000])
    if err:
        print(f"Error: {err[:500]}")

ssh.close()