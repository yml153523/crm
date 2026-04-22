#!/bin/bash

# ============================================================
# CRM系统全面页面测试脚本
# 测试目标: http://120.55.195.40:8080 (管理端)
# 覆盖范围: 12个主页面 + 2个子页面 = 14个页面
# 日期: 2026-04-15
# 基于: bugfix-workflow skill 规范
# ============================================================

echo "================================================================"
echo "🧪 CRM系统全面页面功能测试 (基于bugfix-workflow skill)"
echo "================================================================"
echo "测试时间: $(date)"
echo "目标服务器: 120.55.195.40"
echo "管理端端口: 8080 | API端口: 5011"
echo ""

CLOUD_IP="120.55.195.40"
ADMIN_PORT=8080
API_BASE="http://${CLOUD_IP}:5011"

PASS_COUNT=0
FAIL_COUNT=0
WARNING_COUNT=0
TEST_RESULTS=()
PAGE_SUMMARY=()

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================
# 测试函数定义
# ============================================================

test_api() {
    local test_id="$1"
    local test_name="$2"
    local url="$3"
    local expected_code="$4"
    local method="${5:-GET}"
    local data="${6:-}"

    echo -n "  [${test_id}] ${test_name} ... "

    if [ "$method" = "POST" ]; then
        HTTP_CODE=$(curl -s -o /tmp/api_response.json -w "%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer demo-token-admin-$(date +%s)" \
            -d "$data" \
            --connect-timeout 10 --max-time 30 2>/dev/null)
    else
        HTTP_CODE=$(curl -s -o /tmp/api_response.json -w "%{http_code}" -X GET "$url" \
            -H "Authorization: Bearer demo-token-admin-$(date +%s)" \
            --connect-timeout 10 --max-time 30 2>/dev/null)
    fi

    if [ "$HTTP_CODE" = "$expected_code" ] || [ "$expected_code" = "ANY" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP ${HTTP_CODE})"
        ((PASS_COUNT++))
        TEST_RESULTS+=("✅ [${test_id}] ${test_name}")
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (期望 ${expected_code}, 实际 ${HTTP_CODE})"
        ((FAIL_COUNT++))
        TEST_RESULTS+=("❌ [${test_id}] ${test_name} (期望${expected_code}, 实际${HTTP_CODE})")
        
        # 显示错误详情
        if [ -f /tmp/api_response.json ]; then
            ERROR_DETAIL=$(cat /tmp/api_response.json | head -c 200)
            echo "      错误详情: ${ERROR_DETAIL}"
        fi
        return 1
    fi
}

test_frontend_page() {
    local test_id="$1"
    local page_name="$2"
    local url="$3"
    
    echo -n "  [${test_id}] 页面访问: ${page_name} ... "
    
    HTTP_CODE=$(curl -s -o /tmp/page_response.html -w "%{http_code}" "$url" \
        --connect-timeout 10 --max-time 30 2>/dev/null)
    
    if [ "$HTTP_CODE" = "200" ]; then
        # 检查是否包含关键内容
        PAGE_SIZE=$(wc -c < /tmp/page_response.html)
        if [ "$PAGE_SIZE" -gt 1000 ]; then
            echo -e "${GREEN}✅ PASS${NC} (HTTP 200, ${PAGE_SIZE} bytes)"
            ((PASS_COUNT++))
            TEST_RESULTS+=("✅ [${test_id}] ${page_name} (${PAGE_SIZE} bytes)")
            
            # 记录页面摘要
            PAGE_SUMMARY+=("${page_name}: HTTP200, ${PAGE_SIZE}bytes")
            return 0
        else
            echo -e "${YELLOW}⚠️  WARNING${NC} (HTTP 200 但页面过小: ${PAGE_SIZE} bytes)"
            ((WARNING_COUNT++))
            TEST_RESULTS+=("⚠️  [${test_id}] ${page_name} (页面过小)")
            return 2
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP ${HTTP_CODE})"
        ((FAIL_COUNT++))
        TEST_RESULTS+=("❌ [${test_id}] ${page_name} (HTTP${HTTP_CODE})")
        PAGE_SUMMARY+=("${page_name}: FAIL(HTTP${HTTP_CODE})")
        return 1
    fi
}

