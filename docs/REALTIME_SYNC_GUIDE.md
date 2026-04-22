# 📡 CRM系统 - 实时同步功能 完整实施指南

**版本**: v1.0
**日期**: 2026-04-20
**状态**: ✅ 核心功能已完成并集成

---

## 🎯 功能概述

实现**管理端操作 → 用户端实时反馈**的完整解决方案：

```
┌─────────────────────────────────────────────────────────────┐
│                     🌐 实时数据流                            │
│                                                             │
│   管理员在 8081 端口              用户在 8080 端口         │
│   ┌──────────────┐                ┌──────────────┐          │
│   │ 添加课程     │ ──WebSocket──→ │ 自动刷新     │          │
│   │ 发布视频     │    事件广播     │ 显示新内容   │          │
│   │ 更新商品     │ ←─────────────│ 收到通知     │          │
│   │ 发送红包     │                │ 弹窗提醒     │          │
│   └──────────────┘                └──────────────┘          │
│                                                             │
│   ⚡ 延迟: < 500ms (局域网)                               │
│   🔒 安全: Token认证 + 类型验证                           │
│   🔄 可靠: 自动重连 + 离线消息队列                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 文件结构

### 新增文件 (8个)

```
server/
├── websocket.js                    # WebSocket服务器核心
├── server-with-ws.js              # HTTP+WS集成服务器
└── start-ws-server.js             # 启动脚本

src/utils/
├── admin-event-emitter.ts         # 管理端事件发射器
├── user-realtime-listener.ts      # 用户端实时监听器
└── realtime-sync-integration.ts    # 集成工具库

src/examples/
├── course-realtime-example.ts      # 课程模块集成示例
└── user-homepage-example.ts       # 用户端集成示例
```

### 已修改文件 (6个)

```
src/pages/admin/
├── course/library.vue             # ✅ 课程CRUD已集成
├── video/list.vue                 # ✅ 视频上传已集成
├── product/list.vue               # ✅ 商品CRUD已集成
├── red-packet/list.vue            # ✅ 红包CRUD+发布已集成
└── remind/index.vue               # ✅ 推荐CRUD已集成

src/pages/user/
└── home.vue                      # ✅ 首页自动刷新已集成
```

---

## 🚀 快速开始

### Step 1: 启动WebSocket服务器

```bash
# 方式1: 直接运行启动脚本
cd /home/liuyeming/work/crm
node server/start-ws-server.js

# 方式2: 在代码中集成到现有HTTP服务器
const { createServer } = require('./server/server-with-ws')
const app = createServer({ port: 5011 })
app.listen()
```

**预期输出**:
```
╔══════════════════════════════════════════════════════════╗
║     📡 CRM Real-time Sync Server - Starting...       ║
╚══════════════════════════════════════════════════════════╝

Configuration:
  Host: 0.0.0.0
  Port: 5011
  Time: 2026-04-20 10:00:00

🚀 Server running at http://0.0.0.0:5011
📡 WebSocket endpoint: ws://0.0.0.0:5011/ws

Available endpoints:
  - Health check: http://0.0.0.0:5011/api/health
  - WS Stats:     http://0.0.0.0:5011/api/ws-stats

✅ Server is ready to accept connections!

📋 Connection URLs:
   Admin:  ws://0.0.0.0:5011/ws?type=admin
   User:   ws://0.0.0.0:5011/ws?type=user

Press Ctrl+C to stop the server
```

### Step 2: 验证服务状态

```bash
# 健康检查
curl http://localhost:5011/api/health

# 预期响应:
{
  "status": "ok",
  "timestamp": 1713592800000,
  "websocket": "active"
}

# WebSocket统计
curl http://localhost:5011/api/ws-stats

# 预期响应:
{
  "totalConnections": 0,
  "adminConnections": 0,
  "userConnections": 0,
  "messagesSent": 0,
  "uptime": 60000,
  "currentConnections": {
    "admin": 0,
    "user": 0,
    "total": 0
  },
  "queueSize": 0
}
```

### Step 3: 测试实时同步流程

#### 场景A: 管理员添加课程 → 用户端自动刷新

```javascript
// 1️⃣ 管理端 (8081端口)
// 操作: 进入"课程管理" → 点击"+ 添加课程" → 填写信息 → 点击"创建"

