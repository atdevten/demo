import { Router, Request, Response } from 'express';
import { VectorStore } from '../services/vectorStore';

const router = Router();
const vectorStore = new VectorStore();

router.get('/', async (req: Request, res: Response) => {
  try {
    const qdrantHealthy = await vectorStore.healthCheck();

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        qdrant: qdrantHealthy ? 'healthy' : 'unhealthy',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Service unavailable',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

