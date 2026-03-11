require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const searchRoutes = require('./routes/search');
const sessionRoutes = require('./routes/session');
const quizRoutes = require('./routes/quiz');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/search', searchRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/quiz', quizRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'FocusTube API is running', timestamp: new Date().toISOString() });
});

// MongoDB connection (optional - app works without it)
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.log('⚠️  MongoDB not connected (sessions stored in memory):', err.message));
}

app.listen(PORT, () => {
  console.log(`🎯 FocusTube API running on http://localhost:${PORT}`);
  console.log(`📺 YouTube API Key: ${process.env.YOUTUBE_API_KEY ? '✅ Configured' : '❌ Missing - add to .env'}`);
});
