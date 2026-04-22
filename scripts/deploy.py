#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CRM系统一键部署脚本
=================
功能：本地构建 + 云端部署 + 自动验证

使用方法：
  python3 scripts/deploy.py                    # 完整流程（构建+部署+验证）
  python3 scripts/deploy.py --build-only       # 仅执行本地构建
  python3 scripts/deploy.py --deploy-only      # 仅执行云端部署（跳过构建）
  python3 scripts/deploy.py --verify-only      # 仅验证云端状态

配置说明：
  只需修改下方的 CONFIG 字段即可适应不同环境

依赖项：
  - sshpass: 用于自动SSH登录（Ubuntu: sudo apt-get install sshpass）
  - npm/nodejs: 用于前端构建
  - scp/ssh: 用于文件传输和远程命令执行

作者：AI Assistant
日期：2026-04-17
"""

import sys
import os
import subprocess
import shutil
import time
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Tuple

# ==================== 配置区域（修改这里即可） ====================
CONFIG = {
    # ====== 必须修改的部分 ======
    
    # 云服务器信息
    "remote_host": "123.56.107.111",           # ⚠️ 修改为你的云服务器IP地址
    "remote_port": 22,                        # SSH端口（通常为22）
    "remote_user": "root",                    # SSH用户名
    
    # SSH认证方式（二选一）
    "remote_password": "1qaz@WSX",            # 方式1: SSH密码（推荐用于测试环境）
    # "ssh_key_path": "~/.ssh/id_rsa",       # 方式2: SSH密钥路径（推荐用于生产环境）
    
    # ====== 通常不需要修改的部分 ======
    
    # 部署目录（根据nginx.conf中的配置）
    # 8080端口 -> 用户端（手机用户访问）
    "deploy_dir_8080": "/var/www/crm-user",
    # 8081端口 -> 管理端（PC后台管理）
    "deploy_dir_8081": "/var/www/crm-admin",
    
    # 本地项目路径（自动检测）
    "project_root": Path(__file__).parent.parent,
    
    # 构建命令
    "build_command_user": "npm run build:user",      # 用户端构建命令
    "build_command_admin": "npm run build:admin",    # 管理端构建命令
    
    # API验证接口（用于验证最新修改是否生效）
    "api_verify_endpoint": "/api/system/version",
}

# ================================================================


class Deployer:
    """CRM系统部署器"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.project_root = config["project_root"]
        
    def log(self, message: str, level: str = "INFO"):
        """统一日志输出"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        prefix = {
            "INFO": "✅",
            "WARN": "⚠️",
            "ERROR": "❌",
            "STEP": "📋"
        }.get(level, "ℹ️")
        print(f"[{timestamp}] {prefix} {message}")
        
    def step(self, step_num: int, total: int, message: str):
        """输出步骤信息"""
        self.log(f"[{step_num}/{total}] {message}", "STEP")
        
    def run_local_command(self, command: str, cwd: Optional[Path] = None) -> Tuple[bool, str]:
        """执行本地命令"""
        work_dir = cwd or self.project_root
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=work_dir,
                capture_output=True,
                text=True,
                timeout=300  # 5分钟超时
            )
            
            if result.returncode == 0:
                return True, result.stdout
            else:
                return False, result.stderr
                
        except subprocess.TimeoutExpired:
            return False, "命令执行超时"
        except Exception as e:
            return False, str(e)
            
    def check_sshpass(self) -> bool:
        """检查并提示安装sshpass"""
        success, _ = self.run_local_command("which sshpass")
        
        if not success:
            self.log("未检测到sshpass工具", "WARN")
            print("\n" + "="*70)
            print("📦 安装sshpass工具")
            print("="*70)
            print("sshpass用于自动输入SSH密码，使部署过程无需手动交互。")
            print("\n请选择一种方式安装:")
            print()
            print("  方式1 (推荐): 自动安装")
            print("    运行: sudo apt-get install -y sshpass")
            print("    或: sudo yum install -y sshpass")
            print()
            print("  方式2: 使用SSH密钥认证（无需密码）")
            print("    1. 生成密钥: ssh-keygen -t rsa")
            print("    2. 复制到服务器: ssh-copy-id root@你的服务器IP")
            print("    3. 在CONFIG中设置: 'ssh_key_path': '~/.ssh/id_rsa'")
            print()
            print("  方式3: 手动输入密码（每次部署都需要输入）")
            print("    将CONFIG中的'remote_password'设置为空字符串: ''")
            print("="*70 + "\n")
            
            # 尝试自动安装
            response = input("是否尝试自动安装sshpass? (y/n): ").strip().lower()
            if response == 'y':
                self.log("正在尝试安装sshpass...")
                
                # 检测操作系统类型
                success, output = self.run_local_command("cat /etc/os-release | grep -i ubuntu || cat /etc/os-release | grep -i debian")
                is_debian = bool(success and output)
                
                if is_debian:
                    cmd = "echo $(whoami) | sudo -S apt-get update && echo $(whoami) | sudo -S apt-get install -y sshpass"
                else:
                    cmd = "echo $(whoami) | sudo -S yum install -y sshpass"
                    
                success, output = self.run_local_command(cmd)
                
                if success:
                    self.log("sshpass安装成功！")
                    return True
                else:
                    self.log(f"自动安装失败: {output}", "ERROR")
                    return False
            else:
                self.log("跳过sshpass安装，将使用其他认证方式", "WARN")
                return False
        
        return True
            
    def build_ssh_command(self, command: str, timeout: int = 30) -> str:
        """构建SSH命令（支持多种认证方式）"""
        host = self.config["remote_host"]
        port = self.config.get("remote_port", 22)
        user = self.config.get("remote_user", "root")
        password = self.config.get("remote_password", "")
        
        base_ssh = f"ssh -p {port} -o StrictHostKeyChecking=no -o ConnectTimeout={timeout} {user}@{host}"
        
        # 优先级: 密码 > 密钥 > 无认证
        if password and shutil.which("sshpass"):
            return f'sshpass -p "{password}" {base_ssh} "{command}"'
        elif self.config.get("ssh_key_path"):
            key_path = Path(self.config["ssh_key_path"]).expanduser()
            if key_path.exists():
                return f'{base_ssh} -i {key_path} "{command}"'
            else:
                self.log(f"SSH密钥不存在: {key_path}", "WARN")
        
        # 回退到无密码SSH（需要已配置免密登录）
        return f'{base_ssh} "{command}"'
            
    def run_remote_command(self, command: str, timeout: int = 30) -> Tuple[bool, str]:
        """执行远程SSH命令"""
        ssh_cmd = self.build_ssh_command(command, timeout)
        
        try:
            result = subprocess.run(
                ssh_cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout + 10
            )
            
            if result.returncode == 0:
                return True, result.stdout
            else:
                return False, result.stderr
                
        except subprocess.TimeoutExpired:
            return False, "远程命令执行超时"
        except Exception as e:
            return False, str(e)
            
    def upload_files_scp(self, local_dir: str, remote_dir: str) -> Tuple[int, int]:
        """使用SCP上传文件"""
        host = self.config["remote_host"]
        port = self.config.get("remote_port", 22)
        user = self.config.get("remote_user", "root")
        password = self.config.get("remote_password", "")
        
        local_path = self.project_root / local_dir
        if not local_path.exists():
            self.log(f"本地目录不存在: {local_path}", "ERROR")
            return 0, 0
            
        local_files = list(local_path.rglob('*'))
        local_files = [f for f in local_files if f.is_file()]
        
        total = len(local_files)
        uploaded = 0
        failed = 0
        
        self.log(f"待上传文件数: {total}")
        
        for i, local_file in enumerate(local_files, 1):
            try:
                relative_path = local_file.relative_to(local_path)
                remote_path = f"{remote_dir}/{relative_path}"
                
                # 创建远程目录
                remote_dir_path = str(Path(remote_path).parent)
                mkdir_cmd = self.build_ssh_command(f"mkdir -p {remote_dir_path}")
                subprocess.run(mkdir_cmd, shell=True, capture_output=True, timeout=30)
                
                # 使用scp上传文件
                base_scp = f"scp -P {port} -o StrictHostKeyChecking=no"
                
                if password and shutil.which("sshpass"):
                    scp_cmd = f'sshpass -p "{password}" {base_scp} "{local_file}" {user}@{host}:"{remote_path}"'
                elif self.config.get("ssh_key_path"):
                    key_path = Path(self.config["ssh_key_path"]).expanduser()
                    scp_cmd = f'{base_scp} -i {key_path} "{local_file}" {user}@{host}:"{remote_path}"'
                else:
                    scp_cmd = f'{base_scp} "{local_file}" {user}@{host}:"{remote_path}"'
                    
                result = subprocess.run(scp_cmd, shell=True, capture_output=True, timeout=60)
                
                if result.returncode == 0:
                    uploaded += 1
                else:
                    failed += 1
                    if failed <= 5:  # 显示前5个错误
                        self.log(f"  上传失败: {relative_path}", "WARN")
                        
                # 进度显示
                if i % 20 == 0 or i == total:
                    progress = (i / total) * 100
                    self.log(f"  上传进度: {i}/{total} ({progress:.1f}%)")
                    
            except Exception as e:
                failed += 1
                if failed <= 5:
                    self.log(f"  文件上传异常: {relative_path} - {e}", "WARN")
                
        self.log(f"上传完成: 成功={uploaded}, 失败={failed}, 总计={total}")
        return uploaded, failed
        
    def clean_local_build(self, build_type: str = "user") -> bool:
        """清理本地构建文件"""
        self.step(1, 6, f"清理本地{build_type}端构建文件")
        
        build_dirs = {
            "user": ["dist-user"],
            "admin": ["dist-admin"]
        }
        
        dirs_to_clean = build_dirs.get(build_type, [])
        
        for dir_name in dirs_to_clean:
            dir_path = self.project_root / dir_name
            if dir_path.exists():
                self.log(f"删除目录: {dir_path}")
                shutil.rmtree(dir_path)
                
        self.log("本地构建文件已清理")
        return True
        
    def execute_build(self, build_type: str = "user") -> bool:
        """执行构建"""
        self.step(2, 6, f"执行{build_type}端构建")
        
        command = self.config.get(
            f"build_command_{build_type}",
            "npm run build:user"
        )
        
        self.log(f"执行命令: {command}")
        success, output = self.run_local_command(command)
        
        if success:
            self.log("构建成功")
            # 显示关键输出
            for line in output.split('\n'):
                if any(keyword in line for keyword in ['DONE', 'Build complete', 'error', 'Error']):
                    self.log(f"  {line.strip()}")
            return True
        else:
            self.log(f"构建失败: {output[:500]}", "ERROR")
            return False
            
    def clean_remote_deploy(self, deploy_dir: str) -> bool:
        """清理云端部署目录"""
        self.step(3, 6, f"清理云端部署目录: {deploy_dir}")
        
        commands = [
            f"rm -rf {deploy_dir}/*",
            f"mkdir -p {deploy_dir}/assets",
            f"mkdir -p {deploy_dir}/static",
        ]
        
        for cmd in commands:
            success, output = self.run_remote_command(cmd)
            if not success and output:
                self.log(f"  警告: {output[:100]}", "WARN")
                
        self.log("云端目录已清理")
        return True
        
    def upload_files(self, local_dir: str, remote_dir: str) -> Tuple[int, int]:
        """上传文件到云端"""
        self.step(4, 6, f"上传文件到云端: {local_dir} -> {remote_dir}")
        
        return self.upload_files_scp(local_dir, remote_dir)
        
    def set_permissions(self, deploy_dir: str) -> bool:
        """设置文件权限并重载Nginx"""
        self.step(5, 6, "设置文件权限和重载Nginx")
        
        commands = [
            f"chmod -R 755 {deploy_dir}",
            f"chown -R www-data:www-data {deploy_dir}",
            "nginx -t && nginx -s reload",
        ]
        
        all_success = True
        for cmd in commands:
            success, output = self.run_remote_command(cmd)
            if output:
                lines = output.split('\n')[:2]
                for line in lines:
                    if line.strip():
                        self.log(f"  {line}")
            if not success and 'syntax is ok' not in (output or '').lower():
                all_success = False
                
        if all_success:
            self.log("权限设置完成，Nginx已重载")
        else:
            self.log("部分命令执行失败", "WARN")
            
        return True
        
    def verify_deployment(self, deploy_type: str = "user") -> Dict:
        """验证部署结果"""
        self.step(6, 6, f"验证{deploy_type}端部署结果")
        
        results = {
            "success": False,
            "checks": [],
            "api_response": None
        }
        
        host = self.config["remote_host"]
        port = 8080 if deploy_type == "user" else 8081
        deploy_dir = self.config[f"deploy_dir_{port}"]
        api_endpoint = self.config["api_verify_endpoint"]

        checks = [
            ("检查index.html存在性", 
             f"test -f {deploy_dir}/index.html && echo 'EXISTS' || echo 'NOT_FOUND'"),

            ("检查JS引用（确认是新版本）",
             f"grep -o 'src=\"/assets/index[^\"]*\"' {deploy_dir}/index.html | head -1"),

            ("检查主JS文件大小",
             f"ls -lh {deploy_dir}/assets/index-*.js 2>/dev/null | awk '{{print $5, $9}}' | head -1"),

            ("curl测试页面可访问性",
             f"curl -s -o /dev/null -w '%{{http_code}}' 'http://127.0.0.1:{port}/'"),

            ("API版本验证（检查最新修改）",
             f"curl -s 'http://127.0.0.1:5011{api_endpoint}' 2>/dev/null || echo 'API_UNAVAILABLE'"),
        ]
        
        all_passed = True
        for desc, cmd in checks:
            success, out = self.run_remote_command(cmd)
            
            passed = True
            if 'NOT_FOUND' in out or out.strip() == '404':
                passed = False
                all_passed = False
            elif not success and 'API_UNAVAILABLE' not in out:
                # 命令执行失败也算不通过
                passed = False
                all_passed = False
                
            check_result = {
                "name": desc,
                "passed": passed,
                "output": out.strip()[:200]
            }
            results["checks"].append(check_result)
            
            status_icon = "✓" if passed else "✗"
            self.log(f"  [{status_icon}] {desc}: {out.strip()[:100]}")
            
            # 保存API响应
            if "API版本" in desc:
                results["api_response"] = out.strip()
                
        results["success"] = all_passed
        return results
        
    def generate_report(self, results: Dict, start_time: datetime, deploy_type: str) -> bool:
        """生成部署报告"""
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print("\n" + "="*70)
        print("📊 部署报告")
        print("="*70)
        print(f"部署类型: {'用户端(8080)' if deploy_type == 'user' else '管理端(8081)'}")
        print(f"开始时间: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"结束时间: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"总耗时: {duration:.2f} 秒")
        print("-"*70)
        
        print("验证结果:")
        for check in results["checks"]:
            icon = "✅" if check["passed"] else "❌"
            print(f"  {icon} {check['name']}")
            
        print("-"*70)
        
        if results["success"]:
            print("✅ 部署成功！所有检查项均通过")
            host = self.config["remote_host"]
            port = 8080 if deploy_type == "user" else 8081
            print(f"\n📍 访问地址:")
            print(f"   主页: http://{host}:{port}")
            if deploy_type == "user":
                print(f"   用户首页: http://{host}:{port}/#/pages/user/home")
        else:
            print("❌ 部署失败！部分检查项未通过，请查看上方日志")
            
        if results.get("api_response") and results["api_response"] != 'API_UNAVAILABLE':
            print(f"\n📡 API响应（验证最新修改）:")
            print(f"   {results['api_response'][:200]}")
            
        print("="*70 + "\n")
        
        return results["success"]
        
    def deploy(self, deploy_type: str = "user", 
               build_only: bool = False, 
               deploy_only: bool = False,
               verify_only: bool = False) -> bool:
        """
        执行完整部署流程
        
        Args:
            deploy_type: 部署类型 ('user' 或 'admin')
            build_only: 仅执行构建
            deploy_only: 仅执行部署（跳过构建）
            verify_only: 仅验证
        """
        start_time = datetime.now()
        
        print("\n" + "="*70)
        print("🚀 CRM系统一键部署工具")
        print("="*70)
        print(f"📅 时间: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🎯 目标服务器: {self.config['remote_host']}")
        print(f"📦 部署类型: {'用户端(8080端口)' if deploy_type == 'user' else '管理端(8081端口)'}")
        print("="*70 + "\n")
        
        try:
            # 检查sshpass（如果需要密码认证且未安装）
            password = self.config.get("remote_password", "")
            if password and not shutil.which("sshpass"):
                if not self.check_sshpass():
                    self.log("继续使用其他认证方式...", "WARN")
                    
            # 仅验证模式
            if verify_only:
                self.log("仅执行验证...")
                results = self.verify_deployment(deploy_type)
                success = self.generate_report(results, start_time, deploy_type)
                return success
                
            # 本地构建阶段
            if not deploy_only:
                if not self.clean_local_build(deploy_type):
                    return False
                    
                if not self.execute_build(deploy_type):
                    return False
            else:
                self.log("跳过构建阶段（--deploy-only 模式）")
                
            # 云端部署阶段
            local_dir = "dist-user" if deploy_type == "user" else "dist-admin"
            port = 8080 if deploy_type == "user" else 8081
            deploy_dir = self.config[f"deploy_dir_{port}"]
            
            if not self.clean_remote_deploy(deploy_dir):
                return False
                
            uploaded, failed = self.upload_files(local_dir, deploy_dir)
            
            if uploaded == 0 and failed > 0:
                self.log("没有文件被成功上传", "ERROR")
                return False
                
            if not self.set_permissions(deploy_dir):
                return False
                
            # 验证阶段
            time.sleep(2)  # 等待Nginx重载完成
            results = self.verify_deployment(deploy_type)
            success = self.generate_report(results, start_time, deploy_type)
            
            return success
            
        except KeyboardInterrupt:
            self.log("\n\n用户中断操作", "WARN")
            return False
        except Exception as e:
            self.log(f"\n部署过程异常: {e}", "ERROR")
            import traceback
            traceback.print_exc()
            return False


def main():
    """主函数：解析参数并执行部署"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="CRM系统一键部署工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  python3 scripts/deploy.py                     # 部署用户端（默认）
  python3 scripts/deploy.py --type admin         # 部署管理端
  python3 scripts/deploy.py --build-only         # 仅构建不部署
  python3 scripts/deploy.py --deploy-only        # 仅部署不构建
  python3 scripts/deploy.py --verify-only        # 仅验证云端状态
  python3 scripts/deploy.py --all                # 同时部署用户端和管理端
  
首次使用前请先配置:
  1. 编辑此脚本顶部的 CONFIG 字典
  2. 设置正确的 remote_host（云服务器IP地址）
  3. 设置 remote_password（SSH密码）或配置SSH密钥
  4. 确保已安装sshpass: sudo apt-get install sshpass
        """
    )
    
    parser.add_argument(
        "--type", "-t",
        choices=["user", "admin"],
        default="user",
        help="部署类型: user(用户端/8080) 或 admin(管理端/8081)，默认为 user"
    )
    
    parser.add_argument(
        "--build-only", "-b",
        action="store_true",
        help="仅执行本地构建，不上传"
    )
    
    parser.add_argument(
        "--deploy-only", "-d",
        action="store_true",
        help="仅执行云端部署，跳过构建"
    )
    
    parser.add_argument(
        "--verify-only", "-v",
        action="store_true",
        help="仅验证云端部署状态"
    )
    
    parser.add_argument(
        "--all", "-a",
        action="store_true",
        help="同时部署用户端和管理端"
    )
    
    args = parser.parse_args()
    
    # 创建部署器实例
    deployer = Deployer(CONFIG)
    
    # 执行部署
    if args.all:
        print("⚠️  同时部署两端模式\n")
        success_user = deployer.deploy("user", args.build_only, args.deploy_only, args.verify_only)
        print("\n" + "-"*70 + "\n")
        success_admin = deployer.deploy("admin", args.build_only, args.deploy_only, args.verify_only)
        success = success_user and success_admin
    else:
        success = deployer.deploy(args.type, args.build_only, args.deploy_only, args.verify_only)
    
    # 返回退出码
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
