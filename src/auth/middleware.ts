import { Request, Response, NextFunction } from 'express';
import { apiKeyManager } from './api-key-manager';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  apiKey?: any;
  userId?: string;
}

/**
 * Authentication middleware - validates API key
 */
export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // Skip auth for health and metrics endpoints
  if (req.path === '/health' || req.path === '/metrics' || req.path === '/cluster/status') {
    return next();
  }

  // Check for development mode
  if (process.env.AUTH_DISABLED === 'true') {
    logger.warn('Authentication disabled - development mode');
    return next();
  }

  // Extract API key from header or query
  const apiKey = 
    req.headers['x-api-key'] as string ||
    req.headers['authorization']?.replace('Bearer ', '') ||
    req.query.api_key as string;

  if (!apiKey) {
    logger.warn('Missing API key', { path: req.path, ip: req.ip });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key required. Provide via X-API-Key header or ?api_key= query parameter',
    });
  }

  // Validate API key
  const validKey = await apiKeyManager.validateApiKey(apiKey);
  
  if (!validKey) {
    logger.warn('Invalid API key', { 
      key: `${apiKey.substring(0, 10)}...`,
      path: req.path,
      ip: req.ip,
    });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired API key',
    });
  }

  // Check rate limit
  const rateLimit = await apiKeyManager.checkRateLimit(apiKey);
  
  if (!rateLimit.allowed) {
    logger.warn('Rate limit exceeded', {
      key: `${apiKey.substring(0, 10)}...`,
      name: validKey.name,
    });
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
    });
  }

  // Attach API key info to request
  req.apiKey = validKey;
  req.userId = validKey.userId;

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', validKey.rateLimit.requestsPerMinute.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());

  logger.debug('Request authenticated', {
    name: validKey.name,
    userId: validKey.userId,
    path: req.path,
  });

  next();
}

/**
 * Optional authentication middleware - doesn't block if no key
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const apiKey = 
    req.headers['x-api-key'] as string ||
    req.headers['authorization']?.replace('Bearer ', '');

  if (apiKey) {
    const validKey = await apiKeyManager.validateApiKey(apiKey);
    if (validKey) {
      req.apiKey = validKey;
      req.userId = validKey.userId;
    }
  }

  next();
}
