#!/bin/bash

# CRM系统完整部署脚本
# 作者: AI Assistant
# 日期: 2026-04-10
# 功能: 一键构建前端、配置Nginx、启动后端服务

set -e  # 遇到错误立即退出

echo "=========================================="
echo "🚀 CRM系统 - 云服务器部署脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/home/liuyeming/work/crm"
SERVER_DIR="${PROJECT_ROOT}/server"
DEPLOY_DIR="/var/www/crm-uniapp"
NGINX_SITES="/etc/nginx/sites-enabled"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否以root权限运行
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        log_error "请使用root权限运行此脚本 (sudo ./deploy.sh)"
        exit 1
    fi
    log_success "权限检查通过 ✓"
}

# 安装必要的系统依赖
install_dependencies() {
    log_info "正在安装系统依赖..."
    
    apt-get update
    
    # 安装Node.js (如果未安装)
    if ! command -v node &> /dev/null; then
        log_info "安装 Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    fi
    
    # 安装PM2 (如果未安装)
    if ! command -v pm2 &> /dev/null; then
        log_info "安装 PM2..."
        npm install -g pm2
    fi
    
    # 安装Nginx (如果未安装)
    if ! command -v nginx &> /dev/null; then
        log_info "安装 Nginx..."
        apt-get install -y nginx
    fi
    
    # 安装MongoDB (如果未安装)
    if ! command -v mongod &> /dev/null; then
        log_info "安装 MongoDB..."
        wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
        apt-get update
        apt-get install -y mongodb-org
        systemctl start mongod
        systemctl enable mongod
    fi
    
    log_success "系统依赖安装完成 ✓"
}

