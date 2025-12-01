import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import uploadRouter from './routes/upload';
import chatRouter from './routes/chat';
import healthRouter from './routes/health';
import { VectorStore } from './services/vectorStore';
// Temporarily disabled patch - old endpoint still works despite deprecation warning
// import { patchHfEndpoint } from './utils/hfEndpointPatch';
// patchHfEndpoint();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files từ public folder
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/chat', chatRouter);
app.use('/health', healthRouter);

// Root route - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Initialize vector store collection
async function initializeVectorStore() {
  try {
    const vectorStore = new VectorStore();
    await vectorStore.createCollectionIfNotExists();
    console.log('Vector store has been initialized');
  } catch (error) {
    console.error('Error initializing vector store:', error);
  }
}

// Start server
const PORT = config.port;

app.listen(PORT, async () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  await initializeVectorStore();
});

export default app;

