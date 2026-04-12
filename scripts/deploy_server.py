#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CRM后端API服务器部署脚本
功能：上传server目录到云端、安装依赖、启动服务
"""

import paramiko
import os
import sys
from pathlib import Path

# 服务器配置
HOST = '120.55.195.40'
USER = 'root'
PASS = '1qaz@WSX'
REMOTE_PATH = '/root/crm/server'

def create_ssh_client():
    """创建SSH连接"""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f'正在连接到 {HOST}...')
    ssh.connect(HOST, username=USER, password=PASS)
    print('✓ SSH连接成功')
    return ssh

def upload_files(sftp, local_path: str, remote_path: str):
    """上传文件或目录"""
    local = Path(local_path)
    
    # 确保远程父目录存在
    try:
        sftp.stat(remote_path)
    except:
        try:
            sftp.mkdir(remote_path)
        except:
            pass
    
    if local.is_file():
        print(f'  上传文件: {local.name}')
        try:
            sftp.put(str(local), f'{remote_path}/{local.name}')
        except Exception as e:
            print(f'  ⚠ 上传失败 {local.name}: {e}')
    elif local.is_dir():
        try:
            sftp.stat(f'{remote_path}/{local.name}')
        except:
            try:
                sftp.mkdir(f'{remote_path}/{local.name}')
            except:
                pass
        
        for item in local.iterdir():
            if item.name == 'node_modules' or item.name == 'uploads':
                continue
            try:
                upload_files(sftp, str(item), f'{remote_path}/{local.name}')
            except Exception as e:
                print(f'  ⚠ 跳过 {item.name}: {e}')

def main():
    print('=' * 60)
    print('=== CRM 后端 API 服务部署脚本 ===')
    print('=' * 60)
    
    # 检查本地文件
    server_dir = Path(__file__).parent.parent / 'server'
    if not server_dir.exists():
        print(f'❌ 错误: {server_dir} 目录不存在')
        sys.exit(1)
    
    package_json = server_dir / 'package.json'
    if not package_json.exists():
        print(f'❌ 错误: {package.json} 不存在')
        sys.exit(1)
    
    print(f'\n✓ 本地检查通过')
    print(f'  Server目录: {server_dir}')
    
    # 连接服务器
    ssh = create_ssh_client()
    sftp = ssh.open_sftp()
    
    # 创建远程目录
    print('\n=== 准备远程环境 ===')
    stdin, stdout, stderr = ssh.exec_command(f'mkdir -p {REMOTE_PATH} && mkdir -p {REMOTE_PATH}/uploads/videos')
    stdout.read()
    print(f'✓ 远程目录已创建: {REMOTE_PATH}')
    
    # 上传文件（排除 node_modules）
    print('\n=== 上传后端代码 ===')
    exclude_dirs = ['node_modules', 'uploads', '.git']
    for item in server_dir.iterdir():
        if item.name not in exclude_dirs:
            upload_files(sftp, str(item), REMOTE_PATH)
    print('✓ 文件上传完成')
    
    sftp.close()
    
    # 安装依赖
    print('\n=== 安装Node.js依赖 ===')
    stdin, stdout, stderr = ssh.exec_command(
        f'cd {REMOTE_PATH} && npm install --production 2>&1',
        timeout=300
    )
    output = stdout.read().decode()
    error = stderr.read().decode()
    
    if error and 'ERR!' in error:
        print(f'⚠ npm install 警告:\n{error[-500:]}')
    else:
        print('✓ 依赖安装完成')
    
    # 安装PM2（如果没有）
    print('\n=== 检查/安装 PM2 ===')
    stdin, stdout, stderr = ssh.exec_command('which pm2 || npm install -g pm2')
    stdout.read()
    print('✓ PM2 已就绪')
    
    # 停止旧进程（如果有），统一使用 crm-backend 名称
    print('\n=== 重启后端服务 ===')
    stdin, stdout, stderr = ssh.exec_command(f'''
pm2 delete crm-server 2>/dev/null
pm2 delete crm-backend 2>/dev/null
cd {REMOTE_PATH} && pm2 start server.js --name crm-backend 2>&1
''')
    output = stdout.read().decode()
    print(output)
    
    # 保存PM2配置
    stdin, stdout, stderr = ssh.exec_command('pm2 save')
    stdout.read()
    print('✓ PM2 配置已保存')
    
    # 更新Nginx配置
    print('\n=== 更新Nginx配置 ===')
    nginx_conf_local = str(Path(__file__).parent.parent / 'deploy' / 'nginx-crm-api.conf')
    nginx_conf_remote = '/etc/nginx/conf.d/crm-api.conf'
    
    sftp = ssh.open_sftp()
    try:
        sftp.put(nginx_conf_local, '/tmp/nginx-crm-api.conf')
        print('✓ Nginx配置已上传')
    except Exception as e:
        print(f'⚠ 上传Nginx配置失败: {e}')
    finally:
        sftp.close()
    
    # 应用Nginx配置
    stdin, stdout, stderr = ssh.exec_command(
        f'cp /tmp/nginx-crm-api.conf {nginx_conf_remote} && nginx -t 2>&1 && systemctl reload nginx 2>&1'
    )
    output = stdout.read().decode()
    error = stderr.read().decode()
    
    if 'successful' in output or 'OK' in output:
        print('✓ Nginx配置已更新并重载')
    else:
        print(f'⚠ Nginx警告:\n{output}\n{error}')
    
    # 测试API健康检查
    print('\n=== 验证服务状态 ===')
    import time
    time.sleep(2)  # 等待服务启动
    
    stdin, stdout, stderr = ssh.exec_command('curl -s http://127.0.0.1:5011/api/health 2>&1 || echo "服务未响应"')
    health_check = stdout.read().decode().strip()
    
    if 'success' in health_check or '运行正常' in health_check:
        print(f'✅ 后端API服务运行正常!')
        print(f'   响应: {health_check}')
    else:
        print(f'⚠️ 服务可能还在启动中...')
        print(f'   请稍后访问 http://{HOST}:8080/api/health 检查')
    
    # 显示访问信息
    print('\n' + '=' * 60)
    print('🎉 部署完成！')
    print('=' * 60)
    print(f'\n📍 访问地址:')
    print(f'   管理后台:   http://{HOST}:8080')
    print(f'   用户前端:   http://{HOST}:8081')
    print(f'   API接口:   http://{HOST}:8080/api/health')
    print(f'   API文档:')
    print(f'     - POST   /api/auth/login      (登录)')
    print(f'     - GET    /api/videos          (视频列表)')
    print(f'     - POST   /api/videos/upload   (上传视频)')
    print(f'     - DELETE /api/videos/:id       (删除视频)')
    print(f'     - GET    /api/remind/history  (提醒历史)')
    print(f'     - POST   /api/remind/send     (发送提醒)')
    print(f'     - GET    /api/courses         (课程列表)')
    print(f'     - GET    /api/users            (用户列表)')
    print(f'\n📝 默认账号: admin / admin123')
    print(f'\n💡 管理命令:')
    print(f'   pm2 logs crm-server     (查看日志)')
    print(f'   pm2 restart crm-server  (重启服务)')
    print(f'   pm2 stop crm-server     (停止服务)')
    print('=' * 60)
    
    ssh.close()

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'\n❌ 部署失败: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)
