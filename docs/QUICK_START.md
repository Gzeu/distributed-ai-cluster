# Quick Start Guide

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm or yarn** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)

## Local Development (Fastest)

### 1. Clone and Install

```bash
git clone https://github.com/Gzeu/distributed-ai-cluster.git
cd distributed-ai-cluster
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env if needed
```

### 3. Start Controller (Terminal 1)

```bash
npm run dev:controller
```

You should see:
```
🎯 Controller Node running on port 8080
🔌 API: http://localhost:8080/v1/chat/completions
📊 Dashboard: http://localhost:8080/cluster/status
```

### 4. Start Worker (Terminal 2)

```bash
npm run dev:worker
```

You should see:
```
🚀 Worker Node: worker_hostname_abc123
✅ Registered with controller
```

### 5. Test the Cluster

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "default",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 6. View Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Open http://localhost:3000

## Docker Compose (Recommended)

### 1. Prepare Model

```bash
mkdir -p models
# Download a GGUF model
wget https://huggingface.co/TheBloke/Llama-2-7B-GGUF/resolve/main/llama-2-7b.Q4_K_M.gguf \
  -O models/model.gguf
```

### 2. Start Services

```bash
docker-compose up -d
```

### 3. Check Status

```bash
docker-compose ps
docker-compose logs -f controller
```

### 4. Scale Workers

```bash
# Add more workers
docker-compose up -d --scale worker-2=5

# Or edit docker-compose.yml and add worker-3, worker-4, etc.
```

### 5. Access Services

- **API**: http://localhost:8080
- **Dashboard**: http://localhost:3000
- **Redis**: localhost:6379

## Kubernetes (Production)

See [docs/KUBERNETES.md](./KUBERNETES.md) for complete guide.

## Next Steps

- 📊 [Monitor your cluster](./MONITORING.md)
- ⚙️ [Configure load balancing](./CONFIGURATION.md)
- 🐛 [Troubleshooting](./TROUBLESHOOTING.md)
- 🚀 [Performance tuning](./PERFORMANCE.md)