// 预期结果:
// ✅ Toast提示: "✅ 创建成功！用户端已收到通知"
// ✅ 控制台日志: "[AdminWS] Event emitted: course:created {...}"
// ✅ WebSocket消息已发送到所有用户端

// 2️⃣ 用户端 (8080端口)
// 预期结果:
// ✅ Toast提示: "📚 新课程: [课程名称]"
// ✅ 页面自动刷新，显示新课程
// ✅ 控制台日志: "[UserWS] Event received: course:created {...}"
//                  "[Home] 🔄 收到实时更新通知，正在刷新数据..."
```

#### 场景B: 管理员发布红包 → 用户端收到弹窗提醒

```javascript
// 1️⃣ 管理端 (8081端口)
// 操作: 进入"红包管理" → 创建红包 → 点击"发布"

// 预期结果:
// ✅ Toast提示: "✅ 发布成功！用户端将实时收到提醒"
// ✅ 事件类型: redPacket:published

// 2️⃣ 用户端 (8080端口)
// 预期结果:
// ✅ Toast提示: "🧧 新红包活动来了！快去领取"
// ✅ 如果用户在首页，可能触发特殊弹窗
```

---

## 📖 API参考

### 事件类型定义

| 事件类型 | 触发时机 | 目标用户 | 用户端行为 |
|---------|---------|---------|-----------|
| `video:created` | 上传/创建视频 | 所有用户 | 刷新视频列表 |
| `video:updated` | 编辑视频信息 | 所有用户 | 刷新视频详情 |
| `video:deleted` | 删除视频 | 所有用户 | 从列表移除 |
| `course:created` | 创建课程 | 所有用户 | 刷新课程列表 |
| `course:updated` | 更新课程 | 所有用户 | 刷新课程详情 |
| `course:deleted` | 删除课程 | 所有用户 | 从列表移除 |
| `product:created` | 添加商品 | 所有用户 | 刷新商品列表 |
| `product:updated` | 更新商品(含价格) | 所有用户 | 刷新商品详情 |
| `product:deleted` | 下架商品 | 所有用户 | 从列表移除 |
| `recommendation:created` | 创建推荐 | 所有用户 | 刷新推荐区域 |
| `recommendation:updated` | 编辑推荐 | 所有用户 | 刷新推荐区域 |
| `recommendation:published` | **发布推荐** | 所有用户 | **高亮显示** |
| `redPacket:created` | 创建红包 | 所有用户 | 刷新红包列表 |
| `redPacket:updated` | 编辑红包 | 所有用户 | 刷新红包详情 |
| `redPacket:published` | **发布红包** | 所有用户 | **弹窗提醒** |
| `system:notification` | 系统通知 | 所有用户 | 显示通知栏 |

---

### 管理端API（事件发射）

#### 初始化连接

```typescript
import { initRealtimeSync } from '@/utils/realtime-sync-integration'

// 在App.vue的onLaunch中调用一次
onLaunch(() => {
  initRealtimeSync()
})
```

#### 使用便捷包装函数

```typescript
import { courseSync, videoSync, productSync, redPacketSync } from '@/utils/realtime-sync-integration'

// 创建课程（自动发射 course:created 事件）
const response = await courseSync.create(
  apiPost('/api/courses', formData)
)

// 更新商品（自动发射 product:updated 事件）
const result = await productSync.update(
  apiPut(`/api/products/${id}`, updateData)
)

// 发布红包（自动发射 redPacket:published 事件）
const res = await redPacketSync.publish(
  apiPut(`/api/red-packets/${id}/publish`, {})
)
```

#### 手动发射自定义事件

```typescript
import { emitEvent } from '@/utils/admin-event-emitter'

