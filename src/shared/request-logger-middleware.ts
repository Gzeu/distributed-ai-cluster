import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logRequest } from './logger';

export interface RequestWithId extends Request {
  id: string;
  startTime: number;
}

export function requestLoggerMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void {
  // Generate unique request ID
  req.id = req.headers['x-request-id'] as string || uuidv4();
  req.startTime = Date.now();

  // Set request ID header
  res.setHeader('X-Request-Id', req.id);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    
    logRequest(
      req.id,
      req.method,
      req.path,
      res.statusCode,
      duration,
      {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress,
        apiKey: req.headers.authorization ? 'present' : 'missing',
      }
    );
  });

  next();
}
