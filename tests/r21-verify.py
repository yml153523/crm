#!/usr/bin/env python3
"""R21 API修复验证"""
import subprocess
import json

def api_test(url, token=None):
    cmd = f"curl -s '{url}'"
    if token:
        cmd += f" -H 'Authorization: Bearer {token}'"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    try:
        return json.loads(result.stdout)
    except:
        return {"raw": result.stdout[:200]}

print("╔══════════════════════════════════════════╗")
print("║   🔧 R21: API修复验证                    ║")
print("╚══════════════════════════════════════════╝")

# 1. 登录
login = api_test("http://localhost:5011/api/auth/login -X POST -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'")
token = login.get("data", {}).get("token", "")
print(f"\n[1] 登录: {'✅ 成功' if token else '❌ 失败'}")

# 2. 测试red-packets列表
rp = api_test(f"http://localhost:5011/api/admin/red-packets?page=1&pageSize=5", token)
rp_ok = rp.get("success", False)
print(f"[2] /api/admin/red-packets: {'✅ 列表API正常' if rp_ok else '❌ ' + str(rp.get('message', ''))}")

# 3. 测试statistics/dashboard
dash = api_test(f"http://localhost:5011/api/statistics/dashboard", token)
dash_ok = dash.get("success", False)
if dash_ok:
    keys = list(dash.get("data", {}).get("overview", {}).keys())
    print(f"[3] /api/statistics/dashboard: ✅ 正常 (字段: {', '.join(keys)})")
else:
    print(f"[3] /api/statistics/dashboard: ❌ {dash.get('message', '')}")

# 总结
print("\n" + "="*45)
if rp_ok and dash_ok:
    print("🎉 R21 API修复验证: 全部通过!")
else:
    print("⚠️ 部分API仍需排查")
print("="*45)
