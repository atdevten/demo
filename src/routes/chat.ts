import { Router, Request, Response } from 'express';
import { RAGChain } from '../services/ragChain';
import { VectorStore } from '../services/vectorStore';

const router = Router();
const vectorStore = new VectorStore();
const ragChain = new RAGChain(vectorStore);

router.post('/', async (req: Request, res: Response) => {
  try {
    const { question, topK } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Question is required',
      });
    }

    const k = topK && typeof topK === 'number' ? Math.min(topK, 10) : 5;

    // Query RAG chain
    const response = await ragChain.query(question.trim(), k);

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing question',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

