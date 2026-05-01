const express = require('express');
const crypto  = require('crypto');
const bcrypt  = require('bcrypt');
const { getDB } = require('../config/db');
const { sendMail } = require('../services/mailer');

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function tokensCol() {
  return getDB().collection('password_reset_tokens');
}

function usersCol() {
  return getDB().collection('users');
}

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(422).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Always respond the same way to prevent user enumeration
  const user = await usersCol().findOne({ email: normalizedEmail, provider: 'local' });
  if (user) {
    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    // One active token per user — replace any existing one
    await tokensCol().replaceOne(
      { email: normalizedEmail },
      { email: normalizedEmail, token, expiresAt },
      { upsert: true }
    );

    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

    try {
      await sendMail({
        to: normalizedEmail,
        subject: 'OpsMind AI — Reset Your Password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0d0d0d;color:#e4e4e7;border-radius:12px;">
            <h2 style="color:#3b82f6;margin-bottom:8px;">Password Reset Request</h2>
            <p style="color:#a1a1aa;">Click the button below to reset your password. This link expires in <strong>30 minutes</strong>.</p>
            <a href="${resetLink}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
              Reset Password
            </a>
            <p style="color:#71717a;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `
      });
    } catch (err) {
      console.error('❌ Forgot password email error:', err.message);
    }
  }

  return res.json({ message: 'If that email exists, a reset link has been sent.' });
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};

  if (!token || !newPassword || newPassword.length < 6) {
    return res.status(422).json({ error: 'Valid token and password (min 6 chars) are required' });
  }

  const record = await tokensCol().findOne({ token });

  if (!record || record.expiresAt < new Date()) {
    await tokensCol().deleteOne({ token });
    return res.status(400).json({ error: 'Reset link is invalid or has expired' });
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  const result = await usersCol().updateOne(
    { email: record.email, provider: 'local' },
    { $set: { password: hashed } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ error: 'User account not found' });
  }

  // Invalidate the token immediately after use
  await tokensCol().deleteOne({ token });

  console.log(`✅ Password reset for: ${record.email}`);
  return res.json({ message: 'Password has been reset successfully. You can now log in.' });
});

module.exports = router;
