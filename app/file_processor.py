"""
Module for handling file upload and text chunking
"""
from typing import List, Tuple
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os


class FileProcessor:
    """Handles text file upload and chunking"""
    
    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ):
        """
        Args:
            chunk_size: Size of each chunk (number of characters)
            chunk_overlap: Number of overlapping characters between chunks
        """
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
    
    def process_text_file(self, file_path: str) -> Tuple[List[str], dict]:
        """
        Process text file and return chunks
        
        Args:
            file_path: Path to text file
            
        Returns:
            Tuple (chunks, metadata)
        """
        try:
            # Read file
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Chunking
            chunks = self.text_splitter.split_text(content)
            
            # Create metadata
            filename = os.path.basename(file_path)
            metadata = {
                "filename": filename,
                "file_path": file_path,
                "total_chunks": len(chunks),
                "total_chars": len(content)
            }
            
            return chunks, metadata
            
        except Exception as e:
            raise Exception(f"Error processing file: {str(e)}")
    
    def process_text_content(self, content: str, filename: str = "uploaded.txt") -> Tuple[List[str], dict]:
        """
        Process text content directly (from Gradio upload)
        
        Args:
            content: Text content
            filename: File name (for metadata storage)
            
        Returns:
            Tuple (chunks, metadata)
        """
        try:
            # Chunking
            chunks = self.text_splitter.split_text(content)
            
            # Create metadata
            metadata = {
                "filename": filename,
                "total_chunks": len(chunks),
                "total_chars": len(content)
            }
            
            return chunks, metadata
            
        except Exception as e:
            raise Exception(f"Error processing text content: {str(e)}")
    
    def save_uploaded_file(self, file_content: bytes, filename: str, upload_dir: str = "uploads") -> str:
        """
        Save uploaded file to uploads directory
        
        Args:
            file_content: File content as bytes
            filename: File name
            upload_dir: Directory to save file
            
        Returns:
            Path to saved file
        """
        # Create directory if it doesn't exist
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_dir, filename)
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        return file_path

