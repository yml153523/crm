#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from ssh_utils import quick_ssh, run_cmd, get_ssh_manager

"""最终修复：上传所有models和controllers文件"""
ssh = quick_ssh('production')  # Auto-managed by SSHAutoManager
sftp = ssh.open_sftp()

# 所有需要上传的文件
files_to_upload = [
    # Models (14个)
    "models/User.js",
    "models/AuditLog.js",
    "models/Course.js",
    "models/Video.js",
    "models/Product.js",
    "models/Order.js",
    "models/Cart.js",
    "models/RedPacket.js",
    "models/RedPacketRecord.js",
    "models/VideoWatch.js",
    "models/Remind.js",
    "models/Payment.js",
    "models/ExportTask.js",
    "models/ClaimFrequencyLog.js",

    # Controllers (已有的+可能需要的)
    "controllers/adminUserController.js",
    "controllers/auditLogController.js",

    # Middleware
    "middleware/auth.js",

    # Config (如果有)
]

print("=== 上传所有Models和Controllers ===\n")

ok = 0
for f in files_to_upload:
    local = os.path.join(LOCAL, f)
    remote = f"{REMOTE}/{f}"
    if os.path.exists(local):
        try:
            # 通过SSH在远程创建目录
            remote_dir = os.path.dirname(remote)
            ssh.exec_command(f"mkdir -p {remote_dir}")
            import time; time.sleep(0.5)  # 等待目录创建完成

            sftp.put(local, remote)
            print(f"✓ {f}")
            ok += 1
        except Exception as e:
            print(f"✗ {f}: {e}")
    else:
        print(f"⚠  {f} 不存在")

sftp.close()
print(f"\n✓ 成功上传 {ok} 个文件\n")

# 重启服务
print("=== 重启后端服务 ===")
cmds = [
    f"cd {REMOTE} && pm2 stop crm-server 2>/dev/null; pm2 delete crm-server 2>/dev/null; fuser -k 5011/tcp 2>/dev/null; sleep 2",
    f"cd {REMOTE} && pm2 start server.js --name crm-server",
    "sleep 8",
    "pm2 list | grep -E 'crm-server|Status'",
    "",
    "echo '=== 最终验证 ==='",
    "curl -s http://127.0.0.1:5011/api/health && echo '' || echo '健康检查失败'",
    "curl -s -X POST http://127.0.0.1:5011/api/users -H 'Content-Type: application/json' -d '{\"phone\":\"13500001111\",\"name\":\"final-test\"}' | head -c 200"
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
        print(out[:600])
    if err and 'WARN' not in err and 'npm' not in err.lower():
        print(f"ERR: {err[:300]}")

ssh.close()
print("\n✅ 完成！")