#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from ssh_utils import quick_ssh, run_cmd, get_ssh_manager

ssh = quick_ssh('production')  # Auto-managed by SSHAutoManager

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