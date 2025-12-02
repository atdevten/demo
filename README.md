# PyBot - RAG Chatbot with Langchain, Ollama & Qdrant

A chatbot using RAG (Retrieval-Augmented Generation) built with:
- **Langchain**: Framework for managing RAG pipeline
- **Ollama**: Local LLM (supports many models like llama2, mistral, etc.)
- **Qdrant**: Vector database for storing embeddings
- **Gradio**: Simple web interface
- **Docker**: Containerization for easy deployment

## Features

- 📤 Upload text files to add to knowledge base
- 🔍 Semantic search with embeddings
- 💬 Chat with bot about content in uploaded files
- 🐳 Fully runs in Docker

## Requirements

- Docker and Docker Compose
- Minimum 4GB RAM (to run Ollama model)

## Installation and Running

### 1. Clone repository

```bash
git clone <repository-url>
cd pybot
```

### 2. Configure environment

Copy `.env.example` to `.env` and modify if needed:

```bash
cp .env.example .env
```

Important environment variables:
- `OLLAMA_MODEL`: Ollama model to use (default: llama2)
- `EMBEDDING_MODEL`: Embedding model (default: all-MiniLM-L6-v2)
- `CHUNK_SIZE`: Chunk size when splitting text (default: 1000)

### 3. Pull Ollama model (important!)

Before running the app, you need to pull an Ollama model. There are 2 ways:

**Method 1: Pull model before starting services**

```bash
# Start only Ollama service
docker-compose up -d ollama

# Pull model (e.g., llama2)
docker exec -it ollama ollama pull llama2

# Or if you want to use a different model (e.g., mistral)
docker exec -it ollama ollama pull mistral
```

**Method 2: Pull model after starting all services**

```bash
docker-compose up -d
docker exec -it ollama ollama pull llama2
```

### 4. Build and run

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### 5. Access the application

Open your browser and navigate to: http://localhost:7860

## Usage

1. **Upload file**: 
   - Click "Select text file (.txt)" and choose your text file
   - Click "Upload and Embed" to process the file
   - Wait for success message

2. **Chat with bot**:
   - Enter questions about the content in the uploaded file
   - Bot will search for relevant information and answer

## Project Structure

```
pybot/
├── app/
│   ├── __init__.py
│   ├── main.py              # Gradio UI
│   ├── chatbot.py           # Chatbot logic with Langchain
│   ├── embeddings.py        # Qdrant and embeddings
│   └── file_processor.py   # File upload processing
├── docker/
│   └── Dockerfile
├── docker-compose.yml       # Services configuration
├── requirements.txt
├── .env.example
└── README.md
```

## Supported Ollama Models

You can use any model supported by Ollama. Some popular models:

- `llama2`: Meta's Llama 2 (default)
- `mistral`: Mistral AI model
- `codellama`: Code-focused Llama model
- `neural-chat`: Intel's neural chat model

To see list of available models:
```bash
docker exec -it ollama ollama list
```

To pull a new model:
```bash
docker exec -it ollama ollama pull <model-name>
```

Then update `OLLAMA_MODEL` in `.env` file.

## Troubleshooting

### Error: "Model not found" when chatting

- Make sure you've pulled the Ollama model before chatting
- Check that `OLLAMA_MODEL` in `.env` matches the pulled model

### Error: Connection refused with Qdrant

- Make sure Qdrant service has started: `docker-compose ps`
- Check `QDRANT_HOST` and `QDRANT_PORT` in `.env`

### Error: Connection refused with Ollama

- Make sure Ollama service has started
- Check `OLLAMA_BASE_URL` in `.env`
- Make sure model has been pulled

### App runs slowly

- Large Ollama models may need more RAM
- Reduce `CHUNK_SIZE` if files are too large
- Reduce `top_k` in retriever if needed

## Stop services

```bash
docker-compose down
```

To remove volumes as well (Qdrant data and Ollama models):

```bash
docker-compose down -v
```

## License

MIT
