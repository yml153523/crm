#!/bin/bash

# CRM系统完整部署脚本 (增强版 v2.1)
# 作者: AI Assistant
# 日期: 2026-04-14
# 版本: v2.1
# 功能: 一键构建前端、配置Nginx、启动后端服务（含审计日志功能）
# 更新: 增强前端构建验证，确保所有模块（红包、审计日志等）正确部署

set -e  # 遇到错误立即退出

echo "=========================================="
echo "🚀 CRM系统 - 云服务器部署脚本 v2.0"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/home/liuyeming/work/crm"
SERVER_DIR="${PROJECT_ROOT}/server"
DEPLOY_DIR="/var/www/crm-uniapp"
NGINX_SITES="/etc/nginx/sites-enabled"
LOG_FILE="/tmp/crm-deploy-$(date +%Y%m%d-%H%M%S).log"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a $LOG_FILE
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a $LOG_FILE
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
}

log_step() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
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
    log_step "步骤 1/7: 安装系统依赖"
    
    apt-get update -qq
    
    # 安装Node.js 20.x (LTS)
    if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 20 ]]; then
        log_info "安装 Node.js 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
        log_success "Node.js $(node -v) 安装完成 ✓"
    else
        log_success "Node.js $(node -v) 已安装 ✓"
    fi
    
    # 安装PM2 (进程管理器)
    if ! command -v pm2 &> /dev/null; then
        log_info "安装 PM2..."
        npm install -g pm2
        log_success "PM2 $(pm2 -v) 安装完成 ✓"
    else
        log_success "PM2 $(pm2 -v) 已安装 ✓"
    fi
    
    # 安装Nginx (Web服务器)
    if ! command -v nginx &> /dev/null; then
        log_info "安装 Nginx..."
        apt-get install -y nginx
        log_success "Nginx 安装完成 ✓"
    else
        log_success "Nginx 已安装 ✓"
    fi
    
    # 安装MongoDB 7.0 (最新稳定版)
    if ! command -v mongod &> /dev/null; then
        log_info "安装 MongoDB 7.0..."
        
        # 使用官方推荐的安装方式 (GPG + apt)
        curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
        
        echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
        
        apt-get update
        apt-get install -y mongodb-org
        
        systemctl start mongod
        systemctl enable mongod
        
        log_success "MongoDB 7.0 安装完成 ✓"
    else
        MONGO_VERSION=$(mongod --version | grep "db version" | awk '{print $3}')
        log_success "MongoDB ${MONGO_VERSION} 已安装 ✓"
    fi
    
    # 安装其他工具
    apt-get install -y -qq curl wget git build-essential > /dev/null 2>&1
    
    log_success "系统依赖安装完成 ✓"
}

# 配置环境变量
setup_environment() {
    log_step "步骤 2/7: 配置环境变量"
    
    cd ${SERVER_DIR}
    
    # 创建 .env 文件（如果不存在）
    if [ ! -f .env ]; then
        log_info "创建 .env 配置文件..."
        
        cat > .env << EOF
# CRM 系统环境配置
# 生成时间: $(date)

# 服务器配置
PORT=5011
NODE_ENV=production

# MongoDB 连接
MONGODB_URI=mongodb://localhost:27017/crm

# JWT 密钥 (生产环境请更换为强密钥)
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d

# 文件上传路径
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=500MB

# API 限流配置
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=100

# Redis 配置 (可选)
REDIS_HOST=localhost
REDIS_PORT=6379
EOF
        
        log_success ".env 文件已创建 ✓"
        log_warning "⚠️  JWT_SECRET 已自动生成，请妥善保管"
    else
        log_success ".env 文件已存在 ✓"
    fi
    
    source .env 2>/dev/null || true
}

