import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'ai-cluster',
    nodeType: process.env.NODE_TYPE || 'unknown',
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
    // File output for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // File output for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

// Request logging middleware
export function createRequestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Attach request ID to request object
    (req as any).requestId = requestId;

    // Log request
    logger.info('Incoming request', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info('Request completed', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      });
    });

    next();
  };
}

// Performance logging helper
export function logPerformance(operation: string, startTime: number, metadata?: any) {
  const duration = Date.now() - startTime;
  logger.info(`Performance: ${operation}`, {
    operation,
    duration,
    ...metadata,
  });
}

// Error logging helper
export function logError(error: Error, context?: any) {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    ...context,
  });
}
