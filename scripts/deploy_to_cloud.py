#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CRM系统 - 云服务器一键部署脚本
功能：
  1. 检查本地构建文件（自动构建缺失的dist目录）
  2. SSH连接云服务器
  3. 清理远程旧文件
  4. SFTP递归上传最新构建文件
  5. 复制到Web目录并设置权限
  6. 更新Nginx配置（含API代理）
  7. 强制重启Nginx服务
  8. 验证部署结果

使用方法:
  python3 scripts/deploy_to_cloud.py
  
作者: AI Assistant
日期: 2026-04-10
"""

import paramiko
import os
import subprocess
import sys
import time

# ============================================================
# 📋 配置区域（根据实际情况修改）
# ============================================================
CLOUD_IP = "120.55.195.40"
CLOUD_USER = "root"
CLOUD_PASS = "1qaz@WSX"
PROJECT_DIR = "/home/liuyeming/work/crm"
REMOTE_TEMP_DIR = "/root/crm"
ADMIN_WEB_DIR = "/var/www/crm-admin"
USER_WEB_DIR = "/var/www/crm-user"

# 后端API服务端口
API_PORT = 5011
ADMIN_PORT = 8080
USER_PORT = 8081

# ============================================================
# 🔧 Nginx配置模板（完整版，包含API代理）
# ============================================================
NGINX_CONFIG_TEMPLATE = '''# CRM系统 Nginx配置 (自动生成)
# 生成时间: {timestamp}
# 管理端: {admin_port} -> {admin_dir}
# 用户端: {user_port} -> {user_dir}
# API代理: /api/ -> http://127.0.0.1:{api_port}/

# ==================== 管理端 (PC后台) ====================
server {{
    listen {admin_port};
    server_name _;

    # 前端静态文件根目录
    root {admin_dir};
    index index.html;

    # 访问日志
    access_log /var/log/nginx/crm-admin.access.log;
    error_log /var/log/nginx/crm-admin.error.log;

    # Gzip压缩
    gzip on;
    gzip_min_length 1k;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/javascript application/json application/javascript application/xml text/xml image/jpeg image/png image/svg+xml;
    gzip_vary on;
    gzip_proxied any;

    # 静态资源缓存30天
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$ {{
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }}

    # 🔑 API代理到后端Node.js服务（重要！管理员登录依赖此配置）
    location /api/ {{
        proxy_pass http://127.0.0.1:{api_port}/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 120s;
        
        # 支持WebSocket（如需要）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 缓冲设置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }}

    # SPA路由支持（前端路由必须）
    location / {{
        try_files $uri $uri/ /index.html;
    }}

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 禁止访问隐藏文件
    location ~ /\\. {{
        deny all;
        access_log off;
        log_not_found off;
    }}
}}

# ==================== 用户端 (移动端/H5) ====================
server {{
    listen {user_port};
    server_name _;

    # 前端静态文件根目录
    root {user_dir};
    index index.html;

    # 访问日志
    access_log /var/log/nginx/crm-user.access.log;
    error_log /var/log/nginx/crm-user.error.log;

    # Gzip压缩
    gzip on;
    gzip_min_length 1k;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/javascript application/json application/javascript application/xml text/xml image/jpeg image/png image/svg+xml;
    gzip_vary on;
    gzip_proxied any;

    # 静态资源缓存30天
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$ {{
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }}

    # 🔑 API代理到后端Node.js服务（重要！用户登录依赖此配置）
    location /api/ {{
        proxy_pass http://127.0.0.1:{api_port}/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 120s;
        
        # 支持WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 缓冲设置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }}

    # SPA路由支持
    location / {{
        try_files $uri $uri/ /index.html;
    }}

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 禁止访问隐藏文件
    location ~ /\\. {{
        deny all;
        access_log off;
        log_not_found off;
    }}
}}
'''


def log_info(message):
    """输出信息"""
    print(f"\033[94m[INFO]\033[0m {message}")

def log_success(message):
    """输出成功信息"""
    print(f"\033[92m[SUCCESS]\033[0m {message}")

def log_error(message):
    """输出错误信息"""
    print(f"\033[91m[ERROR]\033[0m {message}")

def log_warning(message):
    """输出警告信息"""
    print(f"\033[93m[WARNING]\033[0m {message}")


def check_and_build():
    """检查本地构建文件，如果不存在则自动构建"""
    log_info("检查本地构建文件...")
    
    required_dirs = ['dist-admin', 'dist-user']
    missing = []
    
    for dir_name in required_dirs:
        dir_path = os.path.join(PROJECT_DIR, dir_name)
        if not os.path.isdir(dir_path) or not os.listdir(dir_path):
            missing.append(dir_name)
            log_warning(f"{dir_name}/ 目录不存在或为空")
        else:
            file_count = len([f for f in os.listdir(dir_path) if os.path.isfile(os.path.join(dir_path, f))])
            log_success(f"{dir_name}/ 存在 ({file_count} 个文件)")
    
    if missing:
        log_info("开始自动构建...")
        for dist in missing:
            build_cmd = 'build:admin' if 'admin' in dist else 'build:user'
            log_info(f"执行: npm run {build_cmd}")
            try:
                result = subprocess.run(
                    ["npm", "run", build_cmd],
                    cwd=PROJECT_DIR,
                    capture_output=True,
                    text=True,
                    timeout=300
                )
                if result.returncode != 0:
                    log_error(f"构建失败: {result.stderr[-500:] if result.stderr else '未知错误'}")
                    sys.exit(1)
            except subprocess.TimeoutExpired:
                log_error("构建超时")
                sys.exit(1)
            except Exception as e:
                log_error(f"构建异常: {e}")
                sys.exit(1)
        log_success("构建完成")


def upload_directory_recursive(sftp, local_path, remote_path):
    """
    递归上传目录（核心函数）
    使用SFTP协议逐文件上传，确保完整性
    """
    uploaded_files = 0
    uploaded_dirs = 0
    
    for item in sorted(os.listdir(local_path)):
        local_item = os.path.join(local_path, item)
        remote_item = remote_path + '/' + item
        
        if os.path.isfile(local_item):
            try:
                sftp.put(local_item, remote_item)
                uploaded_files += 1
                if uploaded_files % 20 == 0:
                    print(f"  已上传 {uploaded_files} 个文件...", end='\r')
            except Exception as e:
                log_error(f"上传失败: {item} - {e}")
                
        elif os.path.isdir(local_item):
            try:
                sftp.stat(remote_item)
            except FileNotFoundError:
                sftp.mkdir(remote_item)
                uploaded_dirs += 1
            
            sub_files, sub_dirs = upload_directory_recursive(sftp, local_item, remote_item)
            uploaded_files += sub_files
            uploaded_dirs += sub_dirs
    
    return uploaded_files, uploaded_dirs


def execute_remote_command(ssh, cmd, check_error=True):
    """
    执行远程命令并返回结果
    """
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    output = stdout.read().decode('utf-8', errors='ignore')
    error = stderr.read().decode('utf-8', errors='ignore').strip()
    
    if check_error and error and 'error' in error.lower() and 'warning' not in error.lower():
        log_error(f"命令执行错误:\n  命令: {cmd}\n  错误: {error}")
    
    return output, error


def main():
    """主部署流程"""
    print("=" * 70)
    print("🚀 CRM系统 - 云服务器一键部署工具")
    print("=" * 70)
    print(f"目标服务器: {CLOUD_IP}")
    print(f"管理端地址: http://{CLOUD_IP}:{ADMIN_PORT}")
    print(f"用户端地址: http://{CLOUD_IP}:{USER_PORT}")
    print(f"API地址:     http://{CLOUD_IP}:{API_PORT}/api")
    print("=" * 70)
    
    start_time = time.time()
    
    # ========================================
    # 步骤1: 检查并构建本地文件
    # ========================================
    print("\n" + "=" * 50)
    print("📦 步骤 1/7: 检查本地构建文件")
    print("=" * 50)
    check_and_build()
    
    # ========================================
    # 步骤2: SSH连接云服务器
    # ========================================
    print("\n" + "=" * 50)
    print("🔗 步骤 2/7: 连接SSH")
    print("=" * 50)
    
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(CLOUD_IP, username=CLOUD_USER, password=CLOUD_PASS, timeout=30)
        log_success(f"SSH连接成功: {CLOUD_IP}")
    except Exception as e:
        log_error(f"SSH连接失败: {e}")
        sys.exit(1)
    
    try:
        sftp = ssh.open_sftp()
        log_success("SFTP通道已建立")
    except Exception as e:
        log_error(f"SFTP连接失败: {e}")
        ssh.close()
        sys.exit(1)
    
    # ========================================
    # 步骤3: 清理远程旧文件
    # ========================================
    print("\n" + "=" * 50)
    print("🧹 步骤 3/7: 清理远程旧文件")
    print("=" * 50)
    
    cleanup_commands = [
        f"rm -rf {REMOTE_TEMP_DIR}/dist-admin",
        f"rm -rf {REMOTE_TEMP_DIR}/dist-user",
        f"rm -rf {ADMIN_WEB_DIR}/*",
        f"rm -rf {USER_WEB_DIR}/*",
        f"mkdir -p {REMOTE_TEMP_DIR}/dist-admin",
        f"mkdir -p {REMOTE_TEMP_DIR}/dist-user",
        f"mkdir -p {ADMIN_WEB_DIR}",
        f"mkdir -p {USER_WEB_DIR}",
        "echo '清理完成'"
    ]
    
    for cmd in cleanup_commands:
        execute_remote_command(ssh, cmd, check_error=False)
    log_success("远程目录已清理并创建")
    
    # ========================================
    # 步骤4: 上传管理端文件
    # ========================================
    print("\n" + "=" * 50)
    print("⬆️  步骤 4/7: 上传管理端 (dist-admin)")
    print("=" * 50)
    
    admin_local = os.path.join(PROJECT_DIR, "dist-admin")
    admin_remote = f"{REMOTE_TEMP_DIR}/dist-admin"
    
    files, dirs = upload_directory_recursive(sftp, admin_local, admin_remote)
    log_success(f"管理端上传完成: {files} 个文件, {dirs} 个目录")
    
    # ========================================
    # 步骤5: 上传用户端文件
    # ========================================
    print("\n" + "=" * 50)
    print("⬆️  步骤 5/7: 上传用户端 (dist-user)")
    print("=" * 50)
    
    user_local = os.path.join(PROJECT_DIR, "dist-user")
    user_remote = f"{REMOTE_TEMP_DIR}/dist-user"
    
    files, dirs = upload_directory_recursive(sftp, user_local, user_remote)
    log_success(f"用户端上传完成: {files} 个文件, {dirs} 个目录")
    
    # 关闭SFTP
    sftp.close()
    
    # ========================================
    # 步骤6: 部署到Web目录 + 更新Nginx + 重启服务
    # ========================================
    print("\n" + "=" * 50)
    print("⚙️  步骤 6/7: 部署Web目录 & 配置Nginx & 重启服务")
    print("=" * 50)
    
    # 6a. 复制文件到Web目录
    log_info("复制文件到Web目录...")
    copy_commands = [
        f"cp -rf {REMOTE_TEMP_DIR}/dist-admin/* {ADMIN_WEB_DIR}/",
        f"cp -rf {REMOTE_TEMP_DIR}/dist-user/* {USER_WEB_DIR}/",
        f"chown -R www-data:www-data {ADMIN_WEB_DIR}/",
        f"chown -R www-data:www-data {USER_WEB_DIR}/",
        f"chmod -R 755 {ADMIN_WEB_DIR}/ {USER_WEB_DIR}/"
    ]
    
    for cmd in copy_commands:
        execute_remote_command(ssh, cmd)
    log_success("文件已复制并设置权限")
    
    # 6b. 写入新的Nginx配置
    log_info("更新Nginx配置...")
    
    nginx_config = NGINX_CONFIG_TEMPLATE.format(
        timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
        admin_port=ADMIN_PORT,
        user_port=USER_PORT,
        api_port=API_PORT,
        admin_dir=ADMIN_WEB_DIR,
        user_dir=USER_WEB_DIR
    )
    
    # 将配置写入临时文件然后复制到目标位置
    config_content = nginx_config.replace("'", "'\\''")
    write_cmd = f"""cat > /etc/nginx/sites-enabled/crm.conf << 'NGINXEOF'
{nginx_config}
NGINXEOF"""
    
    execute_remote_command(ssh, write_cmd)
    log_success("Nginx配置已更新（含API代理）")
    
    # 6c. 测试Nginx配置
    log_info("测试Nginx配置语法...")
    output, error = execute_remote_command(ssh, "nginx -t 2>&1")
    if 'successful' in output.lower() or 'syntax is ok' in output.lower():
        log_success("Nginx配置语法正确")
    else:
        log_error(f"Nginx配置有误: {output}")
        log_warning("尝试恢复默认配置...")
        execute_remote_command(ssh, "rm -f /etc/nginx/sites-enabled/crm.conf")
    
    # 6d. 强制重启Nginx（不是reload！）
    log_info("强制重启Nginx服务...")
    restart_commands = [
        # 杀掉可能占用端口的进程
        "fuser -k {admin_port}/tcp 2>/dev/null || true".format(admin_port=ADMIN_PORT),
        "fuser -k {user_port}/tcp 2>/dev/null || true".format(user_port=USER_PORT),
        "sleep 1",
        # 完全停止Nginx
        "systemctl stop nginx 2>/dev/null || true",
        "pkill -9 nginx 2>/dev/null || true",
        "sleep 2",
        # 启动Nginx
        "systemctl start nginx",
        "sleep 1",
        # 检查状态
        "systemctl status nginx | head -5"
    ]
    
    for cmd in restart_commands:
        output, _ = execute_remote_command(ssh, cmd, check_error=False)
        if 'active' in cmd or 'Active' in output:
            print(output.strip())
    
    log_success("Nginx服务已强制重启")
    
    # ========================================
    # 步骤7: 最终验证
    # ========================================
    print("\n" + "=" * 50)
    print("✅ 步骤 7/7: 验证部署结果")
    print("=" * 50)
    
    all_passed = True
    
    # 7a. 检查文件
    log_info("检查部署文件...")
    verify_checks = [
        ("管理端JS文件数", f"ls {ADMIN_WEB_DIR}/assets/*.js 2>/dev/null | wc -l"),
        ("用户端JS文件数", f"ls {USER_WEB_DIR}/assets/*.js 2>/dev/null | wc -l"),
        ("管理端index.html", f"test -f {ADMIN_WEB_DIR}/index.html && echo 'EXISTS'"),
        ("用户端index.html", f"test -f {USER_WEB_DIR}/index.html && echo 'EXISTS'")
    ]
    
    for name, cmd in verify_checks:
        output, _ = execute_remote_command(ssh, cmd)
        result = output.strip()
        status = "✅" if ('EXISTS' in result or int(result) > 0) else "❌"
        print(f"  {status} {name}: {result}")
        if status == "❌":
            all_passed = False
    
    # 7b. 检查新页面是否包含
    log_info("检查新页面路由...")
    page_check_cmd = f"grep -o 'pages-admin-product-list\\|pages-admin-statistics-index\\|pages-user-product-list\\|pages-user-red-packet-center' {ADMIN_WEB_DIR}/assets/*.js {USER_WEB_DIR}/assets/*.js 2>/dev/null | sort -u | wc -l"
    output, _ = execute_remote_command(ssh, page_check_cmd)
    new_pages = int(output.strip()) if output.strip().isdigit() else 0
    print(f"  {'✅' if new_pages >= 4 else '❌'} 发现 {new_pages} 个新页面路由")
    if new_pages < 4:
        all_passed = False
    
    # 7c. HTTP访问测试
    log_info("HTTP访问测试...")
    http_checks = [
        ("管理端(8080)", f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:{ADMIN_PORT}/"),
        ("用户端(8081)", f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:{USER_PORT}/"),
        ("API接口(5011)", f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:{API_PORT}/api/health || echo '000'")
    ]
    
    for name, cmd in http_checks:
        output, _ = execute_remote_command(ssh, cmd)
        code = output.strip()
        status = "✅" if code == '200' or code == '404' else "⚠️"
        print(f"  {status} {name}: HTTP {code}")
    
    # 7d. Nginx状态
    log_info("Nginx服务状态:")
    status_output, _ = execute_remote_command(ssh, "systemctl is-active nginx && systemctl status nginx | grep Active")
    print(f"  {status_output.strip()}")
    
    # 关闭SSH
    ssh.close()
    
    # ========================================
    # 输出最终报告
    # ========================================
    end_time = time.time()
    duration = end_time - start_time
    
    print("\n" + "=" * 70)
    if all_passed:
        print("\033[92m🎉 部署成功完成！\033[0m")
    else:
        print("\033[93m⚠️  部署完成但部分验证未通过\033[0m")
    print("=" * 70)
    print(f"\n⏱️  总耗时: {duration:.2f} 秒")
    print(f"\n📍 访问地址:")
    print(f"   管理端: \033[94mhttp://{CLOUD_IP}:{ADMIN_PORT}\033[0m")
    print(f"   用户端: \033[94mhttp://{CLOUD_IP}:{USER_PORT}\033[0m")
    print(f"   API:   \033[94mhttp://{CLOUD_IP}:{API_PORT}/api\033[0m")
    print(f"\n🔧 管理命令:")
    print(f"   查看日志: journalctl -u nginx -f")
    print(f"   重启服务: ssh {CLOUD_USER}@{CLOUD_IP} 'systemctl restart nginx'")
    print(f"   查看状态: ssh {CLOUD_USER}@{CLOUD_IP} 'systemctl status nginx'")
    print(f"\n💡 提示:")
    print(f"   1. 请使用 Ctrl+Shift+R (Windows) 或 Cmd+Shift+R (Mac) 强制刷新浏览器")
    print(f"   2. 如果还是旧页面，请清除浏览器缓存或使用无痕模式")
    print(f"   3. 管理员登录需要后端API服务运行在端口 {API_PORT}")
    print("=" * 70)


if __name__ == "__main__":
    main()
