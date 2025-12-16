import crypto from 'crypto';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

export interface ApiKey {
  key: string;
  name: string;
  userId: string;
  createdAt: number;
  expiresAt?: number;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  permissions: string[];
}

export interface ApiKeyUsage {
  requestCount: number;
  lastUsed: number;
  totalTokens: number;
}

export class ApiKeyManager {
  private redis: Redis | null = null;
  private useRedis: boolean;
  private memoryStore: Map<string, ApiKey> = new Map();
  private usageStore: Map<string, ApiKeyUsage> = new Map();

  constructor() {
    this.useRedis = process.env.REDIS_ENABLED === 'true';
    
    if (this.useRedis) {
      this.initRedis();
    } else {
      logger.warn('Redis disabled, using in-memory API key storage');
    }
  }

  private async initRedis() {
    try {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      
      this.redis.on('connect', () => {
        logger.info('Connected to Redis for API key storage');
      });

      this.redis.on('error', (error) => {
        logger.error('Redis connection error', { error: error.message });
      });
    } catch (error: any) {
      logger.error('Failed to initialize Redis', { error: error.message });
      this.useRedis = false;
    }
  }

  /**
   * Generate a new API key
   */
  generateKey(): string {
    const prefix = 'sk-ai';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}-${randomBytes}`;
  }

  /**
   * Create a new API key
   */
  async createApiKey(
    name: string,
    userId: string = 'default',
    options: {
      expiresInDays?: number;
      requestsPerMinute?: number;
      requestsPerDay?: number;
      permissions?: string[];
    } = {}
  ): Promise<ApiKey> {
    const key = this.generateKey();
    
    const apiKey: ApiKey = {
      key,
      name,
      userId,
      createdAt: Date.now(),
      expiresAt: options.expiresInDays 
        ? Date.now() + (options.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
      rateLimit: {
        requestsPerMinute: options.requestsPerMinute || 60,
        requestsPerDay: options.requestsPerDay || 10000,
      },
      permissions: options.permissions || ['inference'],
    };

    await this.storeApiKey(apiKey);
    
    logger.info('API key created', {
      name,
      userId,
      key: `${key.substring(0, 10)}...`,
    });

    return apiKey;
  }

  /**
   * Validate API key
   */
  async validateApiKey(key: string): Promise<ApiKey | null> {
    const apiKey = await this.getApiKey(key);
    
    if (!apiKey) {
      logger.warn('Invalid API key attempt', { key: `${key.substring(0, 10)}...` });
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && Date.now() > apiKey.expiresAt) {
      logger.warn('Expired API key used', { name: apiKey.name });
      return null;
    }

    return apiKey;
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(key: string): Promise<{ allowed: boolean; remaining: number }> {
    const usage = await this.getUsage(key);
    const apiKey = await this.getApiKey(key);
    
    if (!apiKey) {
      return { allowed: false, remaining: 0 };
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // Check per-minute limit
    const recentRequests = await this.getRequestsInWindow(key, oneMinuteAgo);
    
    if (recentRequests >= apiKey.rateLimit.requestsPerMinute) {
      logger.warn('Rate limit exceeded', {
        key: `${key.substring(0, 10)}...`,
        limit: apiKey.rateLimit.requestsPerMinute,
      });
      return { 
        allowed: false, 
        remaining: 0 
      };
    }

    return { 
      allowed: true, 
      remaining: apiKey.rateLimit.requestsPerMinute - recentRequests 
    };
  }

  /**
   * Record API key usage
   */
  async recordUsage(key: string, tokens: number = 0): Promise<void> {
    const usage = await this.getUsage(key);
    
    const updatedUsage: ApiKeyUsage = {
      requestCount: usage.requestCount + 1,
      lastUsed: Date.now(),
      totalTokens: usage.totalTokens + tokens,
    };

    await this.storeUsage(key, updatedUsage);
    await this.recordRequestTimestamp(key);
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(key: string): Promise<ApiKeyUsage | null> {
    return await this.getUsage(key);
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(key: string): Promise<boolean> {
    if (this.useRedis && this.redis) {
      await this.redis.del(`apikey:${key}`);
      await this.redis.del(`usage:${key}`);
      await this.redis.del(`requests:${key}`);
    } else {
      this.memoryStore.delete(key);
      this.usageStore.delete(key);
    }

    logger.info('API key revoked', { key: `${key.substring(0, 10)}...` });
    return true;
  }

  // Private helper methods

  private async storeApiKey(apiKey: ApiKey): Promise<void> {
    if (this.useRedis && this.redis) {
      await this.redis.set(
        `apikey:${apiKey.key}`,
        JSON.stringify(apiKey),
        'EX',
        apiKey.expiresAt ? Math.floor((apiKey.expiresAt - Date.now()) / 1000) : 365 * 24 * 60 * 60
      );
    } else {
      this.memoryStore.set(apiKey.key, apiKey);
    }
  }

  private async getApiKey(key: string): Promise<ApiKey | null> {
    if (this.useRedis && this.redis) {
      const data = await this.redis.get(`apikey:${key}`);
      return data ? JSON.parse(data) : null;
    } else {
      return this.memoryStore.get(key) || null;
    }
  }

  private async storeUsage(key: string, usage: ApiKeyUsage): Promise<void> {
    if (this.useRedis && this.redis) {
      await this.redis.set(
        `usage:${key}`,
        JSON.stringify(usage),
        'EX',
        30 * 24 * 60 * 60 // 30 days
      );
    } else {
      this.usageStore.set(key, usage);
    }
  }

  private async getUsage(key: string): Promise<ApiKeyUsage> {
    if (this.useRedis && this.redis) {
      const data = await this.redis.get(`usage:${key}`);
      return data ? JSON.parse(data) : { requestCount: 0, lastUsed: 0, totalTokens: 0 };
    } else {
      return this.usageStore.get(key) || { requestCount: 0, lastUsed: 0, totalTokens: 0 };
    }
  }

  private async recordRequestTimestamp(key: string): Promise<void> {
    if (this.useRedis && this.redis) {
      const now = Date.now();
      await this.redis.zadd(`requests:${key}`, now, `${now}`);
      // Clean up old timestamps (keep only last hour)
      await this.redis.zremrangebyscore(`requests:${key}`, 0, now - 60 * 60 * 1000);
      await this.redis.expire(`requests:${key}`, 3600);
    }
  }

  private async getRequestsInWindow(key: string, since: number): Promise<number> {
    if (this.useRedis && this.redis) {
      return await this.redis.zcount(`requests:${key}`, since, '+inf');
    } else {
      // Simplified in-memory implementation
      const usage = this.usageStore.get(key);
      return usage && usage.lastUsed > since ? 1 : 0;
    }
  }
}

// Singleton instance
export const apiKeyManager = new ApiKeyManager();
