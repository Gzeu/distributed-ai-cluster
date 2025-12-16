import { Request, Response, NextFunction } from 'express';
import { logRequest } from '../utils/logger';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logRequest(req, duration, res.statusCode);
  });

  next();
}
