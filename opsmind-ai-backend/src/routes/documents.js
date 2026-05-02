const express = require('express');
const jwt = require('jsonwebtoken');

const { getDB } = require('../config/db');
const { requireAuth, requireRole, getBearerToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

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

// Authenticated list of uploaded documents with aggregated metadata.
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getDB();
    const uploadsCollection = db.collection('document_uploads');
    const scope = getUserScope(req);
    const isAdmin = req.user?.role === 'admin';

    const visibilityFilter = isAdmin || !scope ? {} : {
      $or: [
        { ownerEmail: scope.ownerEmail },
        { ownerId: scope.ownerId },
        { ownerEmail: { $exists: false } },
        { ownerId: { $exists: false } }
      ]
    };

    const uploadDocs = await uploadsCollection.find(
      visibilityFilter,
      {
        projection: {
          _id: 0,
          filename: 1,
          chunkCount: 1,
          uploadedAt: 1,
          version: 1,
          stage: 1,
          errorReason: 1,
          ownerId: 1,
          ownerEmail: 1,
          ownerName: 1
        }
      }
    ).sort({ uploadedAt: -1 }).toArray();

    if (uploadDocs.length > 0) {
      return res.json(uploadDocs);
    }

    const docs = await db.collection('documents').aggregate([
      { $match: visibilityFilter },
      {
        $group: {
          _id: '$filename',
          chunkCount: { $sum: 1 },
          uploadedAt: { $max: '$uploadedAt' }
        }
      },
      {
        $project: {
          _id: 0,
          filename: '$_id',
          chunkCount: 1,
          uploadedAt: 1,
          version: { $literal: 1 },
          stage: { $literal: 'done' }
        }
      },
      { $sort: { uploadedAt: -1 } }
    ]).toArray();

    return res.json(docs);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/:filename', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const db = getDB();
    const filename = decodeURIComponent(req.params.filename || '');

    if (!filename) {
      return res.status(400).json({ error: 'filename is required' });
    }

    const result = await db.collection('documents').deleteMany({ filename });
    await db.collection('document_uploads').deleteOne({ filename });

    return res.json({ success: true, deletedChunks: result.deletedCount });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
