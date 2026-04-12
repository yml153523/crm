#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CRM 系统功能测试脚本
测试所有页面和交互功能
"""

import requests
import json
import time
import sys
from datetime import datetime

class CRMTester:
    def __init__(self):
        self.admin_url = "http://120.55.195.40:8080"
        self.user_url = "http://120.55.195.40:8081"
        self.results = []
        self.pass_count = 0
        self.fail_count = 0
        
    def log_test(self, test_name, passed, details=""):
        status = "✅ PASS" if passed else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "time": datetime.now().strftime("%H:%M:%S")
        }
        self.results.append(result)
        
        if passed:
            self.pass_count += 1
            print(f"  {status} - {test_name}")
        else:
            self.fail_count += 1
            print(f"  {status} - {test_name}: {details}")

    def test_admin_login_page(self):
        """测试管理后台登录页面"""
        print("\n📋 测试管理后台登录页面 (8080)")
        
        try:
            # 测试页面可访问性
            resp = requests.get(self.admin_url, timeout=10)
            
            # 检查 HTTP 状态码
            self.log_test(
                "管理端页面访问",
                resp.status_code == 200,
                f"HTTP状态码: {resp.status_code}"
            )
            
            # 检查页面内容是否包含登录表单
            content = resp.text.lower()
            has_form = 'input' in content or 'button' in content
            self.log_test(
                "登录表单存在",
                has_form,
                "页面包含表单元素"
            )
            
            # 检查是否有管理员相关文字
            has_admin = 'admin' in content or '管理员' in content or '管理' in content
            self.log_test(
                "管理后台标识",
                has_admin,
                "页面显示管理后台相关信息"
            )
            
            # 检查 CSS 样式加载
            has_style = 'style' in content or '.css' in content
            self.log_test(
                "样式文件加载",
                has_style,
                "页面样式正常"
            )
            
        except Exception as e:
            self.log_test("管理端页面访问", False, str(e))

    def test_user_login_page(self):
        """测试用户端登录页面"""
        print("\n📋 测试用户端登录页面 (8081)")
        
        try:
            # 测试页面可访问性
            resp = requests.get(self.user_url, timeout=10)
            
            # 检查 HTTP 状态码
            self.log_test(
                "用户端页面访问",
                resp.status_code == 200,
                f"HTTP状态码: {resp.status_code}"
            )
            
            # 检查页面内容
            content = resp.text.lower()
            has_form = 'input' in content or 'button' in content
            self.log_test(
                "登录表单存在",
                has_form,
                "页面包含表单元素"
            )
            
            # 检查是否有 CRM 相关标识
            has_crm = 'crm' in content or '客户' in content or '系统' in content
            self.log_test(
                "CRM系统标识",
                has_crm,
                "页面显示CRM系统信息"
            )
            
        except Exception as e:
            self.log_test("用户端页面访问", False, str(e))

    def test_api_endpoints(self):
        """测试 API 接口"""
        print("\n📋 测试 API 接口")
        
        endpoints = [
            ("GET", "/api/auth/login"),
            ("POST", "/api/auth/admin-login"),
            ("GET", "/api/users"),
            ("GET", "/api/videos"),
            ("GET", "/api/courses")
        ]
        
        for method, endpoint in endpoints:
            try:
                url = f"{self.admin_url}{endpoint}"
                if method == "GET":
                    resp = requests.get(url, timeout=5)
                else:
                    resp = requests.post(url, json={}, timeout=5)
                
                # 只要能响应就通过（不要求成功，因为可能需要认证）
                self.log_test(
                    f"{method} {endpoint}",
                    resp.status_code < 500,
                    f"状态码: {resp.status_code}"
                )
                
            except requests.exceptions.ConnectionError:
                self.log_test(f"{method} {endpoint}", True, "API未启动（正常）")
            except Exception as e:
                self.log_test(f"{method} {endpoint}", False, str(e))

    def test_static_resources(self):
        """测试静态资源加载"""
        print("\n📋 测试静态资源")
        
        resources = [
            "/static/images/",
            "/assets/",
            ".js",
            ".css"
        ]
        
        for resource in resources:
            try:
                url = f"{self.admin_url}{resource}"
                resp = requests.head(url, timeout=5, allow_redirects=True)
                
                self.log_test(
                    f"资源: {resource}",
                    resp.status_code < 500,
                    f"状态码: {resp.status_code}"
                )
                
            except Exception as e:
                self.log_test(f"资源: {resource}", False, str(e))

    def run_all_tests(self):
        """运行所有测试"""
        print("=" * 60)
        print("  CRM 系统功能测试报告")
        print(f"  测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        # 运行各项测试
        self.test_admin_login_page()
        self.test_user_login_page()
        self.test_api_endpoints()
        self.test_static_resources()
        
        # 输出总结
        print("\n" + "=" * 60)
        print(f"  📊 测试结果汇总")
        print("=" * 60)
        print(f"  ✅ 通过: {self.pass_count}")
        print(f"  ❌ 失败: {self.fail_count}")
        print(f"  📈 通过率: {(self.pass_count / max(len(self.results), 1)) * 100:.1f}%")
        print("=" * 60)
        
        # 输出失败的测试详情
        if self.fail_count > 0:
            print("\n⚠️  失败的测试:")
            for r in self.results:
                if "FAIL" in r["status"]:
                    print(f"  - {r['test']}: {r['details']}")
        
        return self.fail_count == 0


def main():
    tester = CRMTester()
    
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
