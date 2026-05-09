interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

type MessageHandler = (data: any) => void;

interface RealTimeDataPoint {
  timestamp: number;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

class RealTimeDataManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();
  private dataBuffer: Map<string, RealTimeDataPoint[]> = new Map();
  private maxBufferSize = 100;
  private simulationInterval: ReturnType<typeof setInterval> | null = null;
  private isSimulating = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === 'connected') {
        resolve();
        return;
      }

      this.setState('connecting');

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('[RealTime] WebSocket connected');
          this.setState('connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('[RealTime] Message parse error:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('[RealTime] WebSocket closed:', event.code, event.reason);
          this.setState('disconnected');
          this.stopHeartbeat();

          if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('[RealTime] WebSocket error:', error);
          this.setState('error');
          reject(error);
        };
      } catch (error) {
        console.error('[RealTime] Connection failed:', error);
        this.setState('error');
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.stopSimulation();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }

    this.setState('disconnected');
    this.reconnectAttempts = this.config.maxReconnectAttempts;
  }

  getState(): ConnectionState {
    return this.state;
  }

  onStateChange(callback: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  subscribe(channel: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(channel)) {
      this.messageHandlers.set(channel, new Set());
    }
    this.messageHandlers.get(channel)!.add(handler);

    if (this.ws && this.state === 'connected') {
      this.send({ type: 'subscribe', channel });
    }

    return () => {
      const handlers = this.messageHandlers.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(channel);
          if (this.ws && this.state === 'connected') {
            this.send({ type: 'unsubscribe', channel });
          }
        }
      }
    };
  }

  send(data: any): boolean {
    if (this.ws && this.state === 'connected') {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('[RealTime] Send error:', error);
        return false;
      }
    }
    console.warn('[RealTime] Cannot send: not connected');
    return false;
  }

  getHistoricalData(channel: string, limit?: number): RealTimeDataPoint[] {
    const data = this.dataBuffer.get(channel) || [];
    return limit ? data.slice(-limit) : [...data];
  }

  startSimulation(): void {
    if (this.isSimulating) return;

    this.isSimulating = true;
    console.log('[RealTime] Starting simulation mode');

    this.simulationInterval = setInterval(() => {
      this.generateSimulatedData();
    }, 2000);

    this.setState('connected');
  }

  stopSimulation(): void {
    if (!this.isSimulating) return;

    this.isSimulating = false;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    console.log('[RealTime] Stopped simulation mode');
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.stateListeners.forEach(listener => {
        try {
          listener(newState);
        } catch (error) {
          console.error('[RealTime] State listener error:', error);
        }
      });

      console.log(`[RealTime] State changed: ${oldState} -> ${newState}`);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.state === 'connected') {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.setState('reconnecting');
    this.reconnectAttempts++;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    );

    console.log(`[RealTime] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('[RealTime] Reconnect failed:', error);
      });
    }, delay);
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'pong':
        break;

      case 'data':
        this.bufferData(data.channel, data.payload);
        this.notifySubscribers(data.channel, data.payload);
        break;

      case 'subscription_confirmed':
        console.log(`[RealTime] Subscribed to ${data.channel}`);
        break;

      default:
        console.log('[RealTime] Received:', data.type, data);
    }
  }

  private bufferData(channel: string, payload: any): void {
    if (!this.dataBuffer.has(channel)) {
      this.dataBuffer.set(channel, []);
    }

    const buffer = this.dataBuffer.get(channel)!;
    buffer.push({
      timestamp: Date.now(),
      value: typeof payload.value !== 'undefined' ? payload.value : payload,
      label: payload.label,
      metadata: payload.metadata
    });

    while (buffer.length > this.maxBufferSize) {
      buffer.shift();
    }
  }

  private notifySubscribers(channel: string, data: any): void {
    const handlers = this.messageHandlers.get(channel);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('[RealTime] Handler error for channel', channel, ':', error);
        }
      });
    }

    const wildcardHandlers = this.messageHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler({ channel, data });
        } catch (error) {
          console.error('[RealTime] Wildcard handler error:', error);
        }
      });
    }
  }

  private generateSimulatedData(): void {
    const now = Date.now();
    const channels = [
      'visitors',
      'conversions',
      'orders',
      'revenue',
      'video_views',
      'course_enrollments',
      'product_views',
      'cart_additions'
    ];

    channels.forEach(channel => {
      let baseValue: number;
      let variance: number;

      switch (channel) {
        case 'visitors':
          baseValue = 150 + Math.random() * 50;
          variance = 30;
          break;
        case 'conversions':
          baseValue = 25 + Math.random() * 15;
          variance = 8;
          break;
        case 'orders':
          baseValue = 18 + Math.random() * 10;
          variance = 5;
          break;
        case 'revenue':
          baseValue = 8500 + Math.random() * 3000;
          variance = 1200;
          break;
        case 'video_views':
          baseValue = 320 + Math.random() * 80;
          variance = 40;
          break;
        case 'course_enrollments':
          baseValue = 12 + Math.random() * 8;
          variance = 4;
          break;
        case 'product_views':
          baseValue = 85 + Math.random() * 35;
          variance = 15;
          break;
        case 'cart_additions':
          baseValue = 22 + Math.random() * 12;
          variance = 6;
          break;
        default:
          baseValue = 100;
          variance = 20;
      }

      const value = baseValue + (Math.random() - 0.5) * variance;
      const payload = {
        value: Math.round(value),
        label: this.getChannelLabel(channel),
        metadata: {
          trend: Math.random() > 0.5 ? 'up' : 'down',
          changePercent: (Math.random() - 0.5) * 10
        }
      };

      this.bufferData(channel, payload);
      this.notifySubscribers(channel, payload);
    });
  }

  private getChannelLabel(channel: string): string {
    const labels: Record<string, string> = {
      visitors: '访客数',
      conversions: '转化数',
      orders: '订单数',
      revenue: '收入',
      video_views: '视频观看',
      course_enrollments: '课程报名',
      product_views: '商品浏览',
      cart_additions: '加入购物车'
    };
    return labels[channel] || channel;
  }

  getAvailableChannels(): string[] {
    return Array.from(this.messageHandlers.keys());
  }

  getStatistics(): {
    totalMessagesReceived: number;
    bufferSize: number;
    activeSubscriptions: number;
    uptime: number;
    state: ConnectionState;
  } {
    let totalSize = 0;
    this.dataBuffer.forEach(buffer => totalSize += buffer.length);

    return {
      totalMessagesReceived: totalSize,
      bufferSize: totalSize,
      activeSubscriptions: this.messageHandlers.size,
      uptime: 0,
      state: this.state
    };
  }
}

const realTimeManager = new RealTimeDataManager({
  url: `ws://${window.location.hostname}:8080/realtime`
});

export { realTimeManager, RealTimeDataManager };
export type { WebSocketConfig, ConnectionState, RealTimeDataPoint, MessageHandler };
