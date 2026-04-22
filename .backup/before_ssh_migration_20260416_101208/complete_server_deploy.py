#!/usr/bin/env python3
"""终极方案：递归上传整个server目录"""
import paramiko
import os

CLOUD_IP = "120.55.195.40"
REMOTE_BASE = "/root/crm/server"
LOCAL_BASE = "/home/liuyeming/work/crm/server"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(CLOUD_IP, username="root", password="1qaz@WSX", timeout=30)

def upload_recursive(sftp, local_dir, remote_dir):
    """递归上传目录"""
    # 跳过的目录
    skip_dirs = {'node_modules', 'tests', '.git', '__pycache__', 'coverage', '.expo'}

    for item in os.listdir(local_dir):
        if item in skip_dirs:
            continue

        local_path = os.path.join(local_dir, item)
        remote_path = os.path.join(remote_dir, item)

        if os.path.isfile(local_path):
            try:
                sftp.put(local_path, remote_path)
                rel = os.path.relpath(local_path, LOCAL_BASE)
                print(f"✓ {rel}")
            except Exception as e:
                rel = os.path.relpath(local_path, LOCAL_BASE)
                print(f"✗ {rel}: {e}")
        elif os.path.isdir(local_path):
            # 创建远程目录
            ssh.exec_command(f"mkdir -p {remote_dir}")
            import time; time.sleep(0.2)
            upload_recursive(sftp, local_path, remote_path)

print("=== 开始递归上传server目录 ===\n")

sftp = ssh.open_sftp()

# 确保远程基础目录存在
ssh.exec_command(f"mkdir -p {REMOTE_BASE}/{','.join(['controllers','middleware','models','routes','services','schedulers','config','uploads'])}")

import time; time.sleep(1)

# 开始递归上传
upload_recursive(sftp, LOCAL_BASE, REMOTE_BASE)

sftp.close()

print("\n=== 上传完成，重启服务 ===")

cmds = [
    f"cd {REMOTE_BASE} && pm2 stop crm-server 2>/dev/null; pm2 delete crm-server 2>/dev/null",
    f"fuser -k 5011/tcp 2>/dev/null; sleep 2",
    f"cd {REMOTE_BASE} && pm2 start server.js --name crm-server",
    "sleep 10",
    "pm2 list | grep crm-server",
    "",
    "echo '=== 验证API ==='",
    "curl -s http://127.0.0.1:5011/api/health && echo '' || echo 'FAIL'",
    "",
    "echo '=== 测试创建用户 ==='",
    "curl -s -X POST http://127.0.0.1:5011/api/users -H 'Content-Type: application/json' -d '{\"phone\":\"13400000000\",\"name\":\"complete-test\"}' | head -c 300"
]

for cmd in cmds:
    if cmd == "":
        print("")
        continue
    print(f"$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=20)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out[:800])
    if err and 'WARN' not in err and 'npm' not in err.lower():
        print(f"ERR: {err[:400]}")

ssh.close()
print("\n🎉 终极部署完成！")