// routes/search.js
const express = require('express');
const router = express.Router();

const { getDB } = require('../config/db');
const { getQueryEmbedding } = require('../services/queryEmbed');

router.post('/', async (req, res) => {
  try {
    const { query } = req.body;

    const embedding = await getQueryEmbedding(query);
    const db = getDB();

    const results = await db.collection('documents').aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: embedding,
          numCandidates: 100,
          limit: 5
        }
      }
    ]).toArray();

    res.json(results);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;