import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface ApiKey {
  key: string;
  name: string;
  userId?: string;
  createdAt: number;
  lastUsedAt?: number;
  expiresAt?: number;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  permissions: string[];
  enabled: boolean;
}

export interface ApiKeyUsage {
  requests: number;
  tokens: number;
  lastReset: number;
}

export class ApiKeyManager {
  private keys: Map<string, ApiKey> = new Map();
  private usage: Map<string, ApiKeyUsage> = new Map();
  private keysFilePath: string;

  constructor(keysFilePath = './data/api-keys.json') {
    this.keysFilePath = keysFilePath;
    this.loadKeys();
  }

  private loadKeys(): void {
    try {
      if (fs.existsSync(this.keysFilePath)) {
        const data = fs.readFileSync(this.keysFilePath, 'utf-8');
        const keysArray: ApiKey[] = JSON.parse(data);
        keysArray.forEach(key => this.keys.set(key.key, key));
        console.log(`✅ Loaded ${keysArray.length} API keys`);
      } else {
        // Create default admin key on first run
        this.createDefaultKey();
      }
    } catch (error: any) {
      console.error('❌ Failed to load API keys:', error.message);
    }
  }

  private saveKeys(): void {
    try {
      const dir = path.dirname(this.keysFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const keysArray = Array.from(this.keys.values());
      fs.writeFileSync(this.keysFilePath, JSON.stringify(keysArray, null, 2));
    } catch (error: any) {
      console.error('❌ Failed to save API keys:', error.message);
    }
  }

  private createDefaultKey(): void {
    const defaultKey = this.generateKey({
      name: 'Default Admin Key',
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerDay: 10000,
      },
      permissions: ['*'],
    });

    console.log('🔑 Created default API key:');
    console.log(`   Key: ${defaultKey.key}`);
    console.log('   ⚠️  Save this key securely!');
  }

  generateKey(options: {
    name: string;
    userId?: string;
    expiresIn?: number; // days
    rateLimit?: {
      requestsPerMinute: number;
      requestsPerDay: number;
    };
    permissions?: string[];
  }): ApiKey {
    const key = 'sk-' + crypto.randomBytes(32).toString('hex');
    
    const apiKey: ApiKey = {
      key,
      name: options.name,
      userId: options.userId,
      createdAt: Date.now(),
      expiresAt: options.expiresIn 
        ? Date.now() + options.expiresIn * 24 * 60 * 60 * 1000
        : undefined,
      rateLimit: options.rateLimit || {
        requestsPerMinute: 20,
        requestsPerDay: 1000,
      },
      permissions: options.permissions || ['inference'],
      enabled: true,
    };

    this.keys.set(key, apiKey);
    this.saveKeys();

    return apiKey;
  }

  validateKey(key: string): { valid: boolean; reason?: string; apiKey?: ApiKey } {
    const apiKey = this.keys.get(key);

    if (!apiKey) {
      return { valid: false, reason: 'Invalid API key' };
    }

    if (!apiKey.enabled) {
      return { valid: false, reason: 'API key disabled' };
    }

    if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
      return { valid: false, reason: 'API key expired' };
    }

    return { valid: true, apiKey };
  }

  checkRateLimit(key: string): { allowed: boolean; reason?: string } {
    const apiKey = this.keys.get(key);
    if (!apiKey) {
      return { allowed: false, reason: 'Invalid API key' };
    }

    const usage = this.usage.get(key) || {
      requests: 0,
      tokens: 0,
      lastReset: Date.now(),
    };

    const now = Date.now();
    const minuteMs = 60 * 1000;
    const dayMs = 24 * 60 * 60 * 1000;

    // Reset counters if needed
    if (now - usage.lastReset > dayMs) {
      usage.requests = 0;
      usage.tokens = 0;
      usage.lastReset = now;
    }

    // Check per-minute limit
    const requestsLastMinute = this.getRequestsInWindow(key, minuteMs);
    if (requestsLastMinute >= apiKey.rateLimit.requestsPerMinute) {
      return { 
        allowed: false, 
        reason: `Rate limit exceeded: ${apiKey.rateLimit.requestsPerMinute} requests/minute` 
      };
    }

    // Check per-day limit
    if (usage.requests >= apiKey.rateLimit.requestsPerDay) {
      return { 
        allowed: false, 
        reason: `Daily limit exceeded: ${apiKey.rateLimit.requestsPerDay} requests/day` 
      };
    }

    return { allowed: true };
  }

  private requestTimestamps: Map<string, number[]> = new Map();

  private getRequestsInWindow(key: string, windowMs: number): number {
    const timestamps = this.requestTimestamps.get(key) || [];
    const now = Date.now();
    const validTimestamps = timestamps.filter(t => now - t < windowMs);
    this.requestTimestamps.set(key, validTimestamps);
    return validTimestamps.length;
  }

  recordRequest(key: string, tokens = 0): void {
    const apiKey = this.keys.get(key);
    if (!apiKey) return;

    // Update last used
    apiKey.lastUsedAt = Date.now();
    this.saveKeys();

    // Update usage
    const usage = this.usage.get(key) || {
      requests: 0,
      tokens: 0,
      lastReset: Date.now(),
    };

    usage.requests++;
    usage.tokens += tokens;
    this.usage.set(key, usage);

    // Record timestamp for rate limiting
    const timestamps = this.requestTimestamps.get(key) || [];
    timestamps.push(Date.now());
    this.requestTimestamps.set(key, timestamps);
  }

  revokeKey(key: string): boolean {
    const apiKey = this.keys.get(key);
    if (!apiKey) return false;

    apiKey.enabled = false;
    this.saveKeys();
    return true;
  }

  listKeys(): ApiKey[] {
    return Array.from(this.keys.values()).map(key => ({
      ...key,
      key: key.key.substring(0, 12) + '...' // Mask key
    }));
  }

  getUsage(key: string): ApiKeyUsage | undefined {
    return this.usage.get(key);
  }
}
