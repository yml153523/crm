#!/usr/bin/env python3
import paramiko
import os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("120.55.195.40", username="root", password="1qaz@WSX", timeout=30)

REMOTE = "/root/crm/server"
LOCAL = "/home/liuyeming/work/crm/server"

print("=== 创建所有必需目录 ===")
dirs = [
    f"{REMOTE}/services",
    f"{REMOTE}/schedulers",
    f"{REMOTE}/config",
    f"{REMOTE}/uploads/videos"
]

for d in dirs:
    ssh.exec_command(f"mkdir -p {d}")
    print(f"✓ 创建目录: {d}")

import time; time.sleep(1)

print("\n=== 上传services文件 ===")
sftp = ssh.open_sftp()

service_files = [
    "services/ExportService.js",
    "services/CacheService.js",
    "services/WebSocketService.js",
    "services/AutoClaimEngine.js",
    "services/ClaimValidator.js",
    "services/RandomAmountAlgorithm.js",
    "schedulers/RedPacketScheduler.js"
]

for f in service_files:
    local = os.path.join(LOCAL, f)
    remote = f"{REMOTE}/{f}"
    if os.path.exists(local):
        try:
            sftp.put(local, remote)
            print(f"✓ {f}")
        except Exception as e:
            print(f"✗ {f}: {e}")
    else:
        print(f"⚠  {f} 不存在")

sftp.close()

print("\n=== 最终重启 ===")
cmds = [
    f"cd {REMOTE} && pm2 stop crm-server; pm2 delete crm-server; fuser -k 5011/tcp",
    "sleep 3",
    f"cd {REMOTE} && pm2 start server.js --name crm-server",
    "sleep 10",
    "pm2 logs crm-server --err --lines 5 --nostream 2>&1 | grep -i error || echo '无错误'",
    "",
    "echo '=== API测试 ==='",
    "curl -s -m 8 http://127.0.0.1:5011/api/health && echo ' ✅' || echo '❌ 健康检查失败'",
    "",
    "curl -s -m 8 -X POST http://127.0.0.1:5011/api/users -H 'Content-Type: application/json' -d '{\"phone\":\"13300000000\",\"name\":\"success-test\"}' | head -c 300"
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
    if err and 'WARN' not in err:
        print(f"ERR: {err[:400]}")

ssh.close()
print("\n✅ 部署完成！")