# Configuration Guide

## Environment Variables

### Controller Configuration

```bash
# Server
CONTROLLER_PORT=8080          # API port
CONTROLLER_HOST=0.0.0.0       # Bind address

# Load Balancing
STRATEGY=least_loaded         # least_loaded | round_robin | capacity_based | latency_optimized
HEALTH_CHECK_INTERVAL=5000    # Health check interval (ms)

# P2P Discovery
P2P_ENABLED=true              # Enable peer discovery
P2P_PORT=9000                 # P2P communication port

# Cache
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false           # Enable distributed cache

# Timeouts
REQUEST_TIMEOUT=60000         # Request timeout (ms)
MAX_RETRIES=3                 # Retry failed requests

# Logging
LOG_LEVEL=info                # debug | info | warn | error
```

### Worker Configuration

```bash
# Server
WORKER_PORT=8081              # Worker API port
WORKER_HOST=0.0.0.0           # Bind address
CONTROLLER_URL=http://localhost:8080  # Controller URL

# Model
MODEL_PATH=./models/model.gguf  # Path to GGUF model
CONTEXT_LENGTH=2048            # Max context tokens
GPU_LAYERS=0                   # GPU layers (0 = CPU only)

# Cache
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false

# P2P
P2P_ENABLED=true
```

## Load Balancing Strategies

### 1. Least Loaded (Default)

**Best for:** Mixed workloads, unpredictable request patterns

```bash
STRATEGY=least_loaded
```

Routes to node with:
- Lowest active requests per CPU core
- Good for fair distribution

### 2. Round Robin

**Best for:** Uniform requests, simple distribution

```bash
STRATEGY=round_robin
```

Rotates through nodes sequentially.

### 3. Capacity Based

**Best for:** Heterogeneous hardware (GPU + CPU nodes)

```bash
STRATEGY=capacity_based
```

Considers:
- CPU cores
- GPU memory
- Current load
- RAM availability

### 4. Latency Optimized

**Best for:** Latency-sensitive applications

```bash
STRATEGY=latency_optimized
```

Routes to node with lowest average response time.

## Model Configuration

### GPU Acceleration

```bash
# Determine optimal GPU layers
# VRAM / Model size ≈ max layers

# Example: 8GB VRAM, 4GB model
GPU_LAYERS=32  # ~50% of model

# Full GPU
GPU_LAYERS=99  # Use all available VRAM

# CPU only
GPU_LAYERS=0
```

### Context Length

```bash
# Smaller = faster, less memory
CONTEXT_LENGTH=1024  # Short conversations

# Balanced
CONTEXT_LENGTH=2048  # Default

# Larger = slower, more memory
CONTEXT_LENGTH=4096  # Long conversations
```

## Redis Cache

Enable for better performance with repeated prompts:

```bash
# Install Redis
docker run -d -p 6379:6379 redis:7-alpine

# Enable in .env
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

Benefits:
- Share KV cache across workers
- Reduce redundant computation
- 2-5x speedup for similar prompts

## Production Recommendations

```bash
# Controller
CONTROLLER_PORT=8080
STRATEGY=capacity_based       # Best for mixed hardware
HEALTH_CHECK_INTERVAL=5000
REQUEST_TIMEOUT=120000        # 2 minutes for large requests
REDIS_ENABLED=true            # Enable caching
LOG_LEVEL=warn                # Reduce log volume

# Worker
GPU_LAYERS=32                 # Adjust per VRAM
CONTEXT_LENGTH=2048
REDIS_ENABLED=true
```

## Multi-Model Setup

```bash
# Worker 1 (7B model)
MODEL_PATH=./models/llama-2-7b.gguf
WORKER_PORT=8081

# Worker 2 (13B model)
MODEL_PATH=./models/llama-2-13b.gguf
WORKER_PORT=8082

# Controller routes based on model name in request
```
