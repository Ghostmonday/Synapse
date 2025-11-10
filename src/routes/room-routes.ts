/**
 * Room Routes - Real Implementation
 * POST /chat-rooms - Create room
 * POST /chat-rooms/:id/join - Join room
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createRoom, joinRoom, getRoom } from '../services/room-service.js';
import { authMiddleware } from '../server/middleware/auth.js';
import { logError } from '../shared/logger.js';

const router = Router();

/**
 * POST /chat-rooms
 * Create a new room
 * Body: { name: string }
 * Requires: Authentication
 */
router.post('/chat-rooms', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const room = await createRoom(name, userId);

    res.status(201).json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        creator_id: room.creator_id,
        is_private: room.is_private,
        created_at: room.created_at,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Name taken') {
      return res.status(400).json({ error: 'Name taken' });
    }
    logError('Create room error', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

/**
 * POST /chat-rooms/:id/join
 * Join a room
 * Requires: Authentication
 */
router.post('/chat-rooms/:id/join', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const roomId = req.params.id;

    const result = await joinRoom(roomId, userId);

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Room not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('private')) {
        return res.status(403).json({ error: error.message });
      }
    }
    logError('Join room error', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

/**
 * GET /chat-rooms/:id
 * Get room details
 */
router.get('/chat-rooms/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roomId = req.params.id;
    const room = await getRoom(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room });
  } catch (error) {
    logError('Get room error', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

export default router;
