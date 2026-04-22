#!/usr/bin/env python3
import sys
import os

# SSH自动化配置（自动从加密配置文件读取密码）
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scripts'))
from ssh_utils import quick_ssh, run_cmd

ssh = quick_ssh('production')  # Auto-managed by SSHAutoManager

print("=== 强制重启后端服务 ===")

commands = [
    "cd /var/www/crm/server && pm2 stop crm-server 2>/dev/null || echo '未运行'",
