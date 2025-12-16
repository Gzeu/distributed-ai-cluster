import express, { Express, Request, Response } from 'express';
import { config } from 'dotenv';
import axios from 'axios';
import os from 'os';
import { NodeInfo, InferenceRequest, InferenceResponse } from '../types';
import { ModelEngine } from './model-engine';
import { logger, createRequestLogger, logPerformance } from '../utils/logger';
import { metricsMiddleware, metricsEndpoint } from '../metrics/middleware';
import { modelLoadTime, modelMemoryUsage, clusterNodeRequestsActive, recordInference } from '../metrics/prometheus';

config();

const app: Express = express();
const PORT = parseInt(process.env.WORKER_PORT || '8081');
const CONTROLLER_URL = process.env.CONTROLLER_URL || 'http://localhost:8080';

// Middleware
app.use(express.json());
app.use(createRequestLogger());
app.use(metricsMiddleware);

// Initialize model engine
const modelEngine = new ModelEngine();
let nodeId: string;
let registrationInterval: NodeJS.Timeout;

// Generate unique node ID
function generateNodeId(): string {
  const hostname = os.hostname();
  const random = Math.random().toString(36).substring(7);
  return `worker_${hostname}_${random}`;
}

// Get system metrics
function getSystemMetrics() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    cpuUsage: cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length,
    memoryUsage: (usedMem / totalMem) * 100,
    activeRequests: modelEngine.getActiveRequests(),
    totalRequests: modelEngine.getTotalRequests(),
    avgResponseTime: modelEngine.getAvgResponseTime(),
    tokensPerSecond: modelEngine.getTokensPerSecond(),
  };
}

// Register with controller
async function registerWithController() {
  try {
    const nodeInfo: NodeInfo = {
      id: nodeId,
      type: 'worker',
      host: process.env.WORKER_HOST || 'localhost',
      port: PORT,
      status: 'healthy',
      capabilities: {
        gpuAvailable: false, // TODO: Detect GPU
        gpuMemory: 0,
        cpuCores: os.cpus().length,
        ramTotal: os.totalmem(),
        ramAvailable: os.freemem(),
        maxContextLength: parseInt(process.env.CONTEXT_LENGTH || '2048'),
        supportedModels: ['llama-2-7b', 'mistral-7b'],
      },
      metrics: getSystemMetrics(),
      lastSeen: Date.now(),
    };

    await axios.post(`${CONTROLLER_URL}/cluster/register`, nodeInfo);
    logger.debug('Heartbeat sent to controller', { nodeId });
  } catch (error: any) {
    logger.error('Failed to register with controller', { error: error.message });
  }
}

// Routes

// Health check
app.get('/health', (req: Request, res: Response) => {
  const metrics = getSystemMetrics();
  
  // Update Prometheus metrics
  clusterNodeRequestsActive.set({ node_id: nodeId }, metrics.activeRequests);
  
  res.json({
    status: 'healthy',
    nodeId,
    metrics,
    timestamp: Date.now(),
  });
});

// Prometheus metrics
app.get('/metrics', metricsEndpoint);

// Inference endpoint
app.post('/inference', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const request: InferenceRequest = req.body;
    logger.info('Processing inference request', {
      requestId: request.id,
      model: request.model,
      messageCount: request.messages.length,
    });

    const result = await modelEngine.processInference(request);
    const duration = (Date.now() - startTime) / 1000;

    // Record metrics
    const tokensPerSecond = result.completionTokens / duration;
    recordInference(request.model, 'success', duration, result.completionTokens, tokensPerSecond);

    logger.info('Inference completed', {
      requestId: request.id,
      duration,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      tokensPerSecond: tokensPerSecond.toFixed(2),
    });

    const response: InferenceResponse = {
      id: request.id,
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: result.text,
          },
          finishReason: 'stop',
        },
      ],
      usage: {
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.promptTokens + result.completionTokens,
      },
      created: Date.now(),
    };

    res.json(response);
  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000;
    recordInference(req.body.model || 'default', 'error', duration, 0, 0);
    
    logger.error('Inference error', {
      requestId: req.body.id,
      error: error.message,
      stack: error.stack,
    });
    
    res.status(500).json({
      error: 'Inference failed',
      message: error.message,
    });
  }
});

// Initialize
async function initialize() {
  nodeId = generateNodeId();
  logger.info('Worker node initializing', { nodeId });

  // Load model
  const modelPath = process.env.MODEL_PATH;
  if (modelPath) {
    try {
      const loadStart = Date.now();
      await modelEngine.loadModel(modelPath);
      const loadDuration = (Date.now() - loadStart) / 1000;
      
      // Record model load time
      modelLoadTime.observe({ model: modelPath }, loadDuration);
      
      logger.info('Model loaded successfully', {
        modelPath,
        loadTime: `${loadDuration.toFixed(2)}s`,
      });
    } catch (error: any) {
      logger.warn('Failed to load model, running in demo mode', {
        error: error.message,
        modelPath,
      });
    }
  } else {
    logger.warn('No MODEL_PATH specified, running in demo mode');
  }

  // Start server
  app.listen(PORT, () => {
    logger.info('Worker node started', {
      port: PORT,
      controllerUrl: CONTROLLER_URL,
      metricsUrl: `http://localhost:${PORT}/metrics`,
    });
  });

  // Register with controller
  await registerWithController();

  // Keep registration alive
  registrationInterval = setInterval(registerWithController, 10000);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully');
  clearInterval(registrationInterval);
  process.exit(0);
});

initialize();
