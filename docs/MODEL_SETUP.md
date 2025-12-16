# Model Setup Guide

## Supported Model Formats

This cluster supports **GGUF** format models only (used by llama.cpp).

### Popular Models

| Model | Size | VRAM (Q4) | Best For |
|-------|------|-----------|----------|
| TinyLlama 1.1B | 669MB | 1GB | Testing, low-resource |
| Phi-2 2.7B | 1.6GB | 2GB | Code, reasoning |
| Llama 2 7B | 4GB | 4-6GB | General purpose |
| Mistral 7B | 4.1GB | 4-6GB | High quality, fast |
| Llama 2 13B | 7.4GB | 8-10GB | Better quality |
| CodeLlama 13B | 7.4GB | 8-10GB | Coding tasks |
| Llama 2 70B | 38GB | 40GB+ | Maximum quality |

## Downloading Models

### Method 1: Automated Script

```bash
chmod +x scripts/download-model.sh
./scripts/download-model.sh
```

Select from popular pre-configured models.

### Method 2: Manual Download

**From HuggingFace:**

```bash
# Example: Llama 2 7B Q4_K_M quantization
wget https://huggingface.co/TheBloke/Llama-2-7B-GGUF/resolve/main/llama-2-7b.Q4_K_M.gguf \
  -O models/llama-2-7b.gguf

# Mistral 7B
wget https://huggingface.co/TheBloke/Mistral-7B-v0.1-GGUF/resolve/main/mistral-7b-v0.1.Q4_K_M.gguf \
  -O models/mistral-7b.gguf
```

**Browse more models:**
- https://huggingface.co/TheBloke (Most popular quantized models)
- https://huggingface.co/models?sort=downloads&search=gguf

## Quantization Types

GGUF models come in different quantization levels:

| Type | Size | Quality | Speed | Use Case |
|------|------|---------|-------|----------|
| Q2_K | Smallest | Low | Fastest | Testing only |
| Q3_K_M | Small | Medium-Low | Very Fast | Resource-constrained |
| Q4_K_M | **Recommended** | Good | Fast | Best balance |
| Q5_K_M | Medium | Very Good | Medium | Higher quality |
| Q6_K | Large | Excellent | Slower | Near-original quality |
| Q8_0 | Largest | Best | Slowest | Maximum quality |

**Recommendation:** Use `Q4_K_M` for best speed/quality balance.

## GPU Configuration

### Determining GPU Layers

```bash
# Check available VRAM
nvidia-smi

# Calculate layers
# Rough formula: GPU_LAYERS = (VRAM_GB / MODEL_SIZE_GB) * 40
```

**Examples:**

| GPU | VRAM | Llama 2 7B (Q4) | Mistral 7B (Q4) |
|-----|------|-----------------|------------------|
| GTX 1660 | 6GB | GPU_LAYERS=24 | GPU_LAYERS=24 |
| RTX 3060 | 12GB | GPU_LAYERS=99 | GPU_LAYERS=99 |
| RTX 3090 | 24GB | GPU_LAYERS=99 | GPU_LAYERS=99 |
| RTX 4090 | 24GB | GPU_LAYERS=99 | GPU_LAYERS=99 |

### Configuration

**GPU Acceleration (NVIDIA):**
```bash
# In .env
MODEL_PATH=./models/llama-2-7b.gguf
GPU_LAYERS=32  # Adjust based on VRAM
CONTEXT_LENGTH=2048
```

**CPU Only:**
```bash
MODEL_PATH=./models/llama-2-7b.gguf
GPU_LAYERS=0
CONTEXT_LENGTH=2048
```

**Apple Silicon (M1/M2/M3):**
```bash
MODEL_PATH=./models/llama-2-7b.gguf
GPU_LAYERS=1  # Enable Metal acceleration
CONTEXT_LENGTH=2048
```

## Multi-Model Setup

Run different models on different workers:

**Worker 1 (Fast, small model):**
```bash
MODEL_PATH=./models/phi-2.gguf
GPU_LAYERS=99
WORKER_PORT=8081
```

**Worker 2 (Slower, better quality):**
```bash
MODEL_PATH=./models/llama-2-13b.gguf
GPU_LAYERS=32
WORKER_PORT=8082
```

## Performance Tuning

### Context Length

```bash
# Smaller = Faster, less memory
CONTEXT_LENGTH=1024  # Short conversations

# Balanced
CONTEXT_LENGTH=2048  # Default, recommended

# Larger = Slower, more memory
CONTEXT_LENGTH=4096  # Long conversations
CONTEXT_LENGTH=8192  # Very long context (requires compatible model)
```

### Batch Size

```bash
# Larger batch = Better GPU utilization
BATCH_SIZE=512   # Default
BATCH_SIZE=1024  # High-end GPUs
BATCH_SIZE=256   # Lower-end GPUs
```

### Thread Count

```bash
# CPU inference only
# Recommended: CPU cores - 1
THREADS=7  # For 8-core CPU
```

## Verifying Model Loading

**Check worker logs:**
```bash
npm run dev:worker

# Should see:
# 📦 Loading model: ./models/llama-2-7b.gguf
# ✅ Model loaded successfully in 3.45s
#    Model size: 4.08 GB
#    Context: 2048
#    GPU Layers: 32
```

**Test inference:**
```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "default",
    "messages": [{"role": "user", "content": "Say hi!"}]
  }'
```

## Troubleshooting

### Model Not Loading

```bash
# Check file exists
ls -lh models/

# Check permissions
chmod 644 models/*.gguf

# Verify GGUF format
file models/*.gguf
# Should show: "GGUF model file"
```

### Out of Memory

```bash
# Reduce GPU layers
GPU_LAYERS=16  # Instead of 32

# Reduce context
CONTEXT_LENGTH=1024  # Instead of 2048

# Use smaller quantization
# Download Q3_K_M instead of Q4_K_M
```

### Slow Inference

```bash
# Increase GPU layers
GPU_LAYERS=99  # Use all VRAM

# Use smaller model
# Switch from 13B to 7B model

# Reduce context if not needed
CONTEXT_LENGTH=1024
```

## Recommended Setups

### Budget Setup (8GB VRAM)
```bash
MODEL_PATH=./models/llama-2-7b.Q4_K_M.gguf
GPU_LAYERS=24
CONTEXT_LENGTH=2048
BATCH_SIZE=512
```

### Balanced Setup (12GB VRAM)
```bash
MODEL_PATH=./models/mistral-7b.Q5_K_M.gguf
GPU_LAYERS=99
CONTEXT_LENGTH=4096
BATCH_SIZE=1024
```

### High-End Setup (24GB VRAM)
```bash
MODEL_PATH=./models/llama-2-13b.Q5_K_M.gguf
GPU_LAYERS=99
CONTEXT_LENGTH=8192
BATCH_SIZE=1024
```

### CPU-Only Setup
```bash
MODEL_PATH=./models/phi-2.Q4_K_M.gguf
GPU_LAYERS=0
CONTEXT_LENGTH=2048
THREADS=7
```
