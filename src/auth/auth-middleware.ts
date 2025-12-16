import { Request, Response, NextFunction } from 'express';
import { ApiKeyManager } from './api-key-manager';
import { RateLimiter } from './rate-limiter';

export interface AuthenticatedRequest extends Request {
  apiKey?: string;
  userId?: string;
  permissions?: string[];
}

export class AuthMiddleware {
  private apiKeyManager: ApiKeyManager;
  private rateLimiter: RateLimiter;
  private cleanupInterval: NodeJS.Timeout;

  constructor(apiKeyManager: ApiKeyManager, rateLimiter: RateLimiter) {
    this.apiKeyManager = apiKeyManager;
    this.rateLimiter = rateLimiter;

    // Cleanup expired rate limits every minute
    this.cleanupInterval = setInterval(() => {
      this.rateLimiter.cleanup();
    }, 60 * 1000);
  }

  authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract API key from header or query
      const apiKey = 
        req.headers['x-api-key'] as string ||
        req.headers['authorization']?.replace('Bearer ', '') ||
        req.query.api_key as string;

      if (!apiKey) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'API key required. Provide via X-API-Key header or Authorization: Bearer token',
        });
        return;
      }

      // Validate API key
      const validation = await this.apiKeyManager.validateKey(apiKey);
      
      if (!validation.valid) {
        res.status(401).json({
          error: 'Unauthorized',
          message: validation.reason || 'Invalid API key',
        });
        return;
      }

      const keyInfo = validation.apiKey!;

      // Check rate limits
      const rateLimit = this.rateLimiter.checkLimit(
        apiKey,
        keyInfo.rateLimit.requestsPerMinute,
        keyInfo.rateLimit.requestsPerDay
      );

      if (!rateLimit.allowed) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: rateLimit.reason,
          retryAfter: rateLimit.retryAfter,
        });
        return;
      }

      // Get remaining requests
      const remaining = this.rateLimiter.getRemainingRequests(
        apiKey,
        keyInfo.rateLimit.requestsPerMinute,
        keyInfo.rateLimit.requestsPerDay
      );

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit-Minute', keyInfo.rateLimit.requestsPerMinute);
      res.setHeader('X-RateLimit-Remaining-Minute', remaining.minute);
      res.setHeader('X-RateLimit-Limit-Day', keyInfo.rateLimit.requestsPerDay);
      res.setHeader('X-RateLimit-Remaining-Day', remaining.day);

      // Record usage
      await this.apiKeyManager.recordUsage(apiKey);

      // Attach to request
      req.apiKey = apiKey;
      req.userId = keyInfo.userId;
      req.permissions = keyInfo.permissions;

      next();
    } catch (error: any) {
      console.error('Auth middleware error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Authentication failed',
      });
    }
  };

  // Optional authentication (for public endpoints)
  optionalAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const apiKey = 
      req.headers['x-api-key'] as string ||
      req.headers['authorization']?.replace('Bearer ', '') ||
      req.query.api_key as string;

    if (apiKey) {
      const validation = await this.apiKeyManager.validateKey(apiKey);
      if (validation.valid) {
        req.apiKey = apiKey;
        req.userId = validation.apiKey!.userId;
        req.permissions = validation.apiKey!.permissions;
      }
    }

    next();
  };

  cleanup(): void {
    clearInterval(this.cleanupInterval);
  }
}
