/**
 * AI routes
 */

import { Router } from 'express';
import { logError } from '../shared/logger.js';
import { authMiddleware } from '../server/middleware/auth.js';
import { checkUsageLimit, trackUsage } from '../services/usage-service.js';
import { checkQuota, incrementUsage } from '../services/usageMeter.js';
import { AuthenticatedRequest } from '../types/auth.types.js';

const router = Router();

router.post('/chat', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { message, roomId } = req.body;
    
    if (!message || !roomId) {
      return res.status(400).json({ error: 'message and roomId are required' });
    }

    // Check AI calls quota using new metering system
    const AI_CALLS_LIMIT = 100; // Free tier limit
    const withinQuota = await checkQuota(userId, 'ai_calls', AI_CALLS_LIMIT);
    if (!withinQuota) {
      return res.status(403).json({
        error: 'AI call limit reached',
        upgrade_url: '/subscription/upgrade',
        limit: AI_CALLS_LIMIT,
        message: `You've reached your monthly AI call limit. Upgrade to Pro for unlimited AI calls.`
      });
    }

    // Track usage BEFORE processing (legacy system)
    await trackUsage(userId, 'ai_message', 1, { roomId });
    
    // Increment usage using new metering system
    await incrementUsage(userId, 'ai_calls', 1);

    // Integrate with DeepSeek API for AI responses
    const { getDeepSeekKey } = await import('../services/api-keys-service.js');
    const { invokeLLM } = await import('../services/llm-service.js');
    
    let aiResponse: string;
    try {
      const deepseekKey = await getDeepSeekKey();
      if (!deepseekKey) {
        throw new Error('DeepSeek API key not configured');
      }
      
      // Use DeepSeek for AI responses
      const responseStream = await invokeLLM('deepseek-chat', message, 0.7);
      const chunks: string[] = [];
      for await (const chunk of responseStream) {
        chunks.push(chunk);
      }
      aiResponse = chunks.join('');
    } catch (error) {
      logError('AI chat LLM error', error instanceof Error ? error : new Error(String(error)));
      // Fallback response if LLM fails
      aiResponse = 'I apologize, but I\'m having trouble processing your request right now. Please try again.';
    }

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
    // Log full error details server-side only
    const error = err instanceof Error ? err : new Error(String(err));
    logError('AI chat error', error);
    
    // SECURITY: Never expose error details to clients
    res.status(500).json({ error: 'Something broke on our end. We\'ve been notified and are looking into it.' });
  }
});

export default router;

