#!/usr/bin/env python3
"""
CRM后端代码同步脚本 - 将本地server目录部署到云端服务器
用于修复：POST /api/users 和 /api/audit-logs 接口404问题
"""
import os
import sys

# SSH自动化配置（自动从加密配置文件读取密码）
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scripts'))
from ssh_utils import quick_ssh, run_cmd, get_ssh_manager, upload_directory

PROJECT_DIR = "/home/liuyeming/work/crm"
REMOTE_DIR = "/var/www/crm"

def upload_server_code():
    """上传server目录到云端"""
    print(f"开始同步后端代码到 {CLOUD_IP}...")
    print("=" * 60)

    # 连接SSH（自动化管理，无需手动输入密码）
    try:
        ssh = quick_ssh('production')
        print("✓ SSH连接成功（自动管理）")
    except Exception as e:
        print(f"❌ SSH连接失败：{e}")
        sys.exit(1)

    try:
        # 创建远程server目录
        print("\n=== 准备远程目录 ===")
        commands = [
            f"mkdir -p {REMOTE_DIR}/server",
            f"mkdir -p {REMOTE_DIR}/server/controllers",
            f"mkdir -p {REMOTE_DIR}/server/routes",
            f"mkdir -p {REMOTE_DIR}/server/middleware",
            f"mkdir -p {REMOTE_DIR}/server/models",
            f"mkdir -p {REMOTE_DIR}/server/config",
            f"mkdir -p {REMOTE_DIR}/server/uploads/videos",
        ]

        for cmd in commands:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            output = stdout.read().decode()
            if output:
                print(output)

        # 上传server目录文件
        sftp = ssh.open_sftp()
        server_local = os.path.join(PROJECT_DIR, "server")
        server_remote = f"{REMOTE_DIR}/server"

        print("\n=== 上传server核心文件 ===")

        # 需要上传的关键文件列表
        key_files = [
            ("server.js", "server.js"),
            ("package.json", "package.json"),
            (".env", ".env"),
            ("controllers/adminUserController.js", "controllers/adminUserController.js"),
            ("controllers/userController.js", "controllers/userController.js"),
            ("controllers/courseController.js", "controllers/courseController.js"),
            ("controllers/videoController.js", "controllers/videoController.js"),
            ("controllers/productController.js", "controllers/productController.js"),
            ("controllers/auditLogController.js", "controllers/auditLogController.js"),
            ("routes/user.js", "routes/user.js"),
            ("routes/course.js", "routes/course.js"),
            ("routes/video.js", "routes/video.js"),
            ("routes/product.js", "routes/product.js"),
            ("routes/auditLog.js", "routes/auditLog.js"),
            ("middleware/auth.js", "middleware/auth.js"),
            ("models/User.js", "models/User.js"),
            ("models/Course.js", "models/Course.js"),
            ("config/database.js", "config/database.js"),
        ]

        uploaded_count = 0
        for local_file, remote_file in key_files:
            local_path = os.path.join(server_local, local_file)
            remote_path = f"{server_remote}/{remote_file}"

            if os.path.exists(local_path):
                try:
                    sftp.put(local_path, remote_path)
                    print(f"  ✓ {local_file}")
                    uploaded_count += 1
                except Exception as e:
                    print(f"  ✗ {local_file} - 上传失败: {e}")
            else:
                print(f"  ⚠ {local_file} - 本地文件不存在")

        sftp.close()
        print(f"\n✓ 成功上传 {uploaded_count} 个文件")

        # 安装依赖并重启服务
        print("\n=== 安装依赖并重启服务 ===")
        commands = [
            f"cd {REMOTE_DIR}/server && npm install --production 2>&1 | tail -5",
            f"cd {REMOTE_DIR}/server && pm2 stop crm-server 2>/dev/null || true",
            f"cd {REMOTE_DIR}/server && pm2 delete crm-server 2>/dev/null || true",
            f"cd {REMOTE_DIR}/server && pm2 start server.js --name crm-server",
            "sleep 3",
            "pm2 list | grep crm-server",
            "echo ''",
            "echo '✓ 后端服务重启完成'"
        ]

        for cmd in commands:
            print(f"$ {cmd}")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            output = stdout.read().decode()
            err = stderr.read().decode()
            if output:
                print(output)
            if err and 'npm warn' not in err.lower() and 'pm2' not in err.lower():
                print(f"ERR: {err}")

        print("\n✓ 后端代码同步完成！")
        print(f"  管理端: http://{CLOUD_IP}:8080")
        print(f"  用户端: http://{CLOUD_IP}:8081")
        print(f"  API地址: http://{CLOUD_IP}:5011")

    finally:
        ssh.close()

if __name__ == "__main__":
    upload_server_code()