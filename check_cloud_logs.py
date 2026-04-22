#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from ssh_utils import quick_ssh, run_cmd, get_ssh_manager

ssh = quick_ssh('production')  # Auto-managed by SSHAutoManager

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