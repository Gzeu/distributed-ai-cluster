import { Router, Request, Response } from 'express';
import { ApiKeyManager } from '../auth/api-key-manager';
import { AuthenticatedRequest } from '../auth/auth-middleware';

export function createApiKeysRouter(apiKeyManager: ApiKeyManager): Router {
  const router = Router();

  // Create new API key
  router.post('/keys', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, expiresInDays, requestsPerMinute, requestsPerDay, permissions } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const userId = req.userId || 'anonymous';

      const apiKey = await apiKeyManager.createKey(name, userId, {
        expiresInDays,
        requestsPerMinute,
        requestsPerDay,
        permissions,
      });

      res.json({
        success: true,
        apiKey: {
          key: apiKey.key,
          name: apiKey.name,
          createdAt: apiKey.createdAt,
          expiresAt: apiKey.expiresAt,
          rateLimit: apiKey.rateLimit,
        },
        warning: 'Store this key securely. It will not be shown again.',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List API keys (without revealing full keys)
  router.get('/keys', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;
      const keys = await apiKeyManager.listKeys(userId);

      const sanitizedKeys = keys.map(key => ({
        name: key.name,
        keyPreview: key.key.substring(0, 12) + '...',
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
        lastUsed: key.lastUsed,
        totalRequests: key.totalRequests,
        rateLimit: key.rateLimit,
      }));

      res.json({ keys: sanitizedKeys });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Revoke API key
  router.delete('/keys/:keyPreview', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { keyPreview } = req.params;
      const userId = req.userId;

      // Find full key from preview
      const keys = await apiKeyManager.listKeys(userId);
      const key = keys.find(k => k.key.startsWith(keyPreview.replace('...', '')));

      if (!key) {
        return res.status(404).json({ error: 'API key not found' });
      }

      await apiKeyManager.revokeKey(key.key);
      res.json({ success: true, message: 'API key revoked' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
