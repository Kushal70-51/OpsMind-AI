const express = require('express');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebaseAdmin');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'opsmind-dev-secret-change-in-production';

const USERS = [
  {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@company.com',
    password: 'password123',
    role: 'admin'
  },
  {
    id: 'demo-1',
    name: 'Demo User',
    email: 'demo@company.com',
    password: 'password123',
    role: 'employee'
  }
];

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(422).json({ error: 'email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = USERS.find(candidate => candidate.email === normalizedEmail && candidate.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    token
  });
});

router.post('/firebase', async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ error: 'idToken is required' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;

    if (!email) {
      return res.status(400).json({ error: 'No email found in token' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = USERS.find(candidate => candidate.email === normalizedEmail);

    if (!user) {
      // Auto-register employee if not exist
      user = {
        id: `google-${decodedToken.uid}`,
        name: decodedToken.name || email.split('@')[0],
        email: normalizedEmail,
        password: '', // No password for Google auth users
        role: 'employee'
      };
      USERS.push(user);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error("Firebase verify error:", error.message);
    return res.status(401).json({ error: 'Invalid or expired Google token' });
  }
});

module.exports = router;