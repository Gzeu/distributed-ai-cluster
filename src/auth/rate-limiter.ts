export interface RateLimitInfo {
  key: string;
  requests: number;
  resetAt: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitInfo> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  checkLimit(key: string, maxRequests: number): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    let info = this.limits.get(key);

    if (!info || info.resetAt < now) {
      // New window
      info = {
        key,
        requests: 0,
        resetAt: now + 60000,
      };
      this.limits.set(key, info);
    }

    if (info.requests >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: info.resetAt,
      };
    }

    info.requests++;

    return {
      allowed: true,
      remaining: maxRequests - info.requests,
      resetAt: info.resetAt,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, info] of this.limits.entries()) {
      if (info.resetAt < now) {
        this.limits.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
