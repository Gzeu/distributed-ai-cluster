# Troubleshooting Guide

## Common Issues

### Worker Not Registering with Controller

**Symptoms:**
- Worker logs show `Failed to register with controller`
- No workers visible in dashboard

**Solutions:**

1. **Check Controller URL**
   ```bash
   # In .env
   CONTROLLER_URL=http://localhost:8080  # Use actual IP if on different machine
   ```

2. **Verify Controller is Running**
   ```bash
   curl http://localhost:8080/health
   ```

3. **Check Network Connectivity**
   ```bash
   # From worker machine
   ping <controller-ip>
   telnet <controller-ip> 8080
   ```

4. **Firewall Rules**
   ```bash
   # Allow port 8080 (controller)
   sudo ufw allow 8080/tcp
   
   # Allow port 8081 (workers)
   sudo ufw allow 8081/tcp
   ```

### Model Loading Fails

**Symptoms:**
- Worker starts but inference fails
- Error: `Model file not found`

**Solutions:**

1. **Verify Model Path**
   ```bash
   ls -lh models/model.gguf
   # Should show file size (e.g., 4.0G)
   ```

2. **Check File Permissions**
   ```bash
   chmod 644 models/model.gguf
   ```

3. **Use Demo Mode**
   ```bash
   # Comment out MODEL_PATH in .env
   # MODEL_PATH=./models/model.gguf
   ```

### High Memory Usage

**Symptoms:**
- Worker crashes with OOM
- System becomes unresponsive

**Solutions:**

1. **Reduce Context Length**
   ```bash
   # In .env
   CONTEXT_LENGTH=1024  # Instead of 2048
   ```

2. **Limit GPU Layers**
   ```bash
   # In .env
   GPU_LAYERS=0  # Force CPU-only
   ```

3. **Use Smaller Model**
   - Try 3B or 7B parameter models instead of 13B+

### Slow Inference

**Symptoms:**
- Requests timeout
- High response times (>30s)

**Solutions:**

1. **Enable GPU Acceleration**
   ```bash
   # In .env
   GPU_LAYERS=32  # Adjust based on VRAM
   ```

2. **Reduce Max Tokens**
   ```json
   {
     "max_tokens": 256  // Instead of 500+
   }
   ```

3. **Use Quantized Models**
   - Q4_K_M or Q5_K_M for best speed/quality balance

### Docker Issues

**Container Fails to Start:**
```bash
# Check logs
docker-compose logs controller

# Rebuild images
docker-compose build --no-cache

# Remove volumes and restart
docker-compose down -v
docker-compose up -d
```

**Port Conflicts:**
```bash
# Find process using port
lsof -i :8080

# Kill process or change port in docker-compose.yml
ports:
  - "8090:8080"  # Use 8090 externally
```

### Kubernetes Issues

**Pods Stuck in Pending:**
```bash
# Check events
kubectl describe pod -n ai-cluster <pod-name>

# Check resource availability
kubectl top nodes
```

**PVC Not Binding:**
```bash
# Check storage class
kubectl get storageclass

# Manually create PV if needed
kubectl apply -f k8s/pv.yaml
```

## Debug Mode

Enable verbose logging:

```bash
# In .env
LOG_LEVEL=debug
```

## Getting Help

1. Check [GitHub Issues](https://github.com/Gzeu/distributed-ai-cluster/issues)
2. Review logs: `docker-compose logs -f`
3. Test health endpoints: `curl http://localhost:8080/health`
4. Open an issue with:
   - OS and version
   - Node.js version
   - Full error logs
   - Steps to reproduce
