const express = require("express");
const router = express.Router();

const { embedText } = require("../services/embedder");
const { getDB } = require("../config/db");

const Groq = require("groq-sdk");
require("dotenv").config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ✅ Stop words
const stopWords = new Set([
  "what", "is", "the", "of", "a", "an", "are", "were", "was",
  "in", "to", "for", "how", "who", "which", "where", "when",
  "do", "does", "did", "has", "have", "had", "be", "been",
  "can", "could", "will", "would", "should", "may", "might",
  "me", "my", "his", "her", "its", "their", "our", "your",
  "this", "that", "these", "those", "give", "tell", "list",
  "explain", "describe", "show", "find", "get", "please"
]);

// ✅ Query synonym expansion
const synonyms = {
  "conclusion":     "conclusion summary findings results key takeaways outcome",
  "authors":        "submitted by student name roll number author written by",
  "phone":          "mobile contact number telephone",
  "objective":      "objective goal aim purpose sub-objective",
  "introduction":   "introduction overview background context",
  "limitations":    "limitations challenges drawbacks problems issues",
  "applications":   "applications use cases real world examples",
  "methodology":    "methodology method approach process steps",
  "references":     "references bibliography citations sources",
  "abstract":       "abstract summary overview brief",
  "results":        "results findings outcomes evaluation performance",
  "future":         "future work directions scope recommendations"
};

function expandQuery(query) {
  const lower = query.toLowerCase();
  let expanded = lower;
  Object.entries(synonyms).forEach(([key, value]) => {
    if (lower.includes(key)) {
      expanded += " " + value;
    }
  });
  return expanded;
}

// ✅ Reranker — vector + keyword combined score
function rerankResults(results, query) {
  const expandedQuery = expandQuery(query);
  const queryWords = expandedQuery.toLowerCase().split(" ")
    .filter(w => !stopWords.has(w) && w.length > 2);

  return results
    .map(r => {
      const text = r.text.toLowerCase();
      const keywordScore = queryWords.length > 0
        ? queryWords.filter(word => text.includes(word)).length / queryWords.length
        : 0;

      const combinedScore = (r.score * 0.7) + (keywordScore * 0.3);
      return { ...r, combinedScore };
    })
    .sort((a, b) => b.combinedScore - a.combinedScore);
}

