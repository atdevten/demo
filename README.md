# Chatbot RAG với LangChain, Qdrant và Hugging Face

Chatbot RAG (Retrieval-Augmented Generation) cho phép người dùng upload tài liệu text và đặt câu hỏi về nội dung tài liệu. Hệ thống sử dụng:

- **LangChain**: Framework cho RAG pipeline
- **Qdrant**: Vector database để lưu trữ embeddings
- **Hugging Face**: LLM và embeddings models (miễn phí)
- **Docker**: Containerization cho tất cả services

## Kiến trúc

- **Backend**: Node.js/TypeScript với Express
- **Frontend**: HTML/CSS/JavaScript (static files)
- **Vector DB**: Qdrant (Docker container)
- **LLM**: Hugging Face Inference API

## Yêu cầu

- Docker và Docker Compose
- (Tùy chọn) Hugging Face API key để tăng rate limit

## Cài đặt và Chạy

### 1. Clone repository và vào thư mục

```bash
cd chatbot
```

### 2. Create .env file (Required for Hugging Face)

```bash
cp .env.example .env
```

Edit `.env` and add your Hugging Face API key:
- `HUGGINGFACE_API_KEY`: **REQUIRED** - Get your free API key at https://huggingface.co/settings/tokens
- `QDRANT_API_KEY`: Optional - Only needed if using Qdrant Cloud

**Important**: Without `HUGGINGFACE_API_KEY`, the chatbot will not be able to create embeddings or generate answers.

### 3. Build và chạy với Docker Compose

```bash
docker-compose up --build
```

Lệnh này sẽ:
- Build backend Docker image
- Khởi động Qdrant container
- Khởi động backend container
- Tự động tạo collection trong Qdrant

### 4. Truy cập ứng dụng

Mở trình duyệt và truy cập: `http://localhost:3000`

## Sử dụng

### Upload Tài Liệu

1. Click vào "Chọn File" hoặc kéo thả file `.txt` vào vùng upload
2. Đợi hệ thống xử lý (chunking và tạo embeddings)
3. Khi thấy thông báo thành công, bạn có thể đặt câu hỏi

### Đặt Câu Hỏi

1. Nhập câu hỏi vào ô chat
2. Nhấn Enter hoặc click "Gửi"
3. Chatbot sẽ tìm kiếm thông tin liên quan trong tài liệu và trả lời

## API Endpoints

### POST /api/upload
Upload và xử lý tài liệu text.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: file (field name: `document`)

**Response:**
```json
{
  "success": true,
  "message": "Tài liệu đã được xử lý và lưu trữ thành công",
  "data": {
    "filename": "example.txt",
    "chunks": 10,
    "size": 5000
  }
}
```

### POST /api/chat
Đặt câu hỏi về tài liệu.

**Request:**
```json
{
  "question": "Câu hỏi của bạn",
  "topK": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Câu trả lời từ LLM",
    "sources": [
      {
        "text": "Nội dung đoạn text",
        "metadata": {
          "filename": "example.txt",
          "chunkIndex": 0
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

## Cấu trúc Dự án

```
chatbot/
├── src/
│   ├── config/          # Configuration
│   ├── services/        # Core services
│   │   ├── documentLoader.ts
│   │   ├── textSplitter.ts
│   │   ├── embedder.ts
│   │   ├── vectorStore.ts
│   │   └── ragChain.ts
│   ├── routes/          # API routes
│   │   ├── upload.ts
│   │   ├── chat.ts
│   │   └── health.ts
│   └── index.ts         # Express server
├── public/              # Frontend files
│   ├── index.html
│   └── app.js
├── uploads/             # Uploaded documents
├── Dockerfile           # Backend Dockerfile
├── docker-compose.yml   # Docker orchestration
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | production |
| `QDRANT_URL` | Qdrant URL | http://qdrant:6333 |
| `QDRANT_API_KEY` | Qdrant API key | (optional) |
| `COLLECTION_NAME` | Collection name | documents |
| `HUGGINGFACE_API_KEY` | HF API key | (optional) |
| `EMBEDDING_MODEL` | Embedding model | sentence-transformers/all-MiniLM-L6-v2 |
| `LLM_MODEL` | LLM model | mistralai/Mistral-7B-Instruct-v0.1 |
| `CHUNK_SIZE` | Chunk size | 1000 |
| `CHUNK_OVERLAP` | Chunk overlap | 200 |

## Troubleshooting

### Qdrant không kết nối được
- Kiểm tra Qdrant container đang chạy: `docker ps`
- Kiểm tra logs: `docker-compose logs qdrant`
- Đảm bảo `QDRANT_URL` trong .env đúng với service name trong docker-compose

### Hugging Face API errors
- Nếu không có API key, rate limit sẽ rất thấp
- Lấy API key miễn phí tại: https://huggingface.co/settings/tokens
- Thêm vào `.env`: `HUGGINGFACE_API_KEY=your_key_here`

### Upload file lỗi
- Đảm bảo file là `.txt`
- Kiểm tra kích thước file (max 10MB)
- Kiểm tra logs: `docker-compose logs backend`

## Development

### Chạy local (không Docker)

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start Qdrant (Docker)
docker run -p 6333:6333 qdrant/qdrant

# Start backend
npm start
```

### Development mode với hot reload

```bash
npm run dev
```

## License

MIT

