/**
 * Bot Invites Routes
 */

import { Router } from 'express';
import { authMiddleware } from '../server/middleware/auth.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { createBotInvite, useBotInvite, getBotTemplates } from '../services/bot-invite-service.js';
import { logError } from '../shared/logger.js';

const router = Router();

router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { room_id, bot_name, bot_config, template_id, expires_in_hours } = req.body;
    const userId = req.user?.userId;

    if (!userId || !room_id || !bot_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await createBotInvite(
      room_id,
      userId,
      bot_name,
      bot_config || {},
      template_id,
      expires_in_hours || 24
    );

    res.json(result);
  } catch (error: any) {
    logError('Failed to create bot invite', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/use', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    const result = await useBotInvite(token);
    res.json(result);
  } catch (error: any) {
    logError('Failed to use bot invite', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/templates', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const templates = await getBotTemplates();
    res.json({ templates });
  } catch (error: any) {
    logError('Failed to get bot templates', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

