#!/bin/bash

# Kubernetes deployment script

set -e

NAMESPACE="ai-cluster"

echo "☸️  Deploying AI Cluster to Kubernetes..."
echo ""

# Check kubectl
if ! command -v kubectl &> /dev/null; then
  echo "❌ kubectl is not installed"
  exit 1
fi

echo "✅ kubectl $(kubectl version --client --short 2>/dev/null || kubectl version --client)"
echo ""

# Apply manifests
echo "📦 Creating namespace..."
kubectl apply -f k8s/namespace.yaml

echo "📦 Deploying Redis..."
kubectl apply -f k8s/redis-deployment.yaml

echo "⏳ Waiting for Redis..."
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=60s

echo "📦 Deploying Controller..."
kubectl apply -f k8s/controller-deployment.yaml

echo "⏳ Waiting for Controller..."
kubectl wait --for=condition=ready pod -l app=controller -n $NAMESPACE --timeout=120s

echo "📦 Deploying Workers..."
kubectl apply -f k8s/worker-deployment.yaml

echo "📦 Setting up Ingress..."
kubectl apply -f k8s/ingress.yaml

echo "📦 Setting up HPA..."
kubectl apply -f k8s/hpa.yaml

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Check status:"
echo "   kubectl get pods -n $NAMESPACE"
echo "   kubectl get svc -n $NAMESPACE"
echo ""
echo "🔍 View logs:"
echo "   kubectl logs -f deployment/controller -n $NAMESPACE"
echo "   kubectl logs -f statefulset/worker -n $NAMESPACE"
echo ""
echo "🌐 Get external IP:"
echo "   kubectl get svc controller -n $NAMESPACE"
