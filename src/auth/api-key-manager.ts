import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  rateLimit: number; // requests per minute
  createdAt: number;
  expiresAt?: number;
  isActive: boolean;
  usage: {
    totalRequests: number;
    lastUsed: number;
  };
}

export class ApiKeyManager {
  private apiKeys: Map<string, ApiKey> = new Map();
  private keysFilePath: string;

  constructor(keysFilePath: string = './data/api-keys.json') {
    this.keysFilePath = keysFilePath;
    this.loadKeys();
  }

  generateApiKey(name: string, permissions: string[] = ['inference'], rateLimit: number = 60): ApiKey {
    const id = crypto.randomBytes(16).toString('hex');
    const key = `sk-${crypto.randomBytes(32).toString('hex')}`;

    const apiKey: ApiKey = {
      id,
      key,
      name,
      permissions,
      rateLimit,
      createdAt: Date.now(),
      isActive: true,
      usage: {
        totalRequests: 0,
        lastUsed: 0,
      },
    };

    this.apiKeys.set(key, apiKey);
    this.saveKeys();

    console.log(`✅ API key generated: ${name}`);
    return apiKey;
  }

  validateApiKey(key: string): ApiKey | null {
    const apiKey = this.apiKeys.get(key);

    if (!apiKey) {
      return null;
    }

    if (!apiKey.isActive) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
      return null;
    }

    return apiKey;
  }

  recordUsage(key: string): void {
    const apiKey = this.apiKeys.get(key);
    if (apiKey) {
      apiKey.usage.totalRequests++;
      apiKey.usage.lastUsed = Date.now();
      this.saveKeys();
    }
  }

  revokeApiKey(key: string): boolean {
    const apiKey = this.apiKeys.get(key);
    if (apiKey) {
      apiKey.isActive = false;
      this.saveKeys();
      console.log(`🚫 API key revoked: ${apiKey.name}`);
      return true;
    }
    return false;
  }

  listApiKeys(): ApiKey[] {
    return Array.from(this.apiKeys.values()).map(key => ({
      ...key,
      key: key.key.substring(0, 20) + '...' // Mask the key
    }));
  }

  private loadKeys(): void {
    try {
      const dir = path.dirname(this.keysFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.keysFilePath)) {
        const data = fs.readFileSync(this.keysFilePath, 'utf-8');
        const keys: ApiKey[] = JSON.parse(data);
        keys.forEach(key => this.apiKeys.set(key.key, key));
        console.log(`📋 Loaded ${keys.length} API keys`);
      } else {
        // Generate default API key for testing
        const defaultKey = this.generateApiKey('default', ['inference', 'admin'], 1000);
        console.log(`🔑 Default API key: ${defaultKey.key}`);
      }
    } catch (error) {
      console.error('❌ Failed to load API keys:', error);
    }
  }

  private saveKeys(): void {
    try {
      const keys = Array.from(this.apiKeys.values());
      fs.writeFileSync(this.keysFilePath, JSON.stringify(keys, null, 2));
    } catch (error) {
      console.error('❌ Failed to save API keys:', error);
    }
  }
}
