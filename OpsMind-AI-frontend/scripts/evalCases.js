/**
 * Evaluation test cases for the OpsMind RAG pipeline.
 *
 * Two categories:
 *
 * 1. retrieval — questions that SHOULD be answered from the SOPs.
 *    Pass criteria:
 *      - At least one source chunk is returned (sources.length > 0)
 *      - The answer does NOT contain the "I don't know" fallback phrase
 *      - If `expectKeywords` is set, at least one keyword appears in the answer (case-insensitive)
 *      - If `expectSourceFile` is set, at least one returned source filename contains that string
 *
 * 2. hallucination — questions that are NOT covered by any uploaded SOP.
 *    Pass criteria:
 *      - The answer contains the exact fallback phrase "I don't know"
 *      - No sources are returned (sources.length === 0) OR all source scores are below 0.4
 *
 * Edit this file to match your actual uploaded SOP documents.
 */

export const TEST_CASES = [
  // ── Retrieval tests ──────────────────────────────────────────────────────────
  {
    id: 'ret-01',
    type: 'retrieval',
    query: 'How do I process a refund?',
    expectKeywords: ['refund', 'policy', 'process'],
    expectSourceFile: null,   // set to e.g. 'Refund_Policy.pdf' if you know the filename
    description: 'Core refund process — must retrieve relevant SOP chunk'
  },
  {
    id: 'ret-02',
    type: 'retrieval',
    query: 'What is the security training deadline?',
    expectKeywords: ['security', 'training', 'deadline', 'Q1', 'mandatory'],
    expectSourceFile: null,
    description: 'Security training policy — must cite source and not hallucinate a date'
  },
  {
    id: 'ret-03',
    type: 'retrieval',
    query: 'What are the steps for employee onboarding?',
    expectKeywords: ['onboarding', 'employee', 'steps', 'process'],
    expectSourceFile: null,
    description: 'Onboarding SOP — must return at least one source chunk'
  },
  {
    id: 'ret-04',
    type: 'retrieval',
    query: 'What is the password policy?',
    expectKeywords: ['password', 'policy', 'characters', 'security'],
    expectSourceFile: null,
    description: 'Password/security policy — must retrieve relevant chunk'
  },

  // ── Hallucination tests ───────────────────────────────────────────────────────
  {
    id: 'hal-01',
    type: 'hallucination',
    query: 'What is the recipe for chocolate cake?',
    description: 'Completely off-topic — must return "I don\'t know" fallback'
  },
  {
    id: 'hal-02',
    type: 'hallucination',
    query: 'Who won the FIFA World Cup in 2022?',
    description: 'External world knowledge — must not be answered from SOPs'
  },
  {
    id: 'hal-03',
    type: 'hallucination',
    query: 'What is the stock price of Apple today?',
    description: 'Real-time financial data — must return "I don\'t know" fallback'
  },
  {
    id: 'hal-04',
    type: 'hallucination',
    query: 'Can you write me a Python script to sort a list?',
    description: 'Programming task unrelated to SOPs — must not hallucinate an answer'
  }
];