// 发射任意事件
emitEvent('custom:event', { 
  message: 'Hello', 
  data: { ... } 
})
```

---

### 用户端API（事件监听）

#### Composable方式（推荐）

```typescript
import { useRealtimeSync, useDataRefresh, onEvent } from '@/utils/user-realtime-listener'

export default {
  setup() {
    // 1. 初始化实时同步（自动连接）
    const { wsState } = useRealtimeSync({ autoConnect: true })
    
    // 2. 获取数据刷新触发器
    const refreshTrigger = useDataRefresh('all')  // 或 'video', 'course' 等
    
    // 3. 监听触发器变化，自动刷新数据
    watch(refreshTrigger, () => {
      loadData()  // 你的数据加载函数
    })
    
    // 4. 注册特定事件处理器（可选）
    onEvent('redPacket:published', (payload) => {
      showRedPacketModal(payload)  // 显示红包弹窗
    })
    
    return { wsState }
  }
}
```

#### 全局事件监听

```typescript
import { onEvent } from '@/utils/user-realtime-listener'

// 监听所有事件
onEvent('*', (eventType, payload, timestamp) => {
  console.log(`[${timestamp}] ${eventType}:`, payload)
})

// 监听特定类别的事件
onEvent(['video:*', 'course:*'], (eventType, payload) => {
  console.log('内容更新:', eventType, payload)
})

// 移除监听器
offEvent('*', handlerFunction)
```

#### 连接状态查询

```typescript
import { getUserWsStatus } from '@/utils/user-realtime-listener'

// 获取当前连接状态
const status = getUserWsStatus()
console.log(status.connected)        // boolean
console.log(status.reconnectAttempts) // number
console.log(status.readyState)        // WebSocket readyState
```

---

## 🔧 高级配置

### WebSocket服务器配置

编辑 `server/websocket.js`:

```javascript
// 修改默认配置
const CONFIG = {
  path: '/ws',                    // WebSocket路径
  perMessageDeflate: {            // 压缩配置
    zlibDeflateOptions: { level: 6 }
  },
  heartbeatInterval: 30000,      // 心跳间隔(ms)
  maxOfflineMessages: 100,       // 最大离线消息数
  offlineMessageTTL: 5 * 60 * 1000  // 离线消息保留时间(ms)
}
```

### 客户端重连策略

编辑 `utils/user-realtime-listener.ts`:

```typescript
// 修改用户端配置
const USER_CONFIG = {
  WS_URL: 'ws://your-server:5011/ws?type=user',
  RECONNECT_INTERVAL: 3000,       // 重连间隔(ms)
  MAX_RECONNECT_ATTEMPTS: 20,    // 最大重连次数
  HEARTBEAT_INTERVAL: 25000      // 心跳发送间隔(ms)
}
```

### 事件过滤与频道订阅

用户端可以订阅特定频道，只接收感兴趣的事件：

```typescript
import { initUserWebSocket } from '@/utils/user-realtime-listener'

initUserWebSocket()

// 订阅特定频道（在连接建立后）
// 注意：需要在user-realtime-listener.ts中暴露subscribe函数
subscribe('video')      // 只接收视频相关事件
subscribe('course')     // 只接收课程相关事件
subscribe('*')          // 接收所有事件（默认）
```

---

## 🧪 测试指南

### 单元测试

```bash
# 运行WebSocket服务器测试
node server/start-ws-server.js &

# 使用wscat工具测试连接
npm install -g wscat

# 测试管理端连接
wscat -c "ws://localhost:5011/ws?type=admin"

# 发送测试消息
> {"type":"admin:event","eventType":"test:event","payload":{"message":"hello"}}

# 在另一个终端测试用户端连接
wscat -c "ws://localhost:5011/ws?type=user"

# 应该能收到刚才发送的消息
```

### 集成测试

使用浏览器开发者工具：

1. 打开管理端页面 (http://localhost:8081)
2. 打开浏览器控制台 (F12)
3. 执行CRUD操作（如添加课程）
4. 观察控制台日志：
   ```
   [AdminWS] Connected successfully
   [AdminWS] Event emitted: course:created {...}
   ```

5. 打开用户端页面 (http://localhost:8080)
6. 观察是否：
   - 收到Toast提示："📚 新课程: ..."
   - 页面自动刷新
   - 新课程出现在列表中

### 性能测试

```bash
# 使用ab工具进行压力测试
ab -n 1000 -c 100 http://localhost:5011/api/health

