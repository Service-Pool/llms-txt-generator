#!/bin/bash

# Export Ollama environment variables
export OLLAMA_KEEP_ALIVE="${OLLAMA_KEEP_ALIVE}"

echo "Starting Ollama service with OLLAMA_KEEP_ALIVE=${OLLAMA_KEEP_ALIVE}"

# Start Ollama server in background
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "Waiting for Ollama to start..."
sleep 5

# Pull the model
echo "Pulling model: ${OLLAMA_MODEL}"
ollama pull "${OLLAMA_MODEL}"

# Keep Ollama running in foreground
wait $OLLAMA_PID
