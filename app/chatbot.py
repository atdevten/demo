"""
Chatbot module with Langchain RAG and Ollama LLM
"""
import os
from typing import List, Optional
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from dotenv import load_dotenv

load_dotenv()


class ChatBot:
    """Chatbot with RAG using Langchain and Ollama"""
    
    def __init__(self, embedding_manager, retriever_func):
        """
        Args:
            embedding_manager: Instance of EmbeddingManager
            retriever_func: Function to retrieve documents from Qdrant
        """
        self.embedding_manager = embedding_manager
        self.retriever_func = retriever_func
        
        # Configure Ollama
        ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
        ollama_model = os.getenv("OLLAMA_MODEL", "llama2")
        
        # Initialize Ollama LLM
        self.llm = Ollama(
            base_url=ollama_base_url,
            model=ollama_model,
            temperature=0.7,
        )
        
        # Create prompt template for RAG
        self.prompt_template = PromptTemplate(
            input_variables=["context", "question"],
            template="""You are an intelligent AI assistant. Please answer the question based on the provided context.

Context:
{context}

Question: {question}

Please provide a detailed and accurate answer based on the context above. If the context does not contain relevant information, please say that you don't have the information to answer.

Answer:"""
        )
        
        # Create LLM chain
        self.chain = LLMChain(
            llm=self.llm,
            prompt=self.prompt_template
        )
        
        # Store chat history
        self.conversation_history: List[dict] = []
    
    def retrieve_context(self, question: str, top_k: int = 5) -> str:
        """
        Retrieve relevant context from Qdrant
        
        Args:
            question: User's question
            top_k: Number of documents to retrieve
            
        Returns:
            Context string from relevant documents
        """
        results = self.embedding_manager.search_similar(question, top_k=top_k)
        
        if not results:
            return "No relevant information found in the database."
        
        # Combine text chunks into context
        context_parts = []
        for i, result in enumerate(results, 1):
            context_parts.append(f"[{i}] {result['text']}")
        
        return "\n\n".join(context_parts)
    
    def chat(self, question: str, use_context: bool = True) -> str:
        """
        Process question and generate answer
        
        Args:
            question: User's question
            use_context: Whether to use RAG context
            
        Returns:
            Answer from LLM
        """
        try:
            if use_context:
                # Retrieve context from Qdrant
                context = self.retrieve_context(question)
                
                # Generate response with context
                response = self.chain.run(
                    context=context,
                    question=question
                )
            else:
                # Answer without context (LLM only)
                response = self.llm(question)
            
            # Save to history
            self.conversation_history.append({
                "question": question,
                "response": response,
                "use_context": use_context
            })
            
            return response.strip()
            
        except Exception as e:
            error_msg = f"Error processing question: {str(e)}"
            print(error_msg)
            return error_msg
    
    def clear_history(self):
        """Clear chat history"""
        self.conversation_history = []
    
    def get_history(self) -> List[dict]:
        """Get chat history"""
        return self.conversation_history.copy()

