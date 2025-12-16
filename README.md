# 🚀 Distributed AI Cluster

**Run Large Language Models across multiple computers with automatic load balancing, P2P discovery, and OpenAI-compatible API.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

## ✨ Features

- 🔄 **Automatic P2P Discovery** - Nodes find each other automatically using mDNS/libp2p
- ⚖️ **Smart Load Balancing** - Distributes requests based on node capacity and current load
- 🚀 **Model Sharding** - Split large models across multiple machines
- 💾 **Distributed KV Cache** - Share attention cache across nodes for efficiency
- 🔌 **OpenAI-Compatible API** - Drop-in replacement for OpenAI client libraries
- 📊 **Real-time Monitoring** - Web dashboard for cluster health and performance
- 🛡️ **Fault Tolerant** - Automatic failover and node recovery
- 🔧 **Hardware Agnostic** - Works with NVIDIA GPUs, AMD, Apple Silicon, and CPU-only

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Controller Node                       │
│  • Load Balancer                                        │
│  • Service Discovery                                    │
│  • Health Monitor                                       │
│  • KV Cache Coordinator                                 │
│  • API Gateway (OpenAI-compatible)                      │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐   ┌───▼─────┐   ┌──▼──────┐
   │ Worker  │   │ Worker  │   │ Worker  │
   │ Node 1  │   │ Node 2  │   │ Node 3  │
   │ GPU/CPU │   │ GPU/CPU │   │ GPU/CPU │
   └─────────┘   └─────────┘   └─────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- LLM model file (GGUF format) - download from [HuggingFace](https://huggingface.co/models)

### Installation

```bash
# Clone repository
git clone https://github.com/Gzeu/distributed-ai-cluster.git
cd distributed-ai-cluster

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Download a model (example: Llama 2 7B)
mkdir -p models
wget https://huggingface.co/TheBloke/Llama-2-7B-GGUF/resolve/main/llama-2-7b.Q4_K_M.gguf -O models/llama-2-7b.gguf
```

### Running the Cluster

**On Machine 1 (Controller):**
```bash
npm run dev:controller
```

**On Machine 2+ (Workers):**
```bash
# Edit .env and set CONTROLLER_URL
CONTROLLER_URL=http://<controller-ip>:8080

npm run dev:worker
```

### Test the API

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-2-7b",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## 📡 API Reference

### OpenAI-Compatible Endpoint

```typescript
POST /v1/chat/completions
{
  "model": "llama-2-7b",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is distributed computing?"}
  ],
  "temperature": 0.7,
  "max_tokens": 500,
  "stream": false
}
```

### Health Check

```bash
GET /health
```

### Cluster Status

```bash
GET /cluster/status
```

## 🎯 Load Balancing Strategies

- **Least Loaded** - Routes to node with lowest current load
- **Round Robin** - Distributes evenly across all nodes
- **Capacity Based** - Considers GPU/CPU capability
- **Latency Optimized** - Routes to fastest responding node

## 🔧 Configuration

Edit `.env` file:

```bash
# Model sharding - split across nodes
SHARDING_ENABLED=true

# Enable distributed KV cache
KV_CACHE_SHARED=true
REDIS_URL=redis://localhost:6379

# GPU layers (increase for better GPU utilization)
GPU_LAYERS=32
```

## 📊 Monitoring Dashboard

Access web dashboard at: `http://localhost:8080/dashboard`

- Real-time node status
- Request throughput
- Token generation rate
- Resource utilization
- Model loading status

## 🛠️ Development

```bash
# Run tests
npm test

# Lint code
npm run lint

# Build for production
npm run build

# Start production
npm run start:controller
npm run start:worker
```

## 📦 Deployment

### Docker

```bash
# Coming soon
docker-compose up
```

### Systemd Service

See `docs/deployment.md` for production deployment guide.

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- Built with [node-llama-cpp](https://github.com/withcatai/node-llama-cpp)
- Inspired by [Exo](https://github.com/exo-explore/exo) and [LocalAI](https://localai.io)
- P2P networking powered by [libp2p](https://libp2p.io)

## 📚 Resources

- [Documentation](docs/)
- [Examples](examples/)
- [Troubleshooting](docs/troubleshooting.md)
- [Performance Tuning](docs/performance.md)

---

**Made with ❤️ by Gzeu**
