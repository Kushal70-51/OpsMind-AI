import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import { validateLogin, validateAsk } from './middleware/validate.js';
import authRoute from './routes/auth.js';
import uploadRoute from './routes/upload.js';
import searchRoute from './routes/search.js';
import askRoute from './routes/ask.js';
import documentsRoute from './routes/documents.js';

const app = express();

// 1. Security headers — sets X-Content-Type-Options, X-Frame-Options,
//    Strict-Transport-Security, X-XSS-Protection, etc.
app.use(helmet());

// 2. Restricted CORS — only the configured frontend origin(s)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server calls (no origin) and listed origins only
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));

// 3. Body parsing — tight size limit prevents large payload attacks
app.use(express.json({ limit: '512kb' }));

// 4. Rate limiters — different budgets per route sensitivity
const globalLimiter = rateLimit({
  windowMs: 60_000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 10,   // 10 attempts per 15 min — brute-force protection
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' }
});

const askLimiter = rateLimit({
  windowMs: 60_000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Query rate limit reached. Please wait a moment.' }
});

app.use(globalLimiter);

// 5. Routes — validation middleware applied inline at registration point
app.use('/auth', loginLimiter, validateLogin, authRoute);
app.use('/upload', uploadRoute);
app.use('/search', searchRoute);
app.use('/ask', askLimiter, validateAsk, askRoute);
app.use('/documents', documentsRoute);

app.get('/', (req, res) => res.json({ status: 'ok', service: 'OpsMind API' }));

// 6. CORS error handler — must come before the generic error handler
app.use((err, req, res, next) => {
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }
  next(err);
});

// 7. Generic error handler — never leaks stack traces to the client
app.use((err, req, res, _next) => {
  console.error('❌ Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

connectDB()
  .then(() => app.listen(5000, () => console.log('🚀 Server on http://localhost:5000')))
  .catch(err => { console.error('❌ DB failed:', err.message); process.exit(1); });
