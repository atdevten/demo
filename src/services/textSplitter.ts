import { Document } from './documentLoader';
import { config } from '../config';

export interface TextChunk {
  text: string;
  metadata: Document['metadata'] & {
    chunkIndex: number;
    totalChunks: number;
  };
}

export class TextSplitter {
  /**
   * Chia tài liệu thành chunks với overlap
   */
  static splitDocument(document: Document): TextChunk[] {
    const { content, metadata } = document;
    const chunkSize = config.document.chunkSize;
    const chunkOverlap = config.document.chunkOverlap;

    const chunks: TextChunk[] = [];
    let startIndex = 0;

    while (startIndex < content.length) {
      const endIndex = Math.min(startIndex + chunkSize, content.length);
      let chunkText = content.slice(startIndex, endIndex);

      // Nếu không phải chunk cuối, cố gắng cắt tại khoảng trắng hoặc dấu câu
      if (endIndex < content.length) {
        const lastSpace = chunkText.lastIndexOf(' ');
        const lastPeriod = chunkText.lastIndexOf('.');
        const lastNewline = chunkText.lastIndexOf('\n');
        
        const cutIndex = Math.max(lastNewline, lastPeriod, lastSpace);
        if (cutIndex > chunkSize * 0.5) {
          chunkText = chunkText.slice(0, cutIndex + 1);
          startIndex += cutIndex + 1;
        } else {
          startIndex = endIndex;
        }
      } else {
        startIndex = endIndex;
      }

      chunks.push({
        text: chunkText.trim(),
        metadata: {
          ...metadata,
          chunkIndex: chunks.length,
          totalChunks: 0, // Sẽ được cập nhật sau
        },
      });

      // Áp dụng overlap
      if (startIndex < content.length) {
        startIndex = Math.max(0, startIndex - chunkOverlap);
      }
    }

    // Cập nhật totalChunks
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }
}

