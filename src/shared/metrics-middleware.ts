import { Request, Response, NextFunction } from 'express';
import { recordHttpRequest } from './metrics';
import { RequestWithId } from './request-logger-middleware';

export function metricsMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    recordHttpRequest(req.method, req.path, res.statusCode, duration);
  });

  next();
}
