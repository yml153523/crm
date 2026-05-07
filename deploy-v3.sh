#!/bin/bash

# CRM系统智能部署脚本 v3.0 (R45优化版)
# 作者: AI Assistant (Auto-Iteration R45)
# 日期: 2026-04-29
# 功能: 支持本地/远程双模式部署 + 自动回滚 + 完整健康检查
# 更新: 
#   - 修复部署路径问题 (crm-uniapp → crm-server/public)
#   - 新增远程SSH部署模式
#   - 新增一键回滚功能
#   - 新增完整E2E验证
#   - 对接R26-R44优化的配置系统

set -e

echo "=========================================="
echo "🚀 CRM系统 - 智能部署脚本 v3.0"
echo "   (Auto-Iteration R45 优化版)"
echo "=========================================="
echo ""

# ==================== 颜色定义 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ==================== 配置区 (可自定义) ====================
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="${PROJECT_ROOT}/server"

# 服务器配置 (与实际环境一致)
DEPLOY_HOST="${DEPLOY_HOST:-123.56.107.111}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PASS="${DEPLOY_PASS:-1qaz@WSX}"
DEPLOY_PATH="/var/www/crm-server"           # 实际部署根目录
PUBLIC_DIR="${DEPLOY_PATH}/public"          # 前端静态文件目录
BACKUP_DIR="${DEPLOY_PATH}/backups"        # 回滚备份目录
PORT=5011

# 本地模式标志
LOCAL_MODE=false

# 日志文件
LOG_FILE="/tmp/crm-deploy-v3-$(date +%Y%m%d-%H%M%S).log"

