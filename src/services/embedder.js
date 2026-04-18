const { pipeline } = require('@xenova/transformers');

// Load model once
let extractor;

async function loadModel() {
  if (!extractor) {
    console.log("⏳ Loading local embedding model...");
    extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
    console.log("✅ Model loaded");
  }
}

// 🔹 Single text embedding
async function embedText(text) {
  await loadModel();

  const output = await extractor(text, {
    pooling: 'mean',
    normalize: true
  });

  return Array.from(output.data);
}

// 🔹 Multiple chunks — now with metadata support
async function embedChunks(chunks) {
  const result = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`🔢 Embedding ${i + 1}/${chunks.length} | File: ${chunks[i].filename || "unknown"} | Page: ${chunks[i].page || "?"}`);

    try {
      const embedding = await embedText(chunks[i].text);

      result.push({
        text: chunks[i].text,
        embedding,
        filename: chunks[i].filename || null,    // ✅ "Refund_Policy.pdf"
        page: chunks[i].page || null,            // ✅ 12
        chunkIndex: i,                           // ✅ 0, 1, 2...
        uploadedAt: new Date()
      });

    } catch (err) {
      console.error(`❌ Failed chunk ${i}`, err.message);
    }
  }

  return result;
}

module.exports = { embedChunks, embedText };