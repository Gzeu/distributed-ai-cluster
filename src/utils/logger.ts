import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logDir = process.env.LOG_DIR || './logs';
const logLevel = process.env.LOG_LEVEL || 'info';

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    let msg = `${timestamp} [${level}]`;
    
    if (requestId) {
      msg += ` [${requestId}]`;
    }
    
    msg += `: ${message}`;
    
    const metaKeys = Object.keys(meta).filter(k => k !== 'service' && k !== 'timestamp');
    if (metaKeys.length > 0) {
      const cleanMeta: any = {};
      metaKeys.forEach(k => cleanMeta[k] = meta[k]);
      msg += ` ${JSON.stringify(cleanMeta)}`;
    }
    
    return msg;
  })
);

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger
export const logger = winston.createLogger({
  level: logLevel,
  format: fileFormat,
  defaultMeta: { service: 'ai-cluster' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
  ],
});

// Create child logger with context
export function createContextLogger(context: { requestId?: string; userId?: string; nodeId?: string }) {
  return logger.child(context);
}

// Request logger middleware
export function createRequestLogger() {
  return (req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.requestId = requestId;
    req.logger = createContextLogger({ requestId, userId: req.userId });
    
    const startTime = Date.now();
    
    // Log request
    req.logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
    });
    
    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      req.logger.info('Request completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      });
    });
    
    next();
  };
}

// Error logger
export function logError(error: Error, context?: any) {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
}

// Performance logger
export function logPerformance(operation: string, duration: number, metadata?: any) {
  logger.info('Performance metric', {
    operation,
    duration,
    ...metadata,
  });
}

export default logger;
