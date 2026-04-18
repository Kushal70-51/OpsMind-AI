const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/db');

const uploadRoute = require('./routes/upload');
const searchRoute = require('./routes/search');
const askRoute = require('./routes/ask'); // ✅ NEW

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/upload', uploadRoute);   // PDF upload
app.use('/search', searchRoute);   // vector search
app.use('/ask', askRoute);         // ✅ chatbot (RAG)

// Health check (optional but useful)
app.get('/', (req, res) => {
  res.send('✅ API is running');
});

// Start server
connectDB()
  .then(() => {
    app.listen(5000, () => {
      console.log("🚀 Server running on http://localhost:5000");
    });
  })
  .catch((err) => {
    console.error("❌ DB Connection Failed:", err.message);
  });