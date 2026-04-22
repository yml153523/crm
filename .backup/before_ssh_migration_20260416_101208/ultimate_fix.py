#!/usr/bin/env python3
"""终极修复：打包上传整个server目录"""
import paramiko
import os
import tarfile
import io

LOCAL_SERVER = "/home/liuyeming/work/crm/server"
REMOTE_SERVER = "/root/crm/server"
CLOUD_IP = "120.55.195.40"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(CLOUD_IP, username="root", password="1qaz@WSX", timeout=30)
sftp = ssh.open_sftp()

print("=== 终极修复: 完整上传server目录 ===\n")

# 1. 在本地打包server目录（排除node_modules和tests）
print("1. 打包本地server目录...")
tar_path = "/tmp/crm-server.tar.gz"

with tarfile.open(tar_path, "w:gz") as tar:
    for root, dirs, files in os.walk(LOCAL_SERVER):
        # 排除不需要的目录
        dirs[:] = [d for d in dirs if d not in ['node_modules', 'tests', '.git', '__pycache__', 'coverage']]
        
        for file in files:
            local_file = os.path.join(root, file)
            arcname = os.path.relpath(local_file, LOCAL_SERVER)
            
            with open(local_file, 'rb') as f:
                tar.addfile(arcname, f)

print(f"   ✅ 打包完成: {os.path.getsize(tar_path)/1024/1024:.1f} MB")

# 2. 上传到服务器
print("\n2. 上传到云端服务器...")
remote_tar = f"{REMOTE_SERVER}/crm-server.tar.gz"
try:
    sftp.put(tar_path, remote_tar)
    print(f"   ✅ 上传成功")
except Exception as e:
    print(f"   ❌ 上传失败: {e}")
    sftp.close()
    ssh.close()
    exit(1)

sftp.close()

# 3. 在服务器上解压
print("\n3. 解压并安装依赖...")
cmds = [
    f"cd {REMOTE_SERVER} && tar -xzf crm-server.tar.gz",
    f"rm {REMOTE_SERVER}/crm-server.tar.gz",
    "echo '✅ 解压完成'",
    
    # 安装依赖
    f"cd {REMOTE_SERVER} && npm install --production 2>&1 | tail -5",
    
    # 停止旧进程
    "pm2 stop crm-server 2>/dev/null; pm2 delete crm-server 2>/dev/null",
    "fuser -k 5011/tcp 2>/dev/null || true",
    "sleep 3",
    
    # 启动新服务
    f"cd {REMOTE_SERVER} && pm2 start server.js --name crm-server",
    "sleep 10",
    
    # 验证
    "pm2 list | grep crm-server",
    "",
    "echo '=== API测试 ==='",
    "curl -s http://127.0.0.1:5011/api/health && echo '' || echo '❌ 健康检查失败'",
    "",
    "echo '=== 红包列表测试 ==='",
    "curl -s 'http://127.0.0.1:5011/api/admin/red-packets/list?page=1&pageSize=3' \
      -H 'Authorization: Bearer demo-token-admin-test' | head -c 500"
]

for cmd in cmds:
    if cmd == "":
        print("")
        continue
    print(f"$ {cmd[:70]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60 if 'npm install' in cmd else 10)
    output = stdout.read().decode()
    err = stderr.read().decode()
    
    if output.strip():
        lines = output.split('\n')[-8:]
        for line in lines:
            print(f"  {line}")
    if err and 'npm warn' not in err.lower() and 'PM2' not in err:
        print(f"  ERR: {err[:200]}")

ssh.close()

# 清理临时文件
os.remove(tar_path)

print("\n" + "="*60)
print("✅ 终极修复完成！")