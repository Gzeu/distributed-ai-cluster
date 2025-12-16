import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Create logs directory
const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}] ${message}`;
    if (Object.keys(meta).length > 0 && meta.metadata) {
      const filteredMeta = { ...meta.metadata };
      delete filteredMeta.timestamp;
      if (Object.keys(filteredMeta).length > 0) {
        msg += ` ${JSON.stringify(filteredMeta)}`;
      }
    }
    return msg;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { 
    service: process.env.SERVICE_NAME || 'ai-cluster',
    nodeType: process.env.NODE_TYPE || 'unknown',
  },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // Write errors to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Request logging helper
export function logRequest(
  requestId: string,
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  metadata?: any
) {
  logger.info('HTTP Request', {
    requestId,
    method,
    path,
    statusCode,
    duration,
    ...metadata,
  });
}

// Inference logging helper
export function logInference(
  requestId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  duration: number,
  nodeId?: string
) {
  logger.info('Inference completed', {
    requestId,
    model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    duration,
    tokensPerSecond: ((promptTokens + completionTokens) / (duration / 1000)).toFixed(2),
    nodeId,
  });
}

// Error logging helper
export function logError(
  error: Error,
  context?: string,
  metadata?: any
) {
  logger.error(context || 'Error occurred', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...metadata,
  });
}

// Startup logging
export function logStartup(nodeType: string, port: number, config?: any) {
  logger.info(`${nodeType} started`, {
    port,
    nodeEnv: process.env.NODE_ENV,
    config,
  });
}

// Shutdown logging
export function logShutdown(nodeType: string, reason?: string) {
  logger.info(`${nodeType} shutting down`, {
    reason,
  });
}

export default logger;
