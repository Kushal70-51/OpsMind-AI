const express = require('express');

const { getDB } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Admin-only list of uploaded documents with aggregated metadata.
router.get('/', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const db = getDB();
    const uploadsCollection = db.collection('document_uploads');

    const uploadDocs = await uploadsCollection.find(
      {},
      {
        projection: {
          _id: 0,
          filename: 1,
          chunkCount: 1,
          uploadedAt: 1,
          version: 1,
          stage: 1,
          errorReason: 1
        }
      }
    ).sort({ uploadedAt: -1 }).toArray();

    if (uploadDocs.length > 0) {
      return res.json(uploadDocs);
    }

    const docs = await db.collection('documents').aggregate([
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
