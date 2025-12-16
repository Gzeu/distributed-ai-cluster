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

export interface ClusterStats {
  totalNodes: number;
  healthyNodes: number;
  totalCapacity: number;
  activeRequests: number;
}

export interface ClusterData {
  nodes: NodeInfo[];
  stats: ClusterStats;
}
