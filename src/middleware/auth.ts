import { Request, Response, NextFunction } from 'express';
import { ApiKeyManager } from '../auth/api-key-manager';
import { RateLimiter } from '../auth/rate-limiter';

declare global {
  namespace Express {
    interface Request {
      apiKey?: any;
    }
  }
}

export class AuthMiddleware {
  private apiKeyManager: ApiKeyManager;
  private rateLimiter: RateLimiter;

  constructor(apiKeyManager: ApiKeyManager, rateLimiter: RateLimiter) {
    this.apiKeyManager = apiKeyManager;
    this.rateLimiter = rateLimiter;
  }

  authenticate = (req: Request, res: Response, next: NextFunction): void => {
    // Skip auth for health check
    if (req.path === '/health' || req.path === '/metrics') {
      return next();
    }

    // Get API key from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Use: Authorization: Bearer sk-xxx',
      });
      return;
    }

    const apiKey = authHeader.substring(7);

    // Validate API key
    const validKey = this.apiKeyManager.validateApiKey(apiKey);
    if (!validKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired API key',
      });
      return;
    }

    // Check rate limit
    const rateLimit = this.rateLimiter.checkLimit(apiKey, validKey.rateLimit);
    if (!rateLimit.allowed) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${validKey.rateLimit} requests per minute`,
        resetAt: new Date(rateLimit.resetAt).toISOString(),
      });
      return;
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', validKey.rateLimit.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimit.resetAt).toISOString());

    // Record usage
    this.apiKeyManager.recordUsage(apiKey);

    // Attach API key info to request
    req.apiKey = validKey;

    next();
  };

  requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.apiKey) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!req.apiKey.permissions.includes(permission) && !req.apiKey.permissions.includes('admin')) {
        res.status(403).json({
          error: 'Forbidden',
          message: `Missing required permission: ${permission}`,
        });
        return;
      }

      next();
    };
  };
}
