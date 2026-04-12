const Redis = require('ioredis');
const crypto = require('crypto');

class CacheService {
  constructor() {
    this.client = null;
    this.isEnabled = false;
    this.defaultTTL = 300;
    this.prefix = 'crm:redpacket:';
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  async initialize(config = {}) {
    try {
      const redisConfig = {
        host: config.host || process.env.REDIS_HOST || '127.0.0.1',
        port: config.port || process.env.REDIS_PORT || 6379,
        password: config.password || process.env.REDIS_PASSWORD,
        db: config.db || process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 10000,
        connectTimeout: 10000,
        commandTimeout: 5000
      };

      this.client = new Redis(redisConfig);

      this.client.on('connect', () => {
        console.log('✅ Redis缓存服务已连接');
        this.isEnabled = true;
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis连接错误:', err.message);
        this.isEnabled = false;
      });

      this.client.on('close', () => {
        console.warn('⚠️ Redis连接已关闭');
        this.isEnabled = false;
      });

      await this.client.connect();
      global.redisClient = this.client;

      return true;
    } catch (error) {
      console.warn('⚠️ Redis初始化失败，将使用无缓存模式:', error.message);
      this.isEnabled = false;
      return false;
    }
  }

  generateKey(namespace, identifier) {
    const hash = crypto.createHash('md5').update(JSON.stringify(identifier)).digest('hex');
    return `${this.prefix}${namespace}:${hash}`;
  }

  async get(key) {
    if (!this.isEnabled || !this.client) {
      this.stats.misses++;
      return null;
    }

    try {
      const data = await this.client.get(key);
      if (data) {
        this.stats.hits++;
        return JSON.parse(data);
      }
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('缓存读取失败:', error.message);
      this.stats.misses++;
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('缓存写入失败:', error.message);
      return false;
    }
  }

  async del(key) {
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      this.stats.deletes++;
      return true;
    } catch (error) {
      console.error('缓存删除失败:', error.message);
      return false;
    }
  }

  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const freshData = await fetchFn();
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttl);
    }
    return freshData;
  }

  async invalidatePattern(pattern) {
    if (!this.isEnabled || !this.client) return;

    try {
      const keys = await this.client.keys(`${this.prefix}${pattern}`);
      if (keys.length > 0) {
        await this.client.del(...keys);
        console.log(`🗑 已清除 ${keys.length} 个缓存项 (pattern: ${pattern})`);
      }
    } catch (error) {
      console.error('批量清除缓存失败:', error.message);
    }
  }

  async invalidateRedPacketCache(redPacketId) {
    await Promise.all([
      this.invalidatePattern(`redpacket:${redPacketId}:*`),
      this.invalidatePattern(`stats:*`)
    ]);
  }

  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: totalRequests > 0 ? ((this.stats.hits / totalRequests) * 100).toFixed(2) + '%' : 'N/A',
      isEnabled: this.isEnabled,
      isConnected: this.client?.status === 'ready'
    };
  }

  async clearStats() {
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  async healthCheck() {
    if (!this.client) {
      return { status: 'disconnected', message: 'Redis客户端未初始化' };
    }

    try {
      const startTime = Date.now();
      await this.client.ping();
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency: `${latency}ms`,
        memory: await this.client.info('memory').then(info => {
          const match = info.match(/used_memory_human:(.+)/);
          return match?.[1]?.trim() || 'unknown';
        })
      };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  async shutdown() {
    if (this.client) {
      await this.client.quit();
      this.isEnabled = false;
      console.log('Redis缓存服务已关闭');
    }
  }
}

module.exports = new CacheService();
