const { MongoClient } = require('mongodb');
require('dotenv').config();

let db;

async function connectDB() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db('opsmind');
  console.log('MongoDB connected');
}

function getDB() {
  if (!db) throw new Error("DB not connected");
  return db;
}

module.exports = { connectDB, getDB };