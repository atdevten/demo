#!/bin/bash
# Script to initialize Ollama models

OLLAMA_URL=${OLLAMA_URL:-http://localhost:11434}
EMBEDDING_MODEL=${EMBEDDING_MODEL:-nomic-embed-text}
LLM_MODEL=${LLM_MODEL:-mistral}

echo "Waiting for Ollama to be ready..."
until curl -s $OLLAMA_URL/api/tags > /dev/null 2>&1; do
  echo "Waiting for Ollama..."
  sleep 2
done

echo "Pulling embedding model: $EMBEDDING_MODEL"
curl -X POST "$OLLAMA_URL/api/pull" -d "{\"name\": \"$EMBEDDING_MODEL\"}"

echo "Pulling LLM model: $LLM_MODEL"
curl -X POST "$OLLAMA_URL/api/pull" -d "{\"name\": \"$LLM_MODEL\"}"

echo "Ollama models initialized!"

