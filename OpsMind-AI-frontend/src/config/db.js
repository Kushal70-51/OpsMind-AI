import { MongoClient } from 'mongodb';

let db;

export const VECTOR_INDEX = 'vector_index';

const INDEX_DEFINITION = {
  name: VECTOR_INDEX,
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'embedding',
        numDimensions: 384,   // Xenova/all-MiniLM-L6-v2 output size
        similarity: 'cosine'
      },
      { type: 'filter', path: 'filename' }
    ]
  }
};

/**
 * Ensures the vector search index exists and is READY.
 * - If missing: creates it, then polls until status === READY (max 3 min).
 * - If BUILDING: polls until READY.
 * - If READY: returns immediately.
 */
async function ensureVectorIndex(collection) {
  let indexes = [];
  try {
    indexes = await collection.listSearchIndexes().toArray();
  } catch {
    // listSearchIndexes is only available on Atlas — skip on local/non-Atlas
    console.warn('⚠️  listSearchIndexes not supported (non-Atlas cluster). Skipping index validation.');
    return;
  }

  const existing = indexes.find(i => i.name === VECTOR_INDEX);

  if (!existing) {
    console.log('🔧 vector_index not found — creating...');
    await collection.createSearchIndex(INDEX_DEFINITION);
    console.log('✅ vector_index creation requested.');
  } else if (existing.status === 'READY') {
    console.log('✅ vector_index is READY.');
    return;
  } else {
    console.log(`⏳ vector_index status: ${existing.status} — waiting for READY...`);
  }

  // Poll until READY or timeout (3 minutes)
  const MAX_WAIT_MS = 3 * 60 * 1000;
  const POLL_INTERVAL_MS = 5000;
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const current = await collection.listSearchIndexes().toArray();
    const idx = current.find(i => i.name === VECTOR_INDEX);
    const status = idx?.status ?? 'UNKNOWN';
    console.log(`⏳ vector_index status: ${status}`);
    if (status === 'READY') {
      console.log('✅ vector_index is READY — server starting.');
      return;
    }
    if (status === 'FAILED') {
      throw new Error('vector_index creation FAILED. Check Atlas cluster logs.');
    }
  }

  // Index still not ready — warn but don't block server startup
  console.warn('⚠️  vector_index not READY after 3 min. Queries may return empty results until it builds.');
}

export async function connectDB() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db('opsmind');
  console.log('✅ MongoDB connected');

  await ensureVectorIndex(db.collection('documents'));
}

export function getDB() {
  if (!db) throw new Error('DB not connected');
  return db;
}
