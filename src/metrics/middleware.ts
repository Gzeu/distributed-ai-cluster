import { Request, Response, NextFunction } from 'express';
import { register, httpRequestsTotal, httpRequestDuration } from './prometheus';

// Prometheus metrics middleware
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip metrics endpoint itself
  if (req.path === '/metrics') {
    return next();
  }

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const labels = {
      method: req.method,
      path: req.route?.path || req.path,
      status: res.statusCode.toString(),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });

  next();
}

// Metrics endpoint handler
export async function metricsEndpoint(req: Request, res: Response) {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to collect metrics', message: error.message });
  }
}
