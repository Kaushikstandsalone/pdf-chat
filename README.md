# 📄 Chat with PDF — AI-Powered Document Assistant

> **Upload a PDF. Ask questions. Get intelligent answers grounded in your document.**

Chat with PDF is a full-stack **RAG (Retrieval-Augmented Generation)** application that allows users to upload PDF documents and interact with them using natural language.

Instead of sending the entire document to an LLM, the application intelligently retrieves the most relevant sections of the uploaded PDF and provides them as context to the AI. This makes the system more efficient, scalable, and suitable for larger documents.

---

## ✨ Features

- 📤 **PDF Upload** — Upload PDF documents directly through the web interface
- 🔒 **10 MB File Limit** — Prevents excessively large uploads
- 📑 **Automatic PDF Processing** — Extracts and splits document content into manageable chunks
- 🧠 **Semantic Search** — Finds relevant document sections based on meaning rather than exact keywords
- 💬 **Conversational Q&A** — Ask natural-language questions about your document
- 🧾 **Conversation History** — Maintains recent conversation context for follow-up questions
- 🔐 **Document Isolation** — Each uploaded PDF receives a unique `documentId`, preventing cross-document retrieval
- ⚡ **Batch Embeddings** — Generates embeddings efficiently using Gemini's batch embedding API
- 🗄️ **Vector Database** — Stores document embeddings in Pinecone for fast similarity search
- 🤖 **AI Answers** — Uses Gemini to generate answers based on retrieved PDF content
- 🧹 **Temporary File Cleanup** — Uploaded PDFs are deleted from server storage after successful processing
- 🌐 **Production Ready Architecture** — Separate frontend and backend deployments

---

## 🏗️ Architecture