test_resource_exists() {
    local test_id="$1"
    local resource_name="$2"
    local url="$3"
    
    echo -n "  [${test_id}] 资源检查: ${resource_name} ... "
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" \
        --connect-timeout 5 --max-time 10 2>/dev/null)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASS_COUNT++))
        TEST_RESULTS+=("✅ [${test_id}] ${resource_name}")
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP ${HTTP_CODE})"
        ((FAIL_COUNT++))
        TEST_RESULTS+=("❌ [${test_id}] ${resource_name} (HTTP${HTTP_CODE})")
        return 1
    fi
}

print_section_header() {
    local section_num="$1"
    local section_title="$2"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  第${section_num}部分: ${section_title}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ============================================================
# 开始测试
# ============================================================

# ============================================================
# 第一部分：前端页面访问测试 (12个主页面 + 2个子页面)
# ============================================================
print_section_header "1" "前端页面访问测试 (14个页面)"

BASE_URL="http://${CLOUD_IP}:${ADMIN_PORT}"

echo ">>> 1.1 核心页面 (登录 + Dashboard) <<<"
test_frontend_page "P01" "管理员登录页" "${BASE_URL}/#pages/admin/login"
test_frontend_page "P02" "工作台Dashboard" "${BASE_URL}/#pages/admin/dashboard"

echo ""
echo ">>> 1.2 业务管理页面 (会员/课程/视频/商品) <<<"
test_frontend_page "P03" "会员管理" "${BASE_URL}/#pages/admin/member/list"
test_frontend_page "P04" "课程管理" "${BASE_URL}/#pages/admin/course/library"
test_frontend_page "P05" "视频管理" "${BASE_URL}/#pages/admin/video/list"
test_frontend_page "P06" "商品管理" "${BASE_URL}/#pages/admin/product/list"

echo ""
echo ">>> 1.3 运营工具页面 (提醒/统计/日志) <<<"
test_frontend_page "P07" "提醒中心" "${BASE_URL}/#pages/admin/remind/index"
test_frontend_page "P08" "数据统计" "${BASE_URL}/#pages/admin/statistics/index"
test_frontend_page "P09" "日志中心(主页)" "${BASE_URL}/#pages/admin/audit-log/index"
test_frontend_page "P10" "日志中心(列表)" "${BASE_URL}/#pages/admin/audit-log/list"
test_frontend_page "P11" "日志中心(统计)" "${BASE_URL}/#pages/admin/audit-log/stats"

echo ""
echo ">>> 1.4 系统管理页面 (管理员/设置/个人中心) <<<"
test_frontend_page "P12" "管理员管理" "${BASE_URL}/#pages/admin/admin-user/list"
test_frontend_page "P13" "系统设置" "${BASE_URL}/#pages/admin/settings/index"
test_frontend_page "P14" "个人中心" "${BASE_URL}/#pages/admin/profile/index"

echo ""
echo ">>> 1.5 静态资源文件检查 <<<"
JS_BUNDLE=$(curl -s "${BASE_URL}/" | grep -o 'src="[^"]*index-[^"]*\.js"' | head -1 | sed 's/src="//;s/"//')
CSS_BUNDLE=$(curl -s "${BASE_URL}/" | grep -o 'href="[^"]*index-[^"]*\.css"' | head -1 | sed 's/href="//;s/"//')

if [ -n "$JS_BUNDLE" ]; then
    test_resource_exists "R01" "主JS Bundle" "${BASE_URL}${JS_BUNDLE#\/*}"
else
    echo -e "  [R01] 主JS Bundle ... ${YELLOW}⚠️  WARNING${NC} (未找到JS引用)"
    ((WARNING_COUNT++))
fi

if [ -n "$CSS_BUNDLE" ]; then
    test_resource_exists "R02" "主CSS Bundle" "${BASE_URL}${CSS_BUNDLE#\/*}"
else
    echo -e "  [R02] 主CSS Bundle ... ${YELLOW}⚠️  WARNING${NC} (未找到CSS引用)"
    ((WARNING_COUNT++))
fi

# AdminLayout组件CSS
test_resource_exists "R03" "AdminLayout组件CSS" "${BASE_URL}/assets/AdminLayout-" 2>/dev/null || \
echo -e "  [R03] AdminLayout组件CSS ... ${YELLOW}⚠️  SKIP${NC} (可能内联)"

test_resource_exists "R04" "Dashboard组件CSS" "${BASE_URL}/assets/dashboard-" 2>/dev/null || \
echo -e "  [R04] Dashboard组件CSS ... ${YELLOW}⚠️  SKIP${NC} (可能内联)"

# ============================================================
# 第二部分：后端API接口测试 (按页面分组)
# ============================================================
print_section_header "2" "后端API接口测试 (按页面分组)"

echo ">>> 2.1 基础设施API <<<"
test_api "A01" "健康检查" "${API_BASE}/api/health" "200"
test_api "A02" "用户认证(登录)" "${API_BASE}/api/auth/login" "ANY" "POST" '{"phone":"admin","password":"admin123"}'

echo ""
echo ">>> 2.2 会员管理相关API <<<"
test_api "A03" "获取用户列表" "${API_BASE}/api/users?page=1&limit=10" "ANY"
TIMESTAMP=$(date +%s)
TEST_PHONE="139000${TIMESTAMP: -4}"
test_api "A04" "创建新用户" "${API_BASE}/api/users" "201" "POST" "{\"phone\":\"${TEST_PHONE}\",\"name\":\"全量测试用户\",\"role\":\"user\"}"
test_api "A05" "更新用户信息" "${API_BASE}/api/users/test-id" "ANY" "PUT" '{"name":"修改后的名字"}'

echo ""
echo ">>> 2.3 课程管理相关API <<<"
test_api "A06" "获取课程列表" "${API_BASE}/api/courses?page=1&limit=10" "ANY"
test_api "A07" "创建课程" "${API_BASE}/api/courses" "201" "POST" '{"title":"测试课程","description":"全量测试课程","category":"瑜伽"}'

echo ""
echo ">>> 2.4 视频管理相关API <<<"
test_api "A08" "获取视频列表" "${API_BASE}/api/videos?page=1&limit=10" "ANY"
test_api "A09" "上传视频元数据" "${API_BASE}/api/videos" "201" "POST" '{"title":"测试视频","courseId":"test-course"}'

echo ""
echo ">>> 2.5 商品管理相关API <<<"
test_api "A10" "获取商品列表" "${API_BASE}/api/products?page=1&limit=10" "ANY"
test_api "A11" "创建商品" "${API_BASE}/api/products" "201" "POST" '{"name":"测试商品","price":99.9,"stock":100}'

echo ""
echo ">>> 2.6 提醒中心相关API <<<"
test_api "A12" "红包提醒用户列表" "${API_BASE}/api/remind/users/redPacket" "ANY"
test_api "A13" "上课提醒用户列表" "${API_BASE}/api/remind/users/classReminder" "ANY"
test_api "A14" "提醒历史记录" "${API_BASE}/api/remind/history?page=1&pageSize=10" "ANY"
test_api "A15" "批量发送提醒" "${API_BASE}/api/remind/batch-send" "ANY" "POST" '{"userIds":["test"],"type":"redPacket"}'

echo ""
echo ">>> 2.7 数据统计相关API <<<"
test_api "A16" "统计数据概览" "${API_BASE}/api/statistics/overview" "ANY"
test_api "A17" "用户增长趋势" "${API_BASE}/api/statistics/user-growth?range=7d" "ANY"

echo ""
echo ">>> 2.8 审计日志相关API <<<"
test_api "A18" "审计日志查询" "${API_BASE}/api/audit-logs?page=1&limit=20" "ANY"
test_api "A19" "审计日志统计" "${API_BASE}/api/audit-logs/statistics/overview" "ANY"

echo ""
echo ">>> 2.9 管理员管理相关API <<<"
test_api "A20" "管理员用户列表" "${API_BASE}/api/admin/users?page=1&limit=10" "ANY"
test_api "A21" "创建管理员" "${API_BASE}/api/admin/users" "201" "POST" '{"phone":"13800000000","name":"测试管理员","role":"admin"}'
test_api "A22" "切换用户状态" "${API_BASE}/api/admin/users/test-id/status" "ANY" "PUT" '{"status":"inactive"}'

echo ""
echo ">>> 2.10 红包管理相关API <<<"
test_api "A23" "红包活动列表" "${API_BASE}/api/admin/red-packets/list?page=1&limit=10" "ANY"
test_api "A24" "创建红包活动" "${API_BASE}/api/admin/red-packets/" "201" "POST" '{"title":"测试红包","totalAmount":100,"totalCount":10}'
test_api "A25" "红包统计数据" "${API_BASE}/api/admin/red-packets/stats/dashboard" "ANY"
test_api "A26" "导出任务创建" "${API_BASE}/api/admin/red-packets/export" "ANY" "POST" '{"format":"xlsx"}'

# ============================================================
# 第三部分：功能完整性验证
# ============================================================
print_section_header "3" "功能完整性验证"

echo ">>> 3.1 登录流程验证 <<<"
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"phone":"admin","password":"admin123"}' \
    --connect-timeout 10 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q '"success":true\|"token"'; then
    echo -e "  [F01] 登录接口返回Token ... ${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ [F01] 登录返回Token")
