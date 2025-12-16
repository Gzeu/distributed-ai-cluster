import { NodeInfo } from '../types';

export class ClusterManager {
  private nodes: Map<string, NodeInfo> = new Map();
  private nodeTimeouts: Map<string, NodeJS.Timeout> = new Map();

  registerNode(nodeInfo: NodeInfo): void {
    this.nodes.set(nodeInfo.id, nodeInfo);
    this.resetNodeTimeout(nodeInfo.id);
  }

  updateNode(nodeId: string, updates: Partial<NodeInfo>): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      this.nodes.set(nodeId, { ...node, ...updates, lastSeen: Date.now() });
      this.resetNodeTimeout(nodeId);
    }
  }

  removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    const timeout = this.nodeTimeouts.get(nodeId);
    if (timeout) {
      clearTimeout(timeout);
      this.nodeTimeouts.delete(nodeId);
    }
    console.log(`❌ Node removed: ${nodeId}`);
  }

  getNode(nodeId: string): NodeInfo | undefined {
    return this.nodes.get(nodeId);
  }

  getAllNodes(): NodeInfo[] {
    return Array.from(this.nodes.values());
  }

  getHealthyNodes(): NodeInfo[] {
    return this.getAllNodes().filter(node => node.status === 'healthy');
  }

  private resetNodeTimeout(nodeId: string): void {
    const existingTimeout = this.nodeTimeouts.get(nodeId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      const node = this.nodes.get(nodeId);
      if (node) {
        this.updateNode(nodeId, { status: 'offline' });
        console.warn(`⚠️ Node timeout: ${nodeId}`);
      }
    }, 30000); // 30 second timeout

    this.nodeTimeouts.set(nodeId, timeout);
  }
}
