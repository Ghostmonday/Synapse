import express from 'express';
import { supabase } from '../config/db.js';
import { authMiddleware as authenticate } from '../server/middleware/auth.js';
import { rateLimit } from 'express-rate-limit';
import { moderateContent } from '../middleware/moderation.js';
import { invokeLLM } from '../services/llm-service.js';
import { logAudit } from '../shared/logger.js';

const router = express.Router();
router.use(rateLimit({ windowMs: 60000, max: 10 }));

router.post('/invoke', authenticate, moderateContent, async (req, res) => {
  const { assistant_id, prompt } = req.body;
  
  // Input validation
  if (!assistant_id || !prompt) {
    return res.status(400).json({ error: 'assistant_id and prompt are required' });
  }
  
  if (typeof prompt !== 'string' || prompt.length > 10000) {
    return res.status(400).json({ error: 'Prompt must be a string under 10000 characters' });
  }

  try {
    const { data: assistant, error: fetchError } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistant_id)
      .eq('owner_id', req.user.id)
      .eq('is_active', true)
      .single();
    
    if (fetchError || !assistant) {
      return res.status(404).json({ error: 'Assistant not found or inactive' });
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    try {
      // @llm_param - Assistant model and temperature from database. User-configurable per assistant.
      const stream = await invokeLLM(assistant.model, prompt, assistant.temperature || 0.7);
      
      for await (const chunk of stream) {
        if (chunk) {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }
      }
      
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      
      await logAudit('assistant_invoke', req.user.id, { assistant_id, model: assistant.model });
    } catch (streamError: any) {
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
      res.end();
      throw streamError;
    }
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Invoke failed', details: error.message });
    }
  }
});

export default router;