```text
                    ┌──────────────────────┐
                    │      React + Vite     │
                    │      Frontend         │
                    └──────────┬───────────┘
                               │
                            Axios
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Node.js + Express  │
                    │       Backend         │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
                 ▼             ▼             ▼
          ┌────────────┐ ┌───────────┐ ┌────────────┐
          │ PDFLoader  │ │  Gemini   │ │  Pinecone  │
          │ + Chunking │ │ Embeddings│ │ Vector DB  │
          └────────────┘ └───────────┘ └────────────┘
                                             │
                                             ▼
                                      Similarity Search
                                             │
                                             ▼
                                      Relevant Chunks
                                             │
                                             ▼
                                      Gemini 2.5 Flash
                                             │
                                             ▼
                                          Answer
🔄 How It Works
1. Upload

The user uploads a PDF through the React frontend.

The request is sent to the Express backend using Axios.

2. PDF Processing

The backend uses LangChain's PDFLoader to extract the document text.

The extracted content is divided into smaller overlapping chunks using:

RecursiveCharacterTextSplitter

This allows the application to retrieve only the relevant portions of a document instead of processing the entire PDF for every question.

3. Embedding Generation

Each chunk is converted into a numerical vector using:

Gemini Embedding
gemini-embedding-001

The embeddings are generated in batches for better API efficiency.

4. Vector Storage

The generated embeddings are stored in:

Pinecone

Each vector also contains metadata such as:

text
page
documentId

The documentId ensures that searches are restricted to the currently selected document.

5. Question Processing

When the user asks a question:

Question
   ↓
Gemini Embedding
   ↓
Pinecone Similarity Search
   ↓
Top 3 Relevant Chunks

The application retrieves the most relevant sections of the PDF.

6. Answer Generation

The retrieved content is passed to:

Gemini 2.5 Flash

along with the user's question and limited conversation history.

The model is instructed to answer using the provided PDF context and avoid inventing information.

🔐 Document Isolation

A key part of the application is preventing one user's document from being retrieved while another user's document is being queried.

Every upload receives a unique identifier:

PDF A → documentId: abc123
PDF B → documentId: xyz789

The identifier is stored as Pinecone metadata:

{
  text: "...",
  page: 5,
  documentId: "abc123"
}

Queries then use a Pinecone metadata filter:

filter: {
  documentId: {
    $eq: documentId
  }
}

Therefore, even if multiple users upload documents, similarity search is restricted to the relevant document.

🛠️ Tech Stack
Frontend
React
Vite
Axios
CSS
Backend
Node.js
Express
Multer
CORS
AI / RAG
LangChain
Google Gemini
gemini-embedding-001
Gemini 2.5 Flash
Vector Database
Pinecone
PDF Processing
LangChain PDFLoader
Recursive Character Text Splitter
Deployment
Vercel — Frontend
Render — Backend
📁 Project Structure
pdf-chat/
│
├── backend/
│   ├── services/
│   │   ├── chatService.js
│   │   ├── pdfServices.js
│   │   └── vectorService.js
│   │
│   ├── uploads/
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   └── vite.config.js
│
└── README.md
🚀 Getting Started
Prerequisites

Make sure you have:

Node.js installed
A Gemini API key
A Pinecone API key
A Pinecone index configured for 3072 dimensions
1. Clone the Repository
git clone https://github.com/YOUR_USERNAME/pdf-chat.git

cd pdf-chat
2. Backend Setup
cd backend
npm install

Create:

backend/.env

Add:

GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=pdf-chat
PORT=5000

Start the backend:

node server.js

The backend will run locally at:

http://localhost:5000
3. Frontend Setup

Open another terminal:

cd frontend
npm install

Create:

frontend/.env

Add:

VITE_API_URL=http://localhost:5000

Start the frontend:

npm run dev

The application will be available at the Vite development URL shown in your terminal.

🌐 Environment Variables
Backend
Variable	Description
GEMINI_API_KEY	Google Gemini API key
PINECONE_API_KEY	Pinecone API key
PINECONE_INDEX	Pinecone index name
PORT	Backend server port
Frontend
Variable	Description
VITE_API_URL	URL of the Express backend

⚠️ Never expose GEMINI_API_KEY or PINECONE_API_KEY in the frontend.

📡 API Endpoints
Upload PDF
POST /api/uploads

Accepts:

multipart/form-data

with:

pdf: <PDF file>

Example response:

{
  "message": "PDF processed successfully",
  "fileName": "document.pdf",
  "chunks": 120,
  "documentId": "unique-document-id"
}
Ask a Question
POST /api/chat

Request:

{
  "question": "What is this document about?",
  "history": [],
  "documentId": "unique-document-id"
}

Response:

{
  "answer": "The document discusses...",
  "sources": [
    {
      "score": 0.91,
      "page": 4
    }
  ]
}
🧠 RAG Pipeline

The application follows a standard Retrieval-Augmented Generation architecture:

         PDF
          │
          ▼
     PDF Extraction
          │
          ▼
      Text Chunks
          │
          ▼
       Embeddings
          │
          ▼
       Pinecone
          │
          │
     User Question
          │
          ▼
    Question Embedding
          │
          ▼
   Similarity Search
          │
          ▼
   Relevant PDF Chunks
          │
          ▼
      Gemini LLM
          │
          ▼
       Answer

This approach allows the LLM to answer questions using the contents of the uploaded document without requiring the entire PDF to be included in every prompt.

⚡ Performance & Token Optimization

The application includes several optimizations to reduce unnecessary API usage:

Embeddings are generated in batches.
Only the top 3 relevant Pinecone results are retrieved.
Retrieved context is limited before being sent to the LLM.
Only recent conversation history is sent for contextual understanding.
Uploaded PDFs are deleted after successful processing.
🛡️ Security Considerations

The project includes several safeguards:

API keys are stored in environment variables.
.env files are excluded from Git.
PDF uploads are limited to 10 MB.
Only PDF MIME types are accepted.
Uploaded files are temporarily stored and deleted after processing.
Each document receives a unique documentId.
Pinecone queries are filtered by documentId.

For a larger production deployment, additional authentication, authorization, rate limiting, persistent session management, and more comprehensive document lifecycle management would be recommended.

🚀 Deployment

The application is designed to be deployed as two separate services:

Frontend
   ↓
Vercel
   ↓
Backend
   ↓
Render
   ↓
Gemini + Pinecone
Frontend

Set:

VITE_API_URL=https://your-backend-url.onrender.com
Backend

Configure the required environment variables in your hosting provider:

GEMINI_API_KEY=...
PINECONE_API_KEY=...
PINECONE_INDEX=pdf-chat

The backend uses:

const PORT = process.env.PORT || 5000;

so it can work both locally and on a cloud platform that provides its own port.

📌 Future Improvements

Potential improvements include:

🔑 User authentication
👥 Multiple documents per user
📚 Document library
🗑️ Delete document functionality
💾 Persistent chat sessions
📊 Better source/page citations
🧠 Conversation-aware query rewriting
⚡ Streaming AI responses
📈 Usage monitoring and rate limiting
🐳 Docker deployment
☁️ Cloud object storage for larger documents
📱 Improved mobile UI
🎯 What I Learned

This project demonstrates practical implementation of:

Retrieval-Augmented Generation (RAG)
Vector databases
Semantic similarity search
LLM-based question answering
Document chunking
Embedding generation
REST API design
React state management
File upload handling
Environment-based configuration
Backend/frontend separation
Multi-document isolation
Cloud deployment
👨‍💻 Author

Kaushik Baruah

Built as a full-stack AI/RAG project using React, Node.js, Gemini, LangChain and Pinecone.
