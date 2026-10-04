const {
  searchDocuments: searchVector
} = require("./vectorService");
const {
  rerankResults,
} = require("./rerankerService");
const {
  searchDocuments: searchBM25
} = require("./bm25Service");

async function hybridSearch(
  query,
  documentId,
  topK = 10
) {
  const vectorResults = await searchVector(
    query,
    documentId
  );

  const bm25Results = searchBM25(
    query,
    documentId,
    topK
  );

 const fusedResults =
  reciprocalRankFusion(
    vectorResults,
    bm25Results
  );

const rerankedResults =
  rerankResults(
    query,
    fusedResults,
    topK
  );

return rerankedResults;
}

function reciprocalRankFusion(
  vectorResults,
  bm25Results,
  k = 60
) {
  const scores = new Map();

  vectorResults.forEach((result, index) => {
    const chunkId =
      result.id ||
      result.metadata?.chunkId;

    if (!chunkId) {
      return;
    }

    const rank = index + 1;

    const current =
      scores.get(chunkId) || {
        score: 0,
        metadata:
          result.metadata || {},
        sources: [],
      };

    current.score +=
      1 / (k + rank);

    current.sources.push({
      source: "vector",
      rank,
    });

    scores.set(chunkId, current);
  });

  bm25Results.forEach((result, index) => {
    const chunkId =
      result.id ||
      result.metadata?.chunkId;

    if (!chunkId) {
      return;
    }

    const rank = index + 1;

    const current =
      scores.get(chunkId) || {
        score: 0,
        metadata:
          result.metadata || {},
        sources: [],
      };

    current.score +=
      1 / (k + rank);

    current.sources.push({
      source: "bm25",
      rank,
    });

    scores.set(chunkId, current);
  });

  return Array.from(scores.entries())
    .map(([chunkId, result]) => ({
      id: chunkId,

      score: result.score,

      metadata: result.metadata,

      retrievalSources:
        result.sources,

      retrievedBy: result.sources.map(
        (source) => source.source
      ),
    }))
    .sort(
      (a, b) => b.score - a.score
    );
}

module.exports = {
  hybridSearch,
  reciprocalRankFusion,
};