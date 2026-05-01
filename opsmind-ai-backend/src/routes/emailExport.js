const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { sendMail } = require('../services/mailer');

const router = express.Router();

// POST /email/chat-export  (requires auth)
router.post('/chat-export', requireAuth, async (req, res) => {
  const { messages, conversationTitle } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(422).json({ error: 'messages array is required' });
  }

  const userEmail = req.user.email;
  const title = conversationTitle || 'OpsMind AI Chat Export';
  const exportedAt = new Date().toLocaleString('en-US', { timeZone: 'UTC' });

  const rows = messages.map(m => {
    const role = m.role === 'user' ? '👤 You' : '🤖 OpsMind AI';
    const bg = m.role === 'user' ? '#1c1c1e' : '#18181b';
    return `
      <tr>
        <td style="padding:14px 18px;background:${bg};border-bottom:1px solid #27272a;vertical-align:top;">
          <div style="font-size:11px;font-weight:700;color:#71717a;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;">${role}</div>
          <div style="font-size:14px;color:#e4e4e7;line-height:1.6;white-space:pre-wrap;">${escapeHtml(m.content)}</div>
        </td>
      </tr>`;
  }).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:640px;margin:auto;background:#0d0d0d;border-radius:12px;overflow:hidden;border:1px solid #27272a;">
      <div style="padding:24px 28px;background:#111111;border-bottom:1px solid #27272a;">
        <h2 style="margin:0;color:#3b82f6;font-size:18px;">🧠 ${escapeHtml(title)}</h2>
        <p style="margin:6px 0 0;color:#71717a;font-size:12px;">Exported on ${exportedAt} UTC · ${messages.length} messages</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <div style="padding:16px 28px;background:#111111;border-top:1px solid #27272a;">
        <p style="margin:0;color:#52525b;font-size:11px;">This chat was exported from OpsMind AI. Do not share sensitive information.</p>
      </div>
    </div>`;

  try {
    await sendMail({
      to: userEmail,
      subject: `OpsMind AI — ${title}`,
      html
    });
    return res.json({ success: true, message: `Chat sent to ${userEmail}` });
  } catch (err) {
    console.error('❌ Chat export email error:', err.message);
    return res.status(500).json({ error: 'Failed to send email. Please try again.' });
  }
});

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = router;
