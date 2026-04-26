// services/queryEmbed.js
const { embedText } = require('./embedder');

async function getQueryEmbedding(query) {
  return await embedText(query);
}

module.exports = { getQueryEmbedding };