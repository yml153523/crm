#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from ssh_utils import quick_ssh, run_cmd, get_ssh_manager

"""完整修复：安装依赖+启动服务"""
ssh = quick_ssh('production')  # Auto-managed by SSHAutoManager

print("=== 完整修复后端服务 ===\n")

cmds = [
    # 1. 安装依赖（关键步骤）
    ("cd /root/crm/server && npm install --production 2>&1 | tail -15", "安装npm依赖"),
    
    # 2. 停止旧进程
    ("pm2 stop crm-server 2>/dev/null; pm2 delete crm-server 2>/dev/null", "停止旧进程"),
    
    # 3. 杀死占用端口的进程
    ("fuser -k 5011/tcp 2>/dev/null || echo '端口空闲'", "释放5011端口"),
    
    # 4. 等待端口释放
    ("sleep 3", "等待端口释放"),
    
    # 5. 启动服务
    ("cd /root/crm/server && pm2 start server.js --name crm-server", "启动PM2服务"),
    
    # 6. 等待启动完成
    ("sleep 8", "等待服务启动"),
    
    # 7. 检查状态
    ("pm2 list | grep crm-server", "检查PM2状态"),
    
    # 8. 测试健康检查
    ("curl -s http://127.0.0.1:5011/api/health && echo ' ✅' || echo '❌ 失败'", "测试健康检查API"),
    
    # 9. 测试红包列表API（关键验证）
    ("curl -s 'http://127.0.0.1:5011/api/admin/red-packets/list?page=1&pageSize=3' \
      -H 'Authorization: Bearer demo-token-admin-test' | head -c 500", "测试红包列表API")
]

for cmd, desc in cmds:
    print(f"\n>>> {desc}")
    print(f"$ {cmd[:80]}...")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60 if 'npm install' in cmd else 10)
    output = stdout.read().decode()
    
    if output.strip():
        print(output[-800:])
    
    err = stderr.read().decode()
    if err and 'npm warn' not in err.lower():
        print(f"ERR: {err[:300]}")

ssh.close()

print("\n" + "="*60)
print("✅ 修复完成！")