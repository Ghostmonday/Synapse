/**
 * Message Routes
 * Handles message sending and retrieval endpoints
 */

import { Router } from 'express';
import * as messageService from '../services/message-service.js';
import { telemetryHook } from '../telemetry/index.js';

const router = Router();

/**
 * POST /messaging/send
 * Send a message to a room
 */
router.post('/send', async (req, res, next) => {
  try {
    telemetryHook('messaging_send_start');
    await messageService.sendMessageToRoom(req.body);
    telemetryHook('messaging_send_end');
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /messaging/:roomId
 * Retrieve recent messages from a room
 */
router.get('/:roomId', async (req, res, next) => {
  try {
    telemetryHook('messaging_get_start');
    const messages = await messageService.getRoomMessages(req.params.roomId);
    telemetryHook('messaging_get_end');
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

export default router;

