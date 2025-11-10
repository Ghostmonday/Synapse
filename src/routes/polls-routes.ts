/**
 * Polls Routes
 */

import { Router } from 'express';
import { authMiddleware } from '../server/middleware/auth.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { createPoll, voteOnPoll, getPollResults, getRoomPolls } from '../services/poll-service.js';
import { logError } from '../shared/logger.js';

const router = Router();

router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { room_id, question, options, is_anonymous, is_multiple_choice, expires_at } = req.body;
    const userId = req.user?.userId;

    if (!userId || !room_id || !question || !options) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const poll = await createPoll({
      room_id,
      question,
      options,
      is_anonymous: is_anonymous || false,
      is_multiple_choice: is_multiple_choice || false,
      expires_at
    }, userId);

    res.json({ poll });
  } catch (error: any) {
    logError('Failed to create poll', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:pollId/vote', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { pollId } = req.params;
    const { option_id } = req.body;
    const userId = req.user?.userId || null; // null if anonymous

    if (!option_id) {
      return res.status(400).json({ error: 'option_id is required' });
    }

    await voteOnPoll(pollId, option_id, userId);
    res.json({ success: true });
  } catch (error: any) {
    logError('Failed to vote on poll', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:pollId/results', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const results = await getPollResults(req.params.pollId);
    res.json({ results });
  } catch (error: any) {
    logError('Failed to get poll results', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/room/:roomId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { roomId } = req.params;
    const { include_closed } = req.query;
    const polls = await getRoomPolls(roomId, include_closed === 'true');
    res.json({ polls });
  } catch (error: any) {
    logError('Failed to get room polls', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

