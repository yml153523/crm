#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
红包管理功能完整测试脚本
========================
测试范围：
1. 后端API功能验证（列表/创建/编辑/删除/发布/暂停）
2. 前端页面可访问性检查
3. 路由顺序修复验证
4. 业务逻辑完整性测试

作者: AI Assistant
日期: 2026-04-16
"""

import requests
import json
import sys
from datetime import datetime, timedelta

class RedPacketTester:
    def __init__(self):
        self.base_url = "http://120.55.195.40:5011"
        self.admin_base = "http://120.55.195.40:8080"
        self.token = "demo-token-admin-super"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.test_results = []
        self.created_packet_id = None

    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """记录测试结果"""
        status = "✅ PASS" if passed else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        print(f"{status} | {test_name}")
        if details:
            print(f"     └─ {details}")

    def test_01_health_check(self):
        """测试1: 后端健康检查"""
        try:
            resp = requests.get(f"{self.base_url}/api/health", timeout=5)
            passed = resp.status_code == 200 and resp.json().get("success") == True
            self.log_test(
                "后端服务健康检查",
                passed,
                f"HTTP {resp.status_code} - {resp.json().get('message', 'N/A')}"
            )
        except Exception as e:
            self.log_test("后端服务健康检查", False, str(e))

    def test_02_red_packet_list_api(self):
        """测试2: 红包列表API（核心Bug修复验证）"""
        try:
            # 这是之前报500错误的接口，现在应该返回200
            resp = requests.get(
                f"{self.base_url}/api/admin/red-packets/list",
                params={"page": 1, "pageSize": 10},
                headers=self.headers,
                timeout=10
            )

            if resp.status_code == 200:
                data = resp.json()
                passed = data.get("success") == True and "data" in data
                summary = data.get("data", {}).get("summary", {})
                self.log_test(
                    "红包列表API (GET /list)",
                    passed,
                    f"HTTP 200 | 总数:{summary.get('totalCount', 'N/A')} 活动:{summary.get('activeCount', 0)}"
                )
            else:
                self.log_test(
                    "红包列表API (GET /list)",
                    False,
                    f"HTTP {resp.status_code} - {resp.text[:100]}"
                )
        except Exception as e:
            self.log_test("红包列表API (GET /list)", False, str(e))

    def test_03_create_red_packet(self):
        """测试3: 创建红包"""
        try:
            payload = {
                "title": f"测试红包_{datetime.now().strftime('%H%M%S')}",
                "description": "自动化测试创建的红包",
                "type": "random",
                "totalAmount": 100.00,
                "totalCount": 10,
                "validityType": "7d"
            }

            resp = requests.post(
                f"{self.base_url}/api/admin/red-packets",
                json=payload,
                headers=self.headers,
                timeout=10
            )

            if resp.status_code in [200, 201]:
                data = resp.json()
                if data.get("success"):
                    self.created_packet_id = data.get("data", {}).get("_id")
                    packet_title = data.get("data", {}).get("title", "N/A")
                    self.log_test(
                        "创建红包 (POST /)",
                        True,
                        f"ID: {self.created_packet_id[:8]}... | 标题: {packet_title}"
                    )
                else:
                    self.log_test("创建红包 (POST /)", False, data.get("message", "未知错误"))
            else:
                self.log_test(
                    "创建红包 (POST /)",
                    False,
                    f"HTTP {resp.status_code} - {resp.text[:150]}"
                )
        except Exception as e:
            self.log_test("创建红包 (POST /)", False, str(e))

    def test_04_get_packet_detail(self):
        """测试4: 获取红包详情"""
        if not self.created_packet_id:
            self.log_test("获取红包详情 (GET /:id)", False, "跳过：无可用红包ID")
            return

        try:
            resp = requests.get(
                f"{self.base_url}/api/admin/red-packets/{self.created_packet_id}",
                headers=self.headers,
                timeout=10
            )

            if resp.status_code == 200:
                data = resp.json()
                passed = data.get("success") and data.get("data", {}).get("_id") == self.created_packet_id
                self.log_test(
                    "获取红包详情 (GET /:id)",
                    passed,
                    f"标题: {data.get('data', {}).get('title', 'N/A')}"
                )
            else:
                self.log_test(
                    "获取红包详情 (GET /:id)",
                    False,
                    f"HTTP {resp.status_code}"
                )
        except Exception as e:
            self.log_test("获取红包详情 (GET /:id)", False, str(e))

    def test_05_update_packet(self):
        """测试5: 更新红包信息"""
        if not self.created_packet_id:
            self.log_test("更新红包 (PUT /:id)", False, "跳过：无可用红包ID")
            return

        try:
            payload = {
                "description": "更新后的描述 - 测试修改时间: " + datetime.now().strftime("%H:%M:%S")
            }

            resp = requests.put(
                f"{self.base_url}/api/admin/red-packets/{self.created_packet_id}",
                json=payload,
                headers=self.headers,
                timeout=10
            )

            if resp.status_code == 200:
                data = resp.json()
                self.log_test(
                    "更新红包 (PUT /:id)",
                    data.get("success"),
                    data.get("message", "N/A")
                )
            else:
                self.log_test(
                    "更新红包 (PUT /:id)",
                    False,
                    f"HTTP {resp.status_code}"
                )
        except Exception as e:
            self.log_test("更新红包 (PUT /:id)", False, str(e))

    def test_06_publish_packet(self):
        """测试6: 发布红包活动"""
        if not self.created_packet_id:
            self.log_test("发布红包 (PUT /:id/publish)", False, "跳过：无可用红包ID")
            return

        try:
            resp = requests.put(
                f"{self.base_url}/api/admin/red-packets/{self.created_packet_id}/publish",
                headers=self.headers,
                timeout=10
            )

            if resp.status_code == 200:
                data = resp.json()
                self.log_test(
                    "发布红包 (PUT /:id/publish)",
                    data.get("success"),
                    data.get("message", "N/A")
                )
            elif resp.status_code == 400:
                # 可能缺少触发规则配置
                self.log_test(
                    "发布红包 (PUT /:id/publish)",
                    False,
                    f"HTTP 400 - {resp.json().get('message', '可能需要先配置触发规则')}"
                )
            else:
                self.log_test(
                    "发布红包 (PUT /:id/publish)",
                    False,
                    f"HTTP {resp.status_code}"
                )
        except Exception as e:
            self.log_test("发布红包 (PUT /:id/publish)", False, str(e))

    def test_07_list_with_filters(self):
        """测试7: 列表筛选功能"""
        try:
            # 测试状态筛选
            resp = requests.get(
                f"{self.base_url}/api/admin/red-packets/list",
                params={"page": 1, "pageSize": 5, "status": "draft"},
                headers=self.headers,
                timeout=10
            )

            if resp.status_code == 200:
                data = resp.json()
                passed = data.get("success") == True
                list_count = len(data.get("data", {}).get("list", []))
                self.log_test(
                    "列表筛选 (status=draft)",
                    passed,
                    f"找到 {list_count} 个草稿红包"
                )
            else:
                self.log_test("列表筛选 (status=draft)", False, f"HTTP {resp.status_code}")

            # 测试关键词搜索
            resp2 = requests.get(
                f"{self.base_url}/api/admin/red-packets/list",
                params={"page": 1, "pageSize": 5, "keyword": "测试"},
                headers=self.headers,
                timeout=10
            )

            if resp2.status_code == 200:
                data2 = resp2.json()
                search_count = len(data2.get("data", {}).get("list", []))
                self.log_test(
                    "关键词搜索 (keyword=测试)",
                    data2.get("success"),
                    f"找到 {search_count} 个匹配结果"
                )
        except Exception as e:
            self.log_test("列表筛选功能", False, str(e))

    def test_08_delete_packet(self):
        """测试8: 删除红包（清理测试数据）"""
        if not self.created_packet_id:
            self.log_test("删除红包 (DELETE /:id)", False, "跳过：无可用红包ID")
            return

        try:
            # 先尝试将状态改回draft（如果是active状态）
            requests.put(
                f"{self.base_url}/api/admin/red-packets/{self.created_packet_id}",
                json={"status": "draft"},
                headers=self.headers,
                timeout=5
            )

            resp = requests.delete(
                f"{self.base_url}/api/admin/red-packets/{self.created_packet_id}",
                headers=self.headers,
                timeout=10
            )

            if resp.status_code == 200:
                data = resp.json()
                self.log_test(
                    "删除红包 (DELETE /:id) [清理]",
                    data.get("success"),
                    data.get("message", "N/A")
                )
            else:
                self.log_test(
                    "删除红包 (DELETE /:id) [清理]",
                    False,
                    f"HTTP {resp.status_code} - {resp.text[:100]}"
                )
        except Exception as e:
            self.log_test("删除红包 (DELETE /:id) [清理]", False, str(e))

    def test_09_frontend_page_access(self):
        """测试9: 前端页面可访问性"""
        try:
            # 测试管理后台首页
            resp = requests.get(f"{self.admin_base}", timeout=10)
            admin_ok = resp.status_code == 200

            # 测试静态资源是否存在（检查新的红包页面JS是否在构建产物中）
            # 这里我们只验证主页面可访问，具体路由由前端处理
            self.log_test(
                "前端管理后台可访问",
                admin_ok,
                f"HTTP {resp.status_code} | 页面大小: {len(resp.content)} bytes"
            )
        except Exception as e:
            self.log_test("前端管理后台可访问", False, str(e))

    def test_10_route_order_validation(self):
        """测试10: 路由顺序修复验证（关键测试）"""
        """
        验证Express路由挂载顺序：
        - /api/admin/red-packets/list 必须在 /api/admin/red-packets/:id 之前
        - 否则 "list" 会被当作 :id 参数导致500错误
        """
        try:
            # 测试1: 正常的列表请求（这是之前失败的用例）
            resp1 = requests.get(
                f"{self.base_url}/api/admin/red-packets/list",
                headers=self.headers,
                timeout=10
            )

            list_ok = resp1.status_code == 200

            # 测试2: 使用一个无效ID（模拟之前的bug场景）
            resp2 = requests.get(
                f"{self.base_url}/api/admin/packets/list",  # 故意错误路径
                headers=self.headers,
                timeout=5
            )

            # 主要验证列表接口正常工作
            self.log_test(
                "路由顺序修复验证 (核心Bug修复)",
                list_ok,
                f"列表接口 HTTP {resp1.status_code} {'✅ 不再被/:id拦截' if list_ok else '❌ 仍存在问题'}"
            )
        except Exception as e:
            self.log_test("路由顺序修复验证", False, str(e))

    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*70)
        print("🧪 CRM系统 - 红包管理功能完整测试")
        print("="*70)
        print(f"📅 测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🌐 后端地址: {self.base_url}")
        print(f"🖥️  前端地址: {self.admin_base}")
        print("-"*70 + "\n")

        # 执行所有测试
        self.test_01_health_check()
        print()
        self.test_02_red_packet_list_api()
        print()
        self.test_03_create_red_packet()
        print()
        self.test_04_get_packet_detail()
        print()
        self.test_05_update_packet()
        print()
        self.test_06_publish_packet()
        print()
        self.test_07_list_with_filters()
        print()
        self.test_08_delete_packet()
        print()
        self.test_09_frontend_page_access()
        print()
        self.test_10_route_order_validation()

        # 生成报告
        self.generate_report()

    def generate_report(self):
        """生成测试报告"""
        print("\n" + "="*70)
        print("📊 测试结果汇总")
        print("="*70)

        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if "✅" in r["status"])
        failed = total - passed
        pass_rate = (passed / total * 100) if total > 0 else 0

        print(f"\n总测试数: {total}")
        print(f"通过数量: {passed} ✅")
        print(f"失败数量: {failed} ❌")
        print(f"通过率:   {pass_rate:.1f}%")

        if failed > 0:
            print("\n❌ 失败的测试:")
            for r in self.test_results:
                if "❌" in r["status"]:
                    print(f"  • {r['test']}: {r['details']}")

        print("\n✅ 通过的测试:")
        for r in self.test_results:
            if "✅" in r["status"]:
                print(f"  • {r['test']}")

        print("\n" + "-"*70)
        if pass_rate >= 90:
            print(f"🎉 测试结果: 优秀 ({pass_rate:.0f}%通过)")
        elif pass_rate >= 70:
            print(f"👍 测试结果: 良好 ({pass_rate:.0f}%通过)")
        else:
            print(f"⚠️  测试结果: 需要改进 ({pass_rate:.0f}%通过)")

        print("="*70 + "\n")

        # 保存详细报告到文件
        report_file = "/home/liuyeming/work/crm/docs/红包管理功能测试报告.md"
        with open(report_file, "w", encoding="utf-8") as f:
            f.write("# 红包管理功能测试报告\n\n")
            f.write(f"**测试时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"## 测试结果概览\n\n")
            f.write(f"- **总测试数**: {total}\n")
            f.write(f"- **通过**: {passed} ✅\n")
            f.write(f"- **失败**: {failed} ❌\n")
            f.write(f"- **通过率**: {pass_rate:.1f}%\n\n")
            f.write("## 详细测试结果\n\n")
            for r in self.test_results:
                f.write(f"### {r['status']} {r['test']}\n\n")
                f.write(f"- **详情**: {r['details']}\n")
                f.write(f"- **时间**: {r['timestamp']}\n\n")

        print(f"📄 详细报告已保存至: {report_file}")

        return pass_rate >= 90


if __name__ == "__main__":
    tester = RedPacketTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
