import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { Request, Response } from 'express';

export class MetricsCollector {
  public registry: Registry;

  // Counters
  public requestsTotal: Counter;
  public inferenceRequestsTotal: Counter;
  public errorsTotal: Counter;
  public tokensGenerated: Counter;

  // Histograms
  public requestDuration: Histogram;
  public inferenceDuration: Histogram;
  public tokenGenerationTime: Histogram;

  // Gauges
  public activeRequests: Gauge;
  public clusterNodes: Gauge;
  public healthyNodes: Gauge;
  public modelLoaded: Gauge;

  constructor(nodeType: 'controller' | 'worker') {
    this.registry = new Registry();

    // Default labels for all metrics
    this.registry.setDefaultLabels({
      app: 'ai-cluster',
      nodeType,
    });

    // Initialize counters
    this.requestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    this.inferenceRequestsTotal = new Counter({
      name: 'inference_requests_total',
      help: 'Total number of inference requests',
      labelNames: ['model', 'status'],
      registers: [this.registry],
    });

    this.errorsTotal = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.tokensGenerated = new Counter({
      name: 'tokens_generated_total',
      help: 'Total number of tokens generated',
      labelNames: ['model'],
      registers: [this.registry],
    });

    // Initialize histograms
    this.requestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    this.inferenceDuration = new Histogram({
      name: 'inference_duration_seconds',
      help: 'Inference request duration in seconds',
      labelNames: ['model'],
      buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
      registers: [this.registry],
    });

    this.tokenGenerationTime = new Histogram({
      name: 'token_generation_time_seconds',
      help: 'Time to generate each token',
      labelNames: ['model'],
      buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1],
      registers: [this.registry],
    });

    // Initialize gauges
    this.activeRequests = new Gauge({
      name: 'active_requests',
      help: 'Number of active requests',
      registers: [this.registry],
    });

    this.clusterNodes = new Gauge({
      name: 'cluster_nodes_total',
      help: 'Total number of nodes in cluster',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.healthyNodes = new Gauge({
      name: 'cluster_nodes_healthy',
      help: 'Number of healthy nodes in cluster',
      registers: [this.registry],
    });

    this.modelLoaded = new Gauge({
      name: 'model_loaded',
      help: 'Whether model is loaded (1) or not (0)',
      registers: [this.registry],
    });
  }

  // Middleware to track HTTP requests
  requestMiddleware() {
    return (req: Request, res: Response, next: any) => {
      const start = Date.now();
      this.activeRequests.inc();

      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const labels = {
          method: req.method,
          path: req.route?.path || req.path,
          status: res.statusCode.toString(),
        };

        this.requestsTotal.inc(labels);
        this.requestDuration.observe(labels, duration);
        this.activeRequests.dec();
      });

      next();
    };
  }

  // Record inference metrics
  recordInference({
    model,
    duration,
    tokens,
    success,
  }: {
    model: string;
    duration: number;
    tokens: { prompt: number; completion: number };
    success: boolean;
  }) {
    this.inferenceRequestsTotal.inc({
      model,
      status: success ? 'success' : 'error',
    });

    if (success) {
      this.inferenceDuration.observe({ model }, duration / 1000);
      this.tokensGenerated.inc({ model }, tokens.completion);

      if (tokens.completion > 0) {
        const timePerToken = duration / tokens.completion / 1000;
        this.tokenGenerationTime.observe({ model }, timePerToken);
      }
    }
  }

  // Update cluster metrics
  updateClusterMetrics(totalNodes: number, healthyNodes: number) {
    this.clusterNodes.set({ type: 'total' }, totalNodes);
    this.healthyNodes.set(healthyNodes);
  }

  // Get metrics endpoint handler
  metricsHandler() {
    return async (req: Request, res: Response) => {
      res.set('Content-Type', this.registry.contentType);
      res.end(await this.registry.metrics());
    };
  }
}
