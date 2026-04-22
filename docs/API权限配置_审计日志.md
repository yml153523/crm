# 审计日志 API 权限配置

## 权限等级定义

### 角色层级
1. **未登录用户 (anonymous)** - 无权限
2. **普通用户 (user)** - 基础查询权限
3. **管理员 (admin)** - 查询 + 导出权限
4. **超级管理员 (super_admin)** - 全部权限（含清理）

## API端点权限矩阵

| 端点 | 方法 | 匿名用户 | 普通用户 | 管理员 | 超级管理员 |
|------|------|---------|---------|--------|-----------|
| `/api/audit-logs` | GET | ❌ 401 | ✅ 200 | ✅ 200 | ✅ 200 |
| `/api/audit-logs/:id` | GET | ❌ 401 | ✅ 200 | ✅ 200 | ✅ 200 |
| `/api/audit-logs/statistics/overview` | GET | ❌ 401 | ✅ 200 | ✅ 200 | ✅ 200 |
| `/api/audit-logs/export` | POST | ❌ 401 | ❌ 403 | ✅ 200 | ✅ 200 |
| `/api/audit-logs/cleanup` | DELETE | ❌ 401 | ❌ 403 | ❌ 403 | ✅ 200 |

## 中间件配置详情

### 1. authenticateToken (JWT认证)
**作用**: 验证请求头中的Bearer Token  
**触发条件**: 所有审计日志API  
**失败响应**: 
- 无Token: `401 UNAUTHORIZED - 缺少认证令牌`
- Token过期: `401 TOKEN_EXPIRED - 认证令牌已过期`
- Token无效: `401 INVALID_TOKEN - 无效的认证令牌`

### 2. validateAdminRole (管理员角色)
**作用**: 验证用户角色为 admin 或 super_admin  
**适用接口**: POST /export  
**失败响应**: 
- 非管理员: `403 FORBIDDEN - 需要管理员权限`

### 3. validateSuperAdminRole (超级管理员)
**作用**: 验证用户角色为 super_admin  
**适用接口**: DELETE /cleanup  
**失败响应**: 
- 非超级管理员: `403 FORBIDDEN - 需要超级管理员权限`

## 使用示例

### 登录获取Token
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"admin","password":"admin123"}'

# 响应中包含 token
```

### 使用Token访问API
```bash
# 设置Token变量
TOKEN="eyJhbGciOiJIUzI1NiIs..."

# 查询日志列表
curl http://localhost:3001/api/audit-logs \
  -H "Authorization: Bearer $TOKEN"

# 导出日志（需要管理员）
curl -X POST http://localhost:3001/api/audit-logs/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 安全建议

1. **生产环境必须启用认证**
2. **Token有效期建议**: 7天（可配置）
3. **敏感操作需要多因素确认**
4. **定期轮换JWT_SECRET**
5. **监控异常登录行为**

---
**最后更新**: 2026-04-13
**版本**: v1.0