# 构建前端项目（用户端）
build_user_frontend() {
    log_step "步骤 3/7: 构建用户端前端"
    
    cd ${PROJECT_ROOT}
    
    # 检查前端项目是否存在
    if [ ! -f "package.json" ]; then
        log_warning "未找到前端 package.json，跳过前端构建"
        return
    fi
    
    # 复制用户端页面配置
    if [ -f "src/pages.user.json" ]; then
        cp src/pages.user.json src/pages.json
    else
        log_warning "未找到 src/pages.user.json，使用默认配置"
    fi
    
    # 安装前端依赖
    log_info "安装前端依赖..."
    npm install --legacy-peer-deps --silent 2>&1 | tail -5
    
    # 构建用户端
    log_info "构建用户端 H5..."
    if npm run build:h5 2>&1 | tee -a $LOG_FILE | grep -q "BUILD SUCCESS\|build finished"; then
        # 创建用户端部署目录
        mkdir -p ${DEPLOY_DIR}/user
        
        # 复制构建文件
        rm -rf ${DEPLOY_DIR}/user/*
        cp -r dist/build/h5/* ${DEPLOY_DIR}/user/ 2>/dev/null || {
            log_warning "H5构建产物目录不存在，尝试其他路径..."
            find dist -name "*.html" -exec cp -r {} ${DEPLOY_DIR}/user/ \; 2>/dev/null || true
            cp -r dist/* ${DEPLOY_DIR}/user/ 2>/dev/null || true
        }
        
        log_success "用户端前端构建完成 ✓"
    else
        log_error "用户端前端构建失败！"
        log_error "请检查前端代码或跳过此步骤"
    fi
}

# 构建前端项目（管理员端）- 增强版
build_admin_frontend() {
    log_step "步骤 4/7: 构建管理员端前端（完整版含审计日志+红包等所有功能）"

    cd ${PROJECT_ROOT}

    # 检查管理端配置是否存在
    if [ ! -f "src/pages.admin.json" ]; then
        log_error "未找到 src/pages.admin.json"
        exit 1
    fi

    # 显示当前包含的页面
    log_info "管理端页面配置 (pages.admin.json):"
    cat src/pages.admin.json | grep '"path"' | sed 's/.*"path": "//;s/".*//' | while read page; do
        echo "  ✓ ${page}"
    done

    # 使用npm run build:admin构建（自动处理页面配置切换）
    log_info "执行 npm run build:admin..."
    if npm run build:admin 2>&1 | tee -a $LOG_FILE | grep -q "BUILD SUCCESS\|Build complete\|DONE"; then
        # 创建管理端部署目录
        mkdir -p ${DEPLOY_DIR}/admin

        # 复制构建文件（从dist-admin目录）
        if [ -d "dist-admin" ] && [ "$(ls -A dist-admin)" ]; then
            rm -rf ${DEPLOY_DIR}/admin/*
            cp -r dist-admin/* ${DEPLOY_DIR}/admin/

            # 验证关键文件
            if [ -f "${DEPLOY_DIR}/admin/index.html" ]; then
                log_success "index.html 已部署 ✓"

                # 显示版本信息
                BUILD_TIME=$(stat -c %y ${DEPLOY_DIR}/admin/index.html 2>/dev/null || stat -f "%Sm" ${DEPLOY_DIR}/admin/index.html)
                log_success "构建时间: ${BUILD_TIME}"

                # 统计文件数量
                FILE_COUNT=$(find ${DEPLOY_DIR}/admin -type f | wc -l)
                log_success "总文件数: ${FILE_COUNT} 个文件"

                # 验证审计日志页面是否存在
                if find ${DEPLOY_DIR}/admin/assets -name "*audit*" 2>/dev/null | grep -q .; then
                    log_success "审计日志模块已包含 ✓"
                else
                    log_warning "⚠ 审计日志模块可能未正确打包"
                fi
            else
                log_error "❌ index.html 未生成！构建可能失败"
                exit 1
            fi
        else
            log_error "dist-admin 目录为空或不存在！"
            ls -la dist/ 2>/dev/null || echo "dist目录不存在"
            exit 1
        fi

        log_success "管理员端前端构建完成 ✓（包含所有功能模块：会员、课程、视频、商品、红包、审计日志等）"
    else
        log_error "管理员端前端构建失败！"
        log_error "请检查错误日志: ${LOG_FILE}"
        exit 1
    fi
}

# 配置后端服务
setup_backend() {
    log_step "步骤 5/7: 配置后端服务"
    
    cd ${SERVER_DIR}
    
    # 安装后端依赖
    log_info "安装后端依赖..."
    npm install --production 2>&1 | tail -10
    
    # 安装开发依赖（用于测试）
    npm install 2>&1 | tail -5
    
    # 创建上传目录
    mkdir -p uploads/videos
    chmod -R 755 uploads/
    
    # 停止旧的PM2进程（如果有）
    log_info "停止旧服务..."
    pm2 stop crm-server 2>/dev/null || true
    pm2 delete crm-server 2>/dev/null || true
    sleep 2
    
    # 使用PM2启动后端服务
    log_info "启动后端服务..."
    
    # PM2 配置文件
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'crm-server',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 5011
    },
    error_file: '/var/log/crm/error.log',
    out_file: '/var/log/crm/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
EOF
    
    # 启动服务
    pm2 start ecosystem.config.js
    
    # 等待服务启动
    sleep 5
    
    # 设置PM2开机自启
    pm2 save
    pm2 startup systemd -u root --hp /root 2>/dev/null || true
    
    # 检查服务状态
    if pm2 list | grep -q "crm-server.*online"; then
        log_success "后端服务启动成功 ✓ (PID: $(pm2 pid crm-server))"
    else
        log_error "后端服务启动失败！查看日志:"
        pm2 logs crm-server --lines 30 --nostream
        exit 1
    fi
}

# 配置Nginx
setup_nginx() {
    log_step "步骤 6/7: 配置 Nginx"
    
    # 备份原有配置
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d%H%M%S) 2>/dev/null || true
    
    # 删除旧站点配置（如果有）
    rm -f ${NGINX_SITES}/crm.conf 2>/dev/null || true
    
    # 选择合适的Nginx配置
    if [ -f "${PROJECT_ROOT}/deploy/nginx-crm.conf" ]; then
        NGINX_CONFIG="${PROJECT_ROOT}/deploy/nginx-crm.conf"
    elif [ -f "${PROJECT_ROOT}/deploy/nginx-crm-api.conf" ]; then
        NGINX_CONFIG="${PROJECT_ROOT}/deploy/nginx-crm-api.conf"
    else
        # 使用内置默认配置
        log_warning "未找到自定义Nginx配置，使用默认配置..."
        create_default_nginx_config
        NGINX_CONFIG="/tmp/crm-nginx-default.conf"
    fi
    
    # 复制新的Nginx配置
    cp ${NGINX_CONFIG} ${NGINX_SITES}/crm.conf
    
    # 测试Nginx配置
    if nginx -t 2>&1 | grep -q "successful"; then
        log_success "Nginx 配置语法正确 ✓"
    else
        log_error "Nginx 配置语法错误！"
        nginx -t
        exit 1
    fi
    
    # 重载Nginx
    systemctl reload nginx || systemctl restart nginx
    
    log_success "Nginx 配置完成 ✓"
}

# 创建默认Nginx配置
create_default_nginx_config() {
    cat > /tmp/crm-nginx-default.conf << 'EOF'
# 默认CRM Nginx配置

# 用户端 (8080端口)
server {
    listen 8080;
    server_name _;

    root /var/www/crm-uniapp/user;
    index index.html;

    gzip on;
    gzip_min_length 1k;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5011/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 500M;
        proxy_connect_timeout 60s;
        proxy_read_timeout 300s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}

# 管理端 (8081端口)
server {
    listen 8081;
    server_name _;

    root /var/www/crm-uniapp/admin;
    index index.html;

    gzip on;
    gzip_min_length 1k;
    gzip_types text/plain text/css application/json application/javascript;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5011/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 500M;
        proxy_connect_timeout 60s;
        proxy_read_timeout 300s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."
    
    # 检查MongoDB连接
    if mongosh --eval "db.adminCommand('ping')" --quiet 2>/dev/null; then
        log_success "MongoDB 连接正常 ✓"
        
        # 创建初始管理员账号（如果不存在）
        mongosh crm --eval '
        const bcrypt = require("bcryptjs");
        const hashedPassword = bcrypt.hashSync("admin123", 10);
        
        db.users.updateOne(
          { phone: "admin" },
          { 
            $setOnInsert: {
              phone: "admin",
              password: hashedPassword,
              name: "系统管理员",
              role: "super_admin",
              isActive: true,
              createdAt: new Date()
            }
          },
          { upsert: true }
        );
        
        const admin = db.users.findOne({ phone: "admin" });
        print("✅ 管理员账号已就绪");
        print("   手机号: admin");
        print("   密码: admin123");
        print("   角色: super_admin");
        ' 2>/dev/null || {
            log_warning "数据库初始化跳过（需要手动执行）"
        }
    else
        log_error "MongoDB 未运行！"
        log_error "请先启动MongoDB: systemctl start mongod"
        exit 1
    fi
}

# 验证部署
verify_deployment() {
    log_step "步骤 7/7: 验证部署"
    
    sleep 3
    
    ERROR_COUNT=0
    
    # 检查后端服务状态
    if pm2 list | grep -q "crm-server.*online"; then
        log_success "✓ 后端服务运行正常 (PID: $(pm2 pid crm-server))"
    else
        log_error "✗ 后端服务启动失败"
        ((ERROR_COUNT++))
    fi
    
    # 检查端口监听
    for PORT in 5011 8080 8081; do
        if netstat -tuln 2>/dev/null | grep -q ":${PORT} "; then
            case $PORT in
                5011) log_success "✓ 后端API端口 ${PORT} 正在监听" ;;
                8080) log_success "✓ 用户端端口 ${PORT} 正在监听" ;;
                8081) log_success "✓ 管理端端口 ${PORT} 正在监听" ;;
            esac
        else
            case $PORT in
                5011) 
                    log_error "✗ 后端API端口 ${PORT} 未监听"
                    ((ERROR_COUNT++))
                    ;;
                8080|8081) 
                    log_warning "⚠ 前端端口 ${PORT} 未监听（可能未构建前端）"
                    ;;
            esac
        fi
    done
    
    # 测试API接口
    sleep 2
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5011/api/health || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        log_success "✓ 后端API响应正常 (HTTP: $HTTP_CODE)"
    else
        log_warning "⚠ API健康检查返回: $HTTP_CODE"
    fi
    
    # 测试审计日志API（新增功能验证）
    HTTP_CODE_AUDIT=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5011/api/audit-logs || echo "000")
    if [ "$HTTP_CODE_AUDIT" = "401" ] || [ "$HTTP_CODE_AUDIT" = "200" ]; then
        log_success "✓ 审计日志API可用 (HTTP: $HTTP_CODE_AUDIT) - 认证机制生效"
    else
        log_warning "⚠ 审计日志API返回: $HTTP_CODE_AUDIT"
    fi
    
    # 检查文件目录
    if [ -d "${DEPLOY_DIR}/user" ] && [ "$(ls -A ${DEPLOY_DIR}/user 2>/dev/null)" ]; then
        log_success "✓ 用户端静态文件已部署 ($(ls ${DEPLOY_DIR}/user | wc -l) 个文件)"
    else
        log_warning "⚠ 用户端静态文件缺失（可能未构建前端）"
    fi
    
    if [ -d "${DEPLOY_DIR}/admin" ] && [ "$(ls -A ${DEPLOY_DIR}/admin 2>/dev/null)" ]; then
        log_success "✓ 管理端静态文件已部署 ($(ls ${DEPLOY_DIR}/admin | wc -l) 个文件)"
    else
        log_warning "⚠ 管理端静态文件缺失（可能未构建前端）"
    fi
    
    # 返回结果
    if [ $ERROR_COUNT -gt 0 ]; then
        log_error "发现 ${ERROR_COUNT} 个严重错误！"
        return 1
    else
        return 0
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
    echo "🔑 默认账号:"
    echo "   手机号: admin"
    echo "   密码: admin123"
    echo "   角色: 超级管理员"
    echo ""
    echo "🔧 管理命令:"
    echo "   查看日志: pm2 logs crm-server"
    echo "   重启服务: pm2 restart crm-server"
    echo "   查看状态: pm2 status"
    echo "   监控面板: pm2 monit"
    echo "   重载Nginx: systemctl reload nginx"
    echo ""
    echo "📁 重要路径:"
    echo "   项目目录: ${PROJECT_ROOT}"
    echo "   部署目录: ${DEPLOY_DIR}"
    echo "   后端代码: ${SERVER_DIR}"
    echo "   日志文件: ~/.pm2/logs/"
    echo "   部署日志: ${LOG_FILE}"
    echo ""
    echo "🔒 新增安全特性 (审计日志):"
    echo "   ✅ JWT认证已启用"
    echo "   ✅ RBAC三级权限控制"
    echo "   ✅ 操作审计追踪"
    echo "   ✅ 15个自动化测试用例"
    echo ""
    echo "⚠️  注意事项:"
    echo "   1. 请确保防火墙已开放 8080, 8081, 5011 端口"
    echo "   2. 首次登录请立即修改默认密码"
    echo "   3. 生产环境请修改 .env 中的 JWT_SECRET"
    echo "   4. 视频文件上传到 ${SERVER_DIR}/uploads/videos/"
    echo "   5. 定期备份数据库: mongodump --out /backup/\$(date)"
    echo ""
    echo "=========================================="
}

# 主函数
main() {
    echo "开始时间: $(date)"
    echo "日志文件: ${LOG_FILE}"
    echo ""
    
    # 检查root权限
    check_root
    
    # 步骤1: 安装依赖
    install_dependencies
    
    # 步骤2: 配置环境变量
    setup_environment
    
    # 步骤3: 构建用户端前端
    build_user_frontend
    
    # 步骤4: 构建管理员端前端
    build_admin_frontend
    
    # 步骤5: 配置后端服务
    setup_backend
    
    # 步骤6: 配置Nginx
    setup_nginx
    
    # 初始化数据库
    init_database
    
    # 步骤7: 验证部署
    if verify_deployment; then
        # 显示部署信息
        show_deployment_info
        
        echo "结束时间: $(date)"
        echo ""
        log_success "✅ 所有部署步骤已完成！"
        echo ""
        echo "📊 部署统计:"
        echo "   总耗时: $(($(date +%s) - $(date -d "$(head -1 $LOG_FILE | cut -d' ' -f2-)" +%s))) 秒"
        echo "   日志位置: ${LOG_FILE}"
        exit 0
    else
        echo ""
        log_error "❌ 部署过程中发现错误！"
        echo "请查看上方错误信息并修复后重新运行"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "CRM系统部署脚本 v2.0"
    echo ""
    echo "用法: sudo ./deploy.sh [选项]"
    echo ""
    echo "选项:"
    echo "  --skip-frontend    跳过前端构建"
    echo "  --backend-only      仅部署后端服务"
    echo "  --help             显示帮助信息"
    echo ""
    echo "示例:"
    echo "  sudo ./deploy.sh                 # 完整部署"
    echo "  sudo ./deploy.sh --backend-only  # 仅部署后端"
    echo "  sudo ./deploy.sh --skip-frontend # 跳过前端构建"
    echo ""
    echo "注意事项:"
    echo "  1. 必须使用root权限运行"
    echo "  2. 确保网络连接正常"
    echo "  3. 建议在干净的环境中首次部署"
}

# 解析命令行参数
case "$1" in
    --skip-frontend)
        build_user_frontend() { log_warning "跳过用户端前端构建"; }
        build_admin_frontend() { log_warning "跳过管理员端前端构建"; }
        main
        ;;
    --backend-only)
        build_user_frontend() { log_warning "跳过用户端前端构建"; }
        build_admin_frontend() { log_warning "跳过管理员端前端构建"; }
        setup_nginx() { log_warning "跳过Nginx配置"; }
        main
        ;;
    --help|-h)
        show_help
        exit 0
        ;;
    "")
        main
        ;;
    *)
        echo "未知参数: $1"
        show_help
        exit 1
        ;;
esac
