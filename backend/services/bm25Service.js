const fs = require("fs");
const path = require("path");

const INDEX_FILE = path.join(__dirname, "../bm25-index.json");

let documents = new Map();
let documentFrequency = new Map();
let totalDocuments = 0;
let averageDocumentLength = 0;

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function calculateTermFrequency(tokens) {
  const frequencies = new Map();

  for (const token of tokens) {
    frequencies.set(
      token,
      (frequencies.get(token) || 0) + 1
    );
  }

  return frequencies;
}

function rebuildStatistics() {
  documentFrequency = new Map();

  let totalLength = 0;

  for (const document of documents.values()) {
    totalLength += document.tokens.length;

    const uniqueTerms = new Set(document.tokens);

    for (const term of uniqueTerms) {
      documentFrequency.set(
        term,
        (documentFrequency.get(term) || 0) + 1
      );
    }
  }

  totalDocuments = documents.size;

  averageDocumentLength =
    totalDocuments > 0
      ? totalLength / totalDocuments
      : 0;
}

function addDocuments(chunks) {
  for (const chunk of chunks) {
    if (!chunk.chunkId || !chunk.pageContent) {
      continue;
    }

    const tokens = tokenize(chunk.pageContent);

    documents.set(chunk.chunkId, {
      chunkId: chunk.chunkId,
      documentId: chunk.documentId,
      text: chunk.pageContent,
      metadata: chunk.metadata || {},
      tokens,
      termFrequency: calculateTermFrequency(tokens),
    });
  }

  rebuildStatistics();

  saveIndex();

  console.log(
    `BM25 indexed ${chunks.length} chunks`
  );
}

function removeDocument(documentId) {
  for (const [chunkId, document] of documents.entries()) {
    if (document.documentId === documentId) {
      documents.delete(chunkId);
    }
  }

  rebuildStatistics();

  saveIndex();
}

function calculateIDF(term) {
  const df = documentFrequency.get(term) || 0;

  if (df === 0 || totalDocuments === 0) {
    return 0;
  }

  return Math.log(
    1 +
      (totalDocuments - df + 0.5) /
        (df + 0.5)
  );
}

function searchDocuments(query, documentId, topK = 10) {
  const queryTokens = tokenize(query);

  if (
    queryTokens.length === 0 ||
    documents.size === 0
  ) {
    return [];
  }

  const k1 = 1.5;
  const b = 0.75;

  const results = [];

  for (const document of documents.values()) {
    if (
      documentId &&
      document.documentId !== documentId
    ) {
      continue;
    }

    const documentLength = document.tokens.length;

    if (documentLength === 0) {
      continue;
    }

    let score = 0;

    for (const term of queryTokens) {
      const tf =
        document.termFrequency.get(term) || 0;

      if (tf === 0) {
        continue;
      }

      const idf = calculateIDF(term);

      const denominator =
        tf +
        k1 *
          (1 -
            b +
            b *
              (documentLength /
                averageDocumentLength));

      score +=
        idf *
        ((tf * (k1 + 1)) / denominator);
    }

    if (score > 0) {
      results.push({
        id: document.chunkId,
        score,
        metadata: {
          ...document.metadata,

          chunkId: document.chunkId,

          documentId: document.documentId,

          text: document.text,
        },
      });
    }
  }

  results.sort((a, b) => b.score - a.score);

  return results.slice(0, topK);
}

function saveIndex() {
  const data = Array.from(documents.values()).map(
    (document) => ({
      chunkId: document.chunkId,
      documentId: document.documentId,
      text: document.text,
      metadata: document.metadata,
    })
  );

  fs.writeFileSync(
    INDEX_FILE,
    JSON.stringify(data, null, 2)
  );
}

function loadIndex() {
  if (!fs.existsSync(INDEX_FILE)) {
    return;
  }

  try {
    const data = JSON.parse(
      fs.readFileSync(INDEX_FILE, "utf8")
    );

    documents = new Map();

    for (const document of data) {
      const tokens = tokenize(document.text);

      documents.set(document.chunkId, {
        chunkId: document.chunkId,
        documentId: document.documentId,
        text: document.text,
        metadata: document.metadata || {},
        tokens,
        termFrequency:
          calculateTermFrequency(tokens),
      });
    }

    rebuildStatistics();

    console.log(
      `BM25 index loaded: ${documents.size} chunks`
    );
  } catch (error) {
    console.error(
      "Failed to load BM25 index:",
      error.message
    );
  }
}

loadIndex();

module.exports = {
  addDocuments,
  removeDocument,
  searchDocuments,
};