import express, { Express, Request, Response } from 'express';
import { config } from 'dotenv';
import axios from 'axios';
import os from 'os';
import { NodeInfo, InferenceRequest, InferenceResponse } from '../types';
import { ModelEngine } from './model-engine';

config();

const app: Express = express();
const PORT = parseInt(process.env.WORKER_PORT || '8081');
const CONTROLLER_URL = process.env.CONTROLLER_URL || 'http://localhost:8080';

// Middleware
app.use(express.json());

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
    console.log(`✅ Registered with controller: ${nodeId}`);
  } catch (error: any) {
    console.error(`❌ Failed to register with controller: ${error.message}`);
  }
}

// Routes

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    nodeId,
    metrics: getSystemMetrics(),
    timestamp: Date.now(),
  });
});

// Inference endpoint
app.post('/inference', async (req: Request, res: Response) => {
  try {
    const request: InferenceRequest = req.body;
    console.log(`🔄 Processing inference request: ${request.id}`);

    const startTime = Date.now();
    const result = await modelEngine.processInference(request);
    const duration = Date.now() - startTime;

    console.log(`✅ Inference completed in ${duration}ms`);

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
    console.error('❌ Inference error:', error.message);
    res.status(500).json({
      error: 'Inference failed',
      message: error.message,
    });
  }
});

// Initialize
async function initialize() {
  nodeId = generateNodeId();
  console.log(`🚀 Worker Node: ${nodeId}`);
  console.log(`📡 Controller URL: ${CONTROLLER_URL}`);

  // Load model
  const modelPath = process.env.MODEL_PATH;
  if (modelPath) {
    try {
      await modelEngine.loadModel(modelPath);
      console.log(`✅ Model loaded: ${modelPath}`);
    } catch (error: any) {
      console.warn(`⚠️ Failed to load model: ${error.message}`);
      console.warn('⚠️ Worker will run in demo mode');
    }
  } else {
    console.warn('⚠️ No MODEL_PATH specified, running in demo mode');
  }

  // Start server
  app.listen(PORT, () => {
    console.log(`✅ Worker listening on port ${PORT}`);
  });

  // Register with controller
  await registerWithController();

  // Keep registration alive
  registrationInterval = setInterval(registerWithController, 10000);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Shutting down gracefully...');
  clearInterval(registrationInterval);
  process.exit(0);
});

initialize();