# ==================== 日志函数 ====================
log_info()    { echo -e "${BLUE}[INFO]${NC}    $1" | tee -a "$LOG_FILE"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"; }
log_error()   { echo -e "${RED}[ERROR]${NC}    $1" | tee -a "$LOG_FILE"; }
log_step()    {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  ▶ $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ==================== 远程执行函数 ====================
remote_exec() {
    local cmd="$1"
    if [ "$LOCAL_MODE" = true ]; then
        bash -c "$cmd"
    else
        sshpass -p "$DEPLOY_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "${DEPLOY_USER}@${DEPLOY_HOST}" "$cmd"
    fi
}

remote_scp() {
    local src="$1"
    local dst="$2"
    if [ "$LOCAL_MODE" = true ]; then
        cp -r "$src" "$dst"
    else
        sshpass -p "$DEPLOY_PASS" scp -o StrictHostKeyChecking=no -r "$src" "${DEPLOY_USER}@${DEPLOY_HOST}:${dst}"
    fi
}

# ==================== 步骤1: 环境检查 ====================
check_environment() {
    log_step "步骤 1/8: 环境检查与准备"

    # 检查sshpass (远程模式需要)
    if [ "$LOCAL_MODE" = false ]; then
        if ! command -v sshpass &> /dev/null; then
            log_info "安装 sshpass..."
            apt-get install -y sshpass > /dev/null 2>&1 || brew install sshpass 2>/dev/null || {
                log_error "无法安装sshpass，请手动安装或使用 --local 模式"
                exit 1
            }
        fi
        log_success "sshpass 已就绪 ✓"
    fi

    # 测试服务器连接
    if [ "$LOCAL_MODE" = false ]; then
        log_info "测试服务器连接 (${DEPLOY_HOST})..."
        if remote_exec "echo 'connected'" | grep -q "connected"; then
            log_success "服务器连接正常 ✓"
        else
            log_error "无法连接到服务器 ${DEPLOY_HOST}"
            exit 1
        fi

        # 检查PM2状态
        PM2_STATUS=$(remote_exec "pm2 list 2>/dev/null | grep crm-server | awk '{print \$NF}'" || echo "")
        if [ -n "$PM2_STATUS" ]; then
            log_success "PM2进程存在 (状态: ${PM2_STATUS})"
        else
            log_warning "PM2进程不存在，将首次启动"
        fi
    else
        log_success "本地模式已启用 ✓"
    fi

    # 创建备份目录
    remote_exec "mkdir -p ${BACKUP_DIR} 2>/dev/null || true"
    log_success "备份目录已准备 ✓"
}

# ==================== 步骤2: 构建前端 ====================
build_frontend() {
    log_step "步骤 2/8: 构建前端项目"

    cd "$PROJECT_ROOT"

    # 检查package.json
    if [ ! -f "package.json" ]; then
        log_error "未找到 package.json！请在项目根目录运行此脚本"
        exit 1
    fi

    # 安装依赖
    log_info "安装/更新前端依赖..."
    npm install --legacy-peer-deps 2>&1 | tail -3

    # 构建User端
    log_info "构建 User 端前端..."
    if npm run build:user 2>&1 | grep -q "Build complete\|DONE"; then
        USER_SIZE=$(du -sh dist-user 2>/dev/null | cut -f1)
        log_success "User端构建完成 ✓ (大小: ${USER_SIZE})"
    else
        log_error "User端构建失败！"
        exit 1
    fi

    # 构建Admin端
    log_info "构建 Admin 端前端..."
    if npm run build:admin 2>&1 | grep -q "Build complete\|DONE"; then
        ADMIN_SIZE=$(du -sh dist-admin 2>/dev/null | cut -f1)
        log_success "Admin端构建完成 ✓ (大小: ${ADMIN_SIZE})"
    else
        log_error "Admin端构建失败！"
        exit 1
    fi

    # 统计构建产物
    USER_FILES=$(find dist-user -type f 2>/dev/null | wc -l)
    ADMIN_FILES=$(find dist-admin -type f 2>/dev/null | wc -l)
    log_info "构建产物统计: User(${USER_FILES}文件) + Admin(${ADMIN_FILES}文件)"
}

# ==================== 步骤3: 备份现有版本 ====================
backup_current() {
    log_step "步骤 3/8: 备份现有版本"

    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

    log_info "创建备份: ${BACKUP_NAME}"

    remote_exec "
        mkdir -p ${BACKUP_PATH}
        
        # 备份前端文件
        if [ -d '${PUBLIC_DIR}' ]; then
            cp -r ${PUBLIC_DIR} ${BACKUP_PATH}/public 2>/dev/null || true
        fi
        
        # 备份后端关键文件
        if [ -d '${DEPLOY_PATH}/server' ]; then
            mkdir -p ${BACKUP_PATH}/server
            cp ${DEPLOY_PATH}/server/*.js ${BACKUP_PATH}/server/ 2>/dev/null || true
            cp -r ${DEPLOY_PATH}/server/routes ${BACKUP_PATH}/server/ 2>/dev/null || true
            cp -r ${DEPLOY_PATH}/server/models ${BACKUP_PATH}/server/ 2>/dev/null || true
            cp -r ${DEPLOY_PATH}/server/config ${BACKUP_PATH}/server/ 2>/dev/null || true
            cp -r ${DEPLOY_PATH}/server/middleware ${BACKUP_PATH}/server/ 2>/dev/null || true
        fi
        
        # 记录版本信息
        echo '${BACKUP_NAME}' > ${BACKUP_DIR}/last-backup.txt
        echo '\$(date)' >> ${BACKUP_DIR}/last-backup.txt
        
        echo 'BACKUP_DONE'
    "

    if remote_exec "test -d ${BACKUP_PATH}" | grep -q "BACKUP_DONE"; then
        log_success "备份完成 ✓ (${BACKUP_PATH})"
    else
        log_warning "备份可能未完全成功，继续部署..."
    fi
}

# ==================== 步骤4: 部署前端静态文件 ====================
deploy_frontend() {
    log_step "步骤 4/8: 部署前端静态文件"

    log_info "部署 User 端到 ${PUBLIC_DIR}/ ..."
    remote_scp "${PROJECT_ROOT}/dist-user/*" "${PUBLIC_DIR}/"

    log_info "部署 Admin 端到 ${PUBLIC_DIR}/admin/ ..."
    remote_exec "mkdir -p ${PUBLIC_DIR}/admin"
    remote_scp "${PROJECT_ROOT}/dist-admin/*" "${PUBLIC_DIR}/admin/"

    # 验证部署
    USER_CHECK=$(remote_exec "test -f ${PUBLIC_DIR}/index.html && echo 'OK' || echo 'FAIL'")
    ADMIN_CHECK=$(remote_exec "test -f ${PUBLIC_DIR}/admin/index.html && echo 'OK' || echo 'FAIL'")

    if [ "$USER_CHECK" = "OK" ] && [ "$ADMIN_CHECK" = "OK" ]; then
        log_success "前端部署验证通过 ✓"
        log_success "  User端: ${PUBLIC_DIR}/index.html"
        log_success "  Admin端: ${PUBLIC_DIR}/admin/index.html"
    else
        log_error "前端部署失败！(User: ${USER_CHECK}, Admin: ${ADMIN_CHECK})"
        exit 1
    fi
}

# ==================== 步骤5: 部署后端代码 ====================
deploy_backend() {
    log_step "步骤 5/8: 部署后端服务代码"

    log_info "部署 server.js 主文件..."
    remote_scp "${SERVER_DIR}/server.js" "${DEPLOY_PATH}/"

    log_info "部署 routes/ 路由..."
    remote_exec "mkdir -p ${DEPLOY_PATH}/routes"
    remote_scp "${SERVER_DIR}/routes/"* "${DEPLOY_PATH}/routes/"

    log_info "部署 models/ 数据模型..."
    remote_exec "mkdir -p ${DEPLOY_PATH}/models"
    remote_scp "${SERVER_DIR}/models/"* "${DEPLOY_PATH}/models/"

    log_info "部署 config/ 配置文件..."
    remote_exec "mkdir -p ${DEPLOY_PATH}/config"
    remote_scp "${SERVER_DIR}/config/"* "${DEPLOY_PATH}/config/"

    log_info "部署 middleware/ 中间件..."
    remote_exec "mkdir -p ${DEPLOY_PATH}/middleware"
    remote_scp "${SERVER_DIR}/middleware/"* "${DEPLOY_PATH}/middleware/"

    log_info "部署 websocket.js..."
    remote_scp "${SERVER_DIR}/websocket.js" "${DEPLOY_PATH}/"

    log_success "后端代码部署完成 ✓"
}

# ==================== 步骤6: 重启服务 ====================
restart_services() {
    log_step "步骤 6/8: 重启后端服务"

    log_info "重启 PM2 crm-server 服务..."
    remote_exec "
        cd ${DEPLOY_PATH}
        pm2 restart crm-server 2>/dev/null || pm2 start server.js --name crm-server
        sleep 3
        pm2 save
    "

    sleep 2

    # 检查服务状态
    STATUS=$(remote_exec "pm2 list | grep crm-server | awk '{print \$NF}'" 2>/dev/null || echo "unknown")
    
    if [ "$STATUS" = "online" ]; then
        PID=$(remote_exec "pm2 pid crm-server")
        MEM=$(remote_exec "pm2 show crm-server | grep memory_usage | awk '{print \$4}'")
        log_success "服务重启成功 ✓ (PID: ${PID}, 内存: ${MEM})"
    elif [ "$STATUS" = "errored" ]; then
        log_error "服务启动出错！查看日志:"
        remote_exec "pm2 logs crm-server --lines 20 --nostream"
        log_warning "尝试回滚到上一版本..."
        rollback
        exit 1
    else
        log_warning "服务状态异常: ${STATUS}"
    fi
}

# ==================== 步骤7: E2E健康验证 ====================
health_check() {
    log_step "步骤 7/8: E2E健康验证 (R26-R44集成测试)"

    PASS=0
    FAIL=0
    ok() { 
        if [ "$1" = "true" ]; then 
            PASS=$((PASS+1)); echo -e "  ✅ $2"; 
        else 
            FAIL=$((FAIL+1)); echo -e "  ❌ $2 - $3"; 
        fi
    }

    # T1: API Health Check
    log_info "[T1] API健康检查..."
    HEALTH=$(remote_exec "curl -s http://localhost:${PORT}/api/health" 2>/dev/null || echo "{}")
    ok "$(echo $HEALTH | grep -q '"success":true\|"status":"ok"' && echo true)" \
       "API Health Endpoint" \
       "$(echo $HEALTH | head -c 80)"

    # T2: Admin Login Test
    log_info "[T2] Admin登录测试..."
    AUTH=$(remote_exec "curl -s -X POST http://localhost:${PORT}/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{\"phone\":\"admin\",\"password\":\"123456\"}'" 2>/dev/null || echo "{}")
    TOKEN=$(echo $AUTH | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
    ok "$(echo $AUTH | grep -q '"success":true' && echo true)" \
       "Admin认证" \
       "$(if [ -n "$TOKEN" ]; then echo 'Token获取成功'; else echo 'Token缺失'; fi)"

    # T3: Permission System (R32-R35)
    log_info "[T3] 权限系统测试 (R32-R35)..."
    PERM=$(remote_exec "curl -s http://localhost:${PORT}/api/permissions" 2>/dev/null || echo "{}")
    ok "$(echo $PERM | grep -q '"10001"' && echo true)" \
       "权限树API" \
       "包含核心权限码10001"

    MENU=$(remote_exec "curl -s http://localhost:${PORT}/api/permissions/menu/admin" 2>/dev/null || echo "{}")
    ok "$(echo $MENU | grep -q '\\[' && echo true)" \
       "管理员菜单生成" \
       "返回菜单数组"

    # T4: Frontend Static Files (R40-R41)
    log_info "[T4] 前端静态文件测试 (R40-R41)..."
    USER_PAGE=$(remote_exec "curl -s -o /dev/null -w '%{http_code}' http://localhost:${PORT}/index.html" 2>/dev/null || echo "000")
    ok "[ $USER_PAGE = 200 ]" \
       "User端首页访问" \
       "HTTP ${USER_PAGE}"

    ADMIN_PAGE=$(remote_exec "curl -s -o /dev/null -w '%{http_code}' http://localhost:${PORT}/admin/index.html" 2>/dev/null || echo "000")
    ok "[ $ADMIN_PAGE = 200 ]" \
       "Admin端首页访问" \
       "HTTP ${ADMIN_PAGE}"

    # T5: Security Checks (R43)
    log_info "[T5] 安全加固验证 (R43)..."
    NO_AUTH=$(remote_exec "curl -s -o /dev/null -w '%{http_code}' http://localhost:${PORT}/api/admin/users" 2>/dev/null || echo "000")
    ok "[ $NO_AUTH = 401 ]" \
       "未授权拦截(401)" \
       "HTTP ${NO_AUTH}"

    BAD_TOKEN=$(remote_exec "curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer invalid-token' http://localhost:${PORT}/api/admin/users" 2>/dev/null || echo "000")
    ok "[ $BAD_TOKEN = 401 ]" \
       "无效Token拒绝(401)" \
       "HTTP ${BAD_TOKEN}"

    # T6: Performance Baseline (R42)
    log_info "[T6] 性能基准测试 (R42)..."
    RT=$(remote_exec "
        T0=\$(date +%s%N)
        curl -s http://localhost:${PORT}/api/health > /dev/null
        T1=\$(date +%s%N)
        echo \$(( (T1-T0)/1000000 ))
    " 2>/dev/null || echo "9999")
    ok "[ $RT -lt 500 ]" \
       "响应时间基准 (${RT}ms)" \
       "${RT}ms"

    # 输出结果
    TOTAL=$((PASS + FAIL))
    RATE=$((PASS * 100 / TOTAL))

    echo ""
    echo -e "${MAGENTA}┌─────────────────────────────────────┐${NC}"
    echo -e "${MAGENTA}│     📊 E2E验证结果                      │${NC}"
    echo -e "${MAGENTA}├─────────────────────────────────────┤${NC}"
    printf "${MAGENTA}│  总计: %2d  通过: %2d  失败: %2d         │\n" "$TOTAL" "$PASS" "$FAIL"
    printf "${MAGENTA}│  通过率: %3d%%                         │\n" "$RATE"
    echo -e "${MAGENTA}└─────────────────────────────────────┘${NC}"
    echo ""

    if [ $FAIL -eq 0 ]; then
        log_success "所有E2E测试通过 ✓"
        return 0
    else
        log_error "发现 ${FAIL} 个测试失败！"
        return 1
    fi
}

# ==================== 回滚功能 ====================
rollback() {
    log_step "⚠️  执行紧急回滚"

    LAST_BACKUP=$(remote_exec "cat ${BACKUP_DIR}/last-backup.txt 2>/dev/null | head -1" || echo "")

    if [ -z "$LAST_BACKUP" ] || [ ! "$LAST_BACKUP" = "backup-*" ]; then
        log_error "没有可用的备份！无法回滚"
        exit 1
    fi

    BACKUP_PATH="${BACKUP_DIR}/${LAST_BACKUP}"
    log_info "回滚到: ${LAST_BACKUP}"

    # 停止服务
    remote_exec "pm2 stop crm-server 2>/dev/null || true"

    # 恢复文件
    if [ -d "${BACKUP_PATH}/public" ]; then
        remote_exec "rm -rf ${PUBLIC_DIR} && mv ${BACKUP_PATH}/public ${PUBLIC_DIR}"
        log_success "前端文件已恢复 ✓"
    fi

    if [ -d "${BACKUP_PATH}/server" ]; then
        remote_exec "cp ${BACKUP_PATH}/server/*.js ${DEPLOY_PATH}/ 2>/dev/null || true"
        remote_exec "cp -r ${BACKUP_PATH}/server/routes ${DEPLOY_PATH}/ 2>/dev/null || true"
        log_success "后端文件已恢复 ✓"
    fi

    # 重启服务
    remote_exec "cd ${DEPLOY_PATH} && pm2 restart crm-server && sleep 3"

    log_success "✅ 回滚完成！请验证服务是否正常"
    log_info "如需查看日志: pm2 logs crm-server"
}

# ==================== 显示部署信息 ====================
show_deployment_info() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}🎉 CRM系统部署成功！${NC}"
    echo "=========================================="
    echo ""
    echo -e "📍 ${CYAN}访问地址:${NC}"
    echo "   User端:  http://${DEPLOY_HOST}:${PORT}/"
    echo "   Admin端: http://${DEPLOY_HOST}:${PORT}/admin/"
    echo "   API地址: http://${DEPLOY_HOST}:${PORT}/api/"
    echo ""
    echo -e "🔑 ${CYAN}默认账号:${NC}"
    echo "   手机号: admin"
    echo "   密码:   123456"
    echo "   角色:   super_admin"
    echo ""
    echo -e "🔧 ${CYAN}管理命令:${NC}"
    echo "   查看状态: pm2 list"
    echo "   查看日志: pm2 logs crm-server"
    echo "   重启服务: pm2 restart crm-server"
    echo "   一键回滚: ./deploy.sh --rollback"
    echo ""
    echo -e "📁 ${CYAN}关键路径:${NC}"
    echo "   部署根目录: ${DEPLOY_PATH}"
    echo "   前端静态:   ${PUBLIC_DIR}"
    echo "   备份目录:   ${BACKUP_DIR}"
    echo "   部署日志:   ${LOG_FILE}"
    echo ""
    echo -e "${MAGENTA}✨ R26-R44 迭代成果已集成:${NC}"
    echo "   ✅ WebSocket双重认证 (R26)"
    echo "   ✅ JSON权限配置系统 (R32, 59个权限码)"
    echo "   ✅ 前端路由守卫 + 动态菜单 (R33)"
    echo "   ✅ 零硬编码 + 类型安全 (R34/R41)"
    echo "   ✅ Auth缓存 + MongoDB索引 (R42)"
    echo "   ✅ 防御性编程 + 边界校验 (R43)"
    echo "   ✅ express.static修复 (R44)"
    echo ""
    echo "=========================================="
}

# ==================== 显示帮助 ====================
show_help() {
    echo "CRM系统智能部署脚本 v3.0"
    echo ""
    echo "用法: ./deploy.sh [选项]"
    echo ""
    echo "部署模式:"
    echo "  (默认)          远程部署到 ${DEPLOY_HOST}"
    echo "  --local          本地部署模式"
    echo ""
    echo "操作选项:"
    echo "  --rollback       一键回滚到上一个版本"
    echo "  --verify         仅执行健康检查（不部署）"
    echo "  --help, -h       显示此帮助信息"
    echo ""
    echo "环境变量 (可选覆盖):"
    echo "  DEPLOY_HOST      目标服务器IP (默认: ${DEPLOY_HOST})"
    echo "  DEPLOY_USER      SSH用户名 (默认: ${DEPLOY_USER})"
    echo "  DEPLOY_PASS      SSH密码 (默认: 从配置读取)"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh                    # 远程部署"
    echo "  ./deploy.sh --local            # 本地部署"
    echo "  DEPLOY_HOST=192.168.1.100 ./deploy.sh  # 自定义目标"
    echo "  ./deploy.sh --rollback         # 紧急回滚"
    echo "  ./deploy.sh --verify           # 仅验证"
}

# ==================== 主函数 ====================
main() {
    START_TIME=$(date +%s)
    echo "开始时间: $(date)"
    echo "日志文件: ${LOG_FILE}"
    echo "部署模式: $(if [ "$LOCAL_MODE" = true ]; then echo '本地'; else echo "远程(${DEPLOY_HOST})"; fi)"
    echo ""

    # 步骤1: 环境检查
    check_environment

    # 步骤2: 构建前端
    build_frontend

    # 步骤3: 备份现有版本
    backup_current

    # 步骤4: 部署前端
    deploy_frontend

    # 步骤5: 部署后端
    deploy_backend

    # 步骤6: 重启服务
    restart_services

    # 步骤7: E2E健康验证
    if health_check; then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))

        # 显示部署信息
        show_deployment_info

        echo "结束时间: $(date)"
        echo "总耗时: ${DURATION} 秒"
        echo ""
        log_success "✅ 所有部署步骤已完成！系统运行正常。"
        exit 0
    else
        log_error "❌ E2E验证失败！请检查上方错误信息。"
        log_info "提示: 可使用 './deploy.sh --rollback' 回滚到上一版本"
        exit 1
    fi
}

# ==================== 参数解析 ====================
case "$1" in
    --local|-l)
        LOCAL_MODE=true
        DEPLOY_HOST="localhost"
        main
        ;;
    --rollback|-r)
        rollback
        ;;
    --verify|-v)
        LOG_FILE="/dev/null"  # 仅验证不需要记录日志
        health_check
        exit $?
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
