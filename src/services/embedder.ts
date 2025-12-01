import { config } from '../config';

export class Embedder {
  private ollamaUrl: string;
  private model: string;
  private modelPulling: Promise<void> | null = null;
  private modelReady: boolean = false;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = config.huggingface.embeddingModel || 'nomic-embed-text';
    console.log(`Using Ollama for embeddings at ${this.ollamaUrl} with model: ${this.model}`);
  }

  /**
   * Pull model từ Ollama
   */
  private async pullModel(): Promise<void> {
    try {
      console.log(`Pulling embedding model: ${this.model} (this may take a few minutes...)`);
      const pullResponse = await fetch(`${this.ollamaUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: this.model,
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
                process.stdout.write(`\rPulling ${this.model}: ${data.status}...`);
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        console.log(`\nModel ${this.model} pulled successfully`);
      }
    } catch (error: any) {
      console.error(`Error pulling model: ${error.message}`);
      throw error;
    }
  }

  /**
   * Tạo embedding cho một đoạn text sử dụng Ollama
   */
  async embedText(text: string): Promise<number[]> {
    try {
      // Ensure model is ready before making request
      if (!this.modelReady) {
        await this.pullModel();
      }

      const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // If model not found or EOF error (model loading), try to pull/ensure it exists
        if (response.status === 404 && errorText.includes('not found')) {
          console.log(`Model ${this.model} not found, attempting to pull...`);
          await this.pullModel();
          
          // Wait a bit for model to be ready
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Retry the request after pulling
          const retryResponse = await fetch(`${this.ollamaUrl}/api/embeddings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: this.model,
              prompt: text,
            }),
          });

          if (!retryResponse.ok) {
            const retryErrorText = await retryResponse.text();
            throw new Error(`Ollama API error: ${retryResponse.status} ${retryResponse.statusText} - ${retryErrorText}`);
          }

          const retryData = await retryResponse.json();
          if (!retryData.embedding || !Array.isArray(retryData.embedding)) {
            throw new Error('Invalid response format from Ollama');
          }
          return retryData.embedding as number[];
        }
        
        // If EOF error, model might be loading - wait and retry
        if (response.status === 500 && errorText.includes('EOF')) {
          console.log(`Model ${this.model} appears to be loading, waiting and retrying...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const retryResponse = await fetch(`${this.ollamaUrl}/api/embeddings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: this.model,
              prompt: text,
            }),
          });

          if (!retryResponse.ok) {
            const retryErrorText = await retryResponse.text();
            throw new Error(`Ollama API error: ${retryResponse.status} ${retryResponse.statusText} - ${retryErrorText}`);
          }

          const retryData = await retryResponse.json();
          if (!retryData.embedding || !Array.isArray(retryData.embedding)) {
            throw new Error('Invalid response format from Ollama');
          }
          return retryData.embedding as number[];
        }
        
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('Invalid response format from Ollama');
      }

      return data.embedding as number[];
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error('Single embedding error:', {
        message: errorMessage,
        model: this.model,
        ollamaUrl: this.ollamaUrl
      });
      throw new Error(`Error creating embedding: ${errorMessage}`);
    }
  }

  /**
   * Tạo embeddings cho nhiều texts sử dụng Ollama
   */
  async embedTexts(texts: string[]): Promise<number[][]> {
    try {
      console.log(`Creating embeddings for ${texts.length} texts using Ollama model: ${this.model}`);
      
      // Ollama doesn't support batch embeddings, so we need to call individually
      // But we can do it in parallel for better performance
      const embeddingPromises = texts.map(text => this.embedText(text));
      const embeddings = await Promise.all(embeddingPromises);

      console.log(`Successfully created ${embeddings.length} embeddings`);
      return embeddings;
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error('Embedding error details:', {
        message: errorMessage,
        model: this.model,
        textCount: texts.length,
        ollamaUrl: this.ollamaUrl
      });
      throw new Error(`Error creating embeddings: ${errorMessage}`);
    }
  }

  /**
   * Get embedding dimension
   */
  getDimension(): number {
    // nomic-embed-text has 768 dimensions
    if (this.model.includes('nomic-embed-text')) {
      return 768;
    }
    // all-minilm has 384 dimensions
    if (this.model.includes('all-minilm')) {
      return 384;
    }
    // Default for nomic-embed-text
    return 768;
  }
}

