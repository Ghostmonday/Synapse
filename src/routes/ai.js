/**
 * AI routes
 */

import { Router } from 'express';
import { logError } from '../shared/logger.js';
import { authMiddleware } from '../server/middleware/auth.js';
import { checkUsageLimit, trackUsage } from '../services/usage-service.js';

const router = Router();

router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { message, roomId } = req.body;
    
    if (!message || !roomId) {
      return res.status(400).json({ error: 'message and roomId are required' });
    }

    // Check AI message limit
    const limitCheck = await checkUsageLimit(userId, 'aiMessages');
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: 'AI message limit reached',
        upgrade_url: '/subscription/upgrade',
        limit: limitCheck.limit,
        used: limitCheck.used,
        message: `You've used ${limitCheck.used} of ${limitCheck.limit} AI messages this month. Upgrade to Pro for unlimited AI messages.`
      });
    }

    // Track usage BEFORE processing
    await trackUsage(userId, 'ai_message', 1, { roomId });

    // TODO: Integrate with OpenAI/DeepSeek API for actual AI responses
    const aiResponse = `AI response to: ${message}`; // Placeholder

    res.json({ 
      status: 'ok',
      message: aiResponse,
      usage: {
        used: limitCheck.used + 1,
        limit: limitCheck.limit,
        remaining: limitCheck.limit === -1 ? -1 : limitCheck.limit - (limitCheck.used + 1)
      }
    });
  } catch (err: unknown) {
    logError('AI chat error', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) || 'Server error' });
  }
});

export default router;

