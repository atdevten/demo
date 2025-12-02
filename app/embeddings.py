"""
Module for handling embeddings and Qdrant vector database
"""
import os
import hashlib
from typing import List, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()


class EmbeddingManager:
    """Manages embeddings and Qdrant vector database"""
    
    def __init__(self):
        self.qdrant_host = os.getenv("QDRANT_HOST", "qdrant")
        self.qdrant_port = int(os.getenv("QDRANT_PORT", "6333"))
        self.collection_name = os.getenv("QDRANT_COLLECTION", "documents")
        self.embedding_model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        
        # Initialize Qdrant client
        self.client = QdrantClient(
            host=self.qdrant_host,
            port=self.qdrant_port,
        )
        
        # Initialize embedding model
        self.embedding_model = SentenceTransformer(self.embedding_model_name)
        self.embedding_dimension = self.embedding_model.get_sentence_embedding_dimension()
        
        # Create collection if it doesn't exist
        self._ensure_collection()
    
    def _ensure_collection(self):
        """Ensure collection exists in Qdrant"""
        try:
            collections = self.client.get_collections().collections
            collection_names = [col.name for col in collections]
            
            if self.collection_name not in collection_names:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.embedding_dimension,
                        distance=Distance.COSINE
                    )
                )
                print(f"Created collection '{self.collection_name}' in Qdrant")
            else:
                print(f"Collection '{self.collection_name}' already exists")
        except Exception as e:
            print(f"Error checking/creating collection: {e}")
            raise
    
    def create_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Create embeddings for a list of texts"""
        embeddings = self.embedding_model.encode(texts, show_progress_bar=True)
        return embeddings.tolist()
    
    def add_documents(self, texts: List[str], metadatas: Optional[List[dict]] = None):
        """
        Add documents to Qdrant with embeddings
        
        Args:
            texts: List of text chunks
            metadatas: List of corresponding metadata (optional)
        """
        if not texts:
            return
        
        # Create embeddings
        embeddings = self.create_embeddings(texts)
        
        # Prepare points for insertion
        points = []
        for idx, (text, embedding) in enumerate(zip(texts, embeddings)):
            metadata = metadatas[idx] if metadatas else {}
            metadata["text"] = text
            
            # Create ID from text hash to avoid duplicates
            text_hash = int(hashlib.md5(text.encode()).hexdigest()[:8], 16)
            
            point = PointStruct(
                id=text_hash,
                vector=embedding,
                payload=metadata
            )
            points.append(point)
        
        # Insert into Qdrant
        try:
            # Use upsert to avoid duplicate IDs
            operation_info = self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            print(f"Added {len(points)} documents to Qdrant")
            return operation_info
        except Exception as e:
            print(f"Error adding documents to Qdrant: {e}")
            raise
    
    def search_similar(self, query: str, top_k: int = 5) -> List[dict]:
        """
        Search for similar documents to the query
        
        Args:
            query: Question or text to search for
            top_k: Number of results to return
            
        Returns:
            List of similar documents with scores
        """
        # Create embedding for query
        query_embedding = self.embedding_model.encode([query])[0].tolist()
        
        # Search in Qdrant
        try:
            search_results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                limit=top_k
            )
            
            results = []
            for result in search_results:
                results.append({
                    "text": result.payload.get("text", ""),
                    "score": result.score,
                    "metadata": {k: v for k, v in result.payload.items() if k != "text"}
                })
            
            return results
        except Exception as e:
            print(f"Error searching in Qdrant: {e}")
            return []
    
    def get_retriever(self, top_k: int = 5):
        """Return retriever function for use with Langchain"""
        def retrieve(query: str) -> List[str]:
            results = self.search_similar(query, top_k=top_k)
            return [r["text"] for r in results]
        
        return retrieve

