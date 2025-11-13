import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables FIRST, before importing any other modules
dotenv.config();

import chatRouter from './routes/chat.js';
import dataRouter from './routes/data.js';
import { initializeDatabase } from './db/duckdb.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
try {
  await initializeDatabase();
  console.log('✅ Database initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize database:', error.message);
  console.log('⚠️  Server will start but database operations may fail');
  console.log('💡 Make sure to run: npm run setup-db');
}

// Routes
app.use('/api/chat', chatRouter);
app.use('/api/data', dataRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API available at http://localhost:${PORT}/api`);
  if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GOOGLE_API_KEY or GEMINI_API_KEY not found in environment variables');
    console.warn('💡 Get your API key from: https://makersuite.google.com/app/apikey');
  }
});

