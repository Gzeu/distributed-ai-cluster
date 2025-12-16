import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'ai-cluster',
    nodeType: process.env.NODE_TYPE || 'unknown',
  },
  transports: [
    // Write all logs to files
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760,
      maxFiles: 5,
    }),
  ],
});

// Console output for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Request logging helper
export function logRequest(req: any, duration: number, statusCode: number) {
  logger.info('HTTP Request', {
    method: req.method,
    path: req.path,
    statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    apiKey: req.apiKey?.id || 'none',
  });
}

// Error logging helper
export function logError(error: Error, context?: any) {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
}

// Inference logging helper
export function logInference({
  requestId,
  model,
  tokens,
  duration,
  nodeId,
}: {
  requestId: string;
  model: string;
  tokens: { prompt: number; completion: number };
  duration: number;
  nodeId: string;
}) {
  logger.info('Inference completed', {
    requestId,
    model,
    promptTokens: tokens.prompt,
    completionTokens: tokens.completion,
    totalTokens: tokens.prompt + tokens.completion,
    duration: `${duration}ms`,
    tokensPerSecond: ((tokens.completion / duration) * 1000).toFixed(2),
    nodeId,
  });
}

export default logger;
