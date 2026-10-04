function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function rerankResults(query, results, topK = 5) {
  const queryTokens = tokenize(query);

  const queryTerms = new Set(queryTokens);

  const reranked = results.map((result) => {
    const text =
      result.metadata?.text ||
      result.metadata?.pageContent ||
      "";

    const documentTokens = tokenize(text);

    if (documentTokens.length === 0) {
      return {
        ...result,
        rerankerScore: 0,
      };
    }

    const documentTerms =
      new Set(documentTokens);

    let matchedTerms = 0;

    for (const term of queryTerms) {
      if (documentTerms.has(term)) {
        matchedTerms++;
      }
    }

    const keywordScore =
      queryTerms.size > 0
        ? matchedTerms / queryTerms.size
        : 0;

    const phraseScore =
      text
        .toLowerCase()
        .includes(query.toLowerCase())
        ? 1
        : 0;

    const rerankerScore =
      keywordScore * 0.8 +
      phraseScore * 0.2;

    return {
      ...result,
      rerankerScore,
    };
  });

  reranked.sort(
    (a, b) =>
      b.rerankerScore -
      a.rerankerScore
  );

  return reranked.slice(0, topK);
}

module.exports = {
  rerankResults,
};