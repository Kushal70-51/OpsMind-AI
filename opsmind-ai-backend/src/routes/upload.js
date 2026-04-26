const express = require('express');
const multer = require('multer');
const fs = require('fs');

const { chunkPDF } = require('../services/chunker');
const { embedChunks } = require('../services/embedder');
const { getDB } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// 🔥 Multer config
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const isPdfMime = file.mimetype === 'application/pdf';
    const hasPdfExtension = file.originalname.toLowerCase().endsWith('.pdf');

    if (isPdfMime || hasPdfExtension) {
      return cb(null, true);
    }

    return cb(new Error('Only PDF files are allowed'));
  }
});

async function processFiles(files) {
  let totalChunks = 0;
  const db = getDB();
  const uploadsCollection = db.collection('document_uploads');

  // 🔁 Loop through all files
  for (let file of files) {
    const filePath = file.path;
    const fileName = file.originalname;

    try {
      const existingMeta = await uploadsCollection.findOne({ filename: fileName }, { projection: { version: 1 } });
      const nextVersion = (existingMeta?.version || 0) + 1;

      await uploadsCollection.updateOne(
        { filename: fileName },
        {
          $set: {
            filename: fileName,
            stage: 'chunking',
            chunkCount: 0,
            uploadedAt: new Date(),
            version: nextVersion,
            errorReason: null
          }
        },
        { upsert: true }
      );

      console.log('📄 Processing:', fileName);

      // 🔹 Step 1: Chunking
      const chunks = await chunkPDF(filePath, fileName);
      console.log('📄 Chunks created:', chunks.length);

      if (chunks.length === 0) {
        console.log('⚠️ Skipping empty file:', fileName);
        await uploadsCollection.updateOne(
          { filename: fileName },
          {
            $set: {
              stage: 'error',
              errorReason: 'No extractable text found in PDF',
              chunkCount: 0,
              uploadedAt: new Date()
            }
          }
        );
        continue;
      }

      await uploadsCollection.updateOne(
        { filename: fileName },
        { $set: { stage: 'embedding', errorReason: null } }
      );

      // 🔹 Step 2: Embedding
      const embedded = await embedChunks(chunks);
      console.log('🔢 Embeddings created:', embedded.length);

      if (embedded.length === 0) {
        console.log('⚠️ Embedding failed for:', fileName);
        await uploadsCollection.updateOne(
          { filename: fileName },
          {
            $set: {
              stage: 'error',
              errorReason: 'Embedding failed for document',
              chunkCount: 0,
              uploadedAt: new Date()
            }
          }
        );
        continue;
      }

      await uploadsCollection.updateOne(
        { filename: fileName },
        { $set: { stage: 'indexing', errorReason: null } }
      );

      // 🔹 Step 3: Save to DB (MongoDB Atlas via MONGODB_URI)
      await db.collection('documents').insertMany(embedded);
      totalChunks += embedded.length;

      await uploadsCollection.updateOne(
        { filename: fileName },
        {
          $set: {
            stage: 'done',
            chunkCount: embedded.length,
            uploadedAt: new Date(),
            errorReason: null
          }
        }
      );
    } catch (error) {
      await uploadsCollection.updateOne(
        { filename: fileName },
        {
          $set: {
            stage: 'error',
            errorReason: error.message,
            uploadedAt: new Date()
          }
        },
        { upsert: true }
      );
      throw error;
    } finally {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  return totalChunks;
}

// ✅ MULTIPLE FILE SUPPORT (IMPORTANT CHANGE)
router.post('/', upload.array('pdf', 10), async (req, res) => {
  try {
    const files = req.files;

    // ❌ No file error
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    console.log(`📤 Files received: ${files.length}`);

    const totalChunks = await processFiles(files);

    res.json({
      success: true,
      totalChunksStored: totalChunks
    });

  } catch (err) {
    console.error("❌ Upload error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Admin-only endpoint for PDF ingestion from Admin Dashboard
router.post('/admin', requireAuth, requireRole(['admin']), upload.array('pdf', 10), async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log(`📤 Admin files received: ${files.length} | user: ${req.user.email}`);

    const totalChunks = await processFiles(files);

    return res.json({
      success: true,
      totalChunksStored: totalChunks
    });
  } catch (err) {
    console.error('❌ Admin upload error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;