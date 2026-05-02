const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const { embedText } = require("../services/embedder");
const { getDB } = require("../config/db");
const { getBearerToken, JWT_SECRET } = require("../middleware/auth");

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

// ✅ Synonyms
const synonyms = {
  "conclusion":   "conclusion summary findings results key takeaways outcome",
  "authors":      "submitted by student name roll number author written by",
  "phone":        "mobile contact number telephone",
  "objective":    "objective goal aim purpose sub-objective",
  "introduction": "introduction overview background context",
  "limitations":  "limitations challenges drawbacks problems issues",
  "applications": "applications use cases real world examples",
  "methodology":  "methodology method approach process steps",
  "references":   "references bibliography citations sources",
  "abstract":     "abstract summary overview brief",
  "results":      "results findings outcomes evaluation performance",
  "future":       "future work directions scope recommendations",
  "refund":       "refund return money back payment reversal policy",
  "leave":        "leave absence vacation holiday time off policy",
  "onboarding":   "onboarding joining process new employee steps",
  "salary":       "salary compensation payment CTC benefits",
  "complaint":    "complaint grievance issue report problem escalation",
  "policy":       "policy rule guideline procedure regulation",
  "approval":     "approval authorization permission sign off",
  "escalation":   "escalation escalate manager senior contact",
  "resignation":  "resignation quit leaving exit notice period",
  "expense":      "expense reimbursement claim bill receipt"
};

