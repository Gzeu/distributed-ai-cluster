import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from 'dotenv';
import { ClusterManager } from './cluster-manager';
import { LoadBalancer } from './load-balancer';
import { HealthMonitor } from './health-monitor';
import { P2PDiscovery } from '../shared/p2p-discovery';
import { InferenceRequest } from '../types';
import { logger, createRequestLogger } from '../utils/logger';
import { metricsMiddleware, metricsEndpoint } from '../metrics/middleware';
import { clusterNodesActive, recordInference } from '../metrics/prometheus';
import axios from 'axios';

config();

const app: Express = express();
const PORT = process.env.CONTROLLER_PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(createRequestLogger());
app.use(metricsMiddleware);

// Initialize cluster components
const clusterManager = new ClusterManager();
const loadBalancer = new LoadBalancer(clusterManager);
const healthMonitor = new HealthMonitor(clusterManager);
const p2pDiscovery = new P2PDiscovery('controller');

// Start P2P discovery
if (process.env.P2P_ENABLED === 'true') {
  p2pDiscovery.start().then(() => {
    logger.info('P2P discovery started');
  });
}

// Routes

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Prometheus metrics endpoint
app.get('/metrics', metricsEndpoint);

// Cluster status
app.get('/cluster/status', (req: Request, res: Response) => {
  const nodes = clusterManager.getAllNodes();
  const stats = {
    totalNodes: nodes.length,
    healthyNodes: nodes.filter(n => n.status === 'healthy').length,
    totalCapacity: nodes.reduce((sum, n) => sum + n.capabilities.cpuCores, 0),
    activeRequests: nodes.reduce((sum, n) => sum + n.metrics.activeRequests, 0),
  };
  
  // Update Prometheus metrics
  clusterNodesActive.set({ type: 'worker' }, stats.healthyNodes);
  clusterNodesActive.set({ type: 'total' }, stats.totalNodes);
  
  res.json({ nodes, stats });
});

// Register worker node
app.post('/cluster/register', (req: Request, res: Response) => {
  try {
    const nodeInfo = req.body;
    clusterManager.registerNode(nodeInfo);
    logger.info('Worker registered', { 
      nodeId: nodeInfo.id, 
      host: nodeInfo.host, 
      port: nodeInfo.port 
    });
    res.json({ success: true, nodeId: nodeInfo.id });
  } catch (error: any) {
    logger.error('Registration failed', { error: error.message });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// OpenAI-compatible chat completions endpoint
app.post('/v1/chat/completions', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const request: InferenceRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      model: req.body.model || 'default',
      messages: req.body.messages,
      temperature: req.body.temperature,
      maxTokens: req.body.max_tokens,
      stream: req.body.stream || false,
      topP: req.body.top_p,
      frequencyPenalty: req.body.frequency_penalty,
      presencePenalty: req.body.presence_penalty,
    };

    logger.info('Inference request received', {
      requestId: request.id,
      model: request.model,
      messageCount: request.messages.length,
    });

    // Select best node using load balancer
    const targetNode = loadBalancer.selectNode(request);
    
    if (!targetNode) {
      logger.warn('No available workers', { requestId: request.id });
      return res.status(503).json({ 
        error: 'No available workers',
        message: 'All worker nodes are offline or overloaded'
      });
    }

    logger.info('Routing request to worker', {
      requestId: request.id,
      nodeId: targetNode.id,
      nodeLoad: targetNode.metrics.activeRequests,
    });

    // Forward request to worker
    const workerUrl = `http://${targetNode.host}:${targetNode.port}/inference`;
    
    const response = await axios.post(workerUrl, request, {
      timeout: parseInt(process.env.REQUEST_TIMEOUT || '60000'),
    });

    const duration = (Date.now() - startTime) / 1000;
    const tokens = response.data.usage?.total_tokens || 0;
    const tokensPerSecond = tokens / duration;

    // Record metrics
    recordInference(request.model, 'success', duration, tokens, tokensPerSecond);

    logger.info('Inference completed', {
      requestId: request.id,
      duration,
      tokens,
      tokensPerSecond: tokensPerSecond.toFixed(2),
    });

    res.json(response.data);
  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000;
    recordInference(req.body.model || 'default', 'error', duration, 0, 0);
    
    logger.error('Inference failed', { 
      error: error.message,
      stack: error.stack,
      duration,
    });
    
    res.status(500).json({ 
      error: 'Inference failed',
      message: error.message 
    });
  }
});

// Start health monitoring
healthMonitor.start();

app.listen(PORT, () => {
  logger.info('Controller node started', {
    port: PORT,
    apiUrl: `http://localhost:${PORT}/v1/chat/completions`,
    metricsUrl: `http://localhost:${PORT}/metrics`,
    dashboardUrl: `http://localhost:${PORT}/cluster/status`,
  });
});
