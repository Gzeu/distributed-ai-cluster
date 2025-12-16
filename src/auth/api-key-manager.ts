import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

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
  lastUsed?: number;
  totalRequests: number;
}

export class ApiKeyManager {
  private keys: Map<string, ApiKey> = new Map();
  private keysFilePath: string;

  constructor(keysFilePath = './data/api-keys.json') {
    this.keysFilePath = keysFilePath;
  }

  async initialize(): Promise<void> {
    try {
      // Create data directory if not exists
      const dir = path.dirname(this.keysFilePath);
      await fs.mkdir(dir, { recursive: true });

      // Load existing keys
      await this.loadKeys();
      console.log(`✅ Loaded ${this.keys.size} API keys`);
    } catch (error: any) {
      console.warn('⚠️  No existing API keys found, starting fresh');
    }
  }

  async loadKeys(): Promise<void> {
    try {
      const data = await fs.readFile(this.keysFilePath, 'utf-8');
      const keysArray: ApiKey[] = JSON.parse(data);
      
      this.keys.clear();
      keysArray.forEach(key => {
        this.keys.set(key.key, key);
      });
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async saveKeys(): Promise<void> {
    const keysArray = Array.from(this.keys.values());
    await fs.writeFile(
      this.keysFilePath,
      JSON.stringify(keysArray, null, 2),
      'utf-8'
    );
  }

  generateKey(): string {
    const prefix = 'aicl'; // AI Cluster
    const random = crypto.randomBytes(24).toString('base64url');
    return `${prefix}_${random}`;
  }

  async createKey(
    name: string,
    userId: string,
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
      permissions: options.permissions || ['inference:read'],
      totalRequests: 0,
    };

    this.keys.set(key, apiKey);
    await this.saveKeys();

    console.log(`🔑 Created API key: ${name} for user: ${userId}`);
    return apiKey;
  }

  async validateKey(key: string): Promise<{ valid: boolean; apiKey?: ApiKey; reason?: string }> {
    const apiKey = this.keys.get(key);

    if (!apiKey) {
      return { valid: false, reason: 'Invalid API key' };
    }

    // Check expiration
    if (apiKey.expiresAt && Date.now() > apiKey.expiresAt) {
      return { valid: false, reason: 'API key expired' };
    }

    return { valid: true, apiKey };
  }

  async recordUsage(key: string): Promise<void> {
    const apiKey = this.keys.get(key);
    if (!apiKey) return;

    apiKey.lastUsed = Date.now();
    apiKey.totalRequests++;

    // Save periodically (every 10 requests)
    if (apiKey.totalRequests % 10 === 0) {
      await this.saveKeys();
    }
  }

  async revokeKey(key: string): Promise<boolean> {
    const deleted = this.keys.delete(key);
    if (deleted) {
      await this.saveKeys();
      console.log(`🗑️  Revoked API key: ${key}`);
    }
    return deleted;
  }

  async listKeys(userId?: string): Promise<ApiKey[]> {
    const allKeys = Array.from(this.keys.values());
    
    if (userId) {
      return allKeys.filter(k => k.userId === userId);
    }
    
    return allKeys;
  }

  getKeyInfo(key: string): ApiKey | undefined {
    return this.keys.get(key);
  }
}
