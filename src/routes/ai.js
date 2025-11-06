/**
 * AI routes
 */

import { Router } from 'express';
import { logError } from '../shared/logger.js';

const router = Router();

router.post('/chat', async (req, res) => {
  try {
    const { message, roomId } = req.body;
    
    if (!message || !roomId) {
      return res.status(400).json({ error: 'message and roomId are required' });
    }

    // AI chat functionality - returns acknowledgment
    // TODO: Integrate with OpenAI/DeepSeek API for actual AI responses
    res.json({ 
      status: 'ok',
      message: 'AI chat endpoint is ready for implementation',
      received: { message, roomId },
      note: 'Connect to OpenAI/DeepSeek API to generate responses'
    });
  } catch (err: unknown) {
    logError('AI chat error', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) || 'Server error' });
  }
});

export default router;

