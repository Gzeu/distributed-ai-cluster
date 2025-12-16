import { Router, Request, Response } from 'express';
import { ApiKeyManager } from '../auth/api-key-manager';
import { AuthMiddleware } from '../middleware/auth';

export function createApiKeyRoutes(apiKeyManager: ApiKeyManager, authMiddleware: AuthMiddleware): Router {
  const router = Router();

  // List API keys (admin only)
  router.get('/keys', authMiddleware.authenticate, authMiddleware.requirePermission('admin'), (req: Request, res: Response) => {
    const keys = apiKeyManager.listApiKeys();
    res.json({ keys });
  });

  // Generate new API key (admin only)
  router.post('/keys', authMiddleware.authenticate, authMiddleware.requirePermission('admin'), (req: Request, res: Response) => {
    const { name, permissions, rateLimit } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }

    const apiKey = apiKeyManager.generateApiKey(
      name,
      permissions || ['inference'],
      rateLimit || 60
    );

    res.json({
      message: 'API key generated successfully',
      apiKey: {
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit,
        createdAt: apiKey.createdAt,
      },
    });
  });

  // Revoke API key (admin only)
  router.delete('/keys/:key', authMiddleware.authenticate, authMiddleware.requirePermission('admin'), (req: Request, res: Response) => {
    const { key } = req.params;
    const success = apiKeyManager.revokeApiKey(key);

    if (success) {
      res.json({ message: 'API key revoked successfully' });
    } else {
      res.status(404).json({ error: 'API key not found' });
    }
  });

  return router;
}
