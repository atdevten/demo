# RAG Chatbot with LangChain, Qdrant, and Ollama

A production-ready RAG (Retrieval-Augmented Generation) chatbot that allows users to upload text documents and ask questions about their content. The system uses local, open-source models running entirely in Docker containers - no API keys required!

## 🚀 Features

- **Document Upload**: Upload `.txt` files and automatically process them
- **Intelligent Q&A**: Ask questions about uploaded documents
- **Local & Private**: All processing happens locally - no external API calls
- **Dockerized**: Complete setup with Docker Compose
- **Auto Model Download**: Models are automatically downloaded on first use
- **Vector Search**: Fast semantic search using Qdrant vector database

## 🏗️ Architecture

- **Backend**: Node.js/TypeScript with Express
- **Frontend**: Simple HTML/CSS/JavaScript interface
- **Vector Database**: Qdrant (Docker container)
- **LLM & Embeddings**: Ollama (Docker container, local models)
- **RAG Pipeline**: LangChain for orchestration

## 📋 Requirements

- Docker and Docker Compose
- **No API keys needed** - everything runs locally!

## 🛠️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/atdevten/demo.git
cd demo
```

### 2. Create environment file (Optional)

```bash
cp .env.example .env
```

Edit `.env` to customize settings:
- `OLLAMA_URL`: Ollama service URL (default: `http://ollama:11434`)
- `EMBEDDING_MODEL`: Embedding model (default: `nomic-embed-text`)
- `LLM_MODEL`: LLM model (default: `mistral`)
- `QDRANT_API_KEY`: Optional - Only needed for Qdrant Cloud

**Note**: Models will be automatically downloaded on first use. Initial download may take a few minutes:
- `nomic-embed-text`: ~274MB (embedding model)
- `mistral`: ~4GB (LLM model)

### 3. Build and run with Docker Compose

```bash
docker-compose up --build
```

This command will:
- Build the backend Docker image
- Start Qdrant container
- Start Ollama container
- Start backend container
- Automatically create the Qdrant collection
- Automatically download Ollama models when needed (first time may take a few minutes)

### 4. Access the application

Open your browser and navigate to: `http://localhost:3000`

## 📖 Usage

### Upload Documents

1. Click "Choose File" or drag and drop a `.txt` file into the upload area
2. Wait for the system to process (chunking and creating embeddings)
3. When you see a success message, you can start asking questions

### Ask Questions

1. Type your question in the chat input
2. Press Enter or click "Send"
3. The chatbot will search for relevant information in the documents and provide an answer

## 🔌 API Endpoints

### POST /api/upload

Upload and process a text document.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: file (field name: `document`)

**Response:**
```json
{
  "success": true,
  "message": "Document uploaded, processed, and embeddings created successfully!",
  "data": {
    "filename": "example.txt",
    "originalFilename": "example.txt",
    "chunks": 10,
    "size": 5000,
    "status": "Embedded and stored in vector database"
  }
}
```

### POST /api/chat

Ask a question about the uploaded documents.

**Request:**
```json
{
  "question": "Your question here",
  "topK": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Answer from the LLM based on the document context",
    "sources": [
      {
        "text": "Relevant text excerpt from the document",
        "metadata": {
          "filename": "example.txt",
          "filepath": "/path/to/file",
          "uploadedAt": "2024-01-01T00:00:00.000Z",
          "chunkIndex": 0,
          "totalChunks": 10
        },
        "score": 0.95
      }
    ]
  }
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "qdrant": "healthy"
  }
}
```

## 📁 Project Structure

