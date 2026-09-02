require("dotenv").config();

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

async function storeDocuments(chunks,documentId) {
  const index = pinecone.Index(process.env.PINECONE_INDEX);

  const validChunks = chunks
    .map((chunk) => ({
      ...chunk,
      pageContent: chunk.pageContent.trim(),
    }))
    .filter((chunk) => chunk.pageContent.length > 0);

  console.log(`Valid chunks: ${validChunks.length}/${chunks.length}`);

  const BATCH_SIZE = 10;
  let totalStored = 0;

  for (let i = 0; i < validChunks.length; i += BATCH_SIZE) {
    const batch = validChunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((chunk) => chunk.pageContent);

    console.log(
      `Embedding chunks ${i} - ${i + batch.length - 1}`
    );

   const result = await embeddingModel.batchEmbedContents({
  requests: texts.map((text) => ({
    content: {
      role: "RETRIEVAL_DOCUMENT",
      parts: [{ text }],
    },
  })),
});

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
        id: `chunk-${Date.now()}-${i + j}`,
        values: vectors[j],
        metadata: {
          text: batch[j].pageContent,
          page: batch[j].metadata?.loc?.pageNumber || 0,
          documentId:documentId
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
