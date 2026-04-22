#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from ssh_utils import quick_ssh, run_cmd, get_ssh_manager

"""补全所有缺失的路由和控制器文件"""
ssh = quick_ssh('production')  # Auto-managed by SSHAutoManager

sftp = ssh.open_sftp()

# 需要上传的所有文件（基于server.js的require列表）
all_required_files = [
    # 路由文件 (routes/)
    "routes/auth.js",
    "routes/video.js",
    "routes/video-watch.js",
    "routes/remind.js",
    "routes/course.js",
    "routes/user.js",
    "routes/statistics.js",
    "routes/product.js",
    "routes/cart.js",
    "routes/order.js",
    "routes/red-packet.js",
    "routes/admin-red-packets.js",
    "routes/admin-red-packets-list.js",
    "routes/admin-red-packets-stats.js",
    "routes/admin-red-packets-export.js",
    "routes/user-red-packets.js",
    "routes/auditLog.js",
    "routes/adminUser.js",

    # 控制器文件 (controllers/) - 可能也需要
    "controllers/authController.js",
    "controllers/videoController.js",
    "controllers/remindController.js",
    "controllers/courseController.js",
    "controllers/orderController.js",
    "controllers/cartController.js",
    "controllers/statisticsController.js",
    "controllers/productController.js",
    "controllers/redPacketController.js",

    # 核心配置
    "server.js",
    "package.json",
    ".env",
]

uploaded = 0
skipped = 0
failed = 0

print("=== 开始补全所有缺失文件 ===\n")

for file_path in all_required_files:
    local_path = os.path.join(LOCAL_SERVER, file_path)
    remote_path = f"{REMOTE_SERVER}/{file_path}"

    if os.path.exists(local_path):
        try:
            # 确保远程目录存在
            remote_dir = os.path.dirname(remote_path)
            try:
                sftp.stat(remote_dir)
            except:
                ssh.exec_command(f"mkdir -p {remote_dir}")

            sftp.put(local_path, remote_path)
            print(f"✓ {file_path}")
            uploaded += 1
        except Exception as e:
            print(f"✗ {file_path} - 错误: {e}")
            failed += 1
    else:
        print(f"⚠ {file_path} - 本地不存在")
        skipped += 1

sftp.close()

print(f"\n=== 上传完成 ===")
print(f"成功: {uploaded}")
print(f"跳过: {skipped} (本地不存在)")
print(f"失败: {failed}")

# 重启服务
print("\n=== 重启后端服务 ===")
commands = [
    f"cd {REMOTE_SERVER} && pm2 stop crm-server 2>/dev/null || true",
    f"cd {REMOTE_SERVER} && pm2 delete crm-server 2>/dev/null || true",
    f"fuser -k 5011/tcp 2>/dev/null || true",
    "sleep 2",
    f"cd {REMOTE_SERVER} && pm2 start server.js --name crm-server",
    "sleep 5",
    "pm2 list | grep crm-server",
    "",
    "echo '=== 验证API ==='",
    "curl -s http://127.0.0.1:5011/api/health"
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
        print(output[:500])
    if err and 'WARN' not in err and 'npm' not in err.lower():
        print(f"Error: {err[:300]}")

ssh.close()
print("\n✓ 完成！")