/**
 * RAG Retrieval Evaluation Script
 *
 * Calls the live /ask SSE endpoint for each test case and scores results.
 *
 * Usage:
 *   node --env-file=.env scripts/evalRag.js
 *
 * Requirements:
 *   - Server must be running:  npm run server
 *   - At least one SOP PDF must be uploaded and indexed
 *   - GROQ_API_KEY must be set in .env
 *
 * Output: per-test PASS/FAIL with reason, then a summary table.
 */

import { TEST_CASES } from './evalCases.js';

const API_BASE = process.env.EVAL_API_BASE || 'http://localhost:5000';
const EVAL_TOKEN = process.env.EVAL_JWT_TOKEN || null;  // set in .env when EVAL_MODE is off
const FALLBACK_PHRASE = "i don't know";
const TIMEOUT_MS = 30_000;

// ── Colours ──────────────────────────────────────────────────────────────────
const GREEN  = s => `\x1b[32m${s}\x1b[0m`;
const RED    = s => `\x1b[31m${s}\x1b[0m`;
const YELLOW = s => `\x1b[33m${s}\x1b[0m`;
const BOLD   = s => `\x1b[1m${s}\x1b[0m`;
const DIM    = s => `\x1b[2m${s}\x1b[0m`;

// ── SSE stream consumer ───────────────────────────────────────────────────────
async function queryAsk(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers = { 'Content-Type': 'application/json' };
  if (EVAL_TOKEN) headers['Authorization'] = `Bearer ${EVAL_TOKEN}`;

  try {
    const res = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, chatHistory: [] }),
      signal: controller.signal
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // 401 means auth middleware blocked — eval skips auth intentionally
      if (res.status === 401) throw new Error('AUTH_REQUIRED');
      throw new Error(`HTTP ${res.status}: ${body.error ?? 'unknown'}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';
    let sources = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const messages = buffer.split('\n\n');
      buffer = messages.pop() ?? '';

      for (const msg of messages) {
        const dataLine = msg.split('\n').find(l => l.startsWith('data:'));
        if (!dataLine) continue;
        try {
          const payload = JSON.parse(dataLine.slice(5).trim());
          if (payload.type === 'token') answer += payload.token;
          if (payload.type === 'done')  sources = payload.sources ?? [];
          if (payload.type === 'error') throw new Error(payload.error);
        } catch { /* skip malformed */ }
      }
    }

    return { answer: answer.trim(), sources };
  } finally {
    clearTimeout(timer);
  }
}

// ── Scoring ───────────────────────────────────────────────────────────────────
function scoreRetrieval(tc, answer, sources) {
  const answerLower = answer.toLowerCase();
  const failures = [];

  if (sources.length === 0) {
    failures.push('No sources returned');
  }

  if (answerLower.includes(FALLBACK_PHRASE)) {
    failures.push('Answer contains "I don\'t know" fallback — retrieval failed');
  }

  if (tc.expectKeywords?.length) {
    const found = tc.expectKeywords.filter(kw => answerLower.includes(kw.toLowerCase()));
    if (found.length === 0) {
      failures.push(`None of the expected keywords found: [${tc.expectKeywords.join(', ')}]`);
    }
  }

  if (tc.expectSourceFile) {
    const sourceNames = sources.flatMap(s => Array.isArray(s.source) ? s.source : [s.source]);
    const matched = sourceNames.some(s => s?.toLowerCase().includes(tc.expectSourceFile.toLowerCase()));
    if (!matched) {
      failures.push(`Expected source file "${tc.expectSourceFile}" not found in: [${sourceNames.join(', ')}]`);
    }
  }

  return failures;
}

function scoreHallucination(answer, sources) {
  const answerLower = answer.toLowerCase();
  const failures = [];

  if (!answerLower.includes(FALLBACK_PHRASE)) {
    failures.push(`Answer did not contain fallback phrase — possible hallucination.\n    Answer: "${answer.slice(0, 200)}..."`);
  }

  const highScoreSources = sources.filter(s => parseFloat(s.score) >= 0.4);
  if (highScoreSources.length > 0) {
    failures.push(`${highScoreSources.length} high-confidence source(s) returned for out-of-scope query — check score threshold`);
  }

  return failures;
}

// ── Runner ────────────────────────────────────────────────────────────────────
async function run() {
  console.log(BOLD('\n🧪 OpsMind RAG Evaluation'));
  console.log(DIM(`   Endpoint: ${API_BASE}/ask`));
  console.log(DIM(`   Cases: ${TEST_CASES.length} (${TEST_CASES.filter(t => t.type === 'retrieval').length} retrieval, ${TEST_CASES.filter(t => t.type === 'hallucination').length} hallucination)\n`));

  // Auth probe — send token if available, detect if still blocked
  let authRequired = false;
  try {
    const probeHeaders = { 'Content-Type': 'application/json' };
    if (EVAL_TOKEN) probeHeaders['Authorization'] = `Bearer ${EVAL_TOKEN}`;
    const probe = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: probeHeaders,
      body: JSON.stringify({ query: 'test', chatHistory: [] })
    });
    if (probe.status === 401) authRequired = true;
  } catch { /* server not running */ }

  if (authRequired) {
    console.log(YELLOW('⚠️  /ask requires authentication.\n'));
    if (EVAL_TOKEN) {
      console.log(RED('   EVAL_JWT_TOKEN is set but was rejected — token may be expired or invalid.\n'));
    } else {
      console.log(DIM('   Option 1: Set EVAL_JWT_TOKEN=<valid_jwt> in .env (get it from /auth/login)\n'));
      console.log(DIM('   Option 2: Set EVAL_MODE=true in .env to bypass auth for eval only\n'));
    }
    process.exit(1);
  }

  const results = [];

  for (const tc of TEST_CASES) {
    process.stdout.write(`  [${tc.id}] ${tc.description} ... `);

    try {
      const { answer, sources } = await queryAsk(tc.query);

      const failures = tc.type === 'retrieval'
        ? scoreRetrieval(tc, answer, sources)
        : scoreHallucination(answer, sources);

      const passed = failures.length === 0;
      results.push({ tc, passed, failures, answer, sources });

      if (passed) {
        console.log(GREEN('PASS'));
      } else {
        console.log(RED('FAIL'));
        for (const f of failures) console.log(RED(`    ✗ ${f}`));
      }

      // Show top source for retrieval tests
      if (tc.type === 'retrieval' && sources.length > 0) {
        const top = sources[0];
        const srcLabel = Array.isArray(top.source) ? top.source[0] : top.source;
        console.log(DIM(`    → Top source: ${srcLabel} (score: ${top.score})`));
      }

    } catch (err) {
      results.push({ tc, passed: false, failures: [err.message], answer: '', sources: [] });
      console.log(RED(`ERROR: ${err.message}`));
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const retPassed  = results.filter(r => r.tc.type === 'retrieval'     && r.passed).length;
  const retTotal   = results.filter(r => r.tc.type === 'retrieval').length;
  const halPassed  = results.filter(r => r.tc.type === 'hallucination' && r.passed).length;
  const halTotal   = results.filter(r => r.tc.type === 'hallucination').length;

  console.log('\n' + BOLD('─'.repeat(60)));
  console.log(BOLD('  Results Summary'));
  console.log('─'.repeat(60));
  console.log(`  Retrieval accuracy:    ${retPassed}/${retTotal} passed`);
  console.log(`  Hallucination guard:   ${halPassed}/${halTotal} passed`);
  console.log('─'.repeat(60));
  console.log(`  Total: ${passed} passed, ${failed} failed out of ${results.length}`);

  if (failed === 0) {
    console.log(GREEN(BOLD('\n  ✅ All tests passed!\n')));
  } else {
    console.log(RED(BOLD(`\n  ❌ ${failed} test(s) failed. Review failures above.\n`)));
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error(RED(`\nFatal error: ${err.message}`));
  process.exit(1);
});
