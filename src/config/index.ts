import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  qdrant: {
    url: string;
    apiKey?: string;
  };
  collection: {
    name: string;
  };
  ollama: {
    url: string;
  };
  huggingface: {
    embeddingModel: string;
    llmModel: string;
  };
  document: {
    chunkSize: number;
    chunkOverlap: number;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'production',
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
  },
  collection: {
    name: process.env.COLLECTION_NAME || 'documents',
  },
  ollama: {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
  },
  huggingface: {
    embeddingModel: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
    llmModel: process.env.LLM_MODEL || 'mistral',
  },
  document: {
    chunkSize: parseInt(process.env.CHUNK_SIZE || '1000', 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200', 10),
  },
};

