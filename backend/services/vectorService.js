require("dotenv").config();
const EMBEDDING_BATCH_SIZE = 10;
const EMBEDDING_DELAY_MS = 15000;

const { GoogleGenerativeAIEmbeddings } =
    require("@langchain/google-genai");

const { Pinecone } =
    require("@pinecone-database/pinecone");

const { GoogleGenerativeAI } =
    require("@google/generative-ai");    

const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-embedding-001",
});

const googleAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

const embeddingModel = googleAI.getGenerativeModel({
    model: "gemini-embedding-001",
});
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function embedBatchWithRetry(texts) {
  const maxRetries = 5;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await embeddingModel.batchEmbedContents({
        requests: texts.map((text) => ({
          content: {
            role: "RETRIEVAL_DOCUMENT",
            parts: [{ text }],
          },
        })),
      });
    } catch (error) {
      console.error(
        `Embedding request failed (attempt ${attempt + 1}/${maxRetries + 1})`
      );

      console.error("Error:", error.message);

      if (attempt === maxRetries) {
        throw error;
      }

      const delay =
        Math.min(60000, 5000 * Math.pow(2, attempt));

      console.log(
        `Retrying embedding request in ${delay / 1000}s...`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );
    }
  }
}

async function storeDocuments(chunks,documentId) {
  const index = pinecone.Index(process.env.PINECONE_INDEX);

  const validChunks = chunks
    .map((chunk) => ({
      ...chunk,
      pageContent: chunk.pageContent.trim(),
    }))
    .filter((chunk) => chunk.pageContent.length > 0);

  console.log(`Valid chunks: ${validChunks.length}/${chunks.length}`);

  const BATCH_SIZE = EMBEDDING_BATCH_SIZE;
  let totalStored = 0;

  for (let i = 0; i < validChunks.length; i += BATCH_SIZE) {
    const batch = validChunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((chunk) => chunk.pageContent);

    console.log(
      `Embedding chunks ${i} - ${i + batch.length - 1}`
    );

  const result = await embedBatchWithRetry(texts);

const vectors = result.embeddings.map(
  (embedding) => embedding.values
);
console.log("Number of vectors:", vectors.length);

    const records = [];

    for (let j = 0; j < vectors.length; j++) {
      console.log(
        `Vector ${i + j} dimension: ${vectors[j].length}`
      );

      if (vectors[j].length !== 3072) {
        console.log(
          `⚠️ Skipping chunk ${i + j}`
        );
        continue;
      }

      records.push({
  id: batch[j].chunkId,
  values: vectors[j],

  metadata: {
    chunkId: batch[j].chunkId,

    text: batch[j].pageContent,

    page:
  batch[j].metadata?.page || 0,

    documentId: documentId,

    type:
      batch[j].metadata?.type ||
      "text",

    source:
      batch[j].metadata?.source ||
      "",

    tableIndex:
      batch[j].metadata?.tableIndex ??
      -1,

    tableTitle:
      batch[j].metadata?.tableTitle ||
      "",

    headers:
      batch[j].metadata?.headers ||
      "",

    rows:
      batch[j].metadata?.rows ||
      "",

    visualType:
      batch[j].metadata?.visualType ||
      "",
  },
});
    }

    // Don't call Pinecone with an empty array
    if (records.length === 0) {
      console.log(
        `⚠️ No valid vectors in batch ${i}-${i + batch.length - 1}`
      );
      continue;
    }

    await index.namespace("pdf-chat").upsert(records);

    totalStored += records.length;

    console.log(
      `Stored ${records.length} vectors in Pinecone`
    );
//     if (i + BATCH_SIZE < validChunks.length) {
//   console.log(
//     `Waiting ${EMBEDDING_DELAY_MS / 1000}s before next embedding batch...`
//   );

//   // await sleep(EMBEDDING_DELAY_MS);
// }
  }

  if (totalStored === 0) {
    throw new Error(
      "No valid embeddings were generated. Gemini returned empty embeddings."
    );
  }

  console.log(`Total vectors stored: ${totalStored}`);
}
async function searchDocuments(query,documentId) {
  const index = pinecone.Index(process.env.PINECONE_INDEX);

  // Convert user's question into an embedding
  const queryVector = await embeddings.embedQuery(query);

  // Search Pinecone
  const results = await index.namespace("pdf-chat").query({
    vector: queryVector,
    topK: 3,
    includeMetadata: true,
  filter: {
    documentId: {
      $eq: documentId,
    },
  },
  });

  return results.matches || [];
}

module.exports = {
  storeDocuments,
  searchDocuments,
};
