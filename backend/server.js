const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require("multer");
const {processPDF} = require("./services/pdfServices");

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
dotenv.config();
const { storeDocuments } = require("./services/vectorService");
const { generateAnswer } = require("./services/chatService");
const { searchDocuments } = require("./services/vectorService");
const app = express();
const PORT = process.env.PORT || 5000;

const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.get("/",(req,res)=>{
    res.json({
        message:"PDF-Chat App is running"
    });
})

const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
    
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

app.post('/api/uploads',upload.single("pdf"),async(req,res)=>{
    try{
        if(!req.file){
            return res.status(400).json({
                message:`File not found`
            });
        }
        console.log("Uploaded:",req.file.originalname);
        const filePath = path.resolve(req.file.path);
        const chunks  = await processPDF(filePath);
        
        console.log(`Created ${chunks.length} chunks`);
        const documentId = crypto.randomUUID();
        await storeDocuments(chunks,documentId);
        await fs.promises.unlink(filePath);

        res.json({
            message: "PDF processed successfully",
            fileName: req.file.originalname,
            pages: chunks.length,
            chunks: chunks.length,
            documentId:documentId
        });
    }
   catch (error) {
  console.error("UPLOAD ERROR:", error);

 
}
})
app.post("/api/chat", async (req, res) => {
  try {
    const { question, history = [] ,documentId} = req.body;
    if (!documentId) {
  return res.status(400).json({
    message: "Document ID is required",
  });
}
    if (!question || !question.trim()) {
      return res.status(400).json({
        message: "Question is required",
      });
    }

    // Search Pinecone using the current question
    const matches = await searchDocuments(question, documentId);

    // Extract relevant PDF text
    const context = matches
  .map((match) => match.metadata?.text)
  .filter(Boolean)
  .join("\n\n")
  .slice(0, 6000);

    // Generate answer using PDF context + chat history
    const answer = await generateAnswer(
      question,
      context,
      history
    );

    res.json({
      answer,
      sources: matches.map((match) => ({
        score: match.score,
        page: match.metadata?.page,
      })),
    });
  } catch (error) {
    console.error("Chat error:", error);

    res.status(500).json({
      message: "Failed to answer question",
      error: error.message,
    });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "PDF is too large. Maximum size is 10 MB.",
      });
    }
  }

  console.error(error);

  res.status(500).json({
    message: error.message || "Something went wrong",
  });
});

app.listen(PORT,()=>{
    console.log(`App is running on port ${PORT}`);
})