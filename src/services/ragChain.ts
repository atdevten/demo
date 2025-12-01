import { config } from '../config';
import { VectorStore, SearchResult } from './vectorStore';

export interface ChatResponse {
  answer: string;
  sources: SearchResult[];
}

export class RAGChain {
  private ollamaUrl: string;
  private vectorStore: VectorStore;
  private llmModel: string;

  constructor(vectorStore: VectorStore) {
    this.ollamaUrl = config.ollama.url;
    this.vectorStore = vectorStore;
    this.llmModel = config.huggingface.llmModel;
    console.log(`Using Ollama for LLM at ${this.ollamaUrl} with model: ${this.llmModel}`);
  }

  /**
   * Tạo prompt với context từ retrieved documents
   */
  private createPrompt(query: string, contexts: SearchResult[]): string {
    const contextText = contexts
      .map((ctx, idx) => `[${idx + 1}] ${ctx.text}`)
      .join('\n\n');

    return `You are an intelligent AI assistant. Please answer the question based on the context provided from the document.

Context from document:
${contextText}

Question: ${query}

Please answer the question accurately and in detail based on the context above. If the information is not in the context, please clearly state that.

Answer:`;
  }

  /**
   * Pull LLM model từ Ollama
   */
  private async pullModel(): Promise<void> {
    try {
      console.log(`Pulling LLM model: ${this.llmModel} (this may take several minutes...)`);
      const pullResponse = await fetch(`${this.ollamaUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: this.llmModel,
        }),
      });

      if (!pullResponse.ok) {
        const errorText = await pullResponse.text();
        throw new Error(`Failed to pull model: ${errorText}`);
      }

      // Wait for pull to complete (streaming response)
      const reader = pullResponse.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Log progress
          const chunk = decoder.decode(value);
          try {
            const lines = chunk.split('\n').filter(l => l.trim());
            for (const line of lines) {
              const data = JSON.parse(line);
              if (data.status) {
                process.stdout.write(`\rPulling ${this.llmModel}: ${data.status}...`);
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        console.log(`\nModel ${this.llmModel} pulled successfully`);
      }
    } catch (error: any) {
      console.error(`Error pulling model: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate answer sử dụng Ollama LLM
   */
  async generateAnswer(
    query: string,
    contexts: SearchResult[]
  ): Promise<string> {
    try {
      const prompt = this.createPrompt(query, contexts);

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.llmModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            num_predict: 512,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // If model not found, try to pull it
        if (response.status === 404 && errorText.includes('not found')) {
          console.log(`LLM model ${this.llmModel} not found, attempting to pull...`);
          await this.pullModel();
          
          // Retry the request after pulling
          const retryResponse = await fetch(`${this.ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: this.llmModel,
              prompt: prompt,
              stream: false,
              options: {
                temperature: 0.7,
                top_p: 0.9,
                num_predict: 512,
              },
            }),
          });

          if (!retryResponse.ok) {
            const retryErrorText = await retryResponse.text();
            throw new Error(`Ollama API error: ${retryResponse.status} ${retryResponse.statusText} - ${retryErrorText}`);
          }

          const retryData = await retryResponse.json();
          if (!retryData.response) {
            throw new Error('Invalid response format from Ollama');
          }
          return retryData.response.trim();
        }
        
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.response) {
        throw new Error('Invalid response format from Ollama');
      }

      return data.response.trim();
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error('LLM generation error:', {
        message: errorMessage,
        model: this.llmModel,
        ollamaUrl: this.ollamaUrl
      });
      throw new Error(`Error generating answer: ${errorMessage}`);
    }
  }

  /**
   * RAG pipeline: Retrieve + Generate
   */
  async query(query: string, topK: number = 5): Promise<ChatResponse> {
    try {
      // 1. Retrieve relevant documents
      const sources = await this.vectorStore.searchSimilar(query, topK);

      if (sources.length === 0) {
        return {
          answer: 'Sorry, I could not find relevant information in the document.',
          sources: [],
        };
      }

      // 2. Generate answer với context
      const answer = await this.generateAnswer(query, sources);

      return {
        answer,
        sources,
      };
    } catch (error) {
      throw new Error(`Error in RAG pipeline: ${error}`);
    }
  }
}

