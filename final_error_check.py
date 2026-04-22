#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from ssh_utils import quick_ssh, run_cmd, get_ssh_manager

ssh = quick_ssh('production')  # Auto-managed by SSHAutoManager

print("=== 最终错误检查 ===\n")

# 获取最新错误日志
stdin, stdout, stderr = ssh.exec_command("pm2 logs crm-server --err --lines 30 --nostream 2>&1 | grep -A5 'Error\\|Cannot find\\|MODULE_NOT_FOUND' | tail -30", timeout=10)
output = stdout.read().decode()
if output.strip():
    print("发现错误:")
    print(output)
else:
    print("未发现明显错误")

# 检查端口
print("\n=== 端口检查 ===")
stdin, stdout, stderr = ssh.exec_command("ss -tlnp | grep 5011 || netstat -tlnp | grep 5011 || echo '端口5011未监听'", timeout=10)
print(stdout.read().decode())

# 直接测试Node进程是否能正常require
print("\n=== 测试模块加载 ===")
stdin, stdout, stderr = ssh.exec_command("cd /root/crm/server && node -e \"require('./server.js')\" 2>&1 | head -20", timeout=15)
output = stdout.read().decode()
err = stderr.read().decode()
if output:
    print("输出:", output[:500])
if err:
    print("错误:", err[:500])

# 如果还是失败，查看完整日志最后50行
print("\n=== 完整日志(最后30行) ===")
stdin, stdout, stderr = ssh.exec_command("pm2 logs crm-server --lines 30 --nostream 2>&1", timeout=10)
print(stdout.read().decode()[-1500:])

ssh.close()