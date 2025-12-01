import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { DocumentLoader } from '../services/documentLoader';
import { TextSplitter } from '../services/textSplitter';
import { VectorStore } from '../services/vectorStore';

const router = Router();
const vectorStore = new VectorStore();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (DocumentLoader.isValidTextFile(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are accepted'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

router.post('/', upload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file was uploaded',
      });
    }

    const filepath = req.file.path;

    // Load document
    console.log(`Loading document: ${req.file.originalname}`);
    const document = await DocumentLoader.loadTextFile(filepath);
    console.log(`Document loaded: ${document.content.length} characters`);

    // Split into chunks
    console.log('Splitting document into chunks...');
    const chunks = TextSplitter.splitDocument(document);
    console.log(`Document split into ${chunks.length} chunks`);

    // Add to vector store (create embeddings and store in Qdrant)
    console.log('Creating embeddings and storing in vector database...');
    await vectorStore.addDocuments(chunks);
    console.log(`Successfully embedded and stored ${chunks.length} chunks in Qdrant`);

    res.status(200).json({
      success: true,
      message: 'Document uploaded, processed, and embeddings created successfully!',
      data: {
        filename: document.metadata.filename,
        originalFilename: req.file.originalname,
        chunks: chunks.length,
        size: document.content.length,
        status: 'Embedded and stored in vector database',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Upload error:', errorMessage);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    res.status(500).json({
      success: false,
      message: 'Error processing document',
      error: errorMessage,
    });
  }
});

export default router;

