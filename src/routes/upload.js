const express = require('express');
const multer = require('multer');
const fs = require('fs');

const { chunkPDF } = require('../services/chunker');
const { embedChunks } = require('../services/embedder');
const { getDB } = require('../config/db');

const router = express.Router();

// 🔥 Multer config
const upload = multer({ dest: 'uploads/' });

// ✅ MULTIPLE FILE SUPPORT (IMPORTANT CHANGE)
router.post('/', upload.array('pdf', 10), async (req, res) => {
  try {
    const files = req.files;

    // ❌ No file error
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    console.log(`📤 Files received: ${files.length}`);

    let totalChunks = 0;

    const db = getDB();

    // 🔁 Loop through all files
    for (let file of files) {
      const filePath = file.path;
      const fileName = file.originalname;

      console.log("📄 Processing:", fileName);

      // 🔹 Step 1: Chunking
      const chunks = await chunkPDF(filePath, fileName);
      console.log("📄 Chunks created:", chunks.length);

      if (chunks.length === 0) {
        console.log("⚠️ Skipping empty file:", fileName);
        continue;
      }

      // 🔹 Step 2: Embedding
      const embedded = await embedChunks(chunks);
      console.log("🔢 Embeddings created:", embedded.length);

      if (embedded.length === 0) {
        console.log("⚠️ Embedding failed for:", fileName);
        continue;
      }

      // 🔹 Step 3: Save to DB
      await db.collection('documents').insertMany(embedded);

      totalChunks += embedded.length;

      // 🔹 Cleanup
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      totalChunksStored: totalChunks
    });

  } catch (err) {
    console.error("❌ Upload error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;