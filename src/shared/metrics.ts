import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create a Registry
export const register = new Registry();

// Add default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// Custom metrics prefix
const PREFIX = 'ai_cluster_';

// === REQUEST METRICS ===

export const httpRequestsTotal = new Counter({
  name: `${PREFIX}http_requests_total`,
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: `${PREFIX}http_request_duration_seconds`,
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// === INFERENCE METRICS ===

export const inferenceRequestsTotal = new Counter({
  name: `${PREFIX}inference_requests_total`,
  help: 'Total number of inference requests',
  labelNames: ['model', 'status'],
  registers: [register],
});

export const inferenceDuration = new Histogram({
  name: `${PREFIX}inference_duration_seconds`,
  help: 'Inference duration in seconds',
  labelNames: ['model', 'node_id'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

export const tokensGenerated = new Counter({
  name: `${PREFIX}tokens_generated_total`,
  help: 'Total number of tokens generated',
  labelNames: ['model', 'type'], // type: prompt or completion
  registers: [register],
});

export const tokensPerSecond = new Gauge({
  name: `${PREFIX}tokens_per_second`,
  help: 'Current tokens generation rate per second',
  labelNames: ['model', 'node_id'],
  registers: [register],
});

// === CLUSTER METRICS ===

export const clusterNodesTotal = new Gauge({
  name: `${PREFIX}cluster_nodes_total`,
  help: 'Total number of nodes in cluster',
  labelNames: ['status'], // healthy, degraded, offline
  registers: [register],
});

export const clusterActiveRequests = new Gauge({
  name: `${PREFIX}cluster_active_requests`,
  help: 'Current number of active requests in cluster',
  labelNames: ['node_id'],
  registers: [register],
});

// === MODEL METRICS ===

export const modelLoadTime = new Histogram({
  name: `${PREFIX}model_load_time_seconds`,
  help: 'Model loading time in seconds',
  labelNames: ['model', 'node_id'],
  buckets: [1, 5, 10, 30, 60, 120],
  registers: [register],
});

export const modelMemoryUsage = new Gauge({
  name: `${PREFIX}model_memory_bytes`,
  help: 'Model memory usage in bytes',
  labelNames: ['model', 'node_id'],
  registers: [register],
});

// === API KEY METRICS ===

export const apiKeyRequests = new Counter({
  name: `${PREFIX}api_key_requests_total`,
  help: 'Total requests per API key',
  labelNames: ['key_id', 'status'],
  registers: [register],
});

export const apiKeyRateLimitHits = new Counter({
  name: `${PREFIX}api_key_rate_limit_hits_total`,
  help: 'Total rate limit hits per API key',
  labelNames: ['key_id'],
  registers: [register],
});

// === STREAMING METRICS ===

export const streamingRequestsTotal = new Counter({
  name: `${PREFIX}streaming_requests_total`,
  help: 'Total number of streaming requests',
  labelNames: ['model', 'status'],
  registers: [register],
});

export const streamingDuration = new Histogram({
  name: `${PREFIX}streaming_duration_seconds`,
  help: 'Streaming request duration in seconds',
  labelNames: ['model'],
  buckets: [1, 5, 10, 30, 60, 120],
  registers: [register],
});

// Helper functions

export function recordHttpRequest(
  method: string,
  path: string,
  status: number,
  duration: number
): void {
  httpRequestsTotal.inc({ method, path, status: status.toString() });
  httpRequestDuration.observe({ method, path, status: status.toString() }, duration / 1000);
}

export function recordInference(
  model: string,
  nodeId: string,
  duration: number,
  promptTokens: number,
  completionTokens: number,
  success: boolean
): void {
  inferenceRequestsTotal.inc({ model, status: success ? 'success' : 'error' });
  inferenceDuration.observe({ model, node_id: nodeId }, duration / 1000);
  
  tokensGenerated.inc({ model, type: 'prompt' }, promptTokens);
  tokensGenerated.inc({ model, type: 'completion' }, completionTokens);
  
  const totalTokens = promptTokens + completionTokens;
  const tps = totalTokens / (duration / 1000);
  tokensPerSecond.set({ model, node_id: nodeId }, tps);
}

export function recordModelLoad(
  model: string,
  nodeId: string,
  loadTime: number,
  memoryBytes: number
): void {
  modelLoadTime.observe({ model, node_id: nodeId }, loadTime / 1000);
  modelMemoryUsage.set({ model, node_id: nodeId }, memoryBytes);
}

export function updateClusterMetrics(
  healthyNodes: number,
  degradedNodes: number,
  offlineNodes: number
): void {
  clusterNodesTotal.set({ status: 'healthy' }, healthyNodes);
  clusterNodesTotal.set({ status: 'degraded' }, degradedNodes);
  clusterNodesTotal.set({ status: 'offline' }, offlineNodes);
}

export function updateNodeActiveRequests(nodeId: string, count: number): void {
  clusterActiveRequests.set({ node_id: nodeId }, count);
}

export function recordApiKeyRequest(
  keyId: string,
  success: boolean,
  rateLimited = false
): void {
  apiKeyRequests.inc({ key_id: keyId, status: success ? 'success' : 'error' });
  
  if (rateLimited) {
    apiKeyRateLimitHits.inc({ key_id: keyId });
  }
}

export function recordStreamingRequest(
  model: string,
  duration: number,
  success: boolean
): void {
  streamingRequestsTotal.inc({ model, status: success ? 'success' : 'error' });
  streamingDuration.observe({ model }, duration / 1000);
}
