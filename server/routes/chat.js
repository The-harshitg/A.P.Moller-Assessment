import express from 'express';
import { processQuery } from '../services/agent.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30 // 30 requests per minute
});

router.post('/', limiter, async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await processQuery(message, sessionId || 'default');

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Chat route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;

