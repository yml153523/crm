const WebSocket = require('ws');
const http = require('http');
const RedPacket = require('../models/RedPacket');
const RedPacketRecord = require('../models/RedPacketRecord');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.heartbeatInterval = 30000;
    this.heartbeatTimer = null;
  }

  initialize(server) {
    if (this.wss) {
      console.warn('WebSocket服务已初始化');
      return;
    }

    this.wss = new WebSocket.Server({
      server,
      path: '/ws/red-packets',
      clientTracking: true,
      maxPayload: 1024 * 1024
    });

    this.setupConnectionHandler();
    this.startHeartbeat();

    console.log('✅ WebSocket 服务已启动 (路径: /ws/red-packets)');
  }

  setupConnectionHandler() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientInfo = {
        id: clientId,
        ws,
        connectedAt: new Date(),
        subscriptions: new Set(),
        isAdmin: false,
        userId: null
      };

      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      const role = url.searchParams.get('role');

      if (role === 'admin') {
        clientInfo.isAdmin = true;
      }

      if (token) {
        try {
          const decoded = this.verifyToken(token);
          clientInfo.userId = decoded.id || decoded.userId;
        } catch (e) {
          console.warn('WebSocket token验证失败:', e.message);
        }
      }

      this.clients.set(clientId, clientInfo);
      ws.clientId = clientId;

      console.log(`🔌 WebSocket客户端连接: ${clientId} (管理员: ${clientInfo.isAdmin})`);

      this.send(ws, {
        type: 'connection',
        data: { clientId, message: '连接成功', timestamp: new Date() }
      });

      ws.on('message', (data) => {
        this.handleMessage(clientId, data);
      });

      ws.on('close', (code, reason) => {
        console.log(`❌ WebSocket客户端断开: ${clientId} (code: ${code}, reason: ${reason})`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket错误 (${clientId}):`, error.message);
        this.clients.delete(clientId);
      });

      ws.on('pong', () => {
        clientInfo.isAlive = true;
      });
    });
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  verifyToken(token) {
    if (!token) throw new Error('Token为空');

    try {
      const jwt = require('jsonwebtoken');
      return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (e) {
      throw new Error('Token无效或已过期');
    }
  }

  handleMessage(clientId, data) {
    try {
      const message = JSON.parse(data);
      const client = this.clients.get(clientId);

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(client, message.data);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(client, message.data);
          break;
        case 'ping':
          this.send(client.ws, { type: 'pong', timestamp: new Date() });
          break;
        default:
          console.warn(`未知消息类型: ${message.type}`);
      }
    } catch (error) {
      console.error(`处理消息失败 (${clientId}):`, error);
    }
  }

  handleSubscribe(client, data) {
    if (!data || !data.channels) return;

    const channels = Array.isArray(data.channels) ? data.channels : [data.channels];
    channels.forEach(channel => {
      client.subscriptions.add(channel);
    });

    this.send(client.ws, {
      type: 'subscribed',
      data: {
        channels: Array.from(client.subscriptions),
        message: `已订阅 ${channels.length} 个频道`
      }
    });
  }

  handleUnsubscribe(client, data) {
    if (!data || !data.channels) return;

    const channels = Array.isArray(data.channels) ? data.channels : [data.channels];
    channels.forEach(channel => {
      client.subscriptions.delete(channel);
    });

    this.send(client.ws, {
      type: 'unsubscribed',
      data: {
        channels: Array.from(client.subscriptions)
      }
    });
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (!this.wss) return;

      this.wss.clients.forEach((ws) => {
        const client = this.clients.get(ws.clientId);

        if (!client || !client.isAlive) {
          console.log(`💔 心跳超时，断开连接: ${ws.clientId}`);
          this.clients.delete(ws.clientId);
          return ws.terminate();
        }

        client.isAlive = false;
        ws.ping();
      });
    }, this.heartbeatInterval);
  }

  send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcast(channel, message, filterFn = null) {
    if (!this.wss) return;

    const payload = {
      ...message,
      channel,
      timestamp: new Date()
    };

    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.ws.readyState !== WebSocket.OPEN) return;

      const isSubscribed = !channel || client.subscriptions.has('*') || client.subscriptions.has(channel);
      const passesFilter = !filterFn || filterFn(client);

      if (isSubscribed && passesFilter) {
        this.send(client.ws, payload);
        sentCount++;
      }
    });

    return sentCount;
  }

  async broadcastClaimEvent(recordData) {
    try {
      const event = {
        type: 'claim_event',
        data: {
          recordId: recordData._id,
          redPacketId: recordData.redPacketId,
          userId: recordData.userId,
          userName: recordData.userName || '匿名用户',
          amount: recordData.amount,
          status: recordData.status,
          claimedAt: recordData.claimedAt
        }
      };

      const adminCount = this.broadcast('red_packet_claims', event, client => client.isAdmin);
      console.log(`📢 领取事件广播完成 - 管理员接收数: ${adminCount}`);
    } catch (error) {
      console.error('广播领取事件失败:', error);
    }
  }

  async broadcastStatsUpdate(redPacketId, stats) {
    const event = {
      type: 'stats_update',
      data: {
        redPacketId,
        stats,
        timestamp: new Date()
      }
    };

    this.broadcast(`red_packet_stats_${redPacketId}`, event);
  }

  async broadcastRedPacketStatusChange(redPacketId, oldStatus, newStatus) {
    const event = {
      type: 'status_change',
      data: {
        redPacketId,
        oldStatus,
        newStatus,
        timestamp: new Date()
      }
    };

    this.broadcast('red_packet_status', event);
  }

  getServerStats() {
    return {
      connectedClients: this.clients.size,
      adminClients: Array.from(this.clients.values()).filter(c => c.isAdmin).length,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  shutdown() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    if (this.wss) {
      this.clients.forEach((client) => {
        this.send(client.ws, { type: 'shutdown', message: '服务器正在关闭' });
        client.ws.close(1001, 'Server Shutdown');
      });

      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    console.log('WebSocket服务已关闭');
  }
}

module.exports = new WebSocketService();
