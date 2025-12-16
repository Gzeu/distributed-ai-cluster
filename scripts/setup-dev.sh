#!/bin/bash

# Development environment setup script

set -e

echo "🚀 Setting up AI Cluster development environment..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed"
  echo "📥 Install from: https://nodejs.org/"
  exit 1
fi

echo "✅ Node.js $(node --version)"
echo "✅ npm $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "📦 Installing dashboard dependencies..."
cd dashboard
npm install
cd ..

# Create .env if not exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo "✅ .env created from .env.example"
else
  echo "ℹ️  .env already exists"
fi

# Create models directory
mkdir -p models
echo "✅ Created models directory"

echo ""
echo "✨ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Download a model: ./scripts/download-model.sh"
echo "   2. Start controller: npm run dev:controller"
echo "   3. Start worker: npm run dev:worker"
echo "   4. Start dashboard: cd dashboard && npm run dev"
echo ""
echo "📖 Read docs/QUICK_START.md for detailed instructions"