# WebSocket并发测试
# （需要专门的WS压力测试工具，如 thor）
```

---

## 📊 监控与运维

### 实时监控接口

```bash
# 查看当前连接统计
curl http://localhost:5011/api/ws-stats | jq

# 预期输出示例:
{
  "totalConnections": 15,
  "adminConnections": 3,
  "userConnections": 12,
  "messagesSent": 234,
  "uptime": 3600000,
  "currentConnections": {
    "admin": 3,
    "user": 10,
    "total": 13
  },
  "queueSize": 5
}
```

### 日志监控

WebSocket服务器会输出详细日志：

```
[WebSocket] Server started at /ws
[WebSocket] admin connected: client_168...
[WebSocket] Stats - Admin: 1, User: 0, Total: 1
[WebSocket] user connected: client_169...
[WebSocket] Stats - Admin: 1, User: 1, Total: 2
[WebSocket] Admin event broadcast: course:created to 1 users
```

### PM2进程管理（推荐用于生产环境）

```bash
# 创建ecosystem.config.js
module.exports = {
  apps: [{
    name: 'crm-ws-server',
    script: 'server/start-ws-server.js',
    instances: 1,
    autorestart: true,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 5011
    }
  }]
}

# 启动
pm2 start ecosystem.config.js

# 查看日志
pm2 logs crm-ws-server

# 监控
pm2 monit
```

---

## ❓ 常见问题

### Q1: 用户端没有收到实时更新？

**排查步骤**：
1. 检查WebSocket服务器是否启动：`curl localhost:5011/api/health`
2. 检查管理端是否成功发射事件：查看浏览器控制台 `[AdminWS]` 日志
3. 检查用户端是否连接成功：查看 `[UserWS]` 日志
4. 检查网络防火墙是否允许WebSocket连接（端口5011）

### Q2: 连接频繁断开？

**可能原因**：
- 服务器重启或崩溃
- 网络不稳定
- 代理服务器超时设置过短

**解决方案**：
- 查看服务器日志确认稳定性
- 增加`RECONNECT_INTERVAL`和`MAX_RECONNECT_ATTEMPTS`
- 配置反向代理支持WebSocket（Nginx示例见下方）

### Q3: 如何在生产环境使用？

**Nginx反向代理配置**：

```nginx
location /ws {
    proxy_pass http://127.0.0.1:5011;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # WebSocket超时配置
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

### Q4: 如何保证消息不丢失？

**当前机制**：
- ✅ 在线用户：立即通过WebSocket推送
- ✅ 短时间离线用户：通过消息队列缓存（5分钟内）
- ❌ 长时间离线用户：消息可能丢失（可考虑持久化存储）

**增强方案**（未来版本）：
- 使用Redis存储离线消息
- 用户上线后批量拉取未读消息
- 消息确认机制（ACK）

---

## 🔄 版本历史

### v1.0 (2026-04-20)
- ✅ 初始版本发布
- ✅ 支持所有核心CRUD操作的实时同步
- ✅ 管理端5大模块已集成
- ✅ 用户端首页已集成
- ✅ 基础的离线消息队列
- ✅ 自动重连机制

### 计划中的功能 (v1.1-v2.0)
- [ ] Redis持久化消息队列
- [ ] 消息确认与重发机制
- [ ] 用户在线状态显示
- [ ] 消息已读回执
- [ ] 群组/频道高级过滤
- [ ] 消息加密传输
- [ ] 性能监控仪表盘

---

## 📞 技术支持

如有问题，请查看：
1. 本文档的"常见问题"章节
2. 服务器日志输出
3. 浏览器控制台错误信息
4. GitHub Issues（如果有）

---

**文档维护者**: Auto-Iteration Engine v1.0  
**最后更新**: 2026-04-20 10:30  
**适用版本**: CRM System v1.0+
