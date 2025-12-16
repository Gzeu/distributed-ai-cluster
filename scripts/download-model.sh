#!/bin/bash

# Download LLM models script

set -e

MODELS_DIR="./models"
mkdir -p "$MODELS_DIR"

echo "🚀 AI Cluster - Model Downloader"
echo "================================="
echo ""

PS3='Select a model to download: '
options=(
  "Llama 2 7B (Q4_K_M) - 4GB"
  "Llama 2 13B (Q4_K_M) - 7.4GB"
  "Mistral 7B (Q4_K_M) - 4.1GB"
  "Phi-2 (Q4_K_M) - 1.6GB"
  "TinyLlama 1.1B (Q4_K_M) - 669MB"
  "Custom URL"
  "Exit"
)

select opt in "${options[@]}"
do
  case $opt in
    "Llama 2 7B (Q4_K_M) - 4GB")
      URL="https://huggingface.co/TheBloke/Llama-2-7B-GGUF/resolve/main/llama-2-7b.Q4_K_M.gguf"
      FILENAME="llama-2-7b.gguf"
      break
      ;;
    "Llama 2 13B (Q4_K_M) - 7.4GB")
      URL="https://huggingface.co/TheBloke/Llama-2-13B-GGUF/resolve/main/llama-2-13b.Q4_K_M.gguf"
      FILENAME="llama-2-13b.gguf"
      break
      ;;
    "Mistral 7B (Q4_K_M) - 4.1GB")
      URL="https://huggingface.co/TheBloke/Mistral-7B-v0.1-GGUF/resolve/main/mistral-7b-v0.1.Q4_K_M.gguf"
      FILENAME="mistral-7b.gguf"
      break
      ;;
    "Phi-2 (Q4_K_M) - 1.6GB")
      URL="https://huggingface.co/TheBloke/phi-2-GGUF/resolve/main/phi-2.Q4_K_M.gguf"
      FILENAME="phi-2.gguf"
      break
      ;;
    "TinyLlama 1.1B (Q4_K_M) - 669MB")
      URL="https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
      FILENAME="tinyllama-1.1b.gguf"
      break
      ;;
    "Custom URL")
      read -p "Enter model URL: " URL
      read -p "Enter filename (e.g., model.gguf): " FILENAME
      break
      ;;
    "Exit")
      exit 0
      ;;
    *) echo "Invalid option $REPLY";;
  esac
done

echo ""
echo "📥 Downloading to: $MODELS_DIR/$FILENAME"
echo "🔗 URL: $URL"
echo ""

# Download with progress
wget --progress=bar:force:noscroll -O "$MODELS_DIR/$FILENAME" "$URL"

echo ""
echo "✅ Download complete!"
echo "📊 File size: $(du -h "$MODELS_DIR/$FILENAME" | cut -f1)"
echo ""
echo "🔧 Update your .env file:"
echo "   MODEL_PATH=./models/$FILENAME"
echo ""
echo "🚀 Start a worker with:"
echo "   npm run dev:worker"
