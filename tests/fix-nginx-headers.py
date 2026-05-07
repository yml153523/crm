#!/usr/bin/env python3
"""修复Nginx安全头配置"""
import re

config_path = '/etc/nginx/sites-available/pyn-crm.conf'

with open(config_path, 'r') as f:
    content = f.read()

security_headers = """
    # 安全头 (R24加固)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
"""

# 在每个location块中添加安全头（如果还没有的话）
# 查找 location / { 或 location /api/ { 等模式
pattern = r'(location\s+/\S*\s*\{)'

def add_headers_if_missing(match):
    loc_start = match.group(1)
    return loc_start + security_headers

# 替换所有location块的开头
new_content = re.sub(pattern, add_headers_if_missing, content)

with open(config_path, 'w') as f:
    f.write(new_content)

print("✅ Nginx配置已更新：在所有location块中添加安全头")
