// services/reranker.js
function rerankResults(results, query) {
  const queryWords = query.toLowerCase().split(' ');

  return results
    .map(r => {
      const text = r.text.toLowerCase();

      // Keyword match score
      const keywordScore = queryWords.filter(word => 
        text.includes(word)
      ).length / queryWords.length;

      // Combined score = vector score + keyword score
      const combinedScore = (r.score * 0.7) + (keywordScore * 0.3);

      return { ...r, combinedScore };
    })
    .sort((a, b) => b.combinedScore - a.combinedScore);
}

module.exports = { rerankResults };