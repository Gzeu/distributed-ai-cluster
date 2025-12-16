import { ClusterManager } from '../cluster-manager';
import { LoadBalancer } from '../load-balancer';
import { NodeInfo } from '../../types';

describe('LoadBalancer', () => {
  let clusterManager: ClusterManager;
  let loadBalancer: LoadBalancer;

  beforeEach(() => {
    clusterManager = new ClusterManager();
    loadBalancer = new LoadBalancer(clusterManager);
  });

  const createMockNode = (id: string, activeRequests: number, cpuCores: number): NodeInfo => ({
    id,
    type: 'worker',
    host: 'localhost',
    port: 8081,
    status: 'healthy',
    capabilities: {
      gpuAvailable: false,
      cpuCores,
      ramTotal: 16 * 1024 * 1024 * 1024,
      ramAvailable: 8 * 1024 * 1024 * 1024,
      maxContextLength: 2048,
      supportedModels: ['default'],
    },
    metrics: {
      activeRequests,
      totalRequests: 100,
      avgResponseTime: 500,
      tokensPerSecond: 50,
      cpuUsage: 50,
      memoryUsage: 50,
    },
    lastSeen: Date.now(),
  });

  describe('Least Loaded Strategy', () => {
    it('should select node with lowest load', () => {
      const node1 = createMockNode('node1', 5, 4);
      const node2 = createMockNode('node2', 2, 4);
      const node3 = createMockNode('node3', 8, 4);

      clusterManager.registerNode(node1);
      clusterManager.registerNode(node2);
      clusterManager.registerNode(node3);

      const request = {
        id: 'test',
        model: 'default',
        messages: [{ role: 'user' as const, content: 'test' }],
      };

      const selected = loadBalancer.selectNode(request);
      expect(selected?.id).toBe('node2');
    });

    it('should return null when no nodes available', () => {
      const request = {
        id: 'test',
        model: 'default',
        messages: [{ role: 'user' as const, content: 'test' }],
      };

      const selected = loadBalancer.selectNode(request);
      expect(selected).toBeNull();
    });
  });
});
