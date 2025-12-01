// API base URL - sử dụng relative path hoặc environment variable
const API_BASE = window.location.origin;

// Upload functionality
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');

uploadBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', handleFileUpload);

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleFileUpload({ target: fileInput });
    }
});

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
        showUploadStatus('❌ Only .txt files are accepted', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('document', file);

    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    uploadStatus.style.display = 'block';
    uploadStatus.className = 'upload-status';
    uploadStatus.textContent = '📤 Uploading file...';

    try {
        const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (data.success) {
            const successMessage = `✅ Upload & Embedding Successful!\n\n` +
                `📄 File: ${data.data.originalFilename || data.data.filename}\n` +
                `📊 Document size: ${data.data.size.toLocaleString()} characters\n` +
                `🔢 Chunks created: ${data.data.chunks}\n` +
                `✅ Status: ${data.data.status}`;
            
            showUploadStatus(successMessage, 'success');
            addMessage('bot', `✅ Document "${data.data.originalFilename || data.data.filename}" has been successfully uploaded, processed, and embedded into the vector database (${data.data.chunks} chunks). You can now ask questions about this document!`);
        } else {
            showUploadStatus(`❌ ${data.message}${data.error ? '\n\n' + data.error : ''}`, 'error');
        }
    } catch (error) {
        showUploadStatus(`❌ Error: ${error.message}`, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Select File';
        fileInput.value = '';
    }
}

function showUploadStatus(message, type) {
    uploadStatus.textContent = message;
    uploadStatus.className = `upload-status ${type}`;
    uploadStatus.style.display = 'block';
    uploadStatus.style.whiteSpace = 'pre-line'; // Allow line breaks
}

// Chat functionality
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const question = chatInput.value.trim();
    if (!question) return;

    // Add user message
    addMessage('user', question);
    chatInput.value = '';

    // Disable input
    chatInput.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="loading"></span>';

    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question }),
        });

        const data = await response.json();

        if (data.success) {
            let sourcesText = '';
            if (data.data.sources && data.data.sources.length > 0) {
                sourcesText = `<div class="sources">Source: ${data.data.sources.length} relevant passages from "${data.data.sources[0].metadata.filename}"</div>`;
            }
            addMessage('bot', data.data.answer + sourcesText);
        } else {
            addMessage('bot', `❌ Error: ${data.message}`);
        }
    } catch (error) {
        addMessage('bot', `❌ Connection error: ${error.message}`);
    } finally {
        chatInput.disabled = false;
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
        chatInput.focus();
    }
}

function addMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

