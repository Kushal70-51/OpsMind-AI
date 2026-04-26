/**
 * One-time setup script — ensures the Atlas vector search index exists and is READY.
 * The same logic runs automatically on every server start via connectDB(),
 * but this script lets you run it standalone before starting the server.
 *
 * Usage:
 *   node --env-file=.env scripts/createVectorIndex.js
 *
 * Requires MONGODB_URI in .env pointing to an Atlas M10+ cluster.
 */
import { connectDB } from '../src/config/db.js';

connectDB()
  .then(() => {
    console.log('✅ Index setup complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Index setup failed:', err.message);
    process.exit(1);
  });
