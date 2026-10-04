const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require("multer");
dotenv.config();
const { processDocument } = require("./services/documentService");
const { addDocuments } = require("./services/bm25Service");
const {
  hybridSearch
} = require("./services/hybridSearchService");  

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { storeDocuments } = require("./services/vectorService");
const { generateAnswer } = require("./services/chatService");

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
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, PNG and WEBP files are allowed"));
    }
  },
});

app.post("/api/uploads", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "File not found",
      });
    }

    console.log("Uploaded:", req.file.originalname);

    const filePath = path.resolve(req.file.path);
    const documentId = crypto.randomUUID();

    const chunks = await processDocument(
  filePath,
  req.file.mimetype,
  req.file.originalname,
  documentId
);

    console.log(`Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      return res.status(400).json({
        message: "No usable content found in the file",
      });
    }
    console.log(
  "FIRST CHUNK:",
  JSON.stringify(chunks[0], null, 2)
);
    await storeDocuments(chunks, documentId);
    addDocuments(chunks);
    await fs.promises.unlink(filePath);

    res.json({
      message: "File processed successfully",
      fileName: req.file.originalname,
      chunks: chunks.length,
      documentId,
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    res.status(500).json({
      message: "Failed to process file",
      error: error.message,
    });
  }
});
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

    // Hybrid retrieval: vector search + BM25 + RRF + reranking
    const matches = await hybridSearch(
  question,
  documentId,
  20
);

    // Extract relevant PDF text
  const context = matches
  .map((match) => {
    const metadata = match.metadata || {};

    if (metadata.type === "table") {
      let tableContext = `TABLE`;

      if (metadata.tableTitle) {
        tableContext += `: ${metadata.tableTitle}`;
      }

      tableContext += "\n";

      if (metadata.headers) {
        try {
          const headers = JSON.parse(metadata.headers);

          tableContext += `Columns: ${headers.join(" | ")}\n`;
        } catch (error) {
          console.log("Failed to parse table headers");
        }
      }

      if (metadata.rows) {
        try {
          const rows = JSON.parse(metadata.rows);

          rows.forEach((row) => {
            tableContext += `${row.join(" | ")}\n`;
          });
        } catch (error) {
          console.log("Failed to parse table rows");
        }
      }

      return tableContext;
    }

    if (metadata.type === "visual") {
      return `VISUAL INFORMATION:\n${metadata.text || ""}`;
    }

    return metadata.text || "";
  })
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
  chunkId: match.id,
  score: match.score,
  rerankerScore: match.rerankerScore,
  source: match.metadata?.source,
  page: match.metadata?.page,
  type: match.metadata?.type,
  retrievedBy: match.retrievedBy,
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