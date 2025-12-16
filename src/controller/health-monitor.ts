import { ClusterManager } from './cluster-manager';
import axios from 'axios';

export class HealthMonitor {
  private interval: NodeJS.Timeout | null = null;
  private checkInterval: number;

  constructor(private clusterManager: ClusterManager) {
    this.checkInterval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '5000');
  }

  start(): void {
    console.log(`💚 Health monitor started (interval: ${this.checkInterval}ms)`);
    
    this.interval = setInterval(async () => {
      await this.checkAllNodes();
    }, this.checkInterval);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async checkAllNodes(): Promise<void> {
    const nodes = this.clusterManager.getAllNodes();
    
    for (const node of nodes) {
      if (node.type === 'controller') continue;
      
      try {
        const url = `http://${node.host}:${node.port}/health`;
        const response = await axios.get(url, { timeout: 3000 });
        
        if (response.status === 200) {
          this.clusterManager.updateNode(node.id, {
            status: 'healthy',
            metrics: response.data.metrics || node.metrics,
          });
        }
      } catch (error) {
        this.clusterManager.updateNode(node.id, { status: 'degraded' });
        console.warn(`⚠️ Health check failed for node ${node.id}`);
      }
    }
  }
}