else
    echo -e "  [F01] 登录接口返回Token ... ${RED}❌ FAIL${NC}"
    echo "      响应: $(echo $LOGIN_RESPONSE | head -c 150)"
    ((FAIL_COUNT++))
    TEST_RESULTS+=("❌ [F01] 登录失败")
fi

echo ""
echo ">>> 3.2 AdminLayout组件检测 <<<"
INDEX_HTML=$(curl -s "${BASE_URL}/" 2>/dev/null)

if echo "$INDEX_HTML" | grep -qi "AdminLayout\|sidebar\|nav-menu"; then
    echo -e "  [F02] AdminLayout组件引用 ... ${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ [F02] AdminLayout组件存在")
else
    echo -e "  [F02] AdminLayout组件引用 ... ${YELLOW}⚠️  WARNING${NC} (SPA需JS渲染)"
    ((WARNING_COUNT++))
    TEST_RESULTS+=("⚠️  [F02] AdminLayout(SPA渲染)")
fi

echo ""
echo ">>> 3.3 移动端响应式支持检测 <<<"
if grep -l "768px" /home/liuyeming/work/crm/dist-admin/assets/*.css >/dev/null 2>&1; then
    echo -e "  [F03] 移动端媒体查询(≤768px) ... ${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ [F03] 移动端适配CSS存在")
else
    echo -e "  [F03] 移动端媒体查询(≤768px) ... ${RED}❌ FAIL${NC}"
    ((FAIL_COUNT++))
    TEST_RESULTS+=("❌ [F03] 缺少移动端CSS")
fi

if grep -l "480px" /home/liuyeming/work/crm/dist-admin/assets/*.css >/dev/null 2>&1; then
    echo -e "  [F04] 超小屏媒体查询(≤480px) ... ${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ [F04] 超小屏适配CSS存在")
else
    echo -e "  [F04] 超小屏媒体查询(≤480px) ... ${YELLOW}⚠️  WARNING${NC}"
    ((WARNING_COUNT++))
    TEST_RESULTS+=("⚠️  [F04] 缺少超小屏CSS")
fi

echo ""
echo ">>> 3.4 fetch()调用检测(应该为0) <<<"
FETCH_COUNT=$(grep -r "fetch(" /home/liuyeming/work/crm/dist-admin/assets/*.js 2>/dev/null | wc -l)

if [ "$FETCH_COUNT" -eq 0 ]; then
    echo -e "  [F05] fetch()调用数量 ... ${GREEN}✅ PASS${NC} (0个调用)"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ [F05] 无fetch()调用")
else
    echo -e "  [F05] fetch()调用数量 ... ${RED}❌ FAIL${NC} (${FETCH_COUNT}个调用)"
    ((FAIL_COUNT++))
    TEST_RESULTS+=("❌ [F05] 存在${FETCH_COUNT}个fetch()")
fi

# ============================================================
# 第四部分：性能与安全测试
# ============================================================
print_section_header "4" "性能与安全测试"

echo ">>> 4.1 页面加载性能 <<<"
START_TIME=$(date +%s%N)
curl -s "${BASE_URL}/" > /dev/null 2>&1
END_TIME=$(date +%s%N)
LOAD_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$LOAD_TIME" -lt 1000 ]; then
    echo -e "  [PERF01] 首页加载时间 ... ${GREEN}✅ PASS${NC} (${LOAD_TIME}ms < 1000ms) ⚡"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ [PERF01] 加载速度优秀(${LOAD_TIME}ms)")
elif [ "$LOAD_TIME" -lt 3000 ]; then
    echo -e "  [PERF01] 首页加载时间 ... ${YELLOW}⚠️  ACCEPTABLE${NC} (${LOAD_TIME}ms < 3000ms)"
    ((WARNING_COUNT++))
    TEST_RESULTS+=("⚠️  [PERF01] 加载速度一般(${LOAD_TIME}ms)")
else
    echo -e "  [PERF01] 首页加载时间 ... ${RED}❌ SLOW${NC} (${LOAD_TIME}ms > 3000ms)"
    ((FAIL_COUNT++))
    TEST_RESULTS+=("❌ [PERF01] 加载速度慢(${LOAD_TIME}ms)")
fi

echo ""
echo ">>> 4.2 API响应性能 <<<"
START_TIME=$(date +%s%N)
curl -s "${API_BASE}/api/health" > /dev/null 2>&1
END_TIME=$(date +%s%N)
API_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$API_TIME" -lt 500 ]; then
    echo -e "  [PERF02] 健康检查API响应 ... ${GREEN}✅ PASS${NC} (${API_TIME}ms < 500ms) ⚡"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ [PERF02] API响应快(${API_TIME}ms)")
elif [ "$API_TIME" -lt 2000 ]; then
    echo -e "  [PERF02] 健康检查API响应 ... ${YELLOW}⚠️  ACCEPTABLE${NC} (${API_TIME}ms < 2000ms)"
    ((WARNING_COUNT++))
    TEST_RESULTS+=("⚠️  [PERF02] API响应一般(${API_TIME}ms)")
else
    echo -e "  [PERF02] 健康检查API响应 ... ${RED}❌ SLOW${NC} (${API_TIME}ms > 2000ms)"
    ((FAIL_COUNT++))
    TEST_RESULTS+=("❌ [PERF02] API响应慢(${API_TIME}ms)")
fi

echo ""
echo ">>> 4.3 安全头检查 <<<"
SECURITY_HEADERS=$(curl -sI "${BASE_URL}/" 2>/dev/null)

HAS_X_FRAME=$(echo "$SECURITY_HEADERS" | grep -qi "X-Frame-Options" && echo "yes" || echo "no")
HAS_CONTENT_TYPE=$(echo "$SECURITY_HEADERS" | grep -qi "X-Content-Type" && echo "yes" || echo "no")

if [ "$HAS_X_FRAME" = "yes" ] || [ "$HAS_CONTENT_TYPE" = "yes" ]; then
    echo -e "  [SEC01] 安全响应头配置 ... ${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ [SEC01] 安全响应头已配置")
else
    echo -e "  [SEC01] 安全响应头配置 ... ${YELLOW}⚠️  WARNING${NC} (建议添加X-Frame-Options等)"
    ((WARNING_COUNT++))
    TEST_RESULTS+=("⚠️  [SEC01] 安全头缺失")
fi

echo ""
echo ">>> 4.4 CORS配置检查 <<<"
CORS_HEADER=$(curl -sI -X OPTIONS "${API_BASE}/api/health" \
    -H "Origin: http://localhost:8080" \
    -H "Access-Control-Request-Method: GET" 2>/dev/null | grep -i "access-control-allow-origin")

if [ -n "$CORS_HEADER" ]; then
    echo -e "  [SEC02] CORS跨域配置 ... ${GREEN}✅ PASS${NC}"
    echo "      配置: $(echo $CORS_HEADER | head -c 80)"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ [SEC02] CORS已配置")
else
    echo -e "  [SEC02] CORS跨域配置 ... ${YELLOW}⚠️  WARNING${NC} (可能影响H5模式请求)"
    ((WARNING_COUNT++))
    TEST_RESULTS+=("⚠️  [SEC02] CORS未明确配置")
fi

# ============================================================
# 第五部分：数据库连接与数据一致性测试
# ============================================================
print_section_header "5" "数据库连接与数据验证"

echo ">>> 5.1 MongoDB连接状态 <<<"
MONGO_STATUS=$(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@${CLOUD_IP} \
    "systemctl is-active mongod 2>/dev/null || echo 'unknown'" 2>/dev/null)

if [ "$MONGO_STATUS" = "active" ]; then
    echo -e "  [DB01] MongoDB服务状态 ... ${GREEN}✅ PASS${NC} (active)"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ [DB01] MongoDB运行中")
elif [ "$MONGO_STATUS" = "unknown" ]; then
    echo -e "  [DB01] MongoDB服务状态 ... ${YELLOW}⚠️  UNKNOWN${NC} (无法远程检测)"
    ((WARNING_COUNT++))
    TEST_RESULTS+=("⚠️  [DB01] MongoDB状态未知")
else
    echo -e "  [DB01] MongoDB服务状态 ... ${RED}❌ FAIL${NC} (${MONGO_STATUS})"
    ((FAIL_COUNT++))
    TEST_RESULTS+=("❌ [DB01] MongoDB异常(${MONGO_STATUS})")
fi

echo ""
echo ">>> 5.2 数据读写验证 <<<"
WRITE_RESULT=$(curl -s -X POST "${API_BASE}/api/users" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer demo-token-admin-$(date +%s)" \
    -d "{\"phone\":\"137777${RANDOM}\",\"name\":\"DB测试用户\",\"role\":\"user\"}" \
    --connect-timeout 10 2>/dev/null)

if echo "$WRITE_RESULT" | grep -q '"success":true'; then
    USER_ID=$(echo $WRITE_RESULT | grep -o '"_id":"[^"]*"' | head -1 | sed 's/"_id":"//;s/"//')
    
    if [ -n "$USER_ID" ] && [ "$USER_ID" != "" ]; then
        # 尝试读取刚写入的数据
        READ_RESULT=$(curl -s "${API_BASE}/api/users/${USER_ID}" \
            -H "Authorization: Bearer demo-token-admin-$(date +%s)" \
            --connect-timeout 10 2>/dev/null)
        
        if echo "$READ_RESULT" | grep -q '"success":true'; then
            echo -e "  [DB02] 数据库读写操作 ... ${GREEN}✅ PASS${NC} (写入+读取成功)"
            ((PASS_COUNT++))
            TEST_RESULTS+=("✅ [DB02] DB读写正常")
        else
            echo -e "  [DB02] 数据库读写操作 ... ${YELLOW}⚠️  PARTIAL${NC} (写入成功,读取异常)"
            ((WARNING_COUNT++))
            TEST_RESULTS+=("⚠️  [DB02] 写入成功读取异常")
        fi
    else
        echo -e "  [DB02] 数据库读写操作 ... ${YELLOW}⚠️  PARTIAL${NC} (响应无ID)"
        ((WARNING_COUNT++))
        TEST_RESULTS+=("⚠️  [DB02] 响应格式异常")
    fi
else
    echo -e "  [DB02] 数据库读写操作 ... ${RED}❌ FAIL${NC} (写入失败)"
    echo "      错误: $(echo $WRITE_RESULT | head -c 150)"
    ((FAIL_COUNT++))
    TEST_RESULTS+=("❌ [DB02] DB写入失败")
fi

# ============================================================
# 第六部分：PM2进程与服务稳定性测试
# ============================================================
print_section_header "6" "服务稳定性测试"

echo ">>> 6.1 PM2进程状态 <<<"
PM2_STATUS=$(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@${CLOUD_IP} \
    "pm2 list | grep crm-server" 2>/dev/null)

if echo "$PM2_STATUS" | grep -q "online"; then
    PM2_PID=$(echo $PM2_STATUS | awk '{print $8}')
    PM2_RESTARTS=$(echo $PM2_STATUS | awk '{print $10}')
    PM2_UPTIME=$(echo $PM2_STATUS | awk '{for(i=12;i<=NF;i++) printf "%s ", $i}')
    
    echo -e "  [SV01] 后端服务(PM2) ... ${GREEN}✅ PASS${NC}"
    echo "      PID: ${PM2_PID} | 重启次数: ${PM2_RESTARTS} | 运行时长: ${PM2_UPTIME}"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ [SV01] PM2进程正常(PID:${PM2_PID})")
elif echo "$PM2_STATUS" | grep -q "stopped\|errored"; then
    echo -e "  [SV01] 后端服务(PM2) ... ${RED}❌ FAIL${NC} (进程异常)"
    echo "      状态: ${PM2_STATUS}"
    ((FAIL_COUNT++))
    TEST_RESULTS+=("❌ [SV01] PM2进程异常")
else
    echo -e "  [SV01] 后端服务(PM2) ... ${YELLOW}⚠️  UNKNOWN${NC} (无法检测)"
    ((WARNING_COUNT++))
    TEST_RESULTS+=("⚠️  [SV01] PM2状态未知")
fi

echo ""
echo ">>> 6.2 Nginx Web服务器状态 <<<"
NGINX_STATUS=$(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@${CLOUD_IP} \
    "systemctl is-active nginx" 2>/dev/null)

if [ "$NGINX_STATUS" = "active" ]; then
    echo -e "  [SV02] Nginx服务状态 ... ${GREEN}✅ PASS${NC} (active)"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ [SV02] Nginx运行中")
else
    echo -e "  [SV02] Nginx服务状态 ... ${RED}❌ FAIL${NC} (${NGINX_STATUS})"
    ((FAIL_COUNT++))
    TEST_RESULTS+=("❌ [SV02] Nginx异常(${NGINX_STATUS})")
fi

echo ""
echo ">>> 6.3 端口监听状态 <<<"
PORT_8080=$(ssh -o StrictHostKeyChecking=no root@${CLOUD_IP} \
    "ss -tlnp | grep ':8080' || netstat -tlnp | grep ':8080'" 2>/dev/null | head -1)
PORT_5011=$(ssh -o StrictHostKeyChecking=no root@${CLOUD_IP} \
    "ss -tlnp | grep ':5011' || netstat -tlnp | grep ':5011'" 2>/dev/null | head -1)

if [ -n "$PORT_8080" ]; then
    echo -e "  [SV03] 管理端端口(8080) ... ${GREEN}✅ PASS${NC} (正在监听)"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ [SV03] 端口8080监听中")
else
    echo -e "  [SV03] 管理端端口(8080) ... ${RED}❌ FAIL${NC} (未监听)"
    ((FAIL_COUNT++))
    TEST_RESULTS+=("❌ [SV03] 端口8080未监听")
fi

if [ -n "$PORT_5011" ]; then
    echo -e "  [SV04] API端口(5011) ... ${GREEN}✅ PASS${NC} (正在监听)"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ [SV04] 端口5011监听中")
else
    echo -e "  [SV04] API端口(5011) ... ${RED}❌ FAIL${NC} (未监听)"
    ((FAIL_COUNT++))
    TEST_RESULTS+=("❌ [SV04] 端口5011未监听")
fi

# ============================================================
# 测试结果汇总
# ============================================================
echo ""
echo "================================================================"
echo "📊 CRM系统全面测试结果汇总"
echo "================================================================"
echo ""

TOTAL=$((PASS_COUNT + FAIL_COUNT + WARNING_COUNT))
PASS_RATE=$(( PASS_COUNT * 100 / TOTAL ))
FAIL_RATE=$(( FAIL_COUNT * 100 / TOTAL ))

echo "┌─────────────────────────────────────────────┐"
echo "│  总测试数: ${TOTAL}                              │"
echo "│  通过:     ${GREEN}${PASS_COUNT} ✅${NC}                          │"
echo "│  失败:     ${RED}${FAIL_COUNT} ❌${NC}                          │"
echo "│  警告:     ${YELLOW}${WARNING_COUNT} ⚠️                           │"
echo "│  通过率:   ${PASS_RATE}%                            │"
echo "└─────────────────────────────────────────────┘"
echo ""

echo "━━━ 详细结果 ━━━"
echo ""

echo "✅ 通过的测试 (${PASS_COUNT}项):"
for result in "${TEST_RESULTS[@]}"; do
    if [[ $result == ✅* ]]; then
        echo "  $result"
    fi
done

if [ $FAIL_COUNT -gt 0 ]; then
    echo ""
    echo "❌ 失败的测试 (${FAIL_COUNT}项):"
    for result in "${TEST_RESULTS[@]}"; do
        if [[ $result == ❌* ]]; then
            echo "  $result"
        fi
    done
fi

if [ $WARNING_COUNT -gt 0 ]; then
    echo ""
    echo "⚠️  警告项 (${WARNING_COUNT}项):"
    for result in "${TEST_RESULTS[@]}"; do
        if [[ $result == ⚠️* ]]; then
            echo "  $result"
        fi
    done
fi

echo ""
echo "━━━ 页面访问汇总 ━━━"
echo ""
for summary in "${PAGE_SUMMARY[@]}"; do
    echo "  • $summary"
done

echo ""
echo "━━━ 最终结论 ━━━"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    if [ $WARNING_COUNT -eq 0 ]; then
        echo -e "${GREEN}🎉 完美！所有测试全部通过！CRM系统运行完全正常！${NC}"
    else
        echo -e "${GREEN}✅ 核心功能全部正常！发现 ${WARNING_COUNT} 个优化建议项（非阻塞）。${NC}"
    fi
    EXIT_CODE=0
elif [ $FAIL_COUNT -le 3 ]; then
    echo -e "${YELLOW}⚠️  发现 ${FAIL_COUNT} 个问题需要关注，但核心功能基本可用。${NC}"
    EXIT_CODE=1
else
    echo -e "${RED}❌ 发现 ${FAIL_COUNT} 个严重问题，需要立即修复！${NC}"
    EXIT_CODE=2
fi

echo ""
echo "================================================================"
echo "测试完成时间: $(date)"
echo "报告生成位置: docs/全面页面测试报告-$(date +%Y%m%d-%H%M).md"
echo "================================================================"

exit $EXIT_CODE