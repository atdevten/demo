import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from '../config';
import { TextChunk } from './textSplitter';
import { Embedder } from './embedder';

export interface SearchResult {
  text: string;
  metadata: TextChunk['metadata'];
  score: number;
}

export class VectorStore {
  private client: QdrantClient;
  private collectionName: string;
  private embedder: Embedder;

  constructor() {
    this.client = new QdrantClient({
      url: config.qdrant.url,
      apiKey: config.qdrant.apiKey,
    });
    this.collectionName = config.collection.name;
    this.embedder = new Embedder();
  }

  /**
   * Tạo collection nếu chưa tồn tại
   */
  async createCollectionIfNotExists(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (col) => col.name === this.collectionName
      );

      if (!exists) {
        const vectorSize = this.embedder.getDimension();
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: vectorSize,
            distance: 'Cosine',
          },
        });
        console.log(`Collection "${this.collectionName}" has been created with dimension ${vectorSize}`);
      } else {
        // Check if collection dimension matches
        const collectionInfo = await this.client.getCollection(this.collectionName);
        const currentSize = collectionInfo.config?.params?.vectors?.size;
        const expectedSize = this.embedder.getDimension();
        
        if (currentSize !== expectedSize) {
          console.warn(`⚠️  Collection dimension mismatch! Current: ${currentSize}, Expected: ${expectedSize}`);
          console.warn(`   Deleting and recreating collection "${this.collectionName}"...`);
          
          // Delete existing collection
          await this.client.deleteCollection(this.collectionName);
          
          // Recreate with correct dimension
          await this.client.createCollection(this.collectionName, {
            vectors: {
              size: expectedSize,
              distance: 'Cosine',
            },
          });
          console.log(`Collection "${this.collectionName}" has been recreated with dimension ${expectedSize}`);
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const errorDetails = error?.response?.data || error?.status || '';
      console.error('Error creating collection:', {
        message: errorMessage,
        details: errorDetails
      });
      throw new Error(`Error creating collection: ${errorMessage}${errorDetails ? ` - ${JSON.stringify(errorDetails)}` : ''}`);
    }
  }

  /**
   * Thêm documents vào vector store
   */
  async addDocuments(chunks: TextChunk[]): Promise<void> {
    let embeddings: number[][] = [];
    let points: any[] = [];
    
    try {
      await this.createCollectionIfNotExists();

      // Tạo embeddings cho tất cả chunks
      const texts = chunks.map((chunk) => chunk.text);
      embeddings = await this.embedder.embedTexts(texts);

      // Prepare points for Qdrant
      // Qdrant accepts string IDs, but we'll use a hash-based approach for uniqueness
      points = chunks.map((chunk, index) => {
        const embedding = embeddings[index];
        
        // Validate embedding
        if (!embedding || !Array.isArray(embedding) || embedding.length !== this.embedder.getDimension()) {
          throw new Error(`Invalid embedding at index ${index}: expected length ${this.embedder.getDimension()}, got ${embedding?.length || 'null'}`);
        }
        
        // Ensure all payload values are JSON-serializable
        const payload: any = {
          text: String(chunk.text),
          filename: String(chunk.metadata.filename),
          filepath: String(chunk.metadata.filepath),
          uploadedAt: chunk.metadata.uploadedAt instanceof Date 
            ? chunk.metadata.uploadedAt.toISOString() 
            : String(chunk.metadata.uploadedAt),
          chunkIndex: Number(chunk.metadata.chunkIndex),
          totalChunks: Number(chunk.metadata.totalChunks),
        };
        
        return {
          id: this.generatePointId(chunk.metadata),
          vector: embedding,
          payload: payload,
        };
      });
      
      console.log(`Prepared ${points.length} points for upsert, first point ID: ${points[0]?.id}, vector size: ${points[0]?.vector?.length}`);

      // Upsert points
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: points,
      });

      console.log(`Added ${points.length} chunks to vector store`);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      let errorDetails: any = '';
      
      // Try to extract error details from Qdrant response
      if (error?.data) {
        errorDetails = error.data;
      } else if (error?.response?.data) {
        errorDetails = error.response.data;
      }
      
      // Log the full error structure
      console.error('Qdrant upsert error details:', {
        message: errorMessage,
        status: error?.status,
        statusText: error?.statusText,
        errorData: errorDetails,
        collection: this.collectionName,
        pointsCount: points.length,
        vectorSize: embeddings[0]?.length,
        firstPointId: points[0]?.id,
        firstVectorLength: points[0]?.vector?.length,
        firstPointPayload: JSON.stringify(points[0]?.payload || {}).substring(0, 200),
      });
      
      // Extract the actual error message from Qdrant
      let qdrantErrorMsg = '';
      if (errorDetails?.status) {
        qdrantErrorMsg = JSON.stringify(errorDetails.status);
      } else if (typeof errorDetails === 'string') {
        qdrantErrorMsg = errorDetails;
      } else if (errorDetails) {
        qdrantErrorMsg = JSON.stringify(errorDetails);
      }
      
      throw new Error(`Error adding documents: ${errorMessage}${qdrantErrorMsg ? ` - ${qdrantErrorMsg}` : ''}`);
    }
  }

  /**
   * Tìm kiếm similar documents
   */
  async searchSimilar(
    query: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      // Tạo embedding cho query
      const queryEmbedding = await this.embedder.embedText(query);

      // Search trong Qdrant
      const searchResults = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit: limit,
        with_payload: true,
      });

      return searchResults.map((result) => ({
        text: result.payload?.text as string,
        metadata: {
          filename: result.payload?.filename as string,
          filepath: result.payload?.filepath as string,
          uploadedAt: new Date(result.payload?.uploadedAt as string),
          chunkIndex: result.payload?.chunkIndex as number,
          totalChunks: result.payload?.totalChunks as number,
        },
        score: result.score || 0,
      }));
    } catch (error) {
      throw new Error(`Error searching: ${error}`);
    }
  }

  /**
   * Generate unique point ID từ metadata
   * Qdrant only accepts unsigned integers or UUIDs, so we'll use a hash-based numeric ID
   */
  private generatePointId(metadata: TextChunk['metadata']): number {
    // Create a hash from filename and chunkIndex to generate a unique numeric ID
    const idString = `${metadata.filename}_${metadata.chunkIndex}`;
    
    // Simple hash function to convert string to number
    let hash = 0;
    for (let i = 0; i < idString.length; i++) {
      const char = idString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Ensure positive number (unsigned integer)
    return Math.abs(hash);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      return false;
    }
  }
}

