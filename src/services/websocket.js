class WebSocketClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.listeners = new Map();
    this.isConnected = false;
  }

  connect(token, role = 'user') {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.warn('WebSocket已连接或正在连接');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.host || window.location.host}/ws/red-packets?token=${token}&role=${role}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket连接成功');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connection', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`❌ WebSocket连接关闭: ${event.code} - ${event.reason}`);
        this.isConnected = false;
        this.emit('disconnected', { code: event.code, reason: event.reason });
        this.attemptReconnect(token, role);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case 'claim_event':
        this.emit('claim_event', message.data);
        break;
      case 'stats_update':
        this.emit('stats_update', message.data);
        break;
      case 'status_change':
        this.emit('status_change', message.data);
        break;
      case 'pong':
        break;
      default:
        this.emit('message', message);
    }
  }

  subscribe(channels) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket未连接，无法订阅');
      return;
    }

    const channelArray = Array.isArray(channels) ? channels : [channels];
    this.send({
      type: 'subscribe',
      data: { channels: channelArray }
    });
  }

  unsubscribe(channels) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const channelArray = Array.isArray(channels) ? channels : [channels];
    this.send({
      type: 'unsubscribe',
      data: { channels: channelArray }
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  attemptReconnect(token, role) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.connect(token, role);
      }, this.reconnectInterval * this.reconnectAttempts);
    } else {
      console.error('❌ 达到最大重连次数，停止重连');
      this.emit('reconnect_failed');
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件处理器错误 (${event}):`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
      this.isConnected = false;
    }
    this.listeners.clear();
    this.reconnectAttempts = this.maxReconnectAttempts;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      readyState: this.ws?.readyState
    };
  }
}

const wsClient = new WebSocketClient();
export default wsClient;
