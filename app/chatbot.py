"""
Chatbot module with Langchain RAG and Ollama LLM
"""
import os
from typing import List, Optional
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferMemory
from langchain.memory.chat_message_histories import InMemoryChatMessageHistory
from dotenv import load_dotenv

load_dotenv()


class ChatBot:
    """Chatbot with RAG using Langchain and Ollama"""
    
    def __init__(self, embedding_manager, retriever_func, memory_limit: int = 5):
        """
        Args:
            embedding_manager: Instance of EmbeddingManager
            retriever_func: Function to retrieve documents from Qdrant
            memory_limit: Number of recent conversation exchanges to keep in memory (default: 5)
        """
        self.embedding_manager = embedding_manager
        self.retriever_func = retriever_func
        self.memory_limit = memory_limit
        
        # Configure Ollama
        ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
        ollama_model = os.getenv("OLLAMA_MODEL", "llama2")
        
        # Initialize Ollama LLM
        self.llm = Ollama(
            base_url=ollama_base_url,
            model=ollama_model,
            temperature=0.7,
        )
        
        # Initialize InMemorySaver for conversation history
        # Using InMemoryChatMessageHistory which is the underlying storage
        self.chat_message_history = InMemoryChatMessageHistory()
        
        # Initialize ConversationBufferMemory with InMemorySaver
        self.memory = ConversationBufferMemory(
            chat_memory=self.chat_message_history,
            memory_key="chat_history",
            return_messages=False,  # Return as string for prompt template
            max_token_limit=None  # Can be set to limit tokens if needed
        )
        
        # Create prompt template for RAG with conversation history
        self.prompt_template = PromptTemplate(
            input_variables=["context", "chat_history", "question"],
            template="""You are an intelligent AI assistant. Please answer the question based on the provided context and previous conversation history.

Context:
{context}

Previous Conversation:
{chat_history}

Current Question: {question}

Please provide a detailed and accurate answer based on the context and conversation history above. If the context does not contain relevant information, please say that you don't have the information to answer.

Answer:"""
        )
        
        # Create LLM chain with memory
        self.chain = LLMChain(
            llm=self.llm,
            prompt=self.prompt_template,
            memory=self.memory,
            verbose=False
        )
    
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
    
    def format_chat_history(self) -> str:
        """
        Format recent conversation history for the prompt using InMemorySaver
        
        Returns:
            Formatted string of recent conversation history
        """
        # Get chat history from memory
        chat_history = self.memory.load_memory_variables({}).get("chat_history", "")
        
        if not chat_history:
            return "No previous conversation."
        
        # Limit history based on memory_limit if needed
        # The memory already handles this, but we can add custom logic here if needed
        return chat_history
    
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
                
                # Generate response with context and history
                # Memory automatically provides chat_history to the chain
                # We only need to pass context and question
                response = self.chain.run(
                    context=context,
                    question=question
                )
            else:
                # Answer without context (LLM only) but with history
                # Get chat history from memory
                chat_history = self.format_chat_history()
                
                # Create a simpler prompt for non-context mode
                simple_prompt = f"""Previous Conversation:
{chat_history}

Current Question: {question}

Answer:"""
                response = self.llm(simple_prompt)
                
                # Manually save to memory for non-context mode
                self.memory.save_context(
                    {"input": question},
                    {"output": response}
                )
            
            return response.strip()
            
        except Exception as e:
            error_msg = f"Error processing question: {str(e)}"
            print(error_msg)
            return error_msg
    
    def clear_history(self):
        """Clear chat history using InMemorySaver"""
        self.memory.clear()
        self.chat_message_history.clear()
    
    def get_history(self) -> List[dict]:
        """Get chat history from InMemorySaver"""
        messages = self.chat_message_history.messages
        history = []
        
        # Convert messages to dict format
        for i in range(0, len(messages), 2):
            if i + 1 < len(messages):
                history.append({
                    "question": messages[i].content if hasattr(messages[i], 'content') else str(messages[i]),
                    "response": messages[i + 1].content if hasattr(messages[i + 1], 'content') else str(messages[i + 1])
                })
        
        return history

