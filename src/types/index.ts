export interface NodeInfo {
  id: string;
  type: 'controller' | 'worker';
  host: string;
  port: number;
  status: 'healthy' | 'degraded' | 'offline';
  capabilities: NodeCapabilities;
  metrics: NodeMetrics;
  lastSeen: number;
}

export interface NodeCapabilities {
  gpuAvailable: boolean;
  gpuMemory?: number;
  cpuCores: number;
  ramTotal: number;
  ramAvailable: number;
  maxContextLength: number;
  supportedModels: string[];
}

export interface NodeMetrics {
  activeRequests: number;
  totalRequests: number;
  avgResponseTime: number;
  tokensPerSecond: number;
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage?: number;
}

export interface InferenceRequest {
  id: string;
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface InferenceResponse {
  id: string;
  model: string;
  choices: Choice[];
  usage: Usage;
  created: number;
}

export interface Choice {
  index: number;
  message: Message;
  finishReason: 'stop' | 'length' | 'error';
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ClusterConfig {
  loadBalancingStrategy: 'least_loaded' | 'round_robin' | 'capacity_based' | 'latency_optimized';
  healthCheckInterval: number;
  maxRetries: number;
  requestTimeout: number;
  enableSharding: boolean;
  enableKVCache: boolean;
}

export interface KVCacheEntry {
  key: string;
  value: Buffer;
  nodeId: string;
  timestamp: number;
  ttl: number;
}
