const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/db');

const authRoute = require('./routes/auth');
const uploadRoute = require('./routes/upload');
const documentsRoute = require('./routes/documents');
const searchRoute = require('./routes/search');
const askRoute = require('./routes/ask');

const app = express();

// ✅ CORS — Frontend ko allow karo
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://ops-mind-5il9e9yb8-kushal70-51s-projects.vercel.app",
    /\.vercel\.app$/
  ],
  methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/auth', authRoute);
app.use('/upload', uploadRoute);
app.use('/documents', documentsRoute);
app.use('/search', searchRoute);
app.use('/ask', askRoute);

// Health check
app.get('/', (req, res) => {
  res.send('✅ OpsMind AI API is running');
});

// Start server
connectDB()
  .then(() => {
    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB Connection Failed:", err.message);
  });