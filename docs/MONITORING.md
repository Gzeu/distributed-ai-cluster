# Monitoring & Observability Guide

## Prometheus Metrics

The cluster exposes Prometheus-compatible metrics at `/metrics` endpoint.

### Available Metrics

#### HTTP Metrics

```
# Total HTTP requests
ai_cluster_http_requests_total{method="GET",path="/health",status="200"}

# Request duration histogram
ai_cluster_http_request_duration_seconds{method="POST",path="/v1/chat/completions",status="200"}
```

#### Inference Metrics

```
# Total inference requests
ai_cluster_inference_requests_total{model="llama-2-7b",status="success"}

# Inference duration
ai_cluster_inference_duration_seconds{model="llama-2-7b",node_id="worker_1"}

# Tokens generated
ai_cluster_tokens_generated_total{model="llama-2-7b",type="prompt"}
ai_cluster_tokens_generated_total{model="llama-2-7b",type="completion"}

# Tokens per second
ai_cluster_tokens_per_second{model="llama-2-7b",node_id="worker_1"}
```

#### Cluster Metrics

```
# Node count by status
ai_cluster_cluster_nodes_total{status="healthy"}
ai_cluster_cluster_nodes_total{status="degraded"}
ai_cluster_cluster_nodes_total{status="offline"}

# Active requests per node
ai_cluster_cluster_active_requests{node_id="worker_1"}
```

#### Model Metrics

```
# Model load time
ai_cluster_model_load_time_seconds{model="llama-2-7b",node_id="worker_1"}

# Model memory usage
ai_cluster_model_memory_bytes{model="llama-2-7b",node_id="worker_1"}
```

#### API Key Metrics

```
# Requests per API key
ai_cluster_api_key_requests_total{key_id="sk-abc123",status="success"}

# Rate limit hits
ai_cluster_api_key_rate_limit_hits_total{key_id="sk-abc123"}
```

#### Streaming Metrics

```
# Streaming requests
ai_cluster_streaming_requests_total{model="llama-2-7b",status="success"}

# Streaming duration
ai_cluster_streaming_duration_seconds{model="llama-2-7b"}
```

## Prometheus Setup

### 1. Install Prometheus

```bash
# Docker
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Or download binary
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
```

### 2. Configure Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'ai-cluster-controller'
    static_configs:
      - targets: ['localhost:8080']

  - job_name: 'ai-cluster-workers'
    static_configs:
      - targets: 
        - 'localhost:8081'
        - 'localhost:8082'
        - 'localhost:8083'
```

### 3. Access Metrics

```bash
# Test metrics endpoint
curl http://localhost:8080/metrics

# Prometheus UI
open http://localhost:9090
```

## Grafana Dashboards

### 1. Install Grafana

```bash
# Docker
docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana

# Default credentials: admin/admin
```

### 2. Add Prometheus Data Source

1. Go to Configuration → Data Sources
2. Add Prometheus
3. URL: `http://prometheus:9090` (if using Docker)
4. Save & Test

### 3. Import Dashboard

Use the provided dashboard JSON or create custom:

```json
{
  "title": "AI Cluster Overview",
  "panels": [
    {
      "title": "Requests per Second",
      "targets": [
        {
          "expr": "rate(ai_cluster_http_requests_total[5m])"
        }
      ]
    },
    {
      "title": "Tokens Generated",
      "targets": [
        {
          "expr": "rate(ai_cluster_tokens_generated_total[5m])"
        }
      ]
    }
  ]
}
```

## Useful Queries

### Request Rate
```promql
# Requests per second
rate(ai_cluster_http_requests_total[5m])

# By endpoint
sum(rate(ai_cluster_http_requests_total[5m])) by (path)
```

### Latency
```promql
# P95 latency
histogram_quantile(0.95, 
  rate(ai_cluster_http_request_duration_seconds_bucket[5m])
)

# Average inference time
avg(ai_cluster_inference_duration_seconds)
```

### Throughput
```promql
# Tokens per second across cluster
sum(ai_cluster_tokens_per_second)

# By model
sum(ai_cluster_tokens_per_second) by (model)
```

### Error Rate
```promql
# Error rate
rate(ai_cluster_inference_requests_total{status="error"}[5m])
 / 
rate(ai_cluster_inference_requests_total[5m])
```

### Resource Usage
```promql
# CPU usage
process_cpu_seconds_total

# Memory usage
process_resident_memory_bytes

# Model memory
ai_cluster_model_memory_bytes
```

## Alerting Rules

Create `alerts.yml`:

```yaml
groups:
  - name: ai_cluster
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          rate(ai_cluster_inference_requests_total{status="error"}[5m])
          /
          rate(ai_cluster_inference_requests_total[5m])
          > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            rate(ai_cluster_inference_duration_seconds_bucket[5m])
          ) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High inference latency"
          description: "P95 latency is {{ $value }}s"

      - alert: NodesDown
        expr: ai_cluster_cluster_nodes_total{status="healthy"} < 2
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Cluster nodes down"
          description: "Only {{ $value }} healthy nodes"

      - alert: RateLimitHigh
        expr: |
          rate(ai_cluster_api_key_rate_limit_hits_total[5m]) > 10
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "High rate limit hits"
          description: "Rate limiting {{ $value }} req/s"
```

## Logging Integration

Logs are stored in `./logs/` with structured JSON format.

### View logs

```bash
# All logs
tail -f logs/combined.log

# Errors only
tail -f logs/error.log

# Pretty print JSON
tail -f logs/combined.log | jq
```

### Log Aggregation (Optional)

For production, use:
- **Loki** + Grafana for log aggregation
- **Elasticsearch** + Kibana (ELK stack)
- **Datadog**, **New Relic**, or similar

## Health Checks

```bash
# Controller health
curl http://localhost:8080/health

# Worker health
curl http://localhost:8081/health

# Cluster status
curl http://localhost:8080/cluster/status
```

## Performance Monitoring

### Key Metrics to Watch

1. **Latency**: P50, P95, P99 response times
2. **Throughput**: Requests/sec, Tokens/sec
3. **Error Rate**: Failed requests percentage
4. **Resource Usage**: CPU, Memory, GPU
5. **Queue Depth**: Active requests per node

### Optimization Targets

- **P95 Latency**: < 5 seconds
- **Error Rate**: < 1%
- **Tokens/sec**: > 50 per worker
- **CPU Usage**: < 80%
- **Memory**: No leaks, stable over time
