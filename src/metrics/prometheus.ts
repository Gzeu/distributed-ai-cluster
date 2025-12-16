import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// Custom metrics

// Request metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Inference metrics
export const inferenceRequestsTotal = new Counter({
  name: 'inference_requests_total',
  help: 'Total number of inference requests',
  labelNames: ['model', 'status'],
  registers: [register],
});

export const inferenceTokensGenerated = new Counter({
  name: 'inference_tokens_generated_total',
  help: 'Total number of tokens generated',
  labelNames: ['model'],
  registers: [register],
});

export const inferenceDuration = new Histogram({
  name: 'inference_duration_seconds',
  help: 'Duration of inference requests in seconds',
  labelNames: ['model'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

export const inferenceTokensPerSecond = new Gauge({
  name: 'inference_tokens_per_second',
  help: 'Current tokens per second generation rate',
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
  help: 'Number of active requests per node',
  labelNames: ['node_id'],
  registers: [register],
});

// Model metrics
export const modelLoadTime = new Histogram({
  name: 'model_load_time_seconds',
  help: 'Time taken to load model',
  labelNames: ['model'],
  buckets: [1, 5, 10, 30, 60, 120],
  registers: [register],
});

export const modelMemoryUsage = new Gauge({
  name: 'model_memory_usage_bytes',
  help: 'Memory used by loaded model',
  labelNames: ['model'],
  registers: [register],
});

// Rate limit metrics
export const rateLimitExceeded = new Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['api_key_preview', 'limit_type'],
  registers: [register],
});

// Authentication metrics
export const authAttempts = new Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['status'],
  registers: [register],
});

// Export registry for /metrics endpoint
export { register };

// Helper function to record HTTP request
export function recordHttpRequest(method: string, path: string, status: number, duration: number) {
  httpRequestsTotal.inc({ method, path, status });
  httpRequestDuration.observe({ method, path, status }, duration);
}

// Helper function to record inference
export function recordInference(
  model: string,
  status: 'success' | 'error',
  duration: number,
  tokens: number,
  tokensPerSecond: number
) {
  inferenceRequestsTotal.inc({ model, status });
  inferenceDuration.observe({ model }, duration);
  
  if (status === 'success') {
    inferenceTokensGenerated.inc({ model }, tokens);
    inferenceTokensPerSecond.set({ model }, tokensPerSecond);
  }
}
