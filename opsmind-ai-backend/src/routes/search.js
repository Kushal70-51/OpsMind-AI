// routes/search.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const { getDB } = require('../config/db');
const { getQueryEmbedding } = require('../services/queryEmbed');
const { getBearerToken, JWT_SECRET } = require('../middleware/auth');

function getUserScope(req) {
  const token = getBearerToken(req);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      ownerId: decoded.id || null,
      ownerEmail: decoded.email || null,
      role: decoded.role || null
    };
  } catch {
    return null;
  }
}

router.post('/', async (req, res) => {
  try {
    const { query } = req.body;

    const embedding = await getQueryEmbedding(query);
    const db = getDB();
    const scope = getUserScope(req);
    const isAdmin = scope?.role === 'admin';
    const visibilityFilter = isAdmin || !scope ? {} : {
      $or: [
        { ownerEmail: scope.ownerEmail },
        { ownerId: scope.ownerId },
        { ownerEmail: { $exists: false } },
        { ownerId: { $exists: false } }
      ]
    };

    const results = await db.collection('documents').aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: embedding,
          numCandidates: 100,
          limit: 5,
          ...(Object.keys(visibilityFilter).length ? { filter: visibilityFilter } : {})
        }
      }
    ]).toArray();

    res.json(results);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;