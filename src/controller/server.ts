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

config();

const app: Express = express();
const PORT = process.env.CONTROLLER_PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Initialize cluster components
const clusterManager = new ClusterManager();
const loadBalancer = new LoadBalancer(clusterManager);
const healthMonitor = new HealthMonitor(clusterManager);
const p2pDiscovery = new P2PDiscovery('controller');

// Start P2P discovery
if (process.env.P2P_ENABLED === 'true') {
  p2pDiscovery.start().then(() => {
    console.log('✅ P2P discovery started');
  });
}

// Routes

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Cluster status
app.get('/cluster/status', (req: Request, res: Response) => {
  const nodes = clusterManager.getAllNodes();
  const stats = {
    totalNodes: nodes.length,
    healthyNodes: nodes.filter(n => n.status === 'healthy').length,
    totalCapacity: nodes.reduce((sum, n) => sum + n.capabilities.cpuCores, 0),
    activeRequests: nodes.reduce((sum, n) => sum + n.metrics.activeRequests, 0),
  };
  
  res.json({ nodes, stats });
});

// Register worker node
app.post('/cluster/register', (req: Request, res: Response) => {
  try {
    const nodeInfo = req.body;
    clusterManager.registerNode(nodeInfo);
    console.log(`✅ Worker registered: ${nodeInfo.id}`);
    res.json({ success: true, nodeId: nodeInfo.id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// OpenAI-compatible chat completions endpoint
app.post('/v1/chat/completions', async (req: Request, res: Response) => {
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

    // Select best node using load balancer
    const targetNode = loadBalancer.selectNode(request);
    
    if (!targetNode) {
      return res.status(503).json({ 
        error: 'No available workers',
        message: 'All worker nodes are offline or overloaded'
      });
    }

    console.log(`➡️ Routing request ${request.id} to node ${targetNode.id}`);

    // Forward request to worker
    const workerUrl = `http://${targetNode.host}:${targetNode.port}/inference`;
    const axios = require('axios');
    
    const response = await axios.post(workerUrl, request, {
      timeout: parseInt(process.env.REQUEST_TIMEOUT || '60000'),
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('Inference error:', error.message);
    res.status(500).json({ 
      error: 'Inference failed',
      message: error.message 
    });
  }
});

// Start health monitoring
healthMonitor.start();

app.listen(PORT, () => {
  console.log(`🎯 Controller Node running on port ${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/v1/chat/completions`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/cluster/status`);
});
