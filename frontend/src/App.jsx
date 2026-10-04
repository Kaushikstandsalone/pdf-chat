import { useState } from "react";
import axios from "axios";
import "./App.css";
const API_URL = import.meta.env.VITE_API_URL;
function App() {
  const [file, setFile] = useState(null);
  const [history, setHistory] = useState([]);
  const [question, setQuestion] = useState("");
  const [documentId,setDocumentId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const uploadPDF = async () => {
    if (!file) {
      alert("Please select a PDF");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/uploads`,
        formData
      );
      setDocumentId(response.data.documentId);
      console.log(response.data);

      setUploaded(true);

      alert(
        `PDF uploaded successfully. ${response.data.chunks} chunks created.`
      );
    } catch (error) {
      console.error("UPLOAD ERROR:", error);

      alert(
        error.response?.data?.message ||
          error.message ||
          "Failed to upload PDF"
      );
    } finally {
      setUploading(false);
    }
  };

  const askQuestion = async (e) => {
    e.preventDefault();

    if (!question.trim() || asking) {
      return;
    }
    if (!documentId) {
  alert("Please upload a your content first.");
  return;
}
    const currentQuestion = question.trim();

    setQuestion("");
    setAsking(true);

    try {
      /*
       * Send previous history to backend.
       *
       * The current question is NOT in history yet.
       */
      const response = await axios.post(
        `${API_URL}/api/chat`,
        {
          question: currentQuestion,
          history: history.slice(-5),
          documentId:documentId,
        }
      );

      const answer = response.data.answer;

      /*
       * Add both the question and answer
       * to our history.
       */
      setHistory((prevHistory) => [
        ...prevHistory,
        {
          role: "user",
          content: currentQuestion,
        },
        {
          role: "assistant",
          content: answer,
        },
      ]);
    } catch (error) {
      console.error("CHAT ERROR:", error);

      setHistory((prevHistory) => [
        ...prevHistory,
        {
          role: "user",
          content: currentQuestion,
        },
        {
          role: "assistant",
          content:
            error.response?.data?.message ||
            "Sorry, something went wrong.",
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="app">
      <div className="chat-container">

        {/* Header */}
        <header className="header">
          <div>
            <h1>DocuRAG</h1>
            <p>Ask questions about your document</p>
          </div>

          <div className="upload-section">
           <input
  id="file-upload"
  type="file"
  accept="application/pdf,image/jpeg,image/png,image/webp"
  onChange={(e) => setFile(e.target.files[0])}
/>

            <button
              onClick={uploadPDF}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload CONTENT"}
            </button>
          </div>
        </header>

        {/* Upload status */}
        {uploaded && (
          <div className="upload-status">
            ✓ CONTENT uploaded successfully
          </div>
        )}

        {/* Chat messages */}
        <main className="messages">

          {history.length === 0 && !asking && (
            <div className="welcome">
              <h2>👋 Start chatting with your content</h2>
              <p>
                Upload a PDF/Image/DOC and ask questions about its contents.
              </p>
            </div>
          )}

          {history.map((message, index) => (
            <div
              key={index}
              className={`message-row ${
                message.role === "user"
                  ? "user-row"
                  : "assistant-row"
              }`}
            >
              <div
                className={`message ${
                  message.role === "user"
                    ? "user-message"
                    : "assistant-message"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {asking && (
            <div className="message-row assistant-row">
              <div className="message assistant-message typing">
                Thinking...
              </div>
            </div>
          )}
        </main>

        {/* Input */}
        <form className="input-area" onSubmit={askQuestion}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask something about your PDF..."
            disabled={asking}
          />

          <button
            type="submit"
            disabled={asking || !question.trim()}
          >
            {asking ? "..." : "Send"}
          </button>
        </form>

      </div>
    </div>
  );
}

export default App;