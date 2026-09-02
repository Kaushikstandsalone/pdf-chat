require("dotenv").config();

const {
  GoogleGenerativeAIEmbeddings,
} = require("@langchain/google-genai");

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-embedding-001",
});

async function test() {
  try {
    const texts = [
      "Amazon Leadership Principles",
      "Customer Obsession means starting with the customer and working backwards.",
      "Leaders take ownership and think long term.",
    ];

    const results = await embeddings.embedDocuments(texts);

    console.log("Number of embeddings:", results.length);

    results.forEach((embedding, index) => {
      console.log(
        `Embedding ${index}: dimension = ${embedding.length}`
      );
      console.log("First 5:", embedding.slice(0, 5));
    });
  } catch (error) {
    console.error("EMBED DOCUMENTS ERROR:");
    console.error(error);
  }
}

test();