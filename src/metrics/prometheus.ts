import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create a Registry to register the metrics
export const register = new Registry();

// Add default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// Custom metrics

// Request counter
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

// Request duration histogram
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

// Inference metrics
export const inferenceRequestsTotal = new Counter({
  name: 'inference_requests_total',
  help: 'Total number of inference requests',
  labelNames: ['model', 'status'],
  registers: [register],
});

export const inferenceRequestDuration = new Histogram({
  name: 'inference_request_duration_seconds',
  help: 'Duration of inference requests in seconds',
  labelNames: ['model', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60, 120],
  registers: [register],
});

export const inferenceTokensGenerated = new Counter({
  name: 'inference_tokens_generated_total',
  help: 'Total number of tokens generated',
  labelNames: ['model'],
  registers: [register],
});

export const inferenceTokensPerSecond = new Gauge({
  name: 'inference_tokens_per_second',
  help: 'Tokens generated per second',
  labelNames: ['model'],
  registers: [register],
});

// Cluster metrics
export const clusterNodesActive = new Gauge({
  name: 'cluster_nodes_active',
  help: 'Number of active nodes in cluster',
  labelNames: ['type'],
  registers: [register],
});

export const clusterNodeRequestsActive = new Gauge({
  name: 'cluster_node_requests_active',
  help: 'Number of active requests on a node',
  labelNames: ['node_id'],
  registers: [register],
});

// Model metrics
export const modelLoadTime = new Histogram({
  name: 'model_load_time_seconds',
  help: 'Time to load model in seconds',
  labelNames: ['model'],
  buckets: [1, 5, 10, 20, 30, 60, 120],
  registers: [register],
});

export const modelMemoryUsage = new Gauge({
  name: 'model_memory_usage_bytes',
  help: 'Memory usage of loaded model in bytes',
  labelNames: ['model'],
  registers: [register],
});

// Helper function to record inference
export function recordInference(
  model: string,
  status: 'success' | 'error',
  duration: number,
  tokens: number,
  tokensPerSecond: number
) {
  inferenceRequestsTotal.inc({ model, status });
  inferenceRequestDuration.observe({ model, status }, duration);
  
  if (status === 'success' && tokens > 0) {
    inferenceTokensGenerated.inc({ model }, tokens);
    inferenceTokensPerSecond.set({ model }, tokensPerSecond);
  }
}
