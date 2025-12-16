import { ClusterManager } from '../cluster-manager';
import { NodeInfo } from '../../types';

describe('ClusterManager', () => {
  let manager: ClusterManager;

  beforeEach(() => {
    manager = new ClusterManager();
  });

  const createMockNode = (id: string): NodeInfo => ({
    id,
    type: 'worker',
    host: 'localhost',
    port: 8081,
    status: 'healthy',
    capabilities: {
      gpuAvailable: false,
      cpuCores: 4,
      ramTotal: 16 * 1024 * 1024 * 1024,
      ramAvailable: 8 * 1024 * 1024 * 1024,
      maxContextLength: 2048,
      supportedModels: ['default'],
    },
    metrics: {
      activeRequests: 0,
      totalRequests: 0,
      avgResponseTime: 0,
      tokensPerSecond: 0,
      cpuUsage: 0,
      memoryUsage: 0,
    },
    lastSeen: Date.now(),
  });

  describe('registerNode', () => {
    it('should register a new node', () => {
      const node = createMockNode('test-node');
      manager.registerNode(node);

      expect(manager.getAllNodes()).toHaveLength(1);
      expect(manager.getNode('test-node')).toEqual(node);
    });
  });

  describe('updateNode', () => {
    it('should update existing node', () => {
      const node = createMockNode('test-node');
      manager.registerNode(node);

      manager.updateNode('test-node', { status: 'degraded' });

      const updated = manager.getNode('test-node');
      expect(updated?.status).toBe('degraded');
    });
  });

  describe('removeNode', () => {
    it('should remove a node', () => {
      const node = createMockNode('test-node');
      manager.registerNode(node);

      manager.removeNode('test-node');

      expect(manager.getAllNodes()).toHaveLength(0);
    });
  });

  describe('getHealthyNodes', () => {
    it('should return only healthy nodes', () => {
      const node1 = createMockNode('node1');
      const node2 = createMockNode('node2');
      
      manager.registerNode(node1);
      manager.registerNode(node2);
      manager.updateNode('node2', { status: 'offline' });

      const healthy = manager.getHealthyNodes();
      expect(healthy).toHaveLength(1);
      expect(healthy[0].id).toBe('node1');
    });
  });
});