function expandQuery(query) {
  const lower = query.toLowerCase();
  let expanded = lower;
  Object.entries(synonyms).forEach(([key, value]) => {
    if (lower.includes(key)) expanded += " " + value;
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

// ✅ Detect query type
function detectQueryType(query) {
  const lower = query.toLowerCase();
  const isDefinition = /^(what is|what are|define|explain|describe)/i.test(lower);
  const isList = /^(list|give me|show me|what are all|enumerate)/i.test(lower);
  const isComparison = /(compare|difference|vs|versus|between)/i.test(lower);
  const isPerson = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(query);
  const isSimple = lower.split(" ").length <= 5;

  if (isPerson) return "person";
  if (isDefinition && isSimple) return "definition";
  if (isList) return "list";
  if (isComparison) return "comparison";
  return "general";
}

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

router.post("/", async (req, res) => {
  try {
    const { query, chatHistory = [], file } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    const cleanQuery = query.trim().slice(0, 500);
    console.log("🔍 Original Query:", cleanQuery);

    // ✅ SSE Headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // 1️⃣ Query Enhancement
    let enhancedQuery = cleanQuery;
    try {
      const enhancedQueryResponse = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{
          role: "user",
          content: `You are a document search expert. Rewrite this query to find the most relevant section in an academic/research document.

Rules:
- Expand abbreviations and add synonyms
- Add related technical terms
- Keep it under 20 words
- Preserve all person names exactly

Examples:
- "conclusion" → "conclusion summary findings results key takeaways"
- "authors" → "submitted by student name roll number"
- "phone number" → "mobile contact number"
- "limitations" → "limitations challenges drawbacks problems issues"
- "what is social media analysis" → "social media analysis definition overview methods"

Original Query: ${cleanQuery}
Return only the rewritten query, nothing else.`
        }],
        temperature: 0.1
      });
      enhancedQuery = enhancedQueryResponse.choices[0].message.content.trim();
    } catch (e) {
      console.warn("⚠️ Query enhancement failed");
      enhancedQuery = expandQuery(cleanQuery);
    }

    console.log("🔄 Enhanced Query:", enhancedQuery);

    // 2️⃣ Embed
    const queryEmbedding = await embedText(enhancedQuery);
    const db = getDB();
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

    // 3️⃣ Vector Search
    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 800,
          limit: 25,
          ...(Object.keys(visibilityFilter).length ? { filter: visibilityFilter } : {})
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

    if (file) pipeline.push({ $match: { filename: file } });

    const results = await db.collection("documents").aggregate(pipeline).toArray();

    if (!results.length) {
      send({ type: "token", token: "I don't know. This is not covered in the available documents." });
      send({ type: "done", sources: [] });
      return res.end();
    }

    // 4️⃣ Score filter
    const filtered = results.filter(r => r.score > 0.35);
    const usable = filtered.length ? filtered : results.slice(0, 5);

    // 5️⃣ Keyword filter
    const expandedForFilter = expandQuery(cleanQuery);
    const meaningfulWords = expandedForFilter.toLowerCase().split(" ")
      .filter(w => !stopWords.has(w) && w.length > 2);

    let relevantChunks = usable.filter(r =>
      meaningfulWords.some(word => r.text.toLowerCase().includes(word))
    );

    if (relevantChunks.length === 0) {
      relevantChunks = usable.slice(0, 7);
    }

    // 6️⃣ Rerank
    const reranked = rerankResults(relevantChunks, cleanQuery);

    // 7️⃣ Dedup — same content merge karo
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

    // ✅ Query type ke hisaab se chunks limit karo
    const queryType = detectQueryType(cleanQuery);
    const chunkLimit = queryType === "definition" ? 3 : queryType === "list" ? 6 : 5;
    const finalChunks = deduped.slice(0, chunkLimit);

    console.log(`📊 Query type: ${queryType} | Chunks: ${finalChunks.length}`);

    // 8️⃣ Context
    const context = finalChunks.map((r, i) => {
      const src = r.sources.map(s => `${s.filename} Page ${s.page}`).join(", ");
      return `[Source ${i + 1}: ${src}]\n${r.text}`;
    }).join("\n\n---\n\n");

    // 9️⃣ Sources
    const sources = finalChunks.map((r, i) => ({
      index: i + 1,
      source: r.sources.map(s => `${s.filename} Page ${s.page}`),
      score: r.score.toFixed(3),
      snippet: r.text?.substring(0, 150) + "..."
    }));

    // 🔥 Dynamic System Prompt — query type ke hisaab se
    const promptRules = {
      definition: `
- Start with ONE clear summary sentence answering the question directly
- Then add 2-3 key points as bullet points if needed
- Keep answer under 100 words
- Cite source ONCE at the end like: (Source: filename, Page X)
- Do NOT repeat same information from multiple sources — merge them`,

      list: `
- Give a clear bullet point list
- Each point should be unique — no repetition
- Group similar points together
- Keep each bullet concise (one line)
- Cite sources at the end grouped: (Sources: filename Pages X, Y, Z)`,

      comparison: `
- Structure as a clear comparison
- Use "vs" or table-like format if helpful
- Highlight key differences
- Keep answer concise and structured
- Cite sources at the end`,

      person: `
- Answer ONLY about the specific person mentioned
- Include all relevant details found in context
- Do NOT mix up with other persons
- Cite source once at end`,

      general: `
- Start with a direct answer in one sentence
- Add supporting details as bullet points
- Do NOT repeat same info from multiple sources — synthesize them
- Keep answer under 150 words
- Cite sources at the end grouped by filename`
    };

    const systemPrompt = `
You are OpsMind AI, a precise enterprise knowledge assistant.

STRICT RULES:
- Answer ONLY using the provided context
- If answer is NOT in context → say EXACTLY:
  "I don't know. This is not covered in the available documents."
- NEVER hallucinate or use external knowledge
- NEVER repeat the same information multiple times
- Synthesize information from multiple sources — do NOT list each source separately
- Be concise and professional

FORMAT RULES for this query (type: ${queryType}):
${promptRules[queryType]}
`;

    const llmMessages = [
      { role: "system", content: systemPrompt },
      ...chatHistory.slice(-6),
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${cleanQuery}\n\nRemember: Synthesize — do not repeat. Cite once at end.`
      }
    ];

    // ✅ Streaming LLM
    const stream = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: llmMessages,
      temperature: 0.05,
      max_tokens: 400,   // ✅ Concise answers enforce
      stream: true
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || "";
      if (token) send({ type: "token", token });
    }

    send({ type: "done", sources });
    res.end();

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    try {
      res.write(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`);
      res.end();
    } catch {}
  }
});

module.exports = router;