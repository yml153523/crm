#!/usr/bin/env python3
import os
import subprocess
import sys

# SSH自动化配置（自动从加密配置文件读取密码）
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scripts'))
from ssh_utils import quick_ssh, run_cmd, get_ssh_manager, deploy_frontend

PROJECT_DIR = "/home/liuyeming/work/crm"
REMOTE_DIR = "/var/www/crm"

def check_local_files():
    """检查本地必要文件是否存在"""
    print("=== 检查本地文件 ===")
    
    required_dirs = ['dist-admin', 'dist-user']
    missing = []
    
    for dir_name in required_dirs:
        dir_path = os.path.join(PROJECT_DIR, dir_name)
        if not os.path.isdir(dir_path):
            missing.append(dir_name)
            print(f"  ❌ {dir_name}/ 目录不存在")
        else:
            print(f"  ✓ {dir_name}/ 目录存在")
 
    if missing:
        print(f"\n错误：缺少必要的目录：{', '.join(missing)}")
        print("正在自动构建前端...")
        try:
            subprocess.run(["npm", "run", "build:admin"], check=True)
            subprocess.run(["npm", "run", "build:user"], check=True)
        except subprocess.CalledProcessError:
            print("\n构建失败，请手动执行：npm run build:admin && npm run build:user")
            sys.exit(1)

        return True 

def upload_directory(sftp, local_dir, remote_dir, skip_node_modules_at_root=True, skip_media_files=True, skip_node_modules_anywhere=True):
    """递归上传目录"""
    print(f"处理：{os.path.basename(local_dir)} -> {remote_dir}")
    
    # 确保远程目录存在
    try:
        sftp.stat(remote_dir)
    except:
        sftp.mkdir(remote_dir)
    
    # 只在项目根目录跳过的目录
    root_skip_dirs = ['.git', 'node_modules', '__pycache__', '.expo', 'coverage', 'temp-chunks']
    
    # 所有目录都跳过的目录（仅在skip_node_modules_anywhere=True时）
    all_skip_dirs = ['node_modules'] if skip_node_modules_anywhere else []
    
    # 跳过的文件扩展名（仅在后端代码中跳过）
    skip_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.zip', '.tar', '.gz'] if skip_media_files else ['.zip', '.tar', '.gz']
    
    # 遍历本地目录
    for item in os.listdir(local_dir):
        # 如果是根目录，跳过特定目录
        if skip_node_modules_at_root and item in root_skip_dirs:
            print(f"  跳过：{item}")
            continue
        
        # 在所有目录中都跳过 node_modules（仅在需要时）
        if item in all_skip_dirs:
            print(f"  跳过：{item}")
            continue
        
        # 跳过特定扩展名的文件
        _, ext = os.path.splitext(item)
        if ext.lower() in skip_extensions:
            print(f"  跳过：{item}")
            continue
            
        local_path = os.path.join(local_dir, item)
        remote_path = os.path.join(remote_dir, item)
        
        if os.path.isfile(local_path):
            print(f"  上传：{item}")
            sftp.put(local_path, remote_path)
        else:
            # 递归上传子目录，不再跳过根目录特定的目录
            upload_directory(sftp, local_path, remote_path, skip_node_modules_at_root=False, skip_media_files=skip_media_files, skip_node_modules_anywhere=skip_node_modules_anywhere)

def execute_command(ssh, cmd):
    """执行远程命令并输出结果"""
    print(f"$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    output = stdout.read().decode()
    if output:
        print(output)
    err = stderr.read().decode()
    if err and err.strip():
        print(f"ERR: {err}")
    return output, err

def main():
    print(f"开始部署到 {CLOUD_IP}...")
    print("=" * 60)
    
    # 1. 检查本地文件
    check_local_files()
    
    # 2. 连接SSH（自动化管理，无需手动输入密码）
    print("\n=== 连接到云端服务器 ===")
    try:
        ssh = quick_ssh('production')
        print("✓ SSH连接成功（自动管理）")
    except Exception as e:
        print(f"❌ SSH连接失败：{e}")
        sys.exit(1)
    
    try:
        # 3. 清除云上旧的 crm 目录
        print("\n=== 清除云上旧目录 ===")
        commands = [
            "echo '清除旧的 /root/crm 目录...'",
            "rm -rf /root/crm",
            "mkdir -p /root/crm",
            "echo '清除旧的 web 目录...'",
            "rm -rf /var/www/crm-admin/*",
            "rm -rf /var/www/crm-user/*",
            "mkdir -p /var/www/crm-admin",
            "mkdir -p /var/www/crm-user"
        ]
        
        for cmd in commands:
            execute_command(ssh, cmd)
        
        # 4. 上传文件
        sftp = ssh.open_sftp()
        
        print("\n=== 上传 dist-admin ===")
        upload_directory(sftp, f"{PROJECT_DIR}/dist-admin", f"{REMOTE_DIR}/dist-admin", skip_media_files=False, skip_node_modules_anywhere=False)
        
        print("\n=== 上传 dist-user ===")
        upload_directory(sftp, f"{PROJECT_DIR}/dist-user", f"{REMOTE_DIR}/dist-user", skip_media_files=False, skip_node_modules_anywhere=False)
        
        # 5. 复制文件到 web 目录并重启服务
        print("\n=== 部署到 Web 目录 ===")
        commands = [
            "cp -r /root/crm/dist-admin/* /var/www/crm-admin/",
            "cp -r /root/crm/dist-user/* /var/www/crm-user/",
            "chown -R nginx:nginx /var/www/crm-admin/ 2>/dev/null || true",
            "chown -R nginx:nginx /var/www/crm-user/ 2>/dev/null || true",
            "chmod -R 755 /var/www/crm-admin/",
            "chmod -R 755 /var/www/crm-user/",
            "nginx -t 2>/dev/null || true",
            "systemctl reload nginx 2>/dev/null || true"
        ]
        
        for cmd in commands:
            execute_command(ssh, cmd)
        
        print("\n✓ 部署完成！")
        print(f"  管理端: http://{CLOUD_IP}:8080")
        print(f"  用户端: http://{CLOUD_IP}:8081")
        
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
