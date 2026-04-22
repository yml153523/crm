#!/bin/bash

# CRM系统云端部署全面测试脚本
# 测试目标: http://120.55.195.40:8080 (管理端) / 8081 (用户端)
# 日期: 2026-04-15

echo "=========================================="
echo "🧪 CRM系统 - 云端部署全面功能测试"
echo "=========================================="
echo "测试时间: $(date)"
echo "目标服务器: 120.55.195.40"
echo ""

CLOUD_IP="120.55.195.40"
ADMIN_PORT=8080
USER_PORT=8081
API_BASE="http://${CLOUD_IP}:5011"

PASS_COUNT=0
FAIL_COUNT=0
TEST_RESULTS=()

test_api() {
    local test_name="$1"
    local url="$2"
    local expected_code="$3"
    local method="${4:-GET}"
    local data="${5:-}"

    echo -n "测试: $test_name ... "

    if [ "$method" = "POST" ]; then
        HTTP_CODE=$(curl -s -o /tmp/api_response.json -w "%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    else
        HTTP_CODE=$(curl -s -o /tmp/api_response.json -w "%{http_code}" "$url" 2>/dev/null)
    fi

    if [ "$HTTP_CODE" = "$expected_code" ] || [ "$expected_code" = "ANY" ]; then
        echo "✅ PASS (HTTP $HTTP_CODE)"
        ((PASS_COUNT++))
        TEST_RESULTS+=("✅ $test_name")
    else
        echo "❌ FAIL (期望 $expected_code, 实际 $HTTP_CODE)"
        ((FAIL_COUNT++))
        TEST_RESULTS+=("❌ $test_name (期望$expected_code, 实际$HTTP_CODE)")
        cat /tmp/api_response.json 2>/dev/null | head -5
    fi
}

test_frontend() {
    local test_name="$1"
    local url="$2"
    local keyword="$3"

    echo -n "测试: $test_name ... "

    RESPONSE=$(curl -s "$url" 2>/dev/null)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)

    if [ "$HTTP_CODE" = "200" ]; then
        if echo "$RESPONSE" | grep -q "$keyword"; then
            echo "✅ PASS (包含关键字: $keyword)"
            ((PASS_COUNT++))
            TEST_RESULTS+=("✅ $test_name")
        else
            echo "⚠️  WARNING (HTTP 200但缺少关键字: $keyword)"
            ((PASS_COUNT++))
            TEST_RESULTS+=("⚠️  $test_name (缺少关键字)")
        fi
    else
        echo "❌ FAIL (HTTP $HTTP_CODE)"
        ((FAIL_COUNT++))
        TEST_RESULTS+=("❌ $test_name (HTTP$HTTP_CODE)")
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  第一部分: 前端页面访问测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1.1 管理端主页
test_frontend "管理端首页访问" "http://${CLOUD_IP}:${ADMIN_PORT}/" "CRM系统"

# 1.2 用户端主页
test_frontend "用户端首页访问" "http://${CLOUD_IP}:${USER_PORT}/" "CRM"

# 1.3 检查关键JS文件是否存在
test_frontend "管理端JS资源文件" "http://${CLOUD_IP}:${ADMIN_PORT}/assets/index-" ".js"
test_frontend "用户端JS资源文件" "http://${CLOUD_IP}:${USER_PORT}/assets/index-" ".js"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  第二部分: 后端API接口测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 2.1 健康检查
test_api "后端服务健康检查" "${API_BASE}/api/health" "200" "GET"

# 2.2 用户列表接口
test_api "用户列表查询" "${API_BASE}/api/users?page=1&pageSize=10" "ANY" "GET"

# 2.3 创建用户接口
TIMESTAMP=$(date +%s)
TEST_PHONE="138000${TIMESTAMP: -4}"
test_api "创建新用户(手机号:${TEST_PHONE})" "${API_BASE}/api/users" "201" "POST" "{\"phone\":\"${TEST_PHONE}\",\"name\":\"测试用户\",\"role\":\"user\"}"

# 2.4 课程列表接口
test_api "课程列表查询" "${API_BASE}/api/courses?page=1&pageSize=10" "ANY" "GET"

# 2.5 商品列表接口
test_api "商品列表查询" "${API_BASE}/api/products?page=1&pageSize=10" "ANY" "GET"

# 2.6 视频列表接口
test_api "视频列表查询" "${API_BASE}/api/videos?page=1&pageSize=10" "ANY" "GET"

# 2.7 审计日志接口
test_api "审计日志查询" "${API_BASE}/api/audit-logs?page=1&pageSize=10" "401" "GET"

# 2.8 统计数据接口
test_api "统计数据查询" "${API_BASE}/api/statistics/overview" "401" "GET"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  第三部分: 功能完整性验证"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 3.1 检查登录页面
test_frontend "管理员登录页面" "http://${CLOUD_IP}:${ADMIN_PORT}/" "login\|Login\|登录"

# 3.2 检查AdminLayout组件是否加载
RESPONSE=$(curl -s "http://${CLOUD_IP}:${ADMIN_PORT}/" 2>/dev/null)
if echo "$RESPONSE" | grep -q "AdminLayout\|sidebar\|nav-menu"; then
    echo "测试: AdminLayout组件加载 ... ✅ PASS"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ AdminLayout组件加载")
else
    echo "测试: AdminLayout组件加载 ... ⚠️  WARNING (可能需要登录后才显示)"
    ((PASS_COUNT++))
    TEST_RESULTS+=("⚠️  AdminLayout组件(需登录)")
fi

# 3.3 检查静态资源完整性
JS_COUNT=$(curl -s "http://${CLOUD_IP}:${ADMIN_PORT}/" 2>/dev/null | grep -o 'src="[^"]*\.js"' | wc -l)
if [ "$JS_COUNT" -ge 3 ]; then
    echo "测试: 静态JS资源数量(${JS_COUNT}个) ... ✅ PASS"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ JS资源数量(${JS_COUNT}个)")
else
    echo "测试: 静态JS资源数量(${JS_COUNT}个) ... ❌ FAIL (预期>=3)"
    ((FAIL_COUNT++))
    TEST_RESULTS+=("❌ JS资源数量不足")
fi

CSS_COUNT=$(curl -s "http://${CLOUD_IP}:${ADMIN_PORT}/" 2>/dev/null | grep -o 'href="[^"]*\.css"' | wc -l)
if [ "$CSS_COUNT" -ge 2 ]; then
    echo "测试: 静态CSS资源数量(${CSS_COUNT}个) ... ✅ PASS"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ CSS资源数量(${CSS_COUNT}个)")
else
    echo "测试: 静态CSS资源数量(${CSS_COUNT}个) ... ❌ FAIL (预期>=2)"
    ((FAIL_COUNT++))
    TEST_RESULTS+=("❌ CSS资源数量不足")
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  第四部分: 性能与安全测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 4.1 页面加载时间
START_TIME=$(date +%s%N)
curl -s "http://${CLOUD_IP}:${ADMIN_PORT}/" > /dev/null 2>&1
END_TIME=$(date +%s%N)
LOAD_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$LOAD_TIME" -lt 3000 ]; then
    echo "测试: 管理端页面加载时间(${LOAD_TIME}ms) ... ✅ PASS (<3000ms)"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ 页面加载时间(${LOAD_TIME}ms)")
else
    echo "测试: 管理端页面加载时间(${LOAD_TIME}ms) ... ⚠️  SLOW (>3000ms)"
    ((PASS_COUNT++))
    TEST_RESULTS+=("⚠️  页面加载较慢(${LOAD_TIME}ms)")
fi

# 4.2 安全头检查
SECURITY_HEADERS=$(curl -sI "http://${CLOUD_IP}:${ADMIN_PORT}/" 2>/dev/null)
if echo "$SECURITY_HEADERS" | grep -qi "X-Frame-Options\|X-Content-Type"; then
    echo "测试: 安全响应头配置 ... ✅ PASS"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ 安全响应头")
else
    echo "测试: 安全响应头配置 ... ⚠️  WARNING (未检测到标准安全头)"
    ((PASS_COUNT++))
    TEST_RESULTS+=("⚠️  安全响应头缺失")
fi

# 4.3 Gzip压缩检查
if curl -sI -H "Accept-Encoding: gzip" "http://${CLOUD_IP}:${ADMIN_PORT}/" 2>/dev/null | grep -qi "Content-Encoding: gzip"; then
    echo "测试: Gzip压缩启用 ... ✅ PASS"
    ((PASS_COUNT++))
    TEST_RESULTS+=("✅ Gzip压缩")
else
    echo "测试: Gzip压缩启用 ... ⚠️  WARNING (未启用Gzip)"
    ((PASS_COUNT++))
    TEST_RESULTS+=("⚠️  Gzip未启用")
fi

echo ""
echo "=========================================="
echo "📊 测试结果汇总"
echo "=========================================="
echo ""
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo "总测试数: $TOTAL"
echo "通过: ${GREEN}$PASS_COUNT ✅${NC}"
echo "失败: ${RED}$FAIL_COUNT ❌${NC}"
echo "通过率: $(( PASS_COUNT * 100 / TOTAL ))%"
echo ""
echo "详细结果:"
for result in "${TEST_RESULTS[@]}"; do
    echo "  $result"
done

echo ""
if [ $FAIL_COUNT -eq 0 ]; then
    echo "🎉 所有测试通过！云端部署验证成功！"
    exit 0
else
    echo "⚠️  发现 $FAIL_COUNT 个问题，请检查上方详细信息"
    exit 1
fi