import { Router, Request, Response } from 'express';
import { ApiKeyManager } from '../auth/api-key-manager';
import { AuthMiddleware } from '../auth/auth-middleware';

export function createApiKeysRouter(apiKeyManager: ApiKeyManager, authMiddleware: AuthMiddleware): Router {
  const router = Router();

  // Generate new API key (requires existing valid key with admin permission)
  router.post('/generate', authMiddleware.authenticate, (req: Request, res: Response) => {
    try {
      const { name, expiresIn, rateLimit, permissions } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }

      const newKey = apiKeyManager.generateKey({
        name,
        expiresIn,
        rateLimit,
        permissions,
      });

      res.json({
        key: newKey.key,
        name: newKey.name,
        createdAt: newKey.createdAt,
        expiresAt: newKey.expiresAt,
        rateLimit: newKey.rateLimit,
        permissions: newKey.permissions,
        message: '⚠️ Save this key securely. It will not be shown again.',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List all API keys (masked)
  router.get('/list', authMiddleware.authenticate, (req: Request, res: Response) => {
    try {
      const keys = apiKeyManager.listKeys();
      res.json({ keys });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Revoke API key
  router.post('/revoke', authMiddleware.authenticate, (req: Request, res: Response) => {
    try {
      const { key } = req.body;

      if (!key) {
        res.status(400).json({ error: 'Key is required' });
        return;
      }

      const revoked = apiKeyManager.revokeKey(key);
      
      if (revoked) {
        res.json({ message: 'API key revoked successfully' });
      } else {
        res.status(404).json({ error: 'API key not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get usage stats
  router.get('/usage/:key', authMiddleware.authenticate, (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const usage = apiKeyManager.getUsage(key);

      if (usage) {
        res.json({ usage });
      } else {
        res.status(404).json({ error: 'No usage data found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
