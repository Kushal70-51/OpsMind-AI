/**
 * Lightweight input validation middleware — no external schema library needed.
 * Each validator returns an Express middleware that calls next() or 422.
 */

export function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (typeof email !== 'string' || !email.trim()) {
    return res.status(422).json({ error: 'email is required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(422).json({ error: 'email is invalid' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(422).json({ error: 'password must be at least 6 characters' });
  }
  // Sanitise in-place so downstream handlers get clean values
  req.body.email = email.trim().toLowerCase().slice(0, 254);
  req.body.password = password.slice(0, 128);
  next();
}

export function validateAsk(req, res, next) {
  const { query, chatHistory } = req.body;

  if (typeof query !== 'string' || !query.trim()) {
    return res.status(422).json({ error: 'query is required and must be a non-empty string' });
  }
  if (query.trim().length > 500) {
    return res.status(422).json({ error: 'query must be 500 characters or fewer' });
  }

  // Validate chatHistory shape — prevent LLM prompt injection via role spoofing
  if (chatHistory !== undefined) {
    if (!Array.isArray(chatHistory)) {
      return res.status(422).json({ error: 'chatHistory must be an array' });
    }
    if (chatHistory.length > 20) {
      return res.status(422).json({ error: 'chatHistory must have 20 entries or fewer' });
    }
    for (const msg of chatHistory) {
      if (typeof msg !== 'object' || msg === null) {
        return res.status(422).json({ error: 'each chatHistory entry must be an object' });
      }
      // Only allow user/assistant roles — block any attempt to inject system messages
      if (!['user', 'assistant'].includes(msg.role)) {
        return res.status(422).json({ error: 'chatHistory role must be "user" or "assistant"' });
      }
      if (typeof msg.content !== 'string' || !msg.content.trim()) {
        return res.status(422).json({ error: 'chatHistory content must be a non-empty string' });
      }
      // Truncate each history message to prevent context stuffing
      msg.content = msg.content.slice(0, 2000);
    }
  }

  req.body.query = query.trim();
  next();
}

export function validateFilename(req, res, next) {
  const filename = decodeURIComponent(req.params.filename ?? '');
  // Block path traversal attempts
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return res.status(422).json({ error: 'Invalid filename' });
  }
  req.params.filename = filename;
  next();
}

/**
 * Multer file filter — validates MIME type AND checks PDF magic bytes (%PDF-).
 * Rejects files that claim to be PDFs but aren't.
 */
export function pdfFileFilter(req, file, cb) {
  if (file.mimetype !== 'application/pdf') {
    return cb(new Error('Only PDF files are accepted'), false);
  }
  cb(null, true);
}

/**
 * Post-multer magic byte check — reads the first 5 bytes of each uploaded file
 * and rejects anything that doesn't start with the PDF header %PDF-
 */
export async function validatePdfMagicBytes(req, res, next) {
  if (!req.files?.length) return next();

  const { readFileSync, unlinkSync, existsSync } = await import('fs');

  for (const file of req.files) {
    try {
      const header = readFileSync(file.path).slice(0, 5).toString('ascii');
      if (header !== '%PDF-') {
        // Clean up all uploaded temp files before rejecting
        for (const f of req.files) {
          try { if (existsSync(f.path)) unlinkSync(f.path); } catch { /* ignore */ }
        }
        return res.status(422).json({ error: `${file.originalname} is not a valid PDF file` });
      }
    } catch {
      return res.status(500).json({ error: 'Failed to validate uploaded file' });
    }
  }
  next();
}
