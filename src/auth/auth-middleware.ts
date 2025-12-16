import { Request, Response, NextFunction } from 'express';
import { ApiKeyManager } from './api-key-manager';

export interface AuthenticatedRequest extends Request {
  apiKey?: string;
  userId?: string;
}

export class AuthMiddleware {
  constructor(private apiKeyManager: ApiKeyManager) {}

  authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // Extract API key from header
    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7)
      : req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'API key required. Provide via Authorization: Bearer <key> or X-API-Key header' 
      });
      return;
    }

    // Validate key
    const validation = this.apiKeyManager.validateKey(apiKey);
    if (!validation.valid) {
      res.status(401).json({ 
        error: 'Unauthorized', 
        message: validation.reason 
      });
      return;
    }

    // Check rate limit
    const rateLimitCheck = this.apiKeyManager.checkRateLimit(apiKey);
    if (!rateLimitCheck.allowed) {
      res.status(429).json({ 
        error: 'Rate limit exceeded', 
        message: rateLimitCheck.reason 
      });
      return;
    }

    // Attach to request
    req.apiKey = apiKey;
    req.userId = validation.apiKey?.userId;

    next();
  };

  recordRequest = (req: AuthenticatedRequest, tokens = 0): void => {
    if (req.apiKey) {
      this.apiKeyManager.recordRequest(req.apiKey, tokens);
    }
  };
}
