import { ClusterManager } from './cluster-manager';
import { NodeInfo, InferenceRequest } from '../types';

export class LoadBalancer {
  private roundRobinIndex = 0;
  private strategy: string;

  constructor(private clusterManager: ClusterManager) {
    this.strategy = process.env.STRATEGY || 'least_loaded';
  }

  selectNode(request: InferenceRequest): NodeInfo | null {
    const healthyNodes = this.clusterManager.getHealthyNodes();
    
    if (healthyNodes.length === 0) {
      return null;
    }

    switch (this.strategy) {
      case 'least_loaded':
        return this.selectLeastLoaded(healthyNodes);
      case 'round_robin':
        return this.selectRoundRobin(healthyNodes);
      case 'capacity_based':
        return this.selectCapacityBased(healthyNodes);
      case 'latency_optimized':
        return this.selectLatencyOptimized(healthyNodes);
      default:
        return this.selectLeastLoaded(healthyNodes);
    }
  }

  private selectLeastLoaded(nodes: NodeInfo[]): NodeInfo {
    return nodes.reduce((best, node) => {
      const bestLoad = best.metrics.activeRequests / best.capabilities.cpuCores;
      const nodeLoad = node.metrics.activeRequests / node.capabilities.cpuCores;
      return nodeLoad < bestLoad ? node : best;
    });
  }

  private selectRoundRobin(nodes: NodeInfo[]): NodeInfo {
    const node = nodes[this.roundRobinIndex % nodes.length];
    this.roundRobinIndex++;
    return node;
  }

  private selectCapacityBased(nodes: NodeInfo[]): NodeInfo {
    return nodes.reduce((best, node) => {
      const bestScore = this.calculateCapacityScore(best);
      const nodeScore = this.calculateCapacityScore(node);
      return nodeScore > bestScore ? node : best;
    });
  }

  private selectLatencyOptimized(nodes: NodeInfo[]): NodeInfo {
    return nodes.reduce((best, node) => {
      return node.metrics.avgResponseTime < best.metrics.avgResponseTime ? node : best;
    });
  }

  private calculateCapacityScore(node: NodeInfo): number {
    let score = node.capabilities.cpuCores * 10;
    
    if (node.capabilities.gpuAvailable) {
      score += (node.capabilities.gpuMemory || 0) / 1024; // GB
    }
    
    score *= (1 - node.metrics.cpuUsage / 100);
    score *= (1 - node.metrics.activeRequests / 10);
    
    return score;
  }
}
