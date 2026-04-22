#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from ssh_utils import quick_ssh, run_cmd, get_ssh_manager

"""深度诊断并修复"""
ssh = quick_ssh('production')  # Auto-managed by SSHAutoManager

print("=== 深度诊断 ===\n")

# 1. 获取完整错误信息（包括缺失的模块名）
print("1. 完整错误日志:")
stdin, stdout, stderr = ssh.exec_command("""
cd /root/crm/server && node -e "
try {
  require('./server.js');
} catch(e) {
  console.log('错误类型:', e.code);
  console.log('缺失模块:', e.message);
  console.log('requireStack:');
  e.requireStack.forEach((s, i) => console.log(i, s));
}
" 2>&1 | head -30
""", timeout=15)
print(stdout.read().decode()[-1000:])

# 2. 列出server.js所有require语句
print("\n2. server.js中的所有require:")
stdin, stdout, stderr = ssh.execCommand("grep -n \"^require\\|^const.*=.*require\" /root/crm/server/server.js", timeout=5)
print(stdout.read().decode())

# 3. 检查关键依赖是否安装
print("\n3. 关键依赖检查:")
deps = ['express', 'mongoose', 'cors', 'dotenv', 'bcrypt']
for dep in deps:
    stdin, stdout, stderr = ssh.exec_command(f"ls /root/crm/server/node_modules/{dep}/package.json 2>&1 && echo '✅ {dep}' || echo '❌ {dep} 缺失'", timeout=3)
    print(stdout.read().decode().strip())

ssh.close()