const pdfParse = require('pdf-parse');
const fs = require('fs');

async function chunkPDF(filePath, fileName) {
  try {
    // 1. Check file exists
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found");
    }

    // 2. Read file
    const dataBuffer = fs.readFileSync(filePath);

    // 3. Parse PDF with page tracking
    let pageTexts = [];

    const pdfData = await pdfParse(dataBuffer, {
      pagerender: function (pageData) {
        return pageData.getTextContent().then(function (textContent) {
          const pageText = textContent.items.map(i => i.str).join(' ');
          pageTexts.push(pageText);
          return pageText;
        });
      }
    });

    if (!pdfData.text) {
      throw new Error("No text found in PDF");
    }

    const chunks = [];

    // 4. Chunking config
    const CHUNK_SIZE = 512;
    const OVERLAP = 50;

    // 5. Chunk page by page ✅
    pageTexts.forEach((pageText, pageIndex) => {
      const text = pageText.trim();
      if (!text) return;

      let start = 0;
      let chunkIndex = 0;

      while (start < text.length) {
        const end = start + CHUNK_SIZE;
        const chunkText = text.slice(start, end).trim();

        if (chunkText.length > 50) {
          chunks.push({
            text: chunkText,
            filename: fileName,        // ✅ lowercase — matches ask.js
            page: pageIndex + 1,       // ✅ real page number
            chunkIndex: chunkIndex,
            charStart: start,
            charEnd: end,
            createdAt: new Date()
          });
          chunkIndex++;
        }

        start += CHUNK_SIZE - OVERLAP;
      }
    });

    // 6. Fallback — agar pagerender kaam na kare
    if (chunks.length === 0) {
      console.warn("⚠️ pagerender failed, falling back to full text chunking");

      const fullText = pdfData.text.trim();
      let start = 0;
      let chunkIndex = 0;

      while (start < fullText.length) {
        const end = start + CHUNK_SIZE;
        const chunkText = fullText.slice(start, end).trim();

        if (chunkText.length > 50) {
          chunks.push({
            text: chunkText,
            filename: fileName,       // ✅
            page: null,               // page unknown in fallback
            chunkIndex: chunkIndex,
            charStart: start,
            charEnd: end,
            createdAt: new Date()
          });
          chunkIndex++;
        }

        start += CHUNK_SIZE - OVERLAP;
      }
    }

    console.log(`✅ ${fileName} → ${chunks.length} chunks created`);
    return chunks;

  } catch (error) {
    console.error("❌ Error in chunkPDF:", error.message);
    throw error;
  }
}

module.exports = { chunkPDF };