router.post("/", async (req, res) => {
  try {
    const { query, chatHistory = [], file } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    // ✅ Input sanitization
    const cleanQuery = query.trim().slice(0, 500);
    console.log("🔍 Original Query:", cleanQuery);

    // 1️⃣ Query Enhancement — with synonym expansion
    let enhancedQuery = cleanQuery;
    try {
      const enhancedQueryResponse = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{
          role: "user",
          content: `You are a document search expert. Rewrite this query to find the most relevant section in an academic/research document.

Important rules:
- Expand abbreviations and add synonyms
- Add related technical terms
- Keep it under 20 words

Examples:
- "conclusion" → "conclusion summary findings results key takeaways"
- "authors" → "submitted by student name roll number"
- "phone number" → "mobile contact number"
- "limitations" → "limitations challenges drawbacks problems issues"

Original Query: ${cleanQuery}
Return only the rewritten query, nothing else.`
        }],
        temperature: 0.1
      });
      enhancedQuery = enhancedQueryResponse.choices[0].message.content.trim();
    } catch (e) {
      console.warn("⚠️ Query enhancement failed, using original");
      enhancedQuery = expandQuery(cleanQuery); // fallback to local synonyms
    }

    console.log("🔄 Enhanced Query:", enhancedQuery);

    // 2️⃣ Embed enhanced query
    const queryEmbedding = await embedText(enhancedQuery);
    const db = getDB();

    // 3️⃣ Vector Search
    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 800,
          limit: 25
        }
      },
      {
        $project: {
          text: 1,
          filename: 1,
          page: 1,
          score: { $meta: "vectorSearchScore" },
          _id: 0
        }
      }
    ];

    if (file) {
      pipeline.push({ $match: { filename: file } });
    }

    const results = await db
      .collection("documents")
      .aggregate(pipeline)
      .toArray();

    if (!results.length) {
      return res.json({
        question: cleanQuery,
        answer: "I don't know. This is not covered in the available documents.",
        sources: []
      });
    }

    // 4️⃣ Filter low scores
    const filtered = results.filter(r => r.score > 0.35);
    const usable = filtered.length ? filtered : results.slice(0, 5);

    // 5️⃣ Keyword filter — stop words removed + synonyms expanded
    const expandedForFilter = expandQuery(cleanQuery);
    const meaningfulWords = expandedForFilter.toLowerCase().split(" ")
      .filter(w => !stopWords.has(w) && w.length > 2);

    console.log("🔑 Meaningful words:", meaningfulWords);

    let relevantChunks;

    if (meaningfulWords.length === 0) {
      relevantChunks = usable;
    } else {
      relevantChunks = usable.filter(r =>
        meaningfulWords.some(word => r.text.toLowerCase().includes(word))
      );
    }

    // ✅ Fallback — vector results use karo
    if (relevantChunks.length === 0) {
      console.log("⚠️ No keyword match — using top vector results");
      relevantChunks = usable.slice(0, 7);
    }

    // 6️⃣ Rerank
    const reranked = rerankResults(relevantChunks, cleanQuery);

    // 7️⃣ Deduplication
    const map = new Map();
    reranked.forEach(r => {
      const key = r.text.trim().toLowerCase().slice(0, 120);
      if (!map.has(key)) {
        map.set(key, {
          text: r.text,
          sources: [{ filename: r.filename, page: r.page }],
          score: r.combinedScore
        });
      } else {
        map.get(key).sources.push({ filename: r.filename, page: r.page });
      }
    });

    const deduped = Array.from(map.values());
    deduped.sort((a, b) => b.score - a.score);
    const finalChunks = deduped.slice(0, 7);

    // 8️⃣ Build context
    const context = finalChunks.map((r, i) => {
      const src = r.sources
        .map(s => `${s.filename} Page ${s.page}`)
        .join(", ");
      return `[Source ${i + 1}: ${src}]\n${r.text}`;
    }).join("\n\n---\n\n");

    // 9️⃣ Sources list
    const sources = finalChunks.map((r, i) => ({
      index: i + 1,
      source: r.sources.map(s => `${s.filename} Page ${s.page}`),
      score: r.score.toFixed(3)
    }));

    // 🔥 System Prompt
    const systemPrompt = `
You are OpsMind AI, an enterprise knowledge assistant.

STRICT RULES:
- Answer ONLY using the provided context below
- If the exact answer is not present → say EXACTLY:
  "I don't know. This is not covered in the available documents."
- Do NOT generate assumptions or guesses
- Do NOT suggest external policies
- Do NOT use knowledge outside the context
- Always cite sources like: "According to [filename], Page X..."
- For lists/tables → use bullet points
- For summaries → be concise and structured
`;

    const userMessage = `
Context:
${context}

Question: ${cleanQuery}

Important: Answer strictly from context only. Cite every claim.
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory.slice(-6),
      { role: "user", content: userMessage }
    ];

    // 🔟 LLM Call
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.05
    });

    const answer = response.choices[0].message.content;

    // ✅ Answer Verification — relaxed
    let isValid = "YES";
    try {
      const verifyResponse = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{
          role: "user",
          content: `Is this answer based ONLY on the context provided? Reply YES or NO only.
Answer: ${answer}
Context: ${context}`
        }],
        temperature: 0
      });
      isValid = verifyResponse.choices[0].message.content.trim().toUpperCase();
    } catch (e) {
      console.warn("⚠️ Verification failed — defaulting to YES");
    }

    console.log("✅ Verification:", isValid);

    // Block only if NO + low score
    if (isValid.startsWith("NO") && finalChunks[0]?.score < 0.45) {
      return res.json({
        question: cleanQuery,
        answer: "I don't know. This is not covered in the available documents.",
        sources: []
      });
    }

    res.json({ question: cleanQuery, answer, sources });

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;