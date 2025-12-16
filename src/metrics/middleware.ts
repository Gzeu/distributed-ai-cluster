import { Request, Response, NextFunction } from 'express';
import { recordHttpRequest } from './prometheus';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    recordHttpRequest(req.method, req.route?.path || req.path, res.statusCode, duration);
  });
  
  next();
}

export function metricsEndpoint(req: Request, res: Response) {
  const { register } = require('./prometheus');
  res.setHeader('Content-Type', register.contentType);
  register.metrics().then((metrics: string) => {
    res.send(metrics);
  });
}
