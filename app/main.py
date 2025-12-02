"""
Gradio UI for chatbot
"""
import os
import gradio as gr
from dotenv import load_dotenv
from app.embeddings import EmbeddingManager
from app.file_processor import FileProcessor
from app.chatbot import ChatBot

load_dotenv()

# Initialize components
embedding_manager = EmbeddingManager()
file_processor = FileProcessor(
    chunk_size=int(os.getenv("CHUNK_SIZE", "1000")),
    chunk_overlap=int(os.getenv("CHUNK_OVERLAP", "200"))
)

# Initialize chatbot with retriever
retriever_func = embedding_manager.get_retriever(top_k=5)
chatbot = ChatBot(embedding_manager, retriever_func)


def process_file_upload(file) -> str:
    """
    Process file upload from Gradio
    
    Args:
        file: File object from Gradio file upload
        
    Returns:
        Result message
    """
    if file is None:
        return "Please select a file to upload."
    
    try:
        # Read file content
        with open(file.name, 'r', encoding='utf-8') as f:
            content = f.read()
        
        filename = os.path.basename(file.name)
        
        # Process and chunking
        chunks, metadata = file_processor.process_text_content(content, filename)
        
        # Create metadatas for each chunk
        metadatas = [
            {
                "filename": metadata["filename"],
                "chunk_index": i,
                "total_chunks": metadata["total_chunks"]
            }
            for i in range(len(chunks))
        ]
        
        # Add to Qdrant
        embedding_manager.add_documents(chunks, metadatas)
        
        return f"✅ Successfully processed and saved file '{filename}'!\n" \
               f"- Number of chunks: {metadata['total_chunks']}\n" \
               f"- Total characters: {metadata['total_chars']}"
               
    except Exception as e:
        return f"❌ Error processing file: {str(e)}"


def chat_with_bot(message, history):
    """
    Handle chat with bot
    
    Args:
        message: User's question
        history: Chat history from Gradio
        
    Returns:
        Updated history
    """
    if not message.strip():
        return history
    
    # Get response from chatbot
    response = chatbot.chat(message, use_context=True)
    
    # Add to history
    history.append((message, response))
    
    return history


def clear_chat():
    """Clear chat history"""
    chatbot.clear_history()
    return []


# Create Gradio interface
with gr.Blocks(title="PyBot - Chatbot with Langchain & Ollama", theme=gr.themes.Soft()) as demo:
    gr.Markdown(
        """
        # 🤖 PyBot - RAG Chatbot with Langchain, Ollama & Qdrant
        
        Upload text files to add to the knowledge base, then chat with the bot to ask about the content in the files.
        """
    )
    
    with gr.Row():
        with gr.Column(scale=1):
            gr.Markdown("### 📤 Upload File")
            file_upload = gr.File(
                label="Select text file (.txt)",
                file_types=[".txt"]
            )
            upload_btn = gr.Button("Upload and Embed", variant="primary")
            upload_status = gr.Textbox(
                label="Status",
                interactive=False,
                lines=4
            )
            
            upload_btn.click(
                fn=process_file_upload,
                inputs=file_upload,
                outputs=upload_status
            )
        
        with gr.Column(scale=2):
            gr.Markdown("### 💬 Chat with Bot")
            chatbot_interface = gr.Chatbot(
                label="Chat",
                height=500,
                show_copy_button=True
            )
            
            with gr.Row():
                msg_input = gr.Textbox(
                    label="Enter your question",
                    placeholder="Type your question here...",
                    scale=4,
                    container=False
                )
                submit_btn = gr.Button("Send", variant="primary", scale=1)
                clear_btn = gr.Button("Clear chat", scale=1)
            
            # Event handlers
            msg_input.submit(
                fn=chat_with_bot,
                inputs=[msg_input, chatbot_interface],
                outputs=chatbot_interface
            ).then(
                lambda: "",  # Clear input
                outputs=msg_input
            )
            
            submit_btn.click(
                fn=chat_with_bot,
                inputs=[msg_input, chatbot_interface],
                outputs=chatbot_interface
            ).then(
                lambda: "",  # Clear input
                outputs=msg_input
            )
            
            clear_btn.click(
                fn=clear_chat,
                outputs=chatbot_interface
            )
    
    gr.Markdown(
        """
        ---
        **Usage Instructions:**
        1. Upload a text file (.txt) to add to the knowledge base
        2. Wait for the file to be processed and embedded
        3. Chat with the bot about the content in the uploaded file
        """
    )


if __name__ == "__main__":
    # Get port from env or default
    port = int(os.getenv("GRADIO_PORT", "7860"))
    host = os.getenv("GRADIO_HOST", "0.0.0.0")
    
    print(f"🚀 Starting Gradio app on {host}:{port}")
    demo.launch(server_name=host, server_port=port, share=False)

