const axios = require('axios');
const crypto = require('crypto');
const admin = require('firebase-admin');

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || 'opsmind-ai-f1cf6';
const firebaseCertsUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  universe_domain: "googleapis.com"
};

let firebaseCertCache = null;

async function getFirebaseCerts() {
  const cacheIsFresh = firebaseCertCache && (Date.now() - firebaseCertCache.fetchedAt) < 60 * 60 * 1000;
  if (cacheIsFresh) {
    return firebaseCertCache.certs;
  }

  const response = await axios.get(firebaseCertsUrl);
  firebaseCertCache = {
    certs: response.data,
    fetchedAt: Date.now()
  };

  return firebaseCertCache.certs;
}

function parseJwtPart(part) {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

function verifyJwtSignature(token, certificate) {
  const [headerPart, payloadPart, signaturePart] = token.split('.');
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerPart}.${payloadPart}`);
  verifier.end();
  return verifier.verify(certificate, signaturePart, 'base64url');
}

async function verifyIdTokenFallback(idToken) {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid Firebase token format');
  }

  const header = parseJwtPart(parts[0]);
  const payload = parseJwtPart(parts[1]);

  if (!header.kid || header.alg !== 'RS256') {
    throw new Error('Unsupported Firebase token signature');
  }

  const certs = await getFirebaseCerts();
  const certificate = certs[header.kid];

  if (!certificate) {
    throw new Error('Firebase signing certificate not found');
  }

  if (!verifyJwtSignature(idToken, certificate)) {
    throw new Error('Invalid Firebase token signature');
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (payload.aud !== firebaseProjectId) {
    throw new Error('Firebase token audience mismatch');
  }

  if (payload.iss !== `https://securetoken.google.com/${firebaseProjectId}`) {
    throw new Error('Firebase token issuer mismatch');
  }

  if (!payload.sub || payload.sub.length === 0) {
    throw new Error('Firebase token subject missing');
  }

  if (typeof payload.exp !== 'number' || payload.exp <= nowInSeconds) {
    throw new Error('Firebase token expired');
  }

  return payload;
}

if (!admin.apps.length) {
  const hasServiceAccount = Boolean(
    serviceAccount.project_id &&
    serviceAccount.private_key_id &&
    serviceAccount.private_key &&
    serviceAccount.client_email
  );

  if (hasServiceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin Initialized successfully');
    } catch (error) {
      console.error('Firebase Admin Initialization Error:', error.message);
    }
  }
}

if (admin.apps.length) {
  module.exports = admin;
} else {
  console.warn('Firebase Admin credentials were not found; using public token verification fallback.');

  module.exports = {
    auth: () => ({
      verifyIdToken: verifyIdTokenFallback
    })
  };
}