# 构建前端项目（用户端）
build_user_frontend() {
    log_info "正在构建用户端前端..."
    
    cd ${PROJECT_ROOT}
    
    # 复制用户端页面配置
    cp src/pages.user.json src/pages.json
    
    # 安装前端依赖
    npm install --legacy-peer-deps
    
    # 构建用户端
    npm run build:h5
    
    # 创建用户端部署目录
    mkdir -p ${DEPLOY_DIR}/user
    
    # 复制构建文件
    rm -rf ${DEPLOY_DIR}/user/*
    cp -r dist/build/h5/* ${DEPLOY_DIR}/user/
    
    log_success "用户端前端构建完成 ✓"
}

# 构建前端项目（管理员端）
build_admin_frontend() {
    log_info "正在构建管理员端前端..."
    
    cd ${PROJECT_ROOT}
    
    # 复制管理端页面配置
    cp src/pages.admin.json src/pages.json
    
    # 构建管理端
    npm run build:h5
    
    # 创建管理端部署目录
    mkdir -p ${DEPLOY_DIR}/admin
    
    # 复制构建文件
    rm -rf ${DEPLOY_DIR}/admin/*
    cp -r dist/build/h5/* ${DEPLOY_DIR}/admin/
    
    # 恢复默认配置
    cp src/pages.user.json src/pages.json
    
    log_success "管理员端前端构建完成 ✓"
}

# 配置后端服务
setup_backend() {
    log_info "正在配置后端服务..."
    
    cd ${SERVER_DIR}
    
    # 安装后端依赖
    npm install
    
    # 创建上传目录
    mkdir -p uploads/videos
    chmod -R 755 uploads/
    
    # 停止旧的PM2进程（如果有）
    pm2 stop crm-server 2>/dev/null || true
    pm2 delete crm-server 2>/dev/null || true
    
    # 使用PM2启动后端服务
    pm2 start server.js --name "crm-server"
    
    # 设置PM2开机自启
    pm2 save
    pm2 startup systemd -u root --hp /root 2>/dev/null || true
    
    log_success "后端服务配置完成 ✓"
}

# 配置Nginx
setup_nginx() {
    log_info "正在配置 Nginx..."
    
    # 备份原有配置
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d%H%M%S) 2>/dev/null || true
    
    # 删除旧站点配置（如果有）
    rm -f ${NGINX_SITES}/crm.conf 2>/dev/null || true
    
    # 复制新的Nginx配置
    cp ${PROJECT_ROOT}/deploy/nginx-crm.conf ${NGINX_SITES}/crm.conf
    
    # 测试Nginx配置
    nginx -t
    
    # 重载Nginx
    systemctl reload nginx || systemctl restart nginx
    
    log_success "Nginx 配置完成 ✓"
}

# 验证部署
verify_deployment() {
    log_info "正在验证部署..."
    
    sleep 3
    
    # 检查后端服务状态
    if pm2 list | grep -q "crm-server.*online"; then
        log_success "✓ 后端服务运行正常 (PID: $(pm2 pid crm-server))"
    else
        log_error "✗ 后端服务启动失败"
        pm2 logs crm-server --lines 20
        exit 1
    fi
    
    # 检查端口监听
    if netstat -tuln | grep -q ":5011 "; then
        log_success "✓ 后端API端口 5011 正在监听"
    else
        log_error "✗ 后端API端口 5011 未监听"
        exit 1
    fi
    
    if netstat -tuln | grep -q ":8080 "; then
        log_success "✓ 用户端端口 8080 正在监听"
    else
        log_error "✗ 用户端端口 8080 未监听"
        exit 1
    fi
    
    if netstat -tuln | grep -q ":8081 "; then
        log_success "✓ 管理端端口 8081 正在监听"
    else
        log_error "✗ 管理端端口 8081 未监听"
        exit 1
    fi
    
    # 测试API接口
    sleep 2
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5011/api/health || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        log_success "✓ 后端API响应正常 (HTTP: $HTTP_CODE)"
    else
        log_warning "⚠ API健康检查返回: $HTTP_CODE (可能正常，需要进一步验证)"
    fi
    
    # 检查文件目录
    if [ -d "${DEPLOY_DIR}/user" ] && [ "$(ls -A ${DEPLOY_DIR}/user)" ]; then
        log_success "✓ 用户端静态文件已部署"
    else
        log_error "✗ 用户端静态文件缺失"
        exit 1
    fi
    
    if [ -d "${DEPLOY_DIR}/admin" ] && [ "$(ls -A ${DEPLOY_DIR}/admin)" ]; then
        log_success "✓ 管理端静态文件已部署"
    else
        log_error "✗ 管理端静态文件缺失"
        exit 1
    fi
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}🎉 CRM系统部署成功！${NC}"
    echo "=========================================="
    echo ""
    echo "📍 访问地址:"
    echo "   用户端: http://$(hostname -I | awk '{print $1}'):8080"
    echo "   管理端: http://$(hostname -I | awk '{print $1}'):8081"
    echo "   API地址: http://$(hostname -I | awk '{print $1}'):5011"
    echo ""
    echo "🔧 管理命令:"
    echo "   查看日志: pm2 logs crm-server"
    echo "   重启服务: pm2 restart crm-server"
    echo "   查看状态: pm2 status"
    echo "   重载Nginx: systemctl reload nginx"
    echo ""
    echo "📁 重要路径:"
    echo "   项目目录: ${PROJECT_ROOT}"
    echo "   部署目录: ${DEPLOY_DIR}"
    echo "   后端代码: ${SERVER_DIR}"
    echo "   日志文件: ~/.pm2/logs/"
    echo ""
    echo "⚠️  注意事项:"
    echo "   1. 请确保防火墙已开放 8080, 8081, 5011 端口"
    echo "   2. 首次使用需要初始化数据库（创建管理员账号）"
    echo "   3. 视频文件上传到 ${SERVER_DIR}/uploads/videos/"
    echo ""
    echo "=========================================="
}

# 主函数
main() {
    echo "开始时间: $(date)"
    echo ""
    
    # 检查root权限
    check_root
    
    # 步骤1: 安装依赖
    install_dependencies
    
    # 步骤2: 构建用户端前端
    build_user_frontend
    
    # 步骤3: 构建管理员端前端
    build_admin_frontend
    
    # 步骤4: 配置后端服务
    setup_backend
    
    # 步骤5: 配置Nginx
    setup_nginx
    
    # 步骤6: 验证部署
    verify_deployment
    
    # 显示部署信息
    show_deployment_info
    
    echo "结束时间: $(date)"
    echo ""
    log_success "✅ 所有部署步骤已完成！"
}

# 执行主函数
main "$@"
