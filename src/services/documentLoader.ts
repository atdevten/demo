import fs from 'fs/promises';
import path from 'path';

export interface Document {
  content: string;
  metadata: {
    filename: string;
    filepath: string;
    uploadedAt: Date;
  };
}

export class DocumentLoader {
  /**
   * Load và parse file .txt
   */
  static async loadTextFile(filepath: string): Promise<Document> {
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const filename = path.basename(filepath);

      return {
        content: content.trim(),
        metadata: {
          filename,
          filepath,
          uploadedAt: new Date(),
        },
      };
    } catch (error) {
      throw new Error(`Cannot read file: ${filepath}. Error: ${error}`);
    }
  }

  /**
   * Validate file extension
   */
  static isValidTextFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ext === '.txt';
  }
}