```
chatbot/
├── src/
│   ├── config/          # Configuration management
│   │   └── index.ts
│   ├── services/        # Core services
│   │   ├── documentLoader.ts    # Load and parse text files
│   │   ├── textSplitter.ts     # Split documents into chunks
│   │   ├── embedder.ts          # Create embeddings using Ollama
│   │   ├── vectorStore.ts       # Qdrant vector database operations
│   │   └── ragChain.ts          # RAG pipeline with LLM
│   ├── routes/          # API routes
│   │   ├── upload.ts   # Document upload endpoint
│   │   ├── chat.ts     # Chat/query endpoint
│   │   └── health.ts   # Health check endpoint
│   └── index.ts        # Express server entry point
├── public/             # Frontend files
│   ├── index.html      # Main UI
│   └── app.js          # Frontend JavaScript
├── uploads/            # Uploaded documents (gitignored)
├── docker/             # Docker-related scripts
│   └── init-ollama.sh  # Ollama initialization script
├── Dockerfile          # Backend Dockerfile
├── docker-compose.yml  # Docker orchestration
├── package.json
├── tsconfig.json
├── .env.example        # Environment variables template
└── README.md
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `QDRANT_URL` | Qdrant service URL | `http://qdrant:6333` |
| `QDRANT_API_KEY` | Qdrant API key | (optional) |
| `COLLECTION_NAME` | Qdrant collection name | `documents` |
| `OLLAMA_URL` | Ollama service URL | `http://ollama:11434` |
| `EMBEDDING_MODEL` | Embedding model name | `nomic-embed-text` |
| `LLM_MODEL` | LLM model name | `mistral` |
| `CHUNK_SIZE` | Document chunk size (characters) | `1000` |
| `CHUNK_OVERLAP` | Chunk overlap (characters) | `200` |

## 🐛 Troubleshooting

### Qdrant Connection Issues

- Check if Qdrant container is running: `docker ps`
- Check logs: `docker-compose logs qdrant`
- Ensure `QDRANT_URL` in `.env` matches the service name in `docker-compose.yml`

### Ollama Model Errors

- Models are automatically downloaded when needed
- First download may take several minutes:
  - `nomic-embed-text`: ~274MB
  - `mistral`: ~4GB
- Check logs: `docker-compose logs ollama`
- Manually pull a model: `docker exec chatbot-ollama ollama pull nomic-embed-text`
- If you see "EOF" errors, wait a few seconds for the model to finish loading

### Upload File Errors

- Ensure the file is `.txt` format
- Check file size (max 10MB)
- Check logs: `docker-compose logs backend`
- Verify the file is valid UTF-8 text

### Collection Dimension Mismatch

If you see "Bad Request" errors when uploading:
- The system automatically detects and fixes dimension mismatches
- Collection will be recreated with the correct dimension
- Check logs for dimension mismatch warnings

## 💻 Development

### Run Locally (without Docker)

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start Qdrant (Docker)
docker run -p 6333:6333 qdrant/qdrant

# Start Ollama (Docker)
docker run -p 11434:11434 ollama/ollama

# Set environment variables
export OLLAMA_URL=http://localhost:11434
export QDRANT_URL=http://localhost:6333

# Start backend
npm start
```

### Development Mode with Hot Reload

```bash
npm run dev
```

### Available Scripts

- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start the production server
- `npm run dev` - Start development server with hot reload
- `npm run clean` - Remove build directory

## 🔄 Current Status

✅ **Fully Functional**
- Document upload and processing
- Automatic embedding generation with Ollama
- Vector storage in Qdrant
- RAG-based question answering
- Docker Compose setup
- Automatic model downloading
- Collection dimension auto-fix

## 📝 Notes

- **Privacy**: All processing happens locally - no data is sent to external services
- **Performance**: First document upload may be slower as models are downloaded/loaded
- **Storage**: Uploaded documents are stored in the `uploads/` directory
- **Models**: Ollama models are cached in Docker volume `ollama_data`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT

## 🙏 Acknowledgments

- [LangChain](https://github.com/langchain-ai/langchain) - RAG framework
- [Qdrant](https://github.com/qdrant/qdrant) - Vector database
- [Ollama](https://github.com/ollama/ollama) - Local LLM runtime
