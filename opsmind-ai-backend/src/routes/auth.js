const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const admin = require('../config/firebaseAdmin');
const { getDB } = require('../config/db');

const router = express.Router();

// Hard-fail at startup — never fall back to a known default secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

function usersCol() {
  return getDB().collection('users');
}

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Seed initial users from env vars only — no hardcoded credentials in source
// Set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_DEMO_EMAIL, SEED_DEMO_PASSWORD in .env
// Seeding is skipped entirely if those vars are absent
async function seedUsers() {
  const col = usersCol();
  const candidates = [
    {
      email:    process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
      name:     'Admin User',
      role:     'admin'
    },
    {
      email:    process.env.SEED_DEMO_EMAIL,
      password: process.env.SEED_DEMO_PASSWORD,
      name:     'Demo User',
      role:     'employee'
    }
  ];

  for (const u of candidates) {
    if (!u.email || !u.password) continue; // skip if env var not provided
    const exists = await col.findOne({ email: u.email });
    if (!exists) {
      const hashed = await bcrypt.hash(u.password, 12);
      await col.insertOne({ email: u.email, name: u.name, role: u.role, password: hashed, provider: 'local' });
      console.log(`✅ Seeded user: ${u.email}`);
    }
  }
}

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(422).json({ error: 'email and password are required' });
  }

  const user = await usersCol().findOne({ email: email.trim().toLowerCase(), provider: 'local' });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  return res.json({
    user:  { id: user._id, name: user.name, email: user.email, role: user.role },
    token: signToken(user)
  });
});

// POST /auth/firebase
router.post('/firebase', async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'idToken is required' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (!decoded.email) return res.status(400).json({ error: 'No email found in token' });

    const email = decoded.email.trim().toLowerCase();
    const col   = usersCol();
    let user    = await col.findOne({ email });

    if (!user) {
      const result = await col.insertOne({
        email,
        name:     decoded.name || email.split('@')[0],
        role:     'employee',
        password: null,
        provider: 'google',
        uid:      decoded.uid
      });
      user = await col.findOne({ _id: result.insertedId });
    }

    return res.json({
      user:  { id: user._id, name: user.name, email: user.email, role: user.role },
      token: signToken(user)
    });
  } catch (err) {
    console.error('Firebase verify error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired Google token' });
  }
});

module.exports = { router, seedUsers };